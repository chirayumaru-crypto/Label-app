import sqlite3
import os

db_path = "labelapp.db"

def inspect():
    if not os.path.exists(db_path):
        print("Database file labelapp.db not found!")
        return

    print(f"Database Source: {os.path.abspath(db_path)}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = cursor.fetchall()
    
    print("\n--- Database Storage Summary ---")
    for t in tables:
        table_name = t[0]
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"Table '{table_name}': {count} records")
        
    # Show Datasets
    print("\n--- Uploaded Datasets (in 'datasets' table) ---")
    try:
        cursor.execute("SELECT id, name, uploaded_at FROM datasets")
        datasets = cursor.fetchall()
        if not datasets:
            print("(No datasets found)")
        for d in datasets:
            print(f"ID: {d[0]} | Name: {d[1]} | Uploaded: {d[2]}")
    except Exception as e:
        print(f"Error reading datasets: {e}")

    conn.close()

if __name__ == "__main__":
    inspect()
