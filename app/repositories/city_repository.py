"""
City Repository Module.
Handles persistence, parameterized querying, indexing, and upsert operations.
"""
from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import (
    Column, Integer, String, BigInteger, DateTime, func, UniqueConstraint, Index
)
from app.services.database import Base, DatabaseManager

logger = logging.getLogger("repository")

class City(Base):
    """City database entity."""
    __tablename__ = "cities"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    rank = Column(Integer, nullable=True, index=True)
    city = Column(String(255), nullable=False, index=True)
    state = Column(String(255), nullable=False, index=True)
    population = Column(BigInteger, nullable=False, index=True)
    population_year = Column(Integer, nullable=True)
    source = Column(String(255), nullable=False)
    source_url = Column(String(500), nullable=True)
    scraped_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("city", "state", name="uq_city_state"),
        Index("idx_cities_state_pop", "state", population.desc()),
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "rank": self.rank,
            "city": self.city,
            "state": self.state,
            "population": self.population,
            "population_year": self.population_year,
            "source": self.source,
            "source_url": self.source_url,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class CityRepository:
    """Repository for all city data access operations."""

    ALLOWED_SORT_FIELDS = {
        "rank": City.rank,
        "city": City.city,
        "state": City.state,
        "population": City.population,
        "population_year": City.population_year
    }

    @classmethod
    def init_schema(cls) -> None:
        """Initializes database tables and indexes."""
        engine = DatabaseManager.get_engine()
        Base.metadata.create_all(engine)
        logger.info("Database schema initialized successfully.")

    @classmethod
    def upsert_batch(cls, records: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Upserts a batch of city records safely.
        Matches by (city, state) uniqueness to prevent duplicate accumulation.
        """
        cls.init_schema()
        inserted = 0
        updated = 0
        unchanged = 0

        with DatabaseManager.session_scope() as session:
            for rec in records:
                existing = session.query(City).filter(
                    func.lower(City.city) == rec["city"].strip().lower(),
                    func.lower(City.state) == rec["state"].strip().lower()
                ).first()

                now = datetime.utcnow()
                if existing:
                    # Check if changed
                    has_change = (
                        existing.population != rec["population"] or
                        existing.rank != rec.get("rank") or
                        existing.source != rec.get("source")
                    )
                    if has_change:
                        existing.population = rec["population"]
                        existing.rank = rec.get("rank")
                        existing.population_year = rec.get("population_year", 2011)
                        existing.source = rec.get("source", "Wikipedia")
                        existing.source_url = rec.get("source_url")
                        existing.scraped_at = now
                        existing.updated_at = now
                        updated += 1
                    else:
                        unchanged += 1
                else:
                    new_city = City(
                        rank=rec.get("rank"),
                        city=rec["city"].strip(),
                        state=rec["state"].strip(),
                        population=rec["population"],
                        population_year=rec.get("population_year", 2011),
                        source=rec.get("source", "Wikipedia (Census of India 2011)"),
                        source_url=rec.get("source_url"),
                        scraped_at=now
                    )
                    session.add(new_city)
                    inserted += 1

        summary = {"inserted": inserted, "updated": updated, "unchanged": unchanged}
        logger.info(f"Database upsert complete: {summary}")
        return summary

    @classmethod
    def find_all(
        cls,
        search: Optional[str] = None,
        state: Optional[str] = None,
        sort_by: str = "population",
        order: str = "desc",
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Queries cities with case-insensitive search, state filter, safe allowlisted sorting,
        and paginated metadata.
        """
        cls.init_schema()
        page = max(1, page)
        limit = min(max(1, limit), 200) # Cap unreasonable page sizes
        
        with DatabaseManager.session_scope() as session:
            query = session.query(City)
            
            # Case-insensitive city search
            if search and search.strip():
                clean_search = f"%{search.strip().lower()}%"
                query = query.filter(func.lower(City.city).like(clean_search))

            # State filtering
            if state and state.strip() and state.strip().lower() != "all":
                query = query.filter(func.lower(City.state) == state.strip().lower())

            # Total before pagination
            total = query.count()

            # Safe sorting allowlist
            sort_column = cls.ALLOWED_SORT_FIELDS.get(sort_by, City.population)
            if order.lower() == "asc":
                query = query.order_by(sort_column.asc())
            else:
                query = query.order_by(sort_column.desc())

            # Paginate
            offset = (page - 1) * limit
            items = query.offset(offset).limit(limit).all()
            total_pages = (total + limit - 1) // limit if total > 0 else 1

            meta = {
                "page": page,
                "limit": limit,
                "total": total,
                "total_pages": total_pages
            }
            return [city.to_dict() for city in items], meta

    @classmethod
    def find_by_id(cls, city_id: int) -> Optional[Dict[str, Any]]:
        """Finds a city by its primary key ID."""
        cls.init_schema()
        with DatabaseManager.session_scope() as session:
            item = session.query(City).filter(City.id == city_id).first()
            return item.to_dict() if item else None

    @classmethod
    def find_by_name(cls, city_name: str) -> Optional[Dict[str, Any]]:
        """Finds city by name (case-insensitive)."""
        cls.init_schema()
        if not city_name:
            return None
        with DatabaseManager.session_scope() as session:
            item = session.query(City).filter(func.lower(City.city) == city_name.strip().lower()).first()
            return item.to_dict() if item else None

    @classmethod
    def get_top_ranked(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """Returns the top N cities ordered by population descending."""
        cls.init_schema()
        limit = min(max(1, limit), 100)
        with DatabaseManager.session_scope() as session:
            items = session.query(City).order_by(City.population.desc()).limit(limit).all()
            return [city.to_dict() for city in items]

    @classmethod
    def get_all_states(cls) -> List[str]:
        """Returns unique list of states sorted alphabetically."""
        cls.init_schema()
        with DatabaseManager.session_scope() as session:
            results = session.query(City.state).distinct().order_by(City.state.asc()).all()
            return [r[0] for r in results if r[0]]
