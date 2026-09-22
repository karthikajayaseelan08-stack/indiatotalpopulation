"""
Database Connection and Session Management.
Supports MySQL 8+ via SQLAlchemy with graceful SQLite fallback for zero-dependency local runs.
"""
import os
import logging
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import Config

logger = logging.getLogger("database")

Base = declarative_base()

class DatabaseManager:
    """Manages database connection lifecycle and schema setup."""
    
    _engine = None
    _session_factory = None
    _is_sqlite_fallback = False

    @classmethod
    def get_engine(cls):
        if cls._engine is None:
            # First try MySQL connection
            mysql_uri = Config.get_database_uri()
            try:
                engine = create_engine(
                    mysql_uri,
                    pool_pre_ping=True,
                    pool_recycle=3600,
                    connect_args={"connect_timeout": 3}
                )
                # Test connectivity
                with engine.connect() as conn:
                    conn.execute(text("SELECT 1"))
                logger.info(f"Successfully connected to MySQL database: {Config.DB_NAME}")
                cls._engine = engine
                cls._is_sqlite_fallback = False
            except Exception as e:
                logger.warning(
                    f"Could not connect to MySQL server at {Config.DB_HOST}:{Config.DB_PORT} ({e}). "
                    "Falling back to local SQLite engine (data/indian_cities.db) to ensure local runnability."
                )
                Config.DATA_DIR.mkdir(parents=True, exist_ok=True)
                sqlite_path = Config.DATA_DIR / "indian_cities.db"
                sqlite_uri = f"sqlite:///{sqlite_path}"
                cls._engine = create_engine(sqlite_uri, echo=False)
                cls._is_sqlite_fallback = True

            cls._session_factory = sessionmaker(bind=cls._engine, expire_on_commit=False)
        return cls._engine

    @classmethod
    def get_session(cls) -> Session:
        cls.get_engine()
        return cls._session_factory()

    @classmethod
    @contextmanager
    def session_scope(cls) -> Generator[Session, None, None]:
        """Provide a transactional scope around a series of operations."""
        session = cls.get_session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    @classmethod
    def is_fallback(cls) -> bool:
        cls.get_engine()
        return cls._is_sqlite_fallback

    @classmethod
    def check_health(cls) -> dict:
        """Checks DB connectivity."""
        try:
            engine = cls.get_engine()
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {
                "status": "connected",
                "engine": "sqlite" if cls._is_sqlite_fallback else "mysql",
                "database": "indian_cities.db" if cls._is_sqlite_fallback else Config.DB_NAME
            }
        except Exception as e:
            return {
                "status": "degraded",
                "error": "Database unavailable",
                "details": str(e)
            }
