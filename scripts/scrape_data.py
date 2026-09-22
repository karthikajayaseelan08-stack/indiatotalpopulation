"""
CLI script to scrape raw Indian city population data from Wikipedia.
"""
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.scraper import WikipediaCityScraper

def main():
    print("=" * 60)
    print("Scraping Indian Cities Population Data from Wikipedia...")
    print("=" * 60)
    scraper = WikipediaCityScraper()
    html = scraper.fetch_page_content()
    path = scraper.save_raw_html(html)
    rows, metrics = scraper.extract_raw_rows(html)
    print(f" Raw HTML saved to: {path}")
    print(f" Discovered: {metrics['discovered']} rows")
    print(f" Accepted:   {metrics['accepted']} rows")
    print(f" Rejected:   {metrics['rejected']} rows")
    print("Scraping completed successfully.")

if __name__ == "__main__":
    main()
