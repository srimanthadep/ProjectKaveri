-- Making changes accordingly as required
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS rate_plans CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS room_types CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS payment_method_type CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE booking_status AS ENUM (
    'confirmed', 
    'checked_in', 
    'checked_out', 
    'cancelled', 
    'no_show'
);

CREATE TYPE payment_method_type AS ENUM (
    'card', 
    'upi', 
    'bank_transfer', 
    'cash'
);

CREATE TABLE properties (
    property_id     SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    city            VARCHAR(100) NOT NULL,
    star_rating     SMALLINT NOT NULL CHECK (star_rating BETWEEN 1 AND 5)
);

CREATE TABLE room_types (
    room_type_id    SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    max_occupancy   SMALLINT NOT NULL CHECK (max_occupancy > 0)
);

CREATE TABLE rooms (
    room_id         SERIAL PRIMARY KEY,
    property_id     INT NOT NULL REFERENCES properties(property_id) ON DELETE RESTRICT,
    room_number     VARCHAR(10) NOT NULL,
    room_type_id    INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE RESTRICT,
    CONSTRAINT uq_property_room_number UNIQUE (property_id, room_number)
);

CREATE TABLE guests (
    guest_id        SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(30),
    city            VARCHAR(100)
);

CREATE UNIQUE INDEX uq_guests_email_lower ON guests (LOWER(TRIM(email)));

CREATE TABLE rate_plans (
    rate_plan_id    SERIAL PRIMARY KEY,
    property_id     INT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    room_type_id    INT NOT NULL REFERENCES room_types(room_type_id) ON DELETE CASCADE,
    season_name     VARCHAR(50),
    valid           DATERANGE NOT NULL,
    nightly_rate    NUMERIC(10, 2) NOT NULL CHECK (nightly_rate > 0),
    CONSTRAINT no_overlapping_rates EXCLUDE USING gist (
        property_id WITH =,
        room_type_id WITH =,
        valid WITH &&
    )
);

CREATE TABLE bookings (
    booking_id      SERIAL PRIMARY KEY,
    guest_id        INT NOT NULL REFERENCES guests(guest_id) ON DELETE RESTRICT,
    room_id         INT NOT NULL REFERENCES rooms(room_id) ON DELETE RESTRICT,
    stay            DATERANGE NOT NULL,
    guests_count    SMALLINT NOT NULL CHECK (guests_count > 0),
    nightly_rate    NUMERIC(10, 2) NOT NULL CHECK (nightly_rate > 0),
    status          booking_status NOT NULL DEFAULT 'confirmed',
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_stay_range CHECK (NOT isempty(stay) AND lower(stay) < upper(stay)),
    CONSTRAINT no_overlapping_bookings EXCLUDE USING gist (
        room_id WITH =,
        stay WITH &&
    ) WHERE (status NOT IN ('cancelled', 'no_show'))
);

CREATE TABLE payments (
    payment_id      SERIAL PRIMARY KEY,
    booking_id      INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    method          payment_method_type NOT NULL,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
    review_id       SERIAL PRIMARY KEY,
    booking_id      INT NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comments        TEXT,
    reviewed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.1 Insert properties and room types
INSERT INTO properties (name, city, star_rating) VALUES
('Kaveri Riverside', 'Coorg', 4),
('Kaveri Hilltop', 'Ooty', 5),
('Kaveri Backwater', 'Alleppey', 4);

INSERT INTO room_types (name, max_occupancy) VALUES
('Standard', 2),
('Deluxe', 3),
('Suite', 4);

-- Verification
SELECT * FROM properties;
SELECT * FROM room_types;

-- 3.2 & 3.3 Deduplicate and normalize guests
INSERT INTO guests (full_name, email, phone, city)
SELECT DISTINCT ON (LOWER(TRIM(guest_email)))
    TRIM(REGEXP_REPLACE(guest_name, '\s+', ' ', 'g')) AS full_name,
    LOWER(TRIM(guest_email)) AS email,
    REGEXP_REPLACE(guest_phone, '[^0-9+]', '', 'g') AS phone,
    INITCAP(TRIM(guest_city)) AS city
FROM legacy_reservations
ORDER BY LOWER(TRIM(guest_email)), row_id::INT ASC;

-- Verification (should return 19 distinct guests)
SELECT COUNT(*) AS total_unique_guests FROM guests;
SELECT * FROM guests ORDER BY guest_id;

-- 3.5 Extract distinct rooms from legacy reservations (resolving Room 103 -> Standard)
INSERT INTO rooms (property_id, room_number, room_type_id)
WITH unnested_rooms AS (
    SELECT DISTINCT
        p.property_id,
        TRIM(UNNEST(STRING_TO_ARRAY(lr.room_numbers, ','))) AS room_number,
        rt.room_type_id
    FROM legacy_reservations lr
    JOIN properties p ON p.name = lr.hotel_name
    JOIN room_types rt ON rt.name = CASE 
        WHEN lr.hotel_name = 'Kaveri Riverside' AND TRIM(lr.room_numbers) LIKE '%103%' THEN 'Standard'
        ELSE lr.room_type
    END
)
SELECT DISTINCT property_id, room_number, room_type_id 
FROM unnested_rooms
ON CONFLICT (property_id, room_number) DO NOTHING;

-- Verification
SELECT r.room_id, p.name AS property_name, r.room_number, rt.name AS room_type
FROM rooms r
JOIN properties p ON r.property_id = p.property_id
JOIN room_types rt ON r.room_type_id = rt.room_type_id
ORDER BY p.name, r.room_number;

-- 3.6 & 3.7 Migrate bookings with parsed daterange and normalized status
INSERT INTO bookings (guest_id, room_id, stay, guests_count, nightly_rate, status, notes)
SELECT 
    g.guest_id,
    r.room_id,
    daterange(
        CASE 
            WHEN lr.checkin ~ '^\d{4}-\d{2}-\d{2}$' THEN lr.checkin::DATE
            WHEN lr.checkin ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(lr.checkin, 'DD/MM/YYYY')
            ELSE TO_DATE(lr.checkin, 'Month DD, YYYY')
        END,
        CASE 
            WHEN lr.checkout ~ '^\d{4}-\d{2}-\d{2}$' THEN lr.checkout::DATE
            WHEN lr.checkout ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(lr.checkout, 'DD/MM/YYYY')
            ELSE TO_DATE(lr.checkout, 'Month DD, YYYY')
        END,
        '[)'
    ) AS stay,
    (lr.guests_count::INT / CARDINALITY(STRING_TO_ARRAY(lr.room_numbers, ',')))::SMALLINT AS guests_count,
    REGEXP_REPLACE(lr.nightly_rate, '[^0-9.]', '', 'g')::NUMERIC AS nightly_rate,
    CASE 
        WHEN LOWER(TRIM(lr.status)) IN ('confirmed', 'conf') THEN 'confirmed'::booking_status
        WHEN LOWER(TRIM(lr.status)) = 'cancelled' THEN 'cancelled'::booking_status
        WHEN LOWER(TRIM(lr.status)) = 'no show' THEN 'no_show'::booking_status
        ELSE 'confirmed'::booking_status
    END AS status,
    NULLIF(TRIM(lr.notes), '') AS notes
FROM legacy_reservations lr
JOIN guests g ON LOWER(TRIM(lr.guest_email)) = LOWER(TRIM(g.email))
JOIN properties p ON p.name = lr.hotel_name
CROSS JOIN LATERAL UNNEST(STRING_TO_ARRAY(lr.room_numbers, ',')) AS r_num(val)
JOIN rooms r ON r.property_id = p.property_id AND r.room_number = TRIM(r_num.val);

-- Migrate payments splitting multi-room bills proportionally
INSERT INTO payments (booking_id, amount, method)
WITH booking_parts AS (
    SELECT 
        b.booking_id,
        lr.row_id,
        REGEXP_REPLACE(lr.total_paid, '[^0-9.]', '', 'g')::NUMERIC AS total_paid,
        LOWER(TRIM(lr.payment_method)) AS raw_method,
        COUNT(*) OVER (PARTITION BY lr.row_id) AS room_count
    FROM legacy_reservations lr
    JOIN guests g ON LOWER(TRIM(lr.guest_email)) = LOWER(TRIM(g.email))
    JOIN properties p ON p.name = lr.hotel_name
    CROSS JOIN LATERAL UNNEST(STRING_TO_ARRAY(lr.room_numbers, ',')) AS r_num(val)
    JOIN rooms r ON r.property_id = p.property_id AND r.room_number = TRIM(r_num.val)
    JOIN bookings b ON b.guest_id = g.guest_id AND b.room_id = r.room_id
)
SELECT 
    booking_id,
    (total_paid / room_count)::NUMERIC(10, 2) AS amount,
    CASE 
        WHEN raw_method LIKE '%card%' THEN 'card'::payment_method_type
        WHEN raw_method LIKE '%upi%' THEN 'upi'::payment_method_type
        WHEN raw_method LIKE '%bank%' THEN 'bank_transfer'::payment_method_type
        ELSE 'cash'::payment_method_type
    END AS method
FROM booking_parts;

-- 3.8 Proof of zero booking loss
SELECT 
    (SELECT SUM(CARDINALITY(STRING_TO_ARRAY(room_numbers, ','))) FROM legacy_reservations) AS legacy_rooms_count,
    (SELECT COUNT(*) FROM bookings) AS migrated_bookings_count,
    (SELECT SUM(CARDINALITY(STRING_TO_ARRAY(room_numbers, ','))) FROM legacy_reservations) - (SELECT COUNT(*) FROM bookings) AS discrepancy;

-- 3.9 Add 12 physical rooms per property
INSERT INTO rooms (property_id, room_number, room_type_id)
SELECT p.property_id, num.r_no, rt.room_type_id
FROM properties p
CROSS JOIN LATERAL (
    VALUES 
        ('101', 'Standard'), ('102', 'Standard'), ('103', 'Standard'), ('104', 'Standard'),
        ('201', 'Deluxe'),   ('202', 'Deluxe'),   ('203', 'Deluxe'),   ('204', 'Deluxe'),
        ('301', 'Suite'),    ('302', 'Suite'),    ('303', 'Suite'),    ('304', 'Suite')
) AS num(r_no, t_name)
JOIN room_types rt ON rt.name = num.t_name
ON CONFLICT (property_id, room_number) DO NOTHING;

-- 3.10 Insert 3 non-overlapping rate plan seasons per property and room type
INSERT INTO rate_plans (property_id, room_type_id, season_name, valid, nightly_rate)
SELECT 
    p.property_id,
    rt.room_type_id,
    s.s_name,
    s.valid_range,
    CASE 
        WHEN rt.name = 'Standard' THEN s.base_rate
        WHEN rt.name = 'Deluxe'   THEN (s.base_rate * 1.4)::NUMERIC(10,2)
        WHEN rt.name = 'Suite'    THEN (s.base_rate * 2.1)::NUMERIC(10,2)
    END AS nightly_rate
FROM properties p
CROSS JOIN room_types rt
CROSS JOIN (
    VALUES
        ('Regular Season 2025', daterange('2025-01-01', '2025-09-30', '[)'), 3500.00),
        ('Monsoon Season 2025', daterange('2025-10-01', '2025-12-19', '[)'), 2800.00),
        ('Peak Christmas 2025', daterange('2025-12-20', '2026-01-05', '[)'), 7000.00),
        ('Regular Season 2026', daterange('2026-01-05', '2026-12-31', '[)'), 3800.00)
) AS s(s_name, valid_range, base_rate);

-- 3.11 & 3.12 Seed 130+ realistic bookings and post-checkout reviews
DO $$
DECLARE
    i INT;
    v_guest_id INT;
    v_room_id INT;
    v_checkin DATE;
    v_checkout DATE;
    v_status booking_status;
    v_guests_cnt SMALLINT;
    v_rate NUMERIC(10,2);
    v_booking_id INT;
BEGIN
    FOR i IN 1..135 LOOP
        SELECT guest_id INTO v_guest_id FROM guests ORDER BY RANDOM() LIMIT 1;
        SELECT room_id INTO v_room_id FROM rooms ORDER BY RANDOM() LIMIT 1;
        
        v_checkin := DATE '2025-01-10' + ((i * 5) % 680);
        v_checkout := v_checkin + (1 + (i % 4));
        v_guests_cnt := (1 + (i % 3))::SMALLINT;
        
        IF i % 12 = 0 THEN
            v_status := 'cancelled';
        ELSIF i % 17 = 0 THEN
            v_status := 'no_show';
        ELSIF v_checkout < DATE '2026-08-24' THEN
            v_status := 'checked_out';
        ELSE
            v_status := 'confirmed';
        END IF;

        v_rate := 3500.00 + ((i % 5) * 800);

        BEGIN
            INSERT INTO bookings (guest_id, room_id, stay, guests_count, nightly_rate, status)
            VALUES (v_guest_id, v_room_id, daterange(v_checkin, v_checkout, '[)'), v_guests_cnt, v_rate, v_status)
            RETURNING booking_id INTO v_booking_id;

            IF v_status != 'cancelled' THEN
                INSERT INTO payments (booking_id, amount, method)
                VALUES (
                    v_booking_id, 
                    (v_checkout - v_checkin) * v_rate, 
                    (ARRAY['card'::payment_method_type, 'upi'::payment_method_type, 'bank_transfer'::payment_method_type, 'cash'::payment_method_type])[1 + (i % 4)]
                );
            END IF;

            IF v_status = 'checked_out' AND (i % 2 = 0) THEN
                INSERT INTO reviews (booking_id, rating, comments)
                VALUES (
                    v_booking_id, 
                    (3 + (i % 3))::SMALLINT, 
                    'Enjoyed our stay at Kaveri Stays. Excellent hospitality.'
                );
            END IF;

        EXCEPTION WHEN exclusion_violation THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Verification of seeded data
SELECT 'Bookings Count' AS metric, COUNT(*) AS total FROM bookings
UNION ALL
SELECT 'Payments Count', COUNT(*) FROM payments
UNION ALL
SELECT 'Reviews Count', COUNT(*) FROM reviews;

