SELECT 
    LOWER(TRIM(guest_email)) AS normalized_email,
    ARRAY_AGG(DISTINCT guest_name) AS name_variations,
    ARRAY_AGG(DISTINCT guest_phone) AS phone_variations,
    ARRAY_AGG(DISTINCT guest_city) AS city_variations
FROM legacy_reservations
GROUP BY LOWER(TRIM(guest_email))
HAVING COUNT(*) > 1;