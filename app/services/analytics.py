"""
Analytics Service Module.
Performs real database-backed mathematical and statistical aggregations on Indian city population data.
"""
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import func
from app.services.database import DatabaseManager
from app.repositories.city_repository import City, CityRepository

logger = logging.getLogger("analytics")

class AnalyticsService:
    """Computes comprehensive analytics across the dataset."""

    @classmethod
    def get_summary(cls) -> Dict[str, Any]:
        """
        Computes core summary statistics:
        Total cities, total population, average population, median population,
        highest and lowest population cities.
        """
        CityRepository.init_schema()
        with DatabaseManager.session_scope() as session:
            total_cities = session.query(func.count(City.id)).scalar() or 0
            
            if total_cities == 0:
                return {
                    "total_cities": 0,
                    "total_population": 0,
                    "average_population": 0,
                    "median_population": 0,
                    "highest_city": None,
                    "lowest_city": None,
                    "population_distribution": {}
                }

            total_pop = session.query(func.sum(City.population)).scalar() or 0
            avg_pop = session.query(func.avg(City.population)).scalar() or 0

            # Highest population city
            highest_entity = session.query(City).order_by(City.population.desc()).first()
            highest_city = highest_entity.to_dict() if highest_entity else None

            # Lowest population city
            lowest_entity = session.query(City).order_by(City.population.asc()).first()
            lowest_city = lowest_entity.to_dict() if lowest_entity else None

            # Median calculation
            # Pull ordered populations to calculate exact median
            ordered_pops = [p[0] for p in session.query(City.population).order_by(City.population.asc()).all()]
            n = len(ordered_pops)
            if n % 2 == 1:
                median_pop = ordered_pops[n // 2]
            else:
                median_pop = (ordered_pops[(n // 2) - 1] + ordered_pops[n // 2]) // 2

            # Population tier distribution summaries
            megacities = sum(1 for p in ordered_pops if p >= 10_000_000)
            tier1 = sum(1 for p in ordered_pops if 5_000_000 <= p < 10_000_000)
            major = sum(1 for p in ordered_pops if 1_000_000 <= p < 5_000_000)
            mid = sum(1 for p in ordered_pops if 500_000 <= p < 1_000_000)
            emerging = sum(1 for p in ordered_pops if p < 500_000)

            return {
                "total_cities": total_cities,
                "total_population": int(total_pop),
                "average_population": int(round(avg_pop)),
                "median_population": int(median_pop),
                "highest_city": highest_city,
                "lowest_city": lowest_city,
                "distribution": {
                    "megacities_10m_plus": megacities,
                    "tier1_5m_to_10m": tier1,
                    "major_1m_to_5m": major,
                    "mid_500k_to_1m": mid,
                    "emerging_sub_500k": emerging
                }
            }

    @classmethod
    def get_state_analytics(cls) -> List[Dict[str, Any]]:
        """
        Returns state-wise aggregated stats:
        - state name
        - total city count
        - total population
        - average population
        - highest population city in state
        """
        CityRepository.init_schema()
        with DatabaseManager.session_scope() as session:
            # Query aggregates
            results = session.query(
                City.state,
                func.count(City.id).label("city_count"),
                func.sum(City.population).label("total_population"),
                func.avg(City.population).label("avg_population")
            ).group_by(City.state).order_by(func.sum(City.population).desc()).all()

            states_data = []
            for row in results:
                state_name = row.state
                # Find top city in this state
                top_city_entity = session.query(City).filter(
                    City.state == state_name
                ).order_by(City.population.desc()).first()
                
                states_data.append({
                    "state": state_name,
                    "city_count": row.city_count,
                    "total_population": int(row.total_population or 0),
                    "average_population": int(round(row.avg_population or 0)),
                    "highest_city": top_city_entity.city if top_city_entity else None,
                    "highest_city_population": top_city_entity.population if top_city_entity else None
                })
            return states_data

    @classmethod
    def compare_cities(cls, city1_name: str, city2_name: str) -> Optional[Dict[str, Any]]:
        """
        Calculates factual comparison between two cities:
        - population difference
        - percentage difference
        - rank difference
        """
        c1 = CityRepository.find_by_name(city1_name)
        c2 = CityRepository.find_by_name(city2_name)

        if not c1 or not c2:
            return None

        diff = abs(c1["population"] - c2["population"])
        min_pop = min(c1["population"], c2["population"])
        pct_diff = round((diff / min_pop * 100), 2) if min_pop > 0 else 0.0
        ratio = round(c1["population"] / c2["population"], 2) if c2["population"] > 0 else 0.0

        larger = c1["city"] if c1["population"] >= c2["population"] else c2["city"]

        return {
            "city1": c1,
            "city2": c2,
            "population_difference": diff,
            "percentage_difference": pct_diff,
            "ratio": ratio,
            "larger_city": larger,
            "rank_difference": abs((c1.get("rank") or 0) - (c2.get("rank") or 0))
        }
