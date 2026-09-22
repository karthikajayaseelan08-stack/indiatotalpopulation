"""
CLI script to import cities from CSV into MySQL / SQLite database.
"""
import sys
import csv
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Config
from app.repositories.city_repository import CityRepository

def main():
    print("=" * 60)
    print("Importing Indian Cities CSV into Database...")
    print("=" * 60)
    
    csv_file = Config.CITIES_CSV
    if not csv_file.exists():
        print(f"Error: {csv_file} does not exist. Run scripts/run_pipeline.py first.")
        sys.exit(1)

    records = []
    with open(csv_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "rank": int(row["rank"]) if row.get("rank") else None,
                "city": row["city"],
                "state": row["state"],
                "population": int(row["population"]),
                "population_year": int(row["population_year"]) if row.get("population_year") else 2011,
                "source": row.get("source", "Wikipedia (Census of India 2011)"),
                "source_url": row.get("source_url"),
                "scraped_at": row.get("scraped_at")
            })

    print(f"Loaded {len(records)} records from {csv_file}.")
    summary = CityRepository.upsert_batch(records)
    print(f"Database import result: {summary}")
    print("Import completed successfully.")

if __name__ == "__main__":
    main()
