"""
Tests for Database Schema and Repository Operations.
"""
from app.repositories.city_repository import City, CityRepository

def test_repository_upsert_batch(test_db):
    new_records = [
        {"city": "Jaipur", "state": "Rajasthan", "population": 3046163, "rank": 10},
        {"city": "Lucknow", "state": "Uttar Pradesh", "population": 2817105, "rank": 11}
    ]
    summary = CityRepository.upsert_batch(new_records)
    assert summary["inserted"] == 2

    # Verify retrieval
    jaipur = CityRepository.find_by_name("Jaipur")
    assert jaipur is not None
    assert jaipur["population"] == 3046163

def test_repository_duplicate_upsert_updates(test_db):
    # Upsert updated population for Mumbai
    update_record = [
        {"city": "Mumbai", "state": "Maharashtra", "population": 12500000, "rank": 1}
    ]
    summary = CityRepository.upsert_batch(update_record)
    assert summary["updated"] == 1
    assert summary["inserted"] == 0

    mumbai = CityRepository.find_by_name("Mumbai")
    assert mumbai["population"] == 12500000
