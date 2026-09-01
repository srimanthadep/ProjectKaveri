SELECT DISTINCT notes 
FROM legacy_reservations 
WHERE notes IS NULL OR notes IN ('', 'N/A', '-');