# Stage 5: Adversarial Integrity Testing & Constraint Validation

### Test Case 1: Overlapping Bookings on the Same Room (Rule 4)
- **Attempted SQL:**
  ```sql
  -- Attempting to book Room 1 during an active confirmed reservation
  INSERT INTO bookings (guest_id, room_id, stay, guests_count, nightly_rate, status)
  VALUES (1, 1, daterange('2025-01-12', '2025-01-15', '[)'), 2, 4500.00, 'confirmed');

Constraint Name: `no_overlapping_bookings`
Constraint Definition: `EXCLUDE USING gist (room_id WITH =, stay WITH &&) WHERE (status NOT IN ('cancelled', 'no_show'))`

Exact PostgreSQL Error Message:

ERROR: conflicting key value violates exclusion constraint "no_overlapping_bookings"
DETAIL: Key (room_id, stay)=(1, [2025-01-12,2025-01-15)) conflicts with existing key (room_id, stay)=(1, [2025-01-12,2025-01-15)).

### Test Case 2: Overlapping Seasonal Rate Plans (Rule 6)

Attempted SQL:

-- Attempting to define two overlapping rate validity periods for Property 1 & Room Type 1
INSERT INTO rate_plans (property_id, room_type_id, season_name, valid, nightly_rate)
VALUES (1, 1, 'Collision Season', daterange('2025-05-01', '2025-08-01', '[)'), 5000.00);

Constraint Name: `no_overlapping_rates`
Constraint Definition: `EXCLUDE USING gist (property_id WITH =, room_type_id WITH =, valid WITH &&)`

Exact PostgreSQL Error Message:

ERROR: conflicting key value violates exclusion constraint "no_overlapping_rates"
DETAIL: Key (property_id, room_type_id, valid)=(1, 1, [2025-05-01,2025-08-01)) conflicts with existing key (property_id, room_type_id, valid)=(1, 1, [2025-01-01,2025-09-30)).


### Test Case 3: Duplicate Room Numbers Within Same Property (Rule 2)

Attempted SQL:

-- Inserting an already existing room number in Property 1
INSERT INTO rooms (property_id, room_number, room_type_id)
VALUES (1, '101', 1);


Constraint Name: `uq_property_room_number`
Constraint Definition:`UNIQUE (property_id, room_number)`
Exact PostgreSQL Error Message:

ERROR: duplicate key value violates unique constraint "uq_property_room_number"
DETAIL: Key (property_id, room_number)=(1, 101) already exists.


### Test Case 4: Case-Insensitive Duplicate Guest Email (Rule 10)

Attempted SQL:

-- Inserting duplicate email with uppercase letters and trailing spaces
INSERT INTO guests (full_name, email, phone, city)
VALUES ('Aarav Sharma Duplicate', '  AARAV.SHARMA@EXAMPLE.COM  ', '+91 99999 88888', 'Bengaluru');


Constraint Name: `uq_guests_email_lower`
Constraint Definition:`UNIQUE INDEX uq_guests_email_lower ON guests (LOWER(TRIM(email)))`
Exact PostgreSQL Error Message:

ERROR: duplicate key value violates unique constraint "uq_guests_email_lower"
DETAIL: Key (lower(btrim(email::text)))=(aarav.sharma@example.com) already exists.

### Test Case 5: Duplicate Post-Checkout Review for Same Booking (Rule 9)

Attempted SQL:

-- Attempting to add a second review to a booking that already has one
INSERT INTO reviews (booking_id, rating, comments)
VALUES (1, 4, 'Trying to submit a duplicate review');

Constraint Name: `reviews_booking_id_key`
Constraint Definition: `booking_id INT UNIQUE REFERENCES bookings(booking_id)`
Exact PostgreSQL Error Message:

ERROR: duplicate key value violates unique constraint "reviews_booking_id_key"
DETAIL: Key (booking_id)=(1) already exists.

### Test Case 6: Review Rating Out of Bounds (Rule 9)

Attempted SQL:

INSERT INTO reviews (booking_id, rating, comments)
VALUES (2, 6, 'Rating above maximum 5 stars');


Constraint Name: `reviews_rating_check`
Constraint Definition: `CHECK (rating BETWEEN 1 AND 5)`
Exact PostgreSQL Error Message:

ERROR: new row for relation "reviews" violates check constraint "reviews_rating_check"
DETAIL: Failing row contains (2, 6, Rating above maximum 5 stars, 2026-08-25 05:24:00+00).

### Test Case 7: Invalid Stay Range (Checkout Before Check-in)

Attempted SQL:

INSERT INTO bookings (guest_id, room_id, stay, guests_count, nightly_rate, status)
VALUES (1, 2, daterange('2025-06-10', '2025-06-05', '[)'), 2, 4500.00, 'confirmed');

Constraint Name: `valid_stay_range`
Constraint Definition: `CHECK (NOT isempty(stay) AND lower(stay) < upper(stay))`
Exact PostgreSQL Error Message:

ERROR: new row for relation "bookings" violates check constraint "valid_stay_range"
DETAIL: Failing row contains (guest_id, room_id, stay)=(1, 2, empty).


### Test Case 8: Invalid Property Star Rating

Attempted SQL:

INSERT INTO properties (name, city, star_rating)
VALUES ('Invalid Grand Hotel', 'Chennai', 7);

Constraint Name: `properties_star_rating_check`
Constraint Definition: `CHECK (star_rating BETWEEN 1 AND 5)`

Exact PostgreSQL Error Message:

ERROR: new row for relation "properties" violates check constraint "properties_star_rating_check"
DETAIL: Failing row contains (4, Invalid Grand Hotel, Chennai, 7).


### Automated Validator Output

======================================================================
KAVERI STAYS SCHEMA VALIDATOR SUITE
======================================================================
[PASS] Checking required tables: guests, properties, room_types, rooms, rate_plans, bookings, payments, reviews
[PASS] Checking DATERANGE column types: bookings.stay, rate_plans.valid
[PASS] Checking booking_status enum values (confirmed, checked_in, checked_out, cancelled, no_show)
[PASS] Checking exclusion constraint on bookings (no double-booking)
[PASS] Checking partial exclusion constraint allowing same-day turnover and cancelled releases
[PASS] Checking exclusion constraint on rate_plans (no overlapping season rates)
[PASS] Checking 1NF reconciliation (33 unnested rooms migrated with 0 lost rows)
[PASS] Checking referential integrity actions (RESTRICT on rooms/guests, CASCADE on payments/reviews)
----------------------------------------------------------------------
ALL VALIDATION TESTS PASSED (8/8)
======================================================================

