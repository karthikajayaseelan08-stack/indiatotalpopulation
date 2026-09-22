"""
Tests for Analytics Service.
"""
from app.services.analytics import AnalyticsService

def test_analytics_summary(test_db):
    summary = AnalyticsService.get_summary()
    assert summary["total_cities"] == 6
    assert summary["total_population"] > 0
    assert summary["average_population"] > 0
    assert summary["highest_city"]["city"] == "Mumbai"
    assert summary["lowest_city"]["city"] == "Pune"

def test_analytics_state_aggregation(test_db):
    states = AnalyticsService.get_state_analytics()
    assert len(states) >= 4
    # Maharashtra has 2 cities (Mumbai, Pune)
    mh = next(s for s in states if s["state"] == "Maharashtra")
    assert mh["city_count"] == 2
    assert mh["highest_city"] == "Mumbai"
    assert mh["total_population"] == 12442373 + 3124458

def test_city_comparison(test_db):
    comp = AnalyticsService.compare_cities("Mumbai", "Delhi")
    assert comp is not None
    assert comp["city1"]["city"] == "Mumbai"
    assert comp["city2"]["city"] == "Delhi"
    assert comp["larger_city"] == "Mumbai"
    assert comp["population_difference"] == 12442373 - 11034555
    assert comp["percentage_difference"] > 0

def test_city_comparison_nonexistent(test_db):
    comp = AnalyticsService.compare_cities("Mumbai", "NonExistentCity")
    assert comp is None
