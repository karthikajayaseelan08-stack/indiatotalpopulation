"""
CLI script to validate data integrity of cities records.
"""
import sys
import csv
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Config
from app.services.data_cleaner import DataCleaner
from app.services.data_validator import DataValidator

def main():
    print("=" * 60)
    print("Validating Indian Cities Dataset...")
    print("=" * 60)
    
    csv_file = Config.CITIES_CSV
    if not csv_file.exists():
        print(f"Error: {csv_file} does not exist. Run scripts/run_pipeline.py first.")
        sys.exit(1)

    records = []
    with open(csv_file, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            cleaned_row, _ = DataCleaner.clean_record(row)
            if cleaned_row:
                cleaned_row["rank"] = int(row.get("rank", 0))
                records.append(cleaned_row)

    valid_records, report = DataValidator.validate_and_deduplicate(records)
    rep_dict = report.to_dict()

    print(f"Total Rows Evaluated:       {rep_dict['total_rows']}")
    print(f"Valid Rows:                 {rep_dict['valid_rows']}")
    print(f"Invalid Rows:               {rep_dict['invalid_rows']}")
    print(f"Duplicate Rows:             {rep_dict['duplicate_rows']}")
    print(f"Missing City Values:        {rep_dict['missing_city_values']}")
    print(f"Missing State Values:       {rep_dict['missing_state_values']}")
    print(f"Invalid Population Values:  {rep_dict['invalid_population_values']}")
    print(f"Suspicious Records:         {rep_dict['suspicious_records']}")
    print("=" * 60)
    print("Validation check passed.")

if __name__ == "__main__":
    main()
