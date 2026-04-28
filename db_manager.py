import sqlite3
import os
import sys
import json

DB_PATH = 'movie_booking.db'

def get_connection():
    return sqlite3.connect(DB_PATH)

def list_tables():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print("\n--- DATABASE TABLES ---")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"|-- {table:15} | {count:5} rows")
    conn.close()

def execute_query(query):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        if query.lower().startswith('select'):
            rows = cursor.fetchall()
            cols = [d[0] for d in cursor.description]
            print(f"\nResults ({len(rows)} rows):")
            print("-" * (len(cols) * 15))
            print(" | ".join(f"{c:12}" for c in cols))
            print("-" * (len(cols) * 15))
            for row in rows[:20]: # Show first 20
                print(" | ".join(f"{str(v)[:12]:12}" for v in row))
            if len(rows) > 20:
                print(f"... and {len(rows)-20} more rows.")
        else:
            conn.commit()
            print(f"\nSuccess! Rows affected: {conn.total_changes}")
    except Exception as e:
        print(f"\nError: {e}")
    finally:
        conn.close()

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found!")
        return

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        execute_query(query)
        return

    while True:
        print("\n=== BOOKMYSHOW DB MANAGER ===")
        print("1. List Tables & Counts")
        print("2. Run SQL Query")
        print("3. Exit")
        choice = input("Select an option: ")

        if choice == '1':
            list_tables()
        elif choice == '2':
            query = input("Enter SQL: ")
            if query: execute_query(query)
        elif choice == '3':
            break
        else:
            print("Invalid choice.")

if __name__ == "__main__":
    main()
