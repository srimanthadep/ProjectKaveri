# Stage 3: Endpoint Authorization Matrix (3.11)

This matrix defines the complete role-based access control (RBAC) rules across all 4 system roles (`guest`, `staff`, `manager`, `owner`).

| Path | Method | Operation / Description | Public | Guest | Staff | Manager | Owner | Scope / Ownership Rule |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `/auth/register` | `POST` | Self-service guest registration | ✅ | ❌ | ❌ | ❌ | ❌ | Creates `guest` account only. |
| `/auth/login` | `POST` | Authenticate and obtain JWT | ✅ | ✅ | ✅ | ✅ | ✅ | Returns access + refresh token. |
| `/auth/refresh` | `POST` | Rotate and refresh access token | ❌ | ✅ | ✅ | ✅ | ✅ | Validates active refresh token. |
| `/auth/logout` | `POST` | Invalidate current refresh token | ❌ | ✅ | ✅ | ✅ | ✅ | Revokes session. |
| `/me` | `GET` | Get current caller's profile & role | ❌ | ✅ | ✅ | ✅ | ✅ | Returns caller's own record. |
| `/properties` | `GET` | List all hotel properties | ✅ | ✅ | ✅ | ✅ | ✅ | Public catalog. |
| `/properties/{id}` | `GET` | Get property details & room types | ✅ | ✅ | ✅ | ✅ | ✅ | Public catalog. |
| `/properties/{id}/availability` | `GET` | Check room availability by date & type | ✅ | ✅ | ✅ | ✅ | ✅ | Public availability check. |
| `/properties/{id}/rooms` | `GET` | List physical room inventory | ❌ | ❌ | ✅ | ✅ | ✅ | Staff/Mgr scoped to own property; Owner cross-property. |
| `/bookings` | `GET` | List reservations with filters | ❌ | ✅ | ✅ | ✅ | ✅ | Guest: own bookings only; Staff/Mgr: own property only; Owner: all. |
| `/bookings` | `POST` | Create booking + record deposit | ❌ | ✅ | ✅ | ✅ | ✅ | Guest: own booking; Staff: front-desk guest creation. |
| `/bookings/{id}` | `GET` | Get reservation stay details | ❌ | ✅ | ✅ | ✅ | ✅ | Guest: own booking only (404 if other); Staff/Mgr: own property. |
| `/bookings/{id}/check-in` | `POST` | Transition status to `checked_in` | ❌ | ❌ | ✅ | ✅ | ❌ | Staff/Manager of booked property only. |
| `/bookings/{id}/check-out` | `POST` | Transition status to `checked_out` | ❌ | ❌ | ✅ | ✅ | ❌ | Staff/Manager of booked property only. |
| `/bookings/{id}/cancel` | `POST` | Transition status to `cancelled` | ❌ | ✅ | ✅ | ✅ | ✅ | Guest: own booking; Staff/Mgr: own property; Owner: all. |
| `/bookings/{id}/no-show` | `POST` | Transition status to `no_show` | ❌ | ❌ | ✅ | ✅ | ❌ | Staff/Manager of booked property only. |
| `/bookings/{id}/payments` | `POST` | Record payment instalment | ❌ | ✅ | ✅ | ✅ | ❌ | Guest: own booking; Staff/Mgr: own property. |
| `/bookings/{id}/payments` | `GET` | List payments for a booking | ❌ | ✅ | ✅ | ✅ | ✅ | Guest: own booking; Staff/Mgr: own property; Owner: all. |
| `/bookings/{id}/review` | `POST` | Submit post-checkout review | ❌ | ✅ | ❌ | ❌ | ❌ | Guest: only on own checked-out booking. |
| `/reports/occupancy` | `GET` | Property monthly occupancy rates | ❌ | ❌ | ❌ | ✅ | ✅ | Manager: own property only; Owner: all properties. |
| `/reports/adr` | `GET` | Average daily room rates | ❌ | ❌ | ❌ | ✅ | ✅ | Manager: own property only; Owner: all properties. |
| `/reports/revpar` | `GET` | Revenue per available room | ❌ | ❌ | ❌ | ✅ | ✅ | Manager: own property only; Owner: all properties. |
| `/reports/revenue` | `GET` | Monthly revenue by property | ❌ | ❌ | ❌ | ✅ | ✅ | Manager: own property only; Owner: all properties. |
| `/guests` | `GET` | Search and list guests | ❌ | ❌ | ✅ | ✅ | ✅ | Staff & Manager: operational lookups; Owner: full list. |
| `/guests/{id}` | `GET` | View guest profile & stay history | ❌ | ❌ | ✅ | ✅ | ✅ | Staff/Manager/Owner; Guest cannot inspect others. |
