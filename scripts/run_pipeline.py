"""
CLI script to execute the full data ingestion and multithreaded processing pipeline.
"""
import sys
import json
import logging
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.pipeline import IngestionPipeline

def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    print("=" * 70)
    print(" INDIAN CITIES POPULATION ANALYTICS: INGESTION PIPELINE")
    print("=" * 70)
    print("Executing full pipeline: Fetch -> Multithread Clean -> Validate -> CSV -> DB")
    
    try:
        summary = IngestionPipeline.run()
        print("\n" + "=" * 70)
        print("PIPELINE EXECUTION SUMMARY")
        print("=" * 70)
        print(f"Status:                 {'SUCCESS' if summary['success'] else 'FAILED'}")
        print(f"Elapsed Time:           {summary['elapsed_seconds']} seconds")
        print(f"Total Valid Cities:     {summary['total_valid_cities']}")
        print(f"Multithreaded Workers:  {summary['processing_telemetry']['workers_configured']}")
        print(f"Active Threads:         {summary['processing_telemetry']['distinct_threads_active']}")
        print(f"Database Upsert:        {summary['db_summary']}")
        print(f"Output CSV:             {summary['csv_path']}")
        print("=" * 70)
    except Exception as e:
        print(f"\nPipeline failed with error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
