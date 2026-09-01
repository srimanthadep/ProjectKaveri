# Reconciliation: Original Design vs. Standard Schema

## Comparison Summary
- Entity structure matched 100% (8 core tables: properties, room_types, rooms, guests, rate_plans, bookings, payments, reviews).
- Temporal handling matched using PostgreSQL DATERANGE and EXCLUSION constraints with btree_gist.
- Status enum values matched exactly (confirmed, checked_in, checked_out, cancelled, no_show).

## Adjustments Made for Standard Compatibility (R6)
1. room_types: Renamed `type_name` to `name`.
2. rate_plans: Renamed `validity_range` to `valid`.
3. bookings: Renamed `stay_range` to `stay` and stored the DATERANGE directly.
4. payments: Renamed `payment_method` to `method`.

## Kept Extensions
- Retained `nightly_rate` on `bookings` to lock in historical pricing at time of reservation.
- Retained `phone` and `city` on `guests` to preserve legacy customer profiles.