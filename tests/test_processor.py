"""
Tests for Multithreaded Processor.
"""
from app.services.processor import MultithreadedProcessor

def test_multithreaded_processing_produces_normalized_output():
    raw_records = [
        {"city": "Mumbai ‡", "state": "Maharashtra", "population_2011": "12,442,373"},
        {"city": "Delhi ‡", "state": "Delhi", "population_2011": "11,034,555"},
        {"city": "Bengaluru", "state": "Karnataka", "population_2011": "8,443,675"},
        {"city": "Corrupt", "state": "State", "population_2011": "not-a-number"}
    ]
    processor = MultithreadedProcessor(max_workers=2)
    cleaned, telemetry = processor.process_records_in_parallel(raw_records)
    
    assert len(cleaned) == 3
    assert telemetry["total_submitted"] == 4
    assert telemetry["workers_configured"] == 2
    assert telemetry["distinct_threads_active"] >= 1
    assert any(c["city"] == "Mumbai" for c in cleaned)

def test_worker_count_behavior():
    processor = MultithreadedProcessor(max_workers=4)
    assert processor.max_workers == 4
    # Empty input
    cleaned, telemetry = processor.process_records_in_parallel([])
    assert cleaned == []
    assert telemetry["total_processed"] == 0
