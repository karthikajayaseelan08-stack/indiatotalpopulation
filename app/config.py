"""
Configuration module for Indian Cities Population Analytics System.
Loads environment variables and provides structured application configuration.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from root
load_dotenv(BASE_DIR / ".env")

class Config:
    """Application configuration settings."""
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = FLASK_ENV == "development"
    
    # Database configuration
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_NAME = os.getenv("DB_NAME", "indian_cities_db")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    
    # SQLAlchemy URI (using pymysql driver with fallback to SQLite for local development without MySQL server)
    @classmethod
    def get_database_uri(cls) -> str:
        if cls.DB_PASSWORD:
            return f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"
        return f"mysql+pymysql://{cls.DB_USER}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}?charset=utf8mb4"

    # Multithreading configuration
    MAX_WORKERS = int(os.getenv("MAX_WORKERS", "4"))
    
    # Paths
    DATA_DIR = BASE_DIR / "data"
    RAW_DATA_DIR = DATA_DIR / "raw"
    CITIES_CSV = DATA_DIR / "cities.csv"
    LOGS_DIR = BASE_DIR / "logs"
    
    # Source configuration
    WIKIPEDIA_SOURCE_URL = "https://en.wikipedia.org/wiki/List_of_cities_in_India_by_population"
    USER_AGENT = "IndianCitiesPopulationAnalytics/1.0 (Python data pipeline; educational research)"
    HTTP_TIMEOUT = 15 # seconds
