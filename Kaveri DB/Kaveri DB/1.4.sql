SELECT row_id, guest_name, room_numbers 
FROM legacy_reservations 
WHERE room_numbers LIKE '%,%';