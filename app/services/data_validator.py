"""
Data Validator Module for Indian Cities Dataset.
Validates structural integrity, enforces constraints, deduplicates, and produces comprehensive reports.
"""
import logging
from typing import Any, Dict, List, Set, Tuple

logger = logging.getLogger("validator")

class ValidationReport:
    """Encapsulates validation counters and diagnostics."""
    def __init__(self):
        self.total_rows: int = 0
        self.valid_rows: int = 0
        self.invalid_rows: int = 0
        self.duplicate_rows: int = 0
        self.missing_city_values: int = 0
        self.missing_state_values: int = 0
        self.invalid_population_values: int = 0
        self.invalid_ranks: int = 0
        self.suspicious_records: int = 0
        self.rejections: List[Dict[str, Any]] = []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_rows": self.total_rows,
            "valid_rows": self.valid_rows,
            "invalid_rows": self.invalid_rows,
            "duplicate_rows": self.duplicate_rows,
            "missing_city_values": self.missing_city_values,
            "missing_state_values": self.missing_state_values,
            "invalid_population_values": self.invalid_population_values,
            "invalid_ranks": self.invalid_ranks,
            "suspicious_records": self.suspicious_records,
            "rejections_count": len(self.rejections)
        }

class DataValidator:
    """Validates cleaned records against business rules and data contracts."""

    # Reasonable bounds for an Indian city population in census
    MIN_PLAUSIBLE_POPULATION = 10_000
    MAX_PLAUSIBLE_POPULATION = 30_000_000

    @classmethod
    def validate_and_deduplicate(cls, records: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], ValidationReport]:
        """
        Validates records, tracks duplicates using (city.lower(), state.lower()),
        and generates a detailed validation report.
        """
        report = ValidationReport()
        report.total_rows = len(records)
        
        seen_keys: Set[Tuple[str, str]] = set()
        valid_records: List[Dict[str, Any]] = []

        for record in records:
            city = record.get("city", "").strip()
            state = record.get("state", "").strip()
            pop = record.get("population")
            
            # Check missing city
            if not city:
                report.missing_city_values += 1
                report.invalid_rows += 1
                report.rejections.append({"record": record, "reason": "Missing city name"})
                logger.warning(f"Validation failure: Missing city name in {record}")
                continue

            # Check missing state
            if not state:
                report.missing_state_values += 1
                report.invalid_rows += 1
                report.rejections.append({"record": record, "reason": "Missing state name"})
                logger.warning(f"Validation failure: Missing state in {record}")
                continue

            # Check population
            if pop is None or not isinstance(pop, int) or pop <= 0:
                report.invalid_population_values += 1
                report.invalid_rows += 1
                report.rejections.append({"record": record, "reason": f"Invalid population: {pop}"})
                logger.warning(f"Validation failure: Invalid population ({pop}) in city '{city}'")
                continue

            # Plausibility check (suspicious record)
            if pop < cls.MIN_PLAUSIBLE_POPULATION or pop > cls.MAX_PLAUSIBLE_POPULATION:
                report.suspicious_records += 1
                logger.info(f"Suspicious population value noted for '{city}': {pop} (outside expected bounds)")

            # Deduplication key
            business_key = (city.lower(), state.lower())
            if business_key in seen_keys:
                report.duplicate_rows += 1
                report.invalid_rows += 1
                report.rejections.append({"record": record, "reason": f"Duplicate city/state combination: {city}, {state}"})
                logger.warning(f"Validation failure: Duplicate record skipped for '{city}, {state}'")
                continue

            seen_keys.add(business_key)
            valid_records.append(record)
            report.valid_rows += 1

        logger.info(f"Validation complete: {report.valid_rows} valid out of {report.total_rows} total records.")
        return valid_records, report
