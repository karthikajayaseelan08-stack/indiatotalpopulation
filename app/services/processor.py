"""
Multithreaded Record Processing Service.
Utilizes concurrent.futures.ThreadPoolExecutor to perform parallel record cleaning and normalization safely.
"""
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple
from app.config import Config
from app.services.data_cleaner import DataCleaner

logger = logging.getLogger("processor")

class MultithreadedProcessor:
    """
    Executes concurrent record normalization and cleaning across multiple worker threads.
    Demonstrates safe, state-isolated parallel execution.
    """

    def __init__(self, max_workers: Optional[int] = None):
        self.max_workers = max_workers or Config.MAX_WORKERS

    @staticmethod
    def _process_single_record(item: Tuple[int, Dict[str, Any]]) -> Dict[str, Any]:
        """
        Thread worker function.
        Cleans an individual raw row in isolation without shared-state mutation.
        """
        idx, raw_record = item
        current_thread = threading.current_thread().name
        start_t = time.perf_counter()
        
        cleaned, rejection = DataCleaner.clean_record(raw_record)
        duration_ms = (time.perf_counter() - start_t) * 1000
        
        return {
            "index": idx,
            "cleaned": cleaned,
            "rejection": rejection,
            "thread_name": current_thread,
            "duration_ms": round(duration_ms, 3)
        }

    def process_records_in_parallel(self, raw_records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Submits records to a ThreadPoolExecutor, collecting normalized results.
        Returns cleaned records list and performance telemetry.
        """
        if not raw_records:
            return [], {"total_processed": 0, "threads_used": 0, "elapsed_seconds": 0.0}

        start_time = time.perf_counter()
        threads_involved = set()
        cleaned_results: List[Dict[str, Any]] = []
        rejections: List[Dict[str, Any]] = []

        logger.info(f"Initiating parallel processing of {len(raw_records)} records using {self.max_workers} worker threads.")
        
        with ThreadPoolExecutor(max_workers=self.max_workers, thread_name_prefix="RecordWorker") as executor:
            future_to_idx = {
                executor.submit(self._process_single_record, (i, record)): i 
                for i, record in enumerate(raw_records)
            }
            
            for future in as_completed(future_to_idx):
                try:
                    res = future.result()
                    threads_involved.add(res["thread_name"])
                    if res["cleaned"]:
                        cleaned_results.append(res["cleaned"])
                    else:
                        rejections.append({"index": res["index"], "reason": res["rejection"]})
                except Exception as e:
                    logger.error(f"Worker thread error on record {future_to_idx[future]}: {e}")
                    rejections.append({"index": future_to_idx[future], "reason": str(e)})

        elapsed = time.perf_counter() - start_time
        
        telemetry = {
            "total_submitted": len(raw_records),
            "successfully_cleaned": len(cleaned_results),
            "rejected_during_cleaning": len(rejections),
            "workers_configured": self.max_workers,
            "distinct_threads_active": len(threads_involved),
            "active_thread_names": list(threads_involved),
            "elapsed_seconds": round(elapsed, 4),
            "records_per_second": round(len(raw_records) / elapsed, 2) if elapsed > 0 else 0
        }
        
        logger.info(f"Multithreaded processing complete in {elapsed:.4f}s: {telemetry}")
        return cleaned_results, telemetry
