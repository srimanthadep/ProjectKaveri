-- Inventory Expansion
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

-- Rate Plans
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

-- Synthetic Bookings and Reviews
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