# Stage 1: Constraint Inventory & Error Mapping

## 1.1 Full Constraint Inventory

The following table catalogs every constraint enforced in the normalized Kaveri Stays database schema (`05_schema_final.sql`), along with its type, the business rule it satisfies, and the exact PostgreSQL `SQLSTATE` raised when deliberately violated.

| Table | Constraint Name | Constraint Type | Business Rule / Purpose | SQLSTATE Raised |
| :--- | :--- | :--- | :--- | :--- |
| `properties` | `properties_pkey` | `PRIMARY KEY` (p) | Uniquely identifies each hotel property. | `23505` (unique_violation) |
| `properties` | `properties_name_key` | `UNIQUE` (u) | Property names must be globally unique. | `23505` (unique_violation) |
| `properties` | `properties_star_rating_check` | `CHECK` (c) | Hotel star rating must be between 1 and 5. | `23514` (check_violation) |
| `room_types` | `room_types_pkey` | `PRIMARY KEY` (p) | Uniquely identifies room categories. | `23505` (unique_violation) |
| `room_types` | `room_types_name_key` | `UNIQUE` (u) | Room category names (Standard, Deluxe, Suite) must be unique. | `23505` (unique_violation) |
| `room_types` | `room_types_max_occupancy_check` | `CHECK` (c) | Room capacity must be at least 1 guest. | `23514` (check_violation) |
| `rooms` | `rooms_pkey` | `PRIMARY KEY` (p) | Uniquely identifies physical rooms. | `23505` (unique_violation) |
| `rooms` | `rooms_property_id_fkey` | `FOREIGN KEY` (f) | Room must belong to a valid registered property (`ON DELETE RESTRICT`). | `23503` (foreign_key_violation) |
| `rooms` | `rooms_room_type_id_fkey` | `FOREIGN KEY` (f) | Room must map to a valid room type (`ON DELETE RESTRICT`). | `23503` (foreign_key_violation) |
| `rooms` | `uq_property_room_number` | `UNIQUE` (u) | Room numbers must be unique within a given property. | `23505` (unique_violation) |
| `guests` | `guests_pkey` | `PRIMARY KEY` (p) | Uniquely identifies registered human guests. | `23505` (unique_violation) |
| `guests` | `uq_guests_email_lower` | `UNIQUE INDEX` | Single human identity rule: email uniqueness enforced case-insensitively (`LOWER(TRIM(email))`). | `23505` (unique_violation) |
| `rate_plans` | `rate_plans_pkey` | `PRIMARY KEY` (p) | Uniquely identifies seasonal rate tier configurations. | `23505` (unique_violation) |
| `rate_plans` | `rate_plans_property_id_fkey` | `FOREIGN KEY` (f) | Rate plan must belong to an existing property (`ON DELETE CASCADE`). | `23503` (foreign_key_violation) |
| `rate_plans` | `rate_plans_room_type_id_fkey` | `FOREIGN KEY` (f) | Rate plan must map to an existing room type (`ON DELETE CASCADE`). | `23503` (foreign_key_violation) |
| `rate_plans` | `rate_plans_nightly_rate_check` | `CHECK` (c) | Nightly rate must be greater than zero. | `23514` (check_violation) |
| `rate_plans` | `no_overlapping_rates` | `EXCLUSION` (x) | Kernel-level temporal integrity: No overlapping seasonal rate date ranges for the same property and room type (`GiST &&`). | `23P01` (exclusion_violation) |
| `bookings` | `bookings_pkey` | `PRIMARY KEY` (p) | Uniquely identifies reservations. | `23505` (unique_violation) |
| `bookings` | `bookings_guest_id_fkey` | `FOREIGN KEY` (f) | Booking must belong to an existing guest (`ON DELETE RESTRICT`). | `23503` (foreign_key_violation) |
| `bookings` | `bookings_room_id_fkey` | `FOREIGN KEY` (f) | Booking must map to an existing room (`ON DELETE RESTRICT`). | `23503` (foreign_key_violation) |
| `bookings` | `bookings_guests_count_check` | `CHECK` (c) | Guest count must be at least 1. | `23514` (check_violation) |
| `bookings` | `bookings_nightly_rate_check` | `CHECK` (c) | Captured historical nightly rate must be strictly positive. | `23514` (check_violation) |
| `bookings` | `valid_stay_range` | `CHECK` (c) | Stay range must not be empty and check-in must precede check-out. | `23514` (check_violation) |
| `bookings` | `no_overlapping_bookings` | `EXCLUSION` (x) | Double-booking prevention: Stays on the same room cannot overlap unless the reservation is `cancelled` or `no_show` (`GiST &&`). | `23P01` (exclusion_violation) |
| `payments` | `payments_pkey` | `PRIMARY KEY` (p) | Uniquely identifies financial transactions. | `23505` (unique_violation) |
| `payments` | `payments_booking_id_fkey` | `FOREIGN KEY` (f) | Payment must attach to a valid booking (`ON DELETE CASCADE`). | `23503` (foreign_key_violation) |
| `payments` | `payments_amount_check` | `CHECK` (c) | Payment amount must be strictly greater than zero. | `23514` (check_violation) |
| `reviews` | `reviews_pkey` | `PRIMARY KEY` (p) | Uniquely identifies guest feedback records. | `23505` (unique_violation) |
| `reviews` | `reviews_booking_id_key` | `UNIQUE` (u) | At most one review allowed per booking. | `23505` (unique_violation) |
| `reviews` | `reviews_booking_id_fkey` | `FOREIGN KEY` (f) | Review must attach to a valid booking (`ON DELETE CASCADE`). | `23503` (foreign_key_violation) |
| `reviews` | `reviews_rating_check` | `CHECK` (c) | Rating star score must be an integer between 1 and 5. | `23514` (check_violation) |

---

## 1.2 Constraint to HTTP Status Code Mapping

When an operation triggers a database constraint violation, the API layer must translate the specific PostgreSQL `SQLSTATE` into an accurate HTTP status code:

| SQLSTATE | Postgres Exception Class | Typical Constraint Trigger | Target HTTP Status Code | Rationalization |
| :--- | :--- | :--- | :--- | :--- |
| `23P01` | `exclusion_violation` | `no_overlapping_bookings`, `no_overlapping_rates` | **`409 Conflict`** | The request is syntactically well-formed, but conflicts directly with existing temporal state in the database (e.g. room is already booked). |
| `23505` | `unique_violation` | `uq_guests_email_lower`, `reviews_booking_id_key`, `uq_property_room_number` | **`409 Conflict`** | The entity or relation already exists (duplicate email, duplicate review for the same stay). |
| `23503` | `foreign_key_violation` | Invalid `property_id`, `room_id`, `guest_id`, or deleting a referenced parent | **`404 Not Found`** (on referenced entity lookup) or **`409 Conflict`** (on restrict deletion) | When referencing a non-existent foreign ID on insert, return `404`; when deleting an entity blocked by `RESTRICT`, return `409`. |
| `23514` | `check_violation` | `star_rating`, `rating`, `guests_count`, `valid_stay_range` | **`422 Unprocessable Entity`** | The request body was parsed successfully into JSON, but contains semantically invalid field values (e.g., checkout before checkin, rating 7). |

**Distinct HTTP status codes resulting from constraint violations: 3** (`409 Conflict`, `422 Unprocessable Entity`, `404 Not Found`).

---

## 1.3 State Conflicts vs. Malformed Requests (Why 400 is Wrong)

Three constraints are violated by requests that are individually well-formed and valid in isolation, but conflict with the current state of the database:
1. `no_overlapping_bookings` (Exclusion constraint on `bookings`): Request has valid date format, positive guest count, and valid room ID, but the room is already occupied by someone else during those dates.
2. `uq_guests_email_lower` (Unique index on `guests`): Request contains a syntactically valid email address, but an account with that email has already been registered.
3. `reviews_booking_id_key` (Unique constraint on `reviews`): Request contains a valid rating (1-5) and text comment for a valid `booking_id`, but a review has already been submitted for this stay.

**Why `400 Bad Request` is wrong:**
`400 Bad Request` indicates that the server cannot understand or parse the request due to malformed syntax, corrupted headers, or invalid JSON encoding. In all three cases above, the request payload is 100% syntactically correct and parseable. The failure is entirely due to a state collision with existing database records. HTTP RFC 9110 specifies **`409 Conflict`** as the correct semantic response for state collisions.

---

## 1.4 Error Sanitization and Information Leakage

When `no_overlapping_bookings` fails, PostgreSQL returns:
```
ERROR: conflicting key value violates exclusion constraint "no_overlapping_bookings"
DETAIL: Key (room_id, stay)=(1, [2025-01-12,2025-01-15)) conflicts with existing key (room_id, stay)=(1, [2025-01-12,2025-01-15)).
```

**Client Exposure Decision:**
- **What the client MAY see:** A clean, generic error message indicating that the requested room is unavailable for the selected dates:
  ```json
  {
    "error": {
      "code": "ROOM_UNAVAILABLE",
      "message": "The selected room is not available for the requested dates."
    }
  }
  ```
- **What MUST NOT be exposed:** The raw `DETAIL` string. Passing the raw Postgres message leaks internal database schema names (`room_id`, `stay`, `no_overlapping_bookings`) and critically **violates guest privacy** by exposing the exact check-in/check-out dates of other guests' reservations.

---

## 1.5 Rule 3 (Guest Count vs Maximum Occupancy) Audit

**Audit Findings:**
- In the database schema, table `room_types` enforces `max_occupancy SMALLINT NOT NULL CHECK (max_occupancy > 0)`, and table `bookings` enforces `guests_count SMALLINT NOT NULL CHECK (guests_count > 0)`.
- However, PostgreSQL `CHECK` constraints cannot reference columns across multiple tables without custom triggers. Therefore, a standard `INSERT INTO bookings (room_id, guests_count, ...)` **cannot** check `guests_count <= room_types.max_occupancy` purely through declarative table DDL.
- **Verification:** An explicit `INSERT` into `bookings` with `guests_count = 10` for a Standard Room (capacity 2) succeeds in raw SQL unless enforced by an explicit query join/trigger or handled within the transaction before insertion.
- **Resolution:** In the API's single-transaction booking creation flow (`POST /bookings`), the endpoint queries the room's `max_occupancy` within the transaction and raises `422 Unprocessable Entity` before committing, and the database view/trigger or transaction boundary guarantees it.

---

## 1.6 Unconstrained Business Rule Defense

- **Rule Identified:** Preventing a review from being submitted before checkout date occurs.
- **Where it lives:** The API layer checks `CURRENT_DATE >= UPPER(booking.stay)` and `booking.status = 'checked_out'` in the transaction handling `POST /bookings/{id}/review`.
- **What happens if bypassed via `psql`:** A direct SQL `INSERT INTO reviews` bypassing the API can insert a review on an active or future booking because the schema only enforces `UNIQUE(booking_id)` and `rating BETWEEN 1 AND 5`. To make this fully kernel-enforced in PostgreSQL, a `BEFORE INSERT` trigger or stored procedure checking `bookings.status = 'checked_out'` is required.

---

## 1.7 Dangerous Analytical Queries to Expose Directly

Three queries from the 25 Stage 4 queries are unsafe to expose as unconstrained public endpoints:
1. **Unbounded Full-History Queries (e.g., Query 4.4 & 4.16 - All Gaps & All Lifetime Repeat Visitors):** Performing window functions (`LAG()`) over all unpartitioned historical booking rows without date range or property filters causes full-table sequential scans that degrade database performance under concurrent traffic.
2. **Cross-Property Global Financial Reports (Query 4.7, 4.8, 4.10):** Aggregating total monthly revenue and ADR across all properties simultaneously violates multi-tenant property scoping if exposed to property managers or staff.
3. **Unfiltered RFM Segmentation (Query 4.17):** Complex NTILE window calculations across the entire customer base must be restricted to owner-only asynchronous reporting pipelines rather than real-time synchronous request paths.

---

## 1.8 Schema Columns Hidden From Guests

A guest may never see the following internal or administrative columns:
- `accounts.password_hash`: Credential secret.
- `accounts.role`: Internal permission tier.
- `accounts.property_id`: Internal operational binding.
- `bookings.notes`: Internal hotel/staff operational remarks (e.g. "VIP guest", "late check-in flag", "complaint noted").
- `guests.phone` and `guests.city` of other guests: Guest PII.
- `payments.idempotency_key` / raw bank references of other transactions.

---

## 1.9 Booking State Machine & Permitted Actors

```
                 [ confirmed ]
                /      |      \
  Guest/Staff  /       |       \  Staff only
  (Cancellation)       |        \ (No-show timeout)
              v        v         v
       [ cancelled ]  [ checked_in ]  [ no_show ]
                       |
            Staff only | (Check-out)
                       v
                 [ checked_out ]
```

| Transition | From State | To State | Permitted Roles | Business Logic & Rules |
| :--- | :--- | :--- | :--- | :--- |
| **Check-in** | `confirmed` | `checked_in` | `staff`, `manager` | Guest arrives on or after check-in date. |
| **Check-out** | `checked_in` | `checked_out` | `staff`, `manager` | Guest departs, room marked ready for turnover. |
| **Cancel** | `confirmed` | `cancelled` | `guest` (own booking), `staff`, `manager`, `owner` | Reservation cancelled, GiST exclusion constraint immediately releases room back to market. |
| **No-Show** | `confirmed` | `no_show` | `staff`, `manager` | Guest failed to arrive on scheduled date. |

*Illegal transitions (e.g., `confirmed` $\rightarrow$ `checked_out` without `checked_in`, or resurrecting `cancelled` $\rightarrow$ `confirmed`) are strictly rejected with `409 Conflict` or `422 Unprocessable Entity`.*

---

## 1.10 Schema Revision Defense

**Decision:** The normalized schema design from Stage 2/3 (`05_schema_final.sql`) with `DATERANGE`, `btree_gist` exclusion constraints, and stored `nightly_rate` provides the exact transactional foundations required by the HTTP API. The only enhancement required for the API layer is introducing an `accounts` table with role definitions and property scoping to manage authentication tokens securely without modifying core domain tables.
