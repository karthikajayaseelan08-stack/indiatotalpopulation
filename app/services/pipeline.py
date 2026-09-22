"""
Data Ingestion and Refresh Pipeline Service.
Orchestrates the entire lifecycle: Fetch -> Multithread Process -> Clean -> Validate -> CSV -> DB Upsert.
"""
import csv
import logging
import os
import shutil
import tempfile
import time
from datetime import datetime
from typing import Any, Dict, Optional
from app.config import Config
from app.services.scraper import WikipediaCityScraper, ScraperError
from app.services.processor import MultithreadedProcessor
from app.services.data_validator import DataValidator
from app.repositories.city_repository import CityRepository

logger = logging.getLogger("pipeline")

class PipelineExecutionError(Exception):
    """Raised when pipeline encounters an unrecoverable failure."""
    pass

class IngestionPipeline:
    """Manages the full end-to-end data pipeline with safe failure handling."""

    _last_run_summary: Optional[Dict[str, Any]] = None

    @classmethod
    def get_last_run_summary(cls) -> Optional[Dict[str, Any]]:
        return cls._last_run_summary

    @classmethod
    def write_csv_atomically(cls, records: list) -> str:
        """Writes records to a temporary CSV file and atomically replaces data/cities.csv."""
        Config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        target_path = Config.CITIES_CSV
        
        # Write to temp file first
        with tempfile.NamedTemporaryFile("w", delete=False, newline="", encoding="utf-8") as tf:
            temp_name = tf.name
            fieldnames = ["rank", "city", "state", "population", "population_year", "source", "source_url", "scraped_at"]
            writer = csv.DictWriter(tf, fieldnames=fieldnames)
            writer.writeheader()
            for r in records:
                writer.writerow({
                    "rank": r.get("rank"),
                    "city": r.get("city"),
                    "state": r.get("state"),
                    "population": r.get("population"),
                    "population_year": r.get("population_year", 2011),
                    "source": r.get("source", "Wikipedia (Census of India 2011)"),
                    "source_url": r.get("source_url"),
                    "scraped_at": r.get("scraped_at")
                })
        
        # Atomic rename
        shutil.move(temp_name, target_path)
        logger.info(f"Atomically wrote {len(records)} records to {target_path}")
        return str(target_path)

    @classmethod
    def run(cls, max_workers: Optional[int] = None) -> Dict[str, Any]:
        """
        Executes the full ingestion pipeline.
        Fails safely without corrupting previous valid data on error.
        """
        start_time = time.perf_counter()
        execution_timestamp = datetime.utcnow().isoformat()
        logger.info(f"--- Starting Ingestion Pipeline Run at {execution_timestamp} ---")

        workers = max_workers or Config.MAX_WORKERS
        scraper = WikipediaCityScraper()

        try:
            # Step 1 & 2: Fetch and scrape Wikipedia table
            html_content = scraper.fetch_page_content()
            scraper.save_raw_html(html_content)
            raw_records, scrape_metrics = scraper.extract_raw_rows(html_content)

            if not raw_records or len(raw_records) < 100:
                raise PipelineExecutionError(
                    f"Scraping yielded suspiciously low row count ({len(raw_records)}). Aborting to protect existing dataset."
                )

            # Step 3 & 4 & 5: Multithreaded Processing (cleaning in parallel worker threads)
            processor = MultithreadedProcessor(max_workers=workers)
            cleaned_records, processing_telemetry = processor.process_records_in_parallel(raw_records)

            # Step 6: Validation and Deduplication
            valid_records, validation_report = DataValidator.validate_and_deduplicate(cleaned_records)

            if len(valid_records) < 100:
                raise PipelineExecutionError(
                    f"Validated records count ({len(valid_records)}) is below safety threshold. Aborting CSV/DB overwrite."
                )

            # Sort by population descending and assign verified ranks
            valid_records.sort(key=lambda x: x["population"], reverse=True)
            scraped_at_now = datetime.utcnow()
            for idx, item in enumerate(valid_records, start=1):
                item["rank"] = idx
                item["scraped_at"] = scraped_at_now.isoformat()

            # Step 7: Atomic CSV replacement
            csv_path = cls.write_csv_atomically(valid_records)

            # Step 8 & 9: Database Upsert
            db_summary = CityRepository.upsert_batch(valid_records)

            elapsed = round(time.perf_counter() - start_time, 3)

            summary = {
                "success": True,
                "timestamp": execution_timestamp,
                "elapsed_seconds": elapsed,
                "scrape_metrics": scrape_metrics,
                "processing_telemetry": processing_telemetry,
                "validation_report": validation_report.to_dict(),
                "db_summary": db_summary,
                "total_valid_cities": len(valid_records),
                "csv_path": csv_path
            }

            cls._last_run_summary = summary
            logger.info(f"--- Pipeline Execution Completed Successfully in {elapsed}s ---")
            return summary

        except Exception as e:
            elapsed = round(time.perf_counter() - start_time, 3)
            logger.critical(f"Pipeline execution aborted due to failure: {e}", exc_info=True)
            error_summary = {
                "success": False,
                "timestamp": execution_timestamp,
                "elapsed_seconds": elapsed,
                "error": str(e),
                "message": "Existing CSV and Database records preserved safely without corruption."
            }
            cls._last_run_summary = error_summary
            raise PipelineExecutionError(f"Pipeline failed: {e}") from e
