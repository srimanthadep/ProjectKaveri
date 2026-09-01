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