-- 1. Insert Base Properties and Room Types
INSERT INTO properties (name, city, star_rating) VALUES
('Kaveri Riverside', 'Coorg', 4),
('Kaveri Hilltop', 'Ooty', 5),
('Kaveri Backwater', 'Alleppey', 4);

INSERT INTO room_types (name, max_occupancy) VALUES
('Standard', 2),
('Deluxe', 3),
('Suite', 4);

-- 2. Deduplicate Guests
INSERT INTO guests (full_name, email, phone, city)
SELECT DISTINCT ON (LOWER(TRIM(guest_email)))
    TRIM(REGEXP_REPLACE(guest_name, '\s+', ' ', 'g')) AS full_name,
    LOWER(TRIM(guest_email)) AS email,
    REGEXP_REPLACE(guest_phone, '[^0-9+]', '', 'g') AS phone,
    INITCAP(TRIM(guest_city)) AS city
FROM legacy_reservations
ORDER BY LOWER(TRIM(guest_email)), row_id::INT ASC;

-- 3. Populate Initial Rooms
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

-- 4. Migrate Bookings
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

-- 5. Migrate Payments
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