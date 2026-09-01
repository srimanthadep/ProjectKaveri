# Interlude: OpenAPI Spec Reconciliation Report

## R1: Specification Timestamp & Baseline Verification
- Stage 3 hand-written specification (`03_openapi_original.yaml`) and role permission matrix (`03_authorization_matrix.md`) were drafted and verified prior to opening the standardized reveal specification.

---

## R2: Path-by-Path Alignment Matrix

| Category | API Path | HTTP Method | Reveal Match Status | Comparison Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/auth/register` | `POST` | **Identical Match** | Both enforce public self-service registration restricted strictly to the `guest` role with `additionalProperties: false`. |
| **Auth** | `/auth/login` | `POST` | **Identical Match** | Authenticates credentials and returns JWT `access_token` and `refresh_token`. |
| **Auth** | `/auth/refresh` | `POST` | **Identical Match** | Rotates refresh token on use with reuse detection. |
| **Auth** | `/auth/logout` | `POST` | **Identical Match** | Revokes the active session refresh token; returns `204 No Content`. |
| **Auth** | `/me` | `GET` | **Identical Match** | Returns caller's profile shaped by authenticated role. |
| **Properties** | `/properties` | `GET` | **Identical Match** | Public hotel listing. |
| **Properties** | `/properties/{property_id}` | `GET` | **Identical Match** | Single property retrieval. |
| **Properties** | `/properties/{property_id}/rooms` | `GET` | **Identical Match** | Returns all physical rooms including never-booked rooms with pagination metadata. |
| **Properties** | `/properties/{property_id}/availability` | `GET` | **Identical Match** | Availability checking with `from`, `to`, and optional `room_type`. |
| **Bookings** | `/bookings` | `GET` | **Identical Match** | Filtered by property, status, dates, and whitelisted sorting. |
| **Bookings** | `/bookings` | `POST` | **Identical Match** | Single-transaction creation; resolves rate server-side from `rate_plans`. |
| **Bookings** | `/bookings/{booking_id}` | `GET` | **Identical Match** | Returns stay details. Scoped to caller (returns `404` for unauthorized guest to prevent existence enumeration). |
| **Bookings** | `/bookings/{booking_id}/check-in` | `POST` | **Identical Match** | Action endpoint for `confirmed` $\rightarrow$ `checked_in`. |
| **Bookings** | `/bookings/{booking_id}/check-out` | `POST` | **Identical Match** | Action endpoint for `checked_in` $\rightarrow$ `checked_out`. |
| **Bookings** | `/bookings/{booking_id}/cancel` | `POST` | **Identical Match** | Action endpoint for cancellation; releases room. |
| **Bookings** | `/bookings/{booking_id}/no-show` | `POST` | **Identical Match** | Action endpoint for no-show. |
| **Payments** | `/bookings/{booking_id}/payments` | `GET` | **Identical Match** | Lists payment history, total paid, and outstanding balance. |
| **Payments** | `/bookings/{booking_id}/payments` | `POST` | **Identical Match** | Accepts `Idempotency-Key` header; enforces total booking cap. |
| **Reviews** | `/bookings/{booking_id}/review` | `POST` | **Identical Match** | Post-checkout review creation (enforces rating 1-5, single review per stay). |
| **Reviews** | `/properties/{property_id}/reviews` | `GET` | **Identical Match** | Public property reviews with anonymized guest names. |
| **Reports** | `/reports/occupancy` | `GET` | **Identical Match** | Monthly occupancy metrics; scoped to manager's property or owner global. |
| **Reports** | `/reports/adr` | `GET` | **Identical Match** | Average daily room rates. |
| **Reports** | `/reports/revpar` | `GET` | **Identical Match** | Revenue per available room. |
| **Reports** | `/reports/revenue` | `GET` | **Identical Match** | Cross-property monthly revenue; strictly owner-only (`x-roles: [owner]`). |
| **Guests** | `/guests` | `GET` | **Identical Match** | Staff and manager guest search by exact email. |
| **Guests** | `/guests/{guest_id}` | `GET` | **Identical Match** | Single guest record inspection. |

---

## R3 & R4: Status Code & Design Tradeoff Defense

### 1. Action Endpoints vs. Single `PATCH /bookings/{id}`
- **Choice Adopted:** Action endpoints (`/check-in`, `/check-out`, `/cancel`, `/no-show`).
- **Defense:** State transitions in hospitality have distinct business prerequisites and distinct permission sets (e.g. only staff may check in, but a guest may cancel). Dedicated action endpoints make RBAC permissions explicit in OpenAPI decorators rather than burying permission branching inside a single generic PATCH handler.

### 2. Status Code Selection: `404 Not Found` vs `403 Forbidden` on Cross-Guest Booking Inspection
- **Choice Adopted:** `404 Not Found`.
- **Defense:** Returning `403 Forbidden` confirms to an unauthorized guest that the requested booking ID exists in the database (leaking existence and enabling enumeration attacks). Returning `404 Not Found` behaves as if the resource does not exist for unauthorized tenants.

### 3. Review Failure Status Codes: `403` vs `409`
- **Choice Adopted:**
  - Submitting a review before check-out returns **`403 Forbidden`** (the caller is not yet entitled to review).
  - Submitting a second review on the same booking returns **`409 Conflict`** (violates the uniqueness constraint).

---

## R5: Structural Defense Against Specific Security Attacks

1. **Attack 8.2 (Self-service privilege escalation via `"role": "owner"`):**
   - Defeated by `RegisterRequest` setting `additionalProperties: false` and defining no `role` field.
2. **Attack 8.8 (Client supplying custom `nightly_rate` in request):**
   - Defeated by `BookingCreate` omitting `nightly_rate` and enforcing `additionalProperties: false`. The rate is resolved purely on the server by querying `rate_plans`.
3. **Attack 8.1 (Guest enumeration via ID guessing):**
   - Defeated by object-level tenant scoping returning `404 Not Found`.
4. **Attack 8.6 (Refresh token replay):**
   - Defeated by server-side SHA-256 token rotation and immediate invalidation of token families on reuse.

---

## R6: Schema Standardization
The finalized schema `05_openapi_final.yaml` is adopted as the canonical contract for all FastAPI route handlers, response models, and test fixtures.
