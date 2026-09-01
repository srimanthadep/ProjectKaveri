import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def run_inspection():
    with engine.connect() as conn:
        print("=" * 60)
        print("1. PUBLIC TABLES IN SUPABASE POSTGRES:")
        print("=" * 60)
        tables = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """)).fetchall()
        table_list = [r[0] for r in tables]
        for t in table_list:
            cnt = conn.execute(text(f'SELECT COUNT(*) FROM "{t}"')).scalar()
            print(f"  - Table: {t:<20} | Rows: {cnt}")
            
        print("\n" + "=" * 60)
        print("2. TABLE COLUMNS & DATA TYPES IN SUPABASE:")
        print("=" * 60)
        for t in table_list:
            cols = conn.execute(text(f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '{t}'
                ORDER BY ordinal_position;
            """)).fetchall()
            print(f"\n--- {t} ---")
            for c in cols:
                print(f"    {c[0]:<20} {c[1]:<20} nullable={c[2]}")

        print("\n" + "=" * 60)
        print("3. SAMPLE DATA FROM EACH TABLE:")
        print("=" * 60)
        for t in ["properties", "room_types", "rooms", "guests", "rate_plans", "bookings", "payments", "reviews", "accounts"]:
            if t in table_list:
                print(f"\n[First 3 rows of {t}]:")
                rows = conn.execute(text(f'SELECT * FROM "{t}" LIMIT 3')).fetchall()
                for r in rows:
                    print("  ", dict(r._mapping))

if __name__ == "__main__":
    run_inspection()
