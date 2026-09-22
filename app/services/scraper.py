"""
Wikipedia City Population Scraper Service.
Safely retrieves and parses the city population table from Wikipedia.
"""
import logging
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from app.config import Config

logger = logging.getLogger("scraper")

class ScraperError(Exception):
    """Custom exception raised for scraping errors."""
    pass

class WikipediaCityScraper:
    """Scrapes Indian city population table from Wikipedia."""
    
    def __init__(self, source_url: Optional[str] = None, timeout: int = 15):
        self.source_url = source_url or Config.WIKIPEDIA_SOURCE_URL
        self.timeout = timeout
        self.headers = {"User-Agent": Config.USER_AGENT}
        
    def fetch_page_content(self) -> str:
        """Fetches the raw HTML content with timeout and error checking."""
        logger.info(f"Fetching Wikipedia city population page from {self.source_url}")
        try:
            response = requests.get(self.source_url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            logger.info(f"Successfully fetched page (status: {response.status_code}, length: {len(response.text)})")
            return response.text
        except requests.exceptions.Timeout as e:
            logger.error(f"HTTP request timed out after {self.timeout}s: {e}")
            raise ScraperError(f"Request timeout while fetching {self.source_url}") from e
        except requests.exceptions.RequestException as e:
            logger.error(f"HTTP request failed: {e}")
            raise ScraperError(f"Failed to fetch data from {self.source_url}: {e}") from e

    def save_raw_html(self, html_content: str, destination: Optional[Path] = None) -> Path:
        """Persists raw HTML for audit and debugging purposes."""
        dest = destination or (Config.RAW_DATA_DIR / "wikipedia_cities_raw.html")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(html_content, encoding="utf-8")
        logger.info(f"Saved raw HTML audit copy to {dest}")
        return dest

    def find_city_table(self, soup: BeautifulSoup) -> BeautifulSoup:
        """
        Robustly finds the main city population table using semantic column checks
        rather than relying solely on a fragile table index.
        """
        tables = soup.find_all("table", class_="wikitable")
        if not tables:
            raise ScraperError("No 'wikitable' tables found in HTML content")

        for table in tables:
            headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
            header_str = " ".join(headers)
            
            # Semantic check: Look for key indicators of Indian city population table
            has_city_or_name = any(k in header_str for k in ["city", "name", "town"])
            has_state = "state" in header_str or "union territory" in header_str
            has_census_or_pop = any(k in header_str for k in ["census", "population", "2011"])
            
            if has_city_or_name and has_state and has_census_or_pop:
                logger.info("Found relevant city population table via semantic header check")
                return table
                
        # Fallback to the first wikitable if semantic check couldn't strictly match
        logger.warning("Could not match table by exact header criteria; falling back to first wikitable")
        return tables[0]

    def extract_raw_rows(self, html_content: str) -> Tuple[List[Dict[str, str]], Dict[str, int]]:
        """
        Parses HTML and extracts raw row dictionaries.
        Returns extracted rows and extraction metrics.
        """
        soup = BeautifulSoup(html_content, "html.parser")
        table = self.find_city_table(soup)
        
        rows = table.find_all("tr")
        logger.info(f"Discovered {len(rows)} total rows in city population table")
        
        discovered_count = 0
        accepted_count = 0
        rejected_count = 0
        raw_records = []
        
        for idx, tr in enumerate(rows):
            # Remove footnote citations (sup tags like [1], [a])
            for sup in tr.find_all("sup"):
                sup.decompose()
                
            cells = [cell.get_text(" ", strip=True) for cell in tr.find_all(["td", "th"])]
            if not cells:
                continue
                
            discovered_count += 1
            
            # Skip subheaders or rows without enough cells
            if len(cells) < 3:
                rejected_count += 1
                continue
                
            raw_city = cells[0]
            raw_state = cells[1]
            raw_pop_2011 = cells[2]
            raw_pop_2001 = cells[3] if len(cells) > 3 else ""
            
            # Filter out table header rows repeating in body or country totals
            lower_city = raw_city.lower()
            if any(h in lower_city for h in ["name", "city", "census", "rank"]):
                rejected_count += 1
                continue
            if raw_city.strip() == "India" or raw_state.strip() == "India":
                # National total row
                rejected_count += 1
                continue
                
            raw_records.append({
                "raw_index": idx,
                "city": raw_city,
                "state": raw_state,
                "population_2011": raw_pop_2011,
                "population_2001": raw_pop_2001,
                "source_url": self.source_url
            })
            accepted_count += 1

        metrics = {
            "discovered": discovered_count,
            "accepted": accepted_count,
            "rejected": rejected_count
        }
        logger.info(f"Scraper row extraction summary: {metrics}")
        return raw_records, metrics
