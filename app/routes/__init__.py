"""
Routes package initialization.
"""
from app.routes.health_routes import health_bp
from app.routes.city_routes import city_bp
from app.routes.analytics_routes import analytics_bp

__all__ = ["health_bp", "city_bp", "analytics_bp"]
