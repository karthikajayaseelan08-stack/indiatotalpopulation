"""
Tests for Data Cleaner and Validator.
"""
from app.services.data_cleaner import DataCleaner
from app.services.data_validator import DataValidator

def test_clean_text_whitespace_and_symbols():
    raw = "  Mumbai  ‡ [1] (Capital)  "
    cleaned = DataCleaner.clean_text(raw)
    assert cleaned == "Mumbai Capital"

def test_clean_population_commas_and_formats():
    assert DataCleaner.clean_population("12,442,373") == 12442373
    assert DataCleaner.clean_population("  8,443,675 +48.6% ") == 8443675
    assert DataCleaner.clean_population("invalid") is None
    assert DataCleaner.clean_population("-500") is None

def test_clean_record_valid():
    raw = {
        "city": "Bengaluru ‡",
        "state": "Karnataka",
        "population_2011": "8,443,675"
    }
    cleaned, err = DataCleaner.clean_record(raw)
    assert err is None
    assert cleaned["city"] == "Bengaluru"
    assert cleaned["state"] == "Karnataka"
    assert cleaned["population"] == 8443675

def test_clean_record_missing_fields():
    raw = {"city": "", "state": "Maharashtra", "population_2011": "12,000,000"}
    cleaned, err = DataCleaner.clean_record(raw)
    assert cleaned is None
    assert "Empty or invalid city" in err

def test_validator_deduplication():
    records = [
        {"city": "Pune", "state": "Maharashtra", "population": 3124458},
        {"city": "Pune", "state": "Maharashtra", "population": 3124458}, # duplicate
        {"city": "Nagpur", "state": "Maharashtra", "population": 2405665}
    ]
    valid, report = DataValidator.validate_and_deduplicate(records)
    assert len(valid) == 2
    assert report.duplicate_rows == 1
    assert report.valid_rows == 2
