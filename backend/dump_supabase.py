import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv('backend/.env')
DATABASE_URL = os.environ.get('DATABASE_URL')
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    for t in ['properties', 'room_types', 'rooms', 'guests', 'rate_plans', 'bookings', 'payments', 'reviews', 'accounts', 'refresh_tokens', 'revoked_tokens']:
        try:
            rows = conn.execute(text(f'SELECT * FROM "{t}"')).fetchall()
            print(f'=== TABLE: {t} (Count: {len(rows)}) ===')
            for r in rows:
                print('  ', dict(r._mapping))
            print()
        except Exception as e:
            print(f'=== TABLE: {t} Error: {e} ===')
