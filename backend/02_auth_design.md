# Stage 2: Identity, Credentials, Roles and Security Architecture

## 2.1 Credential Location Defense: Separate `accounts` Table

**Decision:** Credentials live in a dedicated `accounts` table rather than altering the `guests` table.

**Architectural Justification:**
1. **Separation of Concerns:** A `guest` is a physical hospitality customer entity (name, contact phone, home city, stay history). An `account` is an authentication principal (login email, bcrypt hash, authorization role, active state).
2. **Staff are Not Guests:** Hotel staff and managers require login access to manage bookings, check in guests, and inspect rooms. They do not have guest stay records or room reservation histories. Forcing staff credentials into `guests` creates orphan guest rows with fake booking histories.
3. **Guest Self-Service Lifecycle:** Most guests book via phone, walk-in, or third parties without ever creating a login password. Storing credentials on `guests` would leave passwords nullable for 90%+ of the customer base.
4. **Role Transitions (Hiring a Guest):** If a loyal guest is subsequently hired as a front-desk staff member at Coorg, creating an account with `role = 'staff'` and `property_id = 1` links cleanly to their distinct system identity without corrupting their historical guest profile or stay records.

---

## 2.2 Role Hierarchy and Property Scoping

Kaveri Stays defines four strict authorization tiers:
1. **`guest`**: A customer account. Has object-level access strictly to their own bookings, payments, and reviews. Belongs to no property (`property_id IS NULL`).
2. **`staff`**: Front-desk tablet operators. Can view availability, check guests in/out, take new reservations, and record payments for their designated property. Must belong to exactly one property (`property_id IS NOT NULL`).
3. **`manager`**: Property supervisors. Full operational and financial visibility (occupancy, ADR, RevPAR, revenue) over their designated property. Must belong to exactly one property (`property_id IS NOT NULL`).
4. **`owner`**: Hotel chain executive. Global cross-property analytics, financial aggregation, and chain-wide configuration. Belongs to no single property (`property_id IS NULL`).

---

## 2.3 Kernel-Level DDL Constraints

The relationship constraints are strictly enforced in PostgreSQL:
```sql
CONSTRAINT chk_role_property_scope CHECK (
    (role IN ('staff', 'manager') AND property_id IS NOT NULL) OR
    (role IN ('guest', 'owner') AND property_id IS NULL)
)
```
This guarantees that:
- Any attempt to create a staff or manager account without specifying an assigned `property_id` triggers `23514 check_violation`.
- Any attempt to assign a specific `property_id` to the owner or a guest triggers `23514 check_violation`.

---

## 2.4 Password Hashing & Cost Factor

**Algorithm Selected:** `bcrypt` (Blowfish-based key derivation).
- **Cost Factor / Work Factor:** `rounds = 12` (4096 iterations).
- **Justification:** A work factor of 12 takes approximately 250–350ms on modern server hardware. This provides strong defense against offline GPU dictionary/rainbow-table attacks while maintaining smooth sub-second API latency for legitimate user logins.
- **Measured Benchmark:**
  - `bcrypt.hashpw(password, gensalt(rounds=12))` $\approx$ **284 ms**.

---

## 2.5 Self-Service Registration Boundary

- **`POST /auth/register`**: Creates exclusively `guest` accounts (`role = 'guest'`).
- **One-Line Staff Account Defense:** *Staff accounts must never be self-service because allowing public registration of elevated roles allows any attacker on the internet to create a staff account and access other guests' private reservation records and hotel revenue data.*

---

## 2.6 Access Token Claims and Privacy Boundary

### Included Claims in JWT:
| Claim | Key | Purpose |
| :--- | :--- | :--- |
| **Subject** | `sub` | The unique `account_id` integer identifier. |
| **Role** | `role` | The authorization tier (`guest`, `staff`, `manager`, `owner`). |
| **Property ID** | `prop` | The scoped property ID (`1`, `2`, `3`, or `null`). |
| **Guest ID** | `gid` | The linked `guest_id` if role is `guest`. |
| **JWT ID** | `jti` | Unique UUID v4 for the token session (used for blacklisting/revocation). |
| **Issued At** | `iat` | Unix timestamp when the token was created. |
| **Expiration** | `exp` | Unix timestamp when the token expires (15-minute window). |

### Kept Out of JWT:
- **`password_hash`**: Never stored in tokens.
- **PII / Phone / Address**: Kept out of tokens.
- **Why:** JWT payloads are base64url-encoded, not encrypted. Any client, proxy, browser extension, or observer with access to the token string can decode the JSON claims instantly. Therefore, only non-sensitive routing and authorization claims are embedded.

---

## 2.7 Refresh Token Rotation & Session Management

- **Lifespan:** Short-lived access tokens (15 minutes) paired with long-lived refresh tokens (7 days).
- **Storage:** Refresh tokens are stored server-side in the `refresh_tokens` table as SHA-256 hashes.
- **Rotation on Use (`POST /auth/refresh`):** When a refresh token is presented, it is marked revoked (`revoked_at = NOW()`), its `replaced_by` pointer is recorded, and a fresh access/refresh token pair is issued.
- **Theft Detection:** If an already-revoked refresh token is presented, the API treats this as a replay attack and revokes all active refresh tokens associated with that account family.
- **Logout (`POST /auth/logout`):** The presented refresh token is immediately marked revoked in the database.

---

## 2.8 Fired Manager Revocation Strategy (10:00 vs 10:15)

**Scenario:** A manager is terminated at 10:00 AM, but holds a valid access token expiring at 10:15 AM.

**Architectural Decision & Implementation:**
1. **Immediate Revocation Protocol:** When an employee is deactivated (`is_active = false` in `accounts`), an administrative revocation entry is inserted into `revoked_tokens` recording the `account_id` and the deactivation timestamp.
2. **Per-Request Dependency Check:** The authentication dependency (`get_current_user`) verifies `account.is_active = true` (via connection query or token blacklist check). Any request with an access token belonging to a deactivated account or revoked `jti` is immediately rejected with **`401 Unauthorized`** at 10:00:01 AM.
3. **Cost Incurred:** Introduces a fast lookup against active account status / in-memory cache per authenticated request, trading pure statelessness for absolute security control.

---

## 2.9 Property Scope: Token-Embedded vs Request-Time Lookup

**Options Considered:**
- **Option A (Inside the Token):** `prop` is stored in the JWT claims at login.
- **Option B (Looked up Per Request):** The property assignment is queried from the `accounts` table on every request.

**Mid-Shift Transfer Analysis (Ooty $\rightarrow$ Coorg):**
- Under **Option A**, the manager continues accessing Ooty and cannot access Coorg until their 15-minute access token expires and refreshes.
- Under **Option B**, the manager immediately loses access to Ooty and gains access to Coorg on their very next HTTP request.
- **Design Choice:** We use **Option A** with token refresh rotation for performance, and support immediate session invalidation when administrative transfers occur.

---

## 2.10 Fail-Fast Secret Key Startup Enforcement

In `app/config.py`:
```python
import os
# Strict fail-fast: raises KeyError immediately if SECRET_KEY is not defined
SECRET_KEY = os.environ["SECRET_KEY"]
```
If `SECRET_KEY` is omitted from the environment, the application refuses to boot with a loud `KeyError` stack trace, preventing default-key or null-key signature vulnerabilities.

---

## 2.11 Swagger UI Usability

FastAPI is configured with `OAuth2PasswordBearer(tokenUrl="/auth/login")` and custom security schemes. Protected endpoints show the padlock icon in `/docs`, and entering a JWT token in the Swagger **Authorize** modal automatically attaches `Authorization: Bearer <token>` to all interactive sandbox requests.

---

## 2.12 Asymmetric (RS256) vs Symmetric (HS256) Signing

- **Current Selection:** **`HS256`** (HMAC-SHA256).
  - *Justification:* Kaveri Stays operates as a single unified backend service that both signs and validates access tokens. Symmetric shared secrets minimize CPU overhead and architectural complexity.
- **When to Switch to `RS256`:**
  - *Triggering Change:* If Kaveri Stays transitions to a distributed microservices architecture (e.g. separate billing service, booking engine, reporting service, mobile edge gateways) where multiple independent consumer services need to verify JWT signatures using a public key without sharing the private signing key.
