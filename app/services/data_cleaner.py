"""
Data Cleaner Module for Indian Cities Dataset.
Normalizes city and state names, parses population strings, and strips unwanted artifacts.
"""
import re
import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("cleaner")

class DataCleaner:
    """Provides sanitization and normalization for raw city records."""

    # Special symbols to strip from city names (e.g. ‡ indicating capital, footnotes, brackets)
    STRIP_PATTERN = re.compile(r"[‡†*\[\]\(\)\d]")

    @classmethod
    def clean_text(cls, value: Optional[str]) -> str:
        """Trims whitespace, normalizes spaces, and strips footnote artifacts."""
        if not value:
            return ""
        # Remove footnote markers / special symbols
        cleaned = cls.STRIP_PATTERN.sub("", str(value))
        # Collapse multiple spaces and trim
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    @classmethod
    def clean_population(cls, value: Any) -> Optional[int]:
        """
        Extracts an integer population value by stripping commas, spaces, and extraneous text.
        Returns None if parsing fails or result is non-positive.
        """
        if value is None:
            return None
            
        val_str = str(value).strip()
        # Remove commas, plus signs, brackets, spaces
        numeric_str = re.sub(r"[,+\s]", "", val_str)
        
        # Match leading numeric digits
        match = re.match(r"^(\d+)", numeric_str)
        if not match:
            return None
            
        try:
            parsed = int(match.group(1))
            return parsed if parsed > 0 else None
        except ValueError:
            return None

    @classmethod
    def clean_record(cls, raw: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Cleans a single raw record.
        Returns (cleaned_dict, None) or (None, rejection_reason).
        """
        city_raw = raw.get("city")
        state_raw = raw.get("state")
        pop_raw = raw.get("population_2011") or raw.get("population")
        
        city = cls.clean_text(city_raw)
        state = cls.clean_text(state_raw)
        
        if not city:
            return None, "Empty or invalid city name after cleaning"
            
        if not state:
            return None, "Empty or invalid state name after cleaning"
            
        population = cls.clean_population(pop_raw)
        if population is None:
            return None, f"Invalid or non-positive population value: '{pop_raw}'"
            
        cleaned = {
            "city": city,
            "state": state,
            "population": population,
            "population_year": 2011,
            "source": "Wikipedia (Census of India 2011)",
            "source_url": raw.get("source_url", "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population")
        }
        return cleaned, None
