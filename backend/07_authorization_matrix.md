# Stage 7: Authorization Matrix & Multi-Tenant Scoping

## 7.1 & 7.2 Structural Authorization Architecture (Task 7.2)

### Why Property Scoping Lives in Dependencies (Not in `if` checks in routes):
1. **Elimination of Human Error:** Placing tenant scoping in route logic requires every engineer on every route to remember to write `if current_user.property_id != requested_id`. Forgetting this check in a single endpoint immediately creates a critical multi-tenant data leak.
2. **Declarative Contracts:** Using FastAPI dependencies (`Depends(require_role(...))` and `verify_property_access`) makes permission enforcement visible in route signatures and testable in isolation.
3. **Fail-Closed Execution:** Unhandled requests are rejected before executing any database queries, preventing SQL injection and unwanted CPU load.

---

## 7.3 & 7.4 Multi-Tenant & Object-Level Isolation

- **Manager Boundary (Task 7.3):** The Ooty manager querying Coorg property data or Coorg revenue receives **`403 Forbidden`**.
- **Guest Isolation (Task 7.4):** Guests can only view and interact with bookings linked to their own `guest_id`. Accessing another guest's booking ID returns **`404 Not Found`** to prevent ID enumeration.
- **Cross-Property Analytics (Task 7.5):** `/reports/revenue` is accessible strictly to the `owner` role (`x-roles: [owner]`).

---

## 7.7 Proven Authorization Grid (Tested Across All 4 Environments)

The following grid represents verified HTTP response codes across the 4 role environments tested against 6 representative endpoints:

| Endpoint | Guest Environment | Staff Environment (Coorg) | Manager Environment (Coorg) | Owner Environment | Security Rule Enforced |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`GET /properties/1/rooms`** | `403 Forbidden` | `200 OK` | `200 OK` | `200 OK` | Room inventory hidden from public/guests. |
| **`GET /properties/2/rooms` (Ooty)** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | `200 OK` | Coorg staff/manager blocked from Ooty inventory. |
| **`POST /bookings`** | `201 Created` | `201 Created` | `201 Created` | `201 Created` | Guest books for self; Staff/Mgr books on guest behalf. |
| **`POST /bookings/{id}/check-in`** | `403 Forbidden` | `200 OK` | `200 OK` | `200 OK` | Check-in restricted to operational staff/managers. |
| **`GET /reports/occupancy?property_id=1`** | `403 Forbidden` | `403 Forbidden` | `200 OK` | `200 OK` | Operational reporting restricted to managers & owner. |
| **`GET /reports/revenue`** | `403 Forbidden` | `403 Forbidden` | `403 Forbidden` | `200 OK` | Chain-wide revenue strictly restricted to owner. |

---

## 7.8 Query-Level Authorization Placement (Task 7.8)

- **Before the Query:** Action and operational endpoints (`/check-in`, `/check-out`, `/reports/revenue`) perform role and property validation *before* issuing any database query, short-circuiting unauthorized requests immediately.
- **Inside the Query (`WHERE` clause):** `GET /bookings` applies tenancy filters directly in SQL (`WHERE booking.guest_id = :gid` or `WHERE room.property_id = :pid`). Filtering inside SQL is mandatory to guarantee accurate pagination counts (`LIMIT`/`OFFSET`), prevent in-memory filtering performance degradation, and eliminate data leakage.
