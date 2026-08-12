"""Verify all 7 tables exist in Neon with the correct structure."""
import os
from dotenv import load_dotenv
load_dotenv()

import psycopg2
conn = psycopg2.connect(os.environ["DATABASE_URL"])
cur = conn.cursor()

cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print("Tables in Neon:")
for row in cur.fetchall():
    print(f"  {row[0]}")

cur.execute("""
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name='applications'
    ORDER BY ordinal_position
""")
print("\napplications columns:")
for row in cur.fetchall():
    print(f"  {row[0]:25} {row[1]:20} nullable={row[2]}")

cur.execute("""
    SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name, kcu.column_name
""")
print("\nForeign key constraints:")
for row in cur.fetchall():
    print(f"  {row[0]:45} column={row[1]} -> {row[2]}.{row[3]}")

cur.close()
conn.close()
print("\nDone.")
