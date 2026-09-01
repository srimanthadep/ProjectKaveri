SELECT row_id, guest_name, nightly_rate 
FROM legacy_reservations 
WHERE nightly_rate !~ '^\d+(\.\d+)?$';