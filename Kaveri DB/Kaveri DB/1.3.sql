SELECT 
    row_id,
    checkin,
    checkout,
    CASE 
        WHEN checkin ~ '^\d{4}-\d{2}-\d{2}$' THEN checkin::DATE
        WHEN checkin ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(checkin, 'DD/MM/YYYY')
        ELSE TO_DATE(checkin, 'Month DD, YYYY')
    END AS parsed_checkin,
    CASE 
        WHEN checkout ~ '^\d{4}-\d{2}-\d{2}$' THEN checkout::DATE
        WHEN checkout ~ '^\d{2}/\d{2}/\d{4}$' THEN TO_DATE(checkout, 'DD/MM/YYYY')
        ELSE TO_DATE(checkout, 'Month DD, YYYY')
    END AS parsed_checkout
FROM legacy_reservations;