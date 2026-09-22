"""
Tests for Wikipedia City Scraper.
"""
import pytest
from unittest.mock import patch, MagicMock
import requests
from app.services.scraper import WikipediaCityScraper, ScraperError

def test_scraper_find_city_table(mock_html):
    scraper = WikipediaCityScraper()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(mock_html, "html.parser")
    table = scraper.find_city_table(soup)
    assert table is not None
    assert "wikitable" in table.get("class", [])

def test_scraper_extract_raw_rows(mock_html):
    scraper = WikipediaCityScraper()
    rows, metrics = scraper.extract_raw_rows(mock_html)
    assert metrics["discovered"] >= 5
    assert metrics["accepted"] == 5  # India total row should be rejected
    assert rows[0]["city"] == "Mumbai ‡"
    assert rows[0]["state"] == "Maharashtra"
    assert rows[0]["population_2011"] == "12,442,373"

def test_scraper_http_failure():
    scraper = WikipediaCityScraper(source_url="http://invalid.domain.xyz")
    with patch("requests.get") as mock_get:
        mock_get.side_effect = requests.exceptions.ConnectionError("Failed connection")
        with pytest.raises(ScraperError):
            scraper.fetch_page_content()

def test_scraper_missing_table():
    scraper = WikipediaCityScraper()
    from bs4 import BeautifulSoup
    soup = BeautifulSoup("<html><body><p>No table here</p></body></html>", "html.parser")
    with pytest.raises(ScraperError):
        scraper.find_city_table(soup)
