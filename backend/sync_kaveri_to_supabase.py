import os
import re
from datetime import datetime, date
from decimal import Decimal
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL found in .env")
    exit(1)

engine = create_engine(DATABASE_URL)

LEGACY_DATA = [
    ('1','Aarav Sharma','aarav.sharma@example.com','+91 98765 43210','Bengaluru','Kaveri Riverside','Coorg','4','101','Deluxe','2','2025-01-12','2025-01-15','4500','13500','card','confirmed','Late check-in requested'),
    ('2','aarav sharma','AARAV.SHARMA@EXAMPLE.COM','9876543210','bengaluru','Kaveri Riverside','Coorg','4','102,103','Deluxe','4','14/02/2025','17/02/2025','4,500.00','27000','Card','CONFIRMED','Anniversary - flowers'),
    ('3','Anita  Desai','anita.desai@example.com','+91 91234 56789','Mumbai','Kaveri Hilltop','Ooty','5','201','Suite','2','2025-02-03','2025-02-06','8200','24600','UPI','confirmed',''),
    ('4','Anita Desai','anita.desai@example.com','091234 56789','mumbai','Kaveri Hilltop','Ooty','5','201','Suite','2','March 9, 2025','March 12, 2025','8200','24,600','upi','conf','Repeat guest'),
    ('5','Ben Carter','ben.carter@example.org','+44 7700 900123','Bristol','Kaveri Riverside','Coorg','4','104','Standard','1','2025-03-20','2025-03-22','3200','6400','CARD','confirmed','N/A'),
    ('6','Chloe Dubois','chloe.dubois@example.com','+33 6 12 34 56 78','Lyon','Kaveri Backwater','Alleppey','4','301,302','Deluxe','3','05/04/2025','09/04/2025','5100','40800','card','confirmed','Two rooms, one bill'),
    ('7','Daniel Fischer','daniel.fischer@example.de','+49 151 12345678','Berlin','Kaveri Hilltop','Ooty','5','202','Deluxe','2','2025-04-18','2025-04-21','6800','20400','Bank Transfer','cancelled','Cancelled 3 days prior'),
    ('8','DANIEL FISCHER','daniel.fischer@example.de','+49 151 12345678','berlin','Kaveri Hilltop','Ooty','5','203','Deluxe','2','2025-05-02','2025-05-05','6800','20400','bank transfer','confirmed','Rebooked after cancellation'),
    ('9','Elena Rossi','elena.rossi@example.com','+39 320 1234567','Milan','Kaveri Backwater','Alleppey','4','303','Suite','2','19/05/2025','23/05/2025','9500','38000','Card','confirmed',None),
    ('10','Farhan Ali','farhan.ali@example.com','+91 99887 76655','Hyderabad','Kaveri Riverside','Coorg','4','101','Deluxe','2','2025-06-01','2025-06-04','4500','13500','upi','confirmed','-'),
    ('11','Grace Okafor','grace.okafor@example.com','+234 802 123 4567','Lagos','Kaveri Hilltop','Ooty','5','204','Standard','1','June 15, 2025','June 18, 2025','5400','16200','card','no show','Did not arrive'),
    ('12','Hiroshi Tanaka','hiroshi.tanaka@example.jp','+81 90-1234-5678','Osaka','Kaveri Backwater','Alleppey','4','301','Deluxe','2','2025-07-08','2025-07-13','5100','25500','CARD','confirmed','Requested airport pickup'),
    ('13','hiroshi tanaka','hiroshi.tanaka@example.jp','+81 90 1234 5678','Osaka','Kaveri Riverside','Coorg','4','105','Suite','2','2025-08-22','2025-08-25','7900','23700','card','confirmed','Repeat guest - upgrade given'),
    ('14','Isabel Moreno','isabel.moreno@example.com','+34 612 345 678','Madrid','Kaveri Hilltop','Ooty','5','201','Suite','3','01/09/2025','05/09/2025','8200','32800','UPI','confirmed','Extra bed'),
    ('15','Jonas Weber','jonas.weber@example.de','+49 170 9876543','Hamburg','Kaveri Backwater','Alleppey','4','304','Standard','1','2025-09-14','2025-09-16','3900','7800','Card','cancelled','Refund processed'),
    ('16','Kavya Nair','kavya.nair@example.com','+91 94567 89012','Kochi','Kaveri Backwater','Alleppey','4','302','Deluxe','2','2025-10-02','2025-10-06','5100','20400','upi','confirmed',''),
    ('17','Kavya  Nair','kavya.nair@example.com','9456789012','Kochi','Kaveri Riverside','Coorg','4','102','Deluxe','2','2025-11-11','2025-11-14','4500','13500','UPI','confirmed','Second stay this year'),
    ('18','Liam O''Brien','liam.obrien@example.ie','+353 87 123 4567','Dublin','Kaveri Hilltop','Ooty','5','205','Deluxe','2','2025-11-28','2025-12-02','6800','27200','card','confirmed','N/A'),
    ('19','Maya Krishnan','maya.k@example.com','+91 98111 22334','Chennai','Kaveri Riverside','Coorg','4','103,104','Standard','4','2025-12-20','2025-12-27','3200','44800','Card','confirmed','Christmas week - peak rate applied'),
    ('20','Noah Bergman','noah.bergman@example.se','+46 70 123 45 67','Stockholm','Kaveri Backwater','Alleppey','4','303','Suite','2','24/12/2025','29/12/2025','12000','60000','card','confirmed','Peak season rate'),
    ('21','Aarav Sharma','aarav.sharma@example.com','+91 98765 43210','Bengaluru','Kaveri Hilltop','Ooty','5','202','Deluxe','2','2026-01-05','2026-01-08','6800','20400','UPI','confirmed','Third stay'),
    ('22','Priya Menon','priya.menon@example.com','+91 90000 11111','Kochi','Kaveri Backwater','Alleppey','4','301','Deluxe','2','2026-01-19','2026-01-22','5100','15300','card','confirmed',None),
    ('23','Ben Carter','ben.carter@example.org','+44 7700 900123','Bristol','Kaveri Backwater','Alleppey','4','304','Standard','2','2026-02-14','2026-02-17','3900','11700','CARD','confirmed','Valentine package'),
    ('24','Sofia Ahmed','sofia.ahmed@example.com','+91 93333 44444','Delhi','Kaveri Hilltop','Ooty','5','203','Deluxe','2','2026-02-20','2026-02-23','6800','20400','upi','confirmed','-'),
    ('25','Elena Rossi','ELENA.ROSSI@example.com','+39 320 1234567','Milan','Kaveri Riverside','Coorg','4','105','Suite','2','2026-03-01','2026-03-05','7900','31600','Card','confirmed','Returning guest'),
    ('26','Tom Nguyen','tom.nguyen@example.com','+84 90 123 4567','Hanoi','Kaveri Riverside','Coorg','4','101','Deluxe','2','2026-03-10','2026-03-13','4500','13500','card','confirmed',''),
    ('27','Grace Okafor','grace.okafor@example.com','+234 802 123 4567','Lagos','Kaveri Backwater','Alleppey','4','302','Deluxe','2','2026-04-02','2026-04-05','5100','15300','UPI','confirmed','Second attempt after no-show'),
    ('28','Yusuf Demir','yusuf.demir@example.com','+90 532 123 4567','Istanbul','Kaveri Hilltop','Ooty','5','204','Standard','1','2026-04-15','2026-04-17','5400','10800','Card','confirmed','N/A'),
    ('29','Maya Krishnan','maya.k@example.com','+91 98111 22334','chennai','Kaveri Backwater','Alleppey','4','303','Suite','2','2026-05-01','2026-05-04','9500','28500','card','confirmed','Repeat'),
    ('30','Liam O''Brien','liam.obrien@example.ie','+353 87 123 4567','Dublin','Kaveri Riverside','Coorg','4','102','Deluxe','2','2026-05-20','2026-05-24','4500','18000','UPI','confirmed','')
]

def parse_date(d_str):
    d_str = d_str.strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}$', d_str):
        return datetime.strptime(d_str, '%Y-%m-%d').date()
    elif re.match(r'^\d{2}/\d{2}/\d{4}$', d_str):
        return datetime.strptime(d_str, '%d/%m/%Y').date()
    else:
        return datetime.strptime(d_str, '%B %d, %Y').date()

def parse_status(s_str):
    s = s_str.strip().lower()
    if s in ['confirmed', 'conf']:
        return 'confirmed'
    elif s == 'cancelled':
        return 'cancelled'
    elif s in ['no show', 'no_show']:
        return 'no_show'
    elif s == 'checked_in':
        return 'checked_in'
    elif s == 'checked_out':
        return 'checked_out'
    return 'confirmed'

def parse_method(m_str):
    m = m_str.strip().lower()
    if 'card' in m:
        return 'card'
    elif 'upi' in m:
        return 'upi'
    elif 'bank' in m:
        return 'bank_transfer'
    return 'cash'

def reset_sequences(conn):
    for tbl, col in [
        ('properties', 'property_id'),
        ('room_types', 'room_type_id'),
        ('rooms', 'room_id'),
        ('guests', 'guest_id'),
        ('rate_plans', 'rate_plan_id'),
        ('bookings', 'booking_id'),
        ('payments', 'payment_id'),
        ('reviews', 'review_id'),
        ('accounts', 'account_id'),
    ]:
        conn.execute(text(f"""
            SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), COALESCE((SELECT MAX({col}) FROM "{tbl}"), 1));
        """))

def sync():
    with engine.begin() as conn:
        reset_sequences(conn)
        
        print("1. Syncing Guests...")
        existing_guests = {
            r[1].lower().strip(): r[0] 
            for r in conn.execute(text("SELECT guest_id, email FROM guests")).fetchall()
        }
        
        seen_emails = set()
        for row in LEGACY_DATA:
            raw_name = row[1].strip()
            clean_name = re.sub(r'\s+', ' ', raw_name)
            email = row[2].strip().lower()
            raw_phone = row[3].strip() if row[3] else ""
            clean_phone = re.sub(r'[^0-9+]', '', raw_phone) if raw_phone else None
            clean_city = row[4].strip().title() if row[4] else None
            
            if email in seen_emails:
                continue
            seen_emails.add(email)
            
            if email not in existing_guests:
                res = conn.execute(text("""
                    INSERT INTO guests (full_name, email, phone, city)
                    VALUES (:name, :email, :phone, :city)
                    RETURNING guest_id;
                """), {"name": clean_name, "email": email, "phone": clean_phone, "city": clean_city})
                new_id = res.scalar()
                existing_guests[email] = new_id
                print(f"  + Added guest: {clean_name} ({email}) -> ID {new_id}")
            else:
                print(f"  = Guest already exists: {email} (ID {existing_guests[email]})")

        reset_sequences(conn)

        print("\n2. Syncing Seasonal Rate Plans...")
        seasons = [
            ("Regular Season 2025", date(2025, 1, 1), date(2025, 9, 30), Decimal("3500.00")),
            ("Monsoon Season 2025", date(2025, 10, 1), date(2025, 12, 19), Decimal("2800.00")),
            ("Peak Christmas 2025", date(2025, 12, 20), date(2026, 1, 5), Decimal("7000.00")),
            ("Regular Season 2026", date(2026, 1, 5), date(2026, 12, 31), Decimal("3800.00")),
        ]
        
        existing_rp_count = conn.execute(text("SELECT COUNT(*) FROM rate_plans")).scalar()
        print(f"  Current rate plans count: {existing_rp_count}")
        if existing_rp_count <= 9:
            conn.execute(text("DELETE FROM rate_plans"))
            for pid in [1, 2, 3]:
                for rt_id, mult in [(1, Decimal("1.0")), (2, Decimal("1.4")), (3, Decimal("2.1"))]:
                    for s_name, v_from, v_to, base_rate in seasons:
                        nightly_rate = (base_rate * mult).quantize(Decimal("0.01"))
                        conn.execute(text("""
                            INSERT INTO rate_plans (property_id, room_type_id, season_name, valid_from, valid_to, nightly_rate)
                            VALUES (:pid, :rt_id, :s_name, :v_from, :v_to, :rate)
                        """), {
                            "pid": pid,
                            "rt_id": rt_id,
                            "s_name": s_name,
                            "v_from": v_from,
                            "v_to": v_to,
                            "rate": nightly_rate
                        })
            print("  + Seeded 36 comprehensive seasonal rate plans across all properties and room types.")

        reset_sequences(conn)

        print("\n3. Syncing Rooms...")
        props = {r[1]: r[0] for r in conn.execute(text("SELECT property_id, name FROM properties")).fetchall()}
        
        for (prop_name, r_num, rt_id) in [
            ('Kaveri Riverside', '105', 3), # Suite
            ('Kaveri Hilltop', '205', 2),   # Deluxe
        ]:
            pid = props[prop_name]
            exists = conn.execute(text("SELECT room_id FROM rooms WHERE property_id = :pid AND room_number = :num"), {"pid": pid, "num": r_num}).scalar()
            if not exists:
                conn.execute(text("""
                    INSERT INTO rooms (property_id, room_number, room_type_id)
                    VALUES (:pid, :num, :rt_id)
                """), {"pid": pid, "num": r_num, "rt_id": rt_id})
                print(f"  + Added legacy room {r_num} for {prop_name}")

        reset_sequences(conn)

        room_map = {
            (r[1], r[2]): r[0]
            for r in conn.execute(text("SELECT room_id, property_id, room_number FROM rooms")).fetchall()
        }

        print("\n4. Syncing Legacy Bookings & Payments...")
        for row in LEGACY_DATA:
            row_id = row[0]
            email = row[2].strip().lower()
            guest_id = existing_guests[email]
            hotel_name = row[5].strip()
            prop_id = props[hotel_name]
            
            room_numbers_str = row[8].strip()
            room_numbers = [rn.strip() for rn in room_numbers_str.split(',') if rn.strip()]
            
            checkin = parse_date(row[11])
            checkout = parse_date(row[12])
            
            raw_rate = re.sub(r'[^0-9.]', '', row[13])
            nightly_rate = Decimal(raw_rate)
            
            raw_total_paid = re.sub(r'[^0-9.]', '', row[14])
            total_paid = Decimal(raw_total_paid)
            
            status = parse_status(row[16])
            notes = row[17].strip() if row[17] and row[17].strip() not in ['N/A', '-', ''] else None
            
            method = parse_method(row[15])
            
            total_rooms = len(room_numbers)
            guests_cnt = max(1, int(row[10].strip()) // total_rooms)
            payment_per_room = (total_paid / total_rooms).quantize(Decimal("0.01"))
            
            for idx, r_num in enumerate(room_numbers):
                r_id = room_map.get((prop_id, r_num))
                if not r_id:
                    print(f"  ! Warning: Room {r_num} not found for property {hotel_name}")
                    continue
                
                existing_booking = conn.execute(text("""
                    SELECT booking_id FROM bookings
                    WHERE guest_id = :gid AND room_id = :rid AND check_in = :cin AND check_out = :cout
                """), {"gid": guest_id, "rid": r_id, "cin": checkin, "cout": checkout}).scalar()
                
                if not existing_booking:
                    res = conn.execute(text("""
                        INSERT INTO bookings (guest_id, room_id, check_in, check_out, guests_count, nightly_rate, status, notes, created_at)
                        VALUES (:gid, :rid, :cin, :cout, :gcnt, :rate, :status, :notes, NOW())
                        RETURNING booking_id;
                    """), {
                        "gid": guest_id,
                        "rid": r_id,
                        "cin": checkin,
                        "cout": checkout,
                        "gcnt": guests_cnt,
                        "rate": nightly_rate,
                        "status": status,
                        "notes": notes
                    })
                    b_id = res.scalar()
                    print(f"  + Added Booking #{b_id}: Row {row_id} (Guest {guest_id}, Room {r_num} at {hotel_name}, {checkin} to {checkout}, status: {status})")
                    
                    if status != 'cancelled':
                        idem_key = f"legacy_pay_{row_id}_{idx+1}"
                        conn.execute(text("""
                            INSERT INTO payments (booking_id, amount, method, idempotency_key, paid_at)
                            VALUES (:bid, :amt, :method, :idem, NOW())
                        """), {
                            "bid": b_id,
                            "amt": payment_per_room,
                            "method": method,
                            "idem": idem_key
                        })
                else:
                    print(f"  = Booking #{existing_booking} already exists for Row {row_id} ({checkin} to {checkout})")

        reset_sequences(conn)
        print("\n5. Sync Completed Successfully!")

if __name__ == "__main__":
    sync()
