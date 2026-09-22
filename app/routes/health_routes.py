"""
Health Check Routes.
Provides application health and database connectivity diagnostics.
"""
from flask import Blueprint, jsonify
from app.services.database import DatabaseManager

health_bp = Blueprint("health", __name__)

@health_bp.route("/api/health", methods=["GET"])
def health_check():
    """Reports application health and database connectivity status."""
    db_health = DatabaseManager.check_health()
    is_healthy = db_health.get("status") == "connected"
    
    response = {
        "success": is_healthy,
        "status": "healthy" if is_healthy else "degraded",
        "database": db_health.get("status"),
        "engine": db_health.get("engine", "unknown")
    }
    
    status_code = 200 if is_healthy else 503
    return jsonify(response), status_code
