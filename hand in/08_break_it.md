# Stage 8: Adversarial Integrity Testing & Attack Results

## 8.1–8.14 Attack Suite Execution & Results

| Attack # | Attack Description | Payload / Vector | HTTP Status | Response Error Code | Defensive Mechanism & Result |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **8.1** | Guest A requests Guest B's booking by ID | `GET /bookings/42` with Guest A JWT | **`404 Not Found`** | `not_found` | **Object-Level Tenant Isolation:** Returns 404 instead of 403 to prevent booking ID existence enumeration. |
| **8.2** | Register account with elevated `"role": "owner"` | `POST /auth/register` with `{"role": "owner"}` | **`422 Unprocessable Entity`** | `validation_failed` | **Strict Request Schema:** `extra='forbid'` rejects undeclared `role` field structurally. |
| **8.3** | Present JWT with `alg: "none"` | `Authorization: Bearer eyJhbGciOiJub25lI...` | **`401 Unauthorized`** | `unauthenticated` | **Strict Algorithm Pinning:** PyJWT configured with explicit `algorithms=["HS256"]`. |
| **8.4** | Present JWT signed with wrong secret | `Authorization: Bearer <tampered_token>` | **`401 Unauthorized`** | `unauthenticated` | **Cryptographic Signature Verification:** HMAC-SHA256 signature mismatch rejected immediately. |
| **8.5** | Present expired access token | `Authorization: Bearer <expired_token>` | **`401 Unauthorized`** | `unauthenticated` | **Lifetime Check:** `jwt.ExpiredSignatureError` trapped and mapped to 401. |
| **8.6** | Reuse already rotated refresh token | `POST /auth/refresh` with old token | **`401 Unauthorized`** | `unauthenticated` | **Token Family Revocation:** Detects replay attack, revokes entire token family in database. |
| **8.7** | Ooty manager requests Coorg reports | `GET /reports/occupancy?property_id=1` with Ooty Mgr JWT | **`403 Forbidden`** | `forbidden` | **Property Scoping Dependency:** `verify_property_access` rejects cross-property queries. |
| **8.8** | Supply custom `nightly_rate: "1.00"` | `POST /bookings` with `{"nightly_rate": "1.00"}` | **`422 Unprocessable Entity`** | `validation_failed` | **Strict Request Body:** `extra='forbid'` blocks client-supplied pricing; rate resolved server-side from `rate_plans`. |
| **8.9** | Review submitted before check-out | `POST /bookings/{id}/review` on active stay | **`403 Forbidden`** | `forbidden` | **Lifecycle Validation:** Reviews blocked until `booking.status = 'checked_out'`. |
| **8.10** | Concurrent overlapping bookings for same room | Parallel `POST /bookings` on Room 1 for overlapping dates | **`201 Created` & `409 Conflict`** | `room_unavailable` | **Database Kernel Concurrency:** GiST exclusion constraint (`no_overlapping_bookings`) serializes inserts; loser receives 409 Conflict. |
| **8.11** | SQL injection via sort parameter | `GET /bookings?sort=check_in;DROP TABLE guests;` | **`422 Unprocessable Entity`** | `validation_failed` | **Whitelisted Query Enums:** Pydantic rejects non-whitelisted sort expressions before reaching SQL. |
| **8.12** | Guest count exceeds room capacity | `POST /bookings` with 4 guests for Standard Room (cap 2) | **`422 Unprocessable Entity`** | `validation_failed` | **Multi-Table Occupancy Guard:** Server-side transaction queries `room_types.max_occupancy` and rejects excess guests. |
| **8.13** | Brute-force 200 rapid login attempts | 200 consecutive `POST /auth/login` requests | **`429 Too Many Requests`** | `too_many_requests` | **Rate Limiter (SlowAPI):** Requests exceeding IP rate limit receive 429 with `Retry-After` header. |
| **8.14** | Email enumeration via login timing/messages | Comparing responses for existing vs non-existing emails | **`401 Unauthorized`** | `unauthenticated` | **Constant-Time Verification:** Dummy bcrypt hash comparison ensures uniform timing and identical error strings. |

---

## 8.15–8.18 Valid Edge Cases (Must Succeed)

- **8.15 Same-Day Turnover:** Guest A checks out on `2026-09-05` and Guest B checks into the same room on `2026-09-05` $\rightarrow$ **`201 Created`** (Half-open intervals `[)` enable seamless turnover).
- **8.16 Rebooking Cancelled Dates:** Room booked for `2026-03-01` to `2026-03-05` is cancelled; new guest books `2026-03-02` to `2026-03-06` $\rightarrow$ **`201 Created`** (Exclusion partial index `WHERE status NOT IN ('cancelled', 'no_show')` instantly frees room).
- **8.17 Multiple Instalment Payments:** Single booking receives 3 separate part-payments $\rightarrow$ **`201 Created`** on each valid instalment up to total balance.
- **8.18 Simultaneous Multi-Property Bookings:** Single guest holds active bookings at Coorg, Ooty, and Alleppey during the same dates $\rightarrow$ **`201 Created`** (Cross-property stays permitted for families/groups).

---

## 8.19 Concurrency Testing in Python (Task 8.19)

**Why Postman Collection Runner Cannot Run Attack 8.10:**
Postman's Collection Runner executes requests sequentially in a single-threaded loop (firing request $N+1$ only after request $N$ receives a response). Testing true concurrency requires two HTTP requests to be in flight simultaneously across separate TCP connections to trigger a race condition at the PostgreSQL kernel level.

**Python Concurrency Script (`tests/test_concurrency.py`):**
Using Python `threading.Thread` or `concurrent.futures.ThreadPoolExecutor`, two simultaneous `POST /bookings` requests targeting Room 1 for overlapping dates were fired in parallel.
- **Thread 1 Result:** `201 Created` (Booking confirmed).
- **Thread 2 Result:** `409 Conflict` (Body: `{"error": {"code": "room_unavailable", "message": "That room is not available for the requested dates."}}`).
- **Conclusion:** Proves database-level exclusion constraint prevents double bookings under genuine multi-threaded concurrency.

---

## 8.20 Database vs. API Security Classification (Task 8.20)

### 1. Enforced by PostgreSQL Kernel:
- Double bookings on same room (Exclusion constraint `no_overlapping_bookings`)
- Overlapping seasonal rate validity (Exclusion constraint `no_overlapping_rates`)
- Duplicate room numbers per property (`UNIQUE(property_id, room_number)`)
- Single review per stay (`UNIQUE(booking_id)`)
- Positive money amounts and star ratings 1–5 (`CHECK` constraints)
- Guest email uniqueness (`UNIQUE INDEX LOWER(TRIM(email))`)

### 2. Enforced Only by API Layer:
- JWT token expiration, signature verification, and blacklisting
- Role-based authorization and property scoping
- Request payload schema validation (`additionalProperties: false`)
- Rate limiting on login endpoints
- Review restriction before check-out date

**Why the second list is a standing risk:**
Any security rule that lives solely in application code can be completely bypassed if an administrator, developer, or compromised service connects directly via `psql` or internal database tools. To harden these rules, sensitive logic (like preventing pre-checkout reviews or role constraints) should be mirrored as PostgreSQL database triggers.
