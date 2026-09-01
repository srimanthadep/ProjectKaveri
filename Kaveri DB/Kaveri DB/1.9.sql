WITH parsed AS (
    SELECT 
        row_id,
        guest_name,
        room_numbers,
        REGEXP_REPLACE(nightly_rate, '[^0-9.]', '', 'g')::NUMERIC AS rate,
        REGEXP_REPLACE(total_paid, '[^0-9.]', '', 'g')::NUMERIC AS paid,
        (CASE 
            WHEN checkout ~ '^\d{4}-\d{2}-\d{2}$' THEN checkout::DATE
            WHEN checkout ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(checkout, 'DD/MM/YYYY')
            ELSE TO_DATE(checkout, 'Month DD, YYYY')
        END - 
        CASE 
            WHEN checkin ~ '^\d{4}-\d{2}-\d{2}$' THEN checkin::DATE
            WHEN checkin ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(checkin, 'DD/MM/YYYY')
            ELSE TO_DATE(checkin, 'Month DD, YYYY')
        END) AS nights
    FROM legacy_reservations
)
SELECT 
    row_id, 
    guest_name, 
    room_numbers, 
    nights, 
    rate, 
    paid, 
    (nights * rate) AS expected_single_room_total
FROM parsed
WHERE paid != (nights * rate);