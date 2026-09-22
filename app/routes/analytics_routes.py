"""
Analytics and Comparison API Routes.
Provides endpoints for summary statistics, state aggregations, and city comparisons.
"""
from flask import Blueprint, jsonify, request
from app.services.analytics import AnalyticsService
from app.services.pipeline import IngestionPipeline

analytics_bp = Blueprint("analytics", __name__)

@analytics_bp.route("/api/analytics/summary", methods=["GET"])
def get_analytics_summary():
    """Returns dataset-wide population metrics, averages, median, and extrema."""
    summary = AnalyticsService.get_summary()
    return jsonify({
        "success": True,
        "data": summary
    }), 200

@analytics_bp.route("/api/analytics/states", methods=["GET"])
def get_state_analytics():
    """Returns comprehensive state-level metrics (city count, total pop, avg pop, top city)."""
    states = AnalyticsService.get_state_analytics()
    return jsonify({
        "success": True,
        "data": states
    }), 200

@analytics_bp.route("/api/analytics/states/population", methods=["GET"])
def get_state_population():
    """Returns state population breakdown for charts."""
    states = AnalyticsService.get_state_analytics()
    chart_data = [{"state": s["state"], "total_population": s["total_population"]} for s in states]
    return jsonify({
        "success": True,
        "data": chart_data
    }), 200

@analytics_bp.route("/api/analytics/states/city-count", methods=["GET"])
def get_state_city_count():
    """Returns city counts by state for charts."""
    states = AnalyticsService.get_state_analytics()
    chart_data = [{"state": s["state"], "city_count": s["city_count"]} for s in states]
    return jsonify({
        "success": True,
        "data": chart_data
    }), 200

@analytics_bp.route("/api/analytics/top-by-state", methods=["GET"])
def get_top_by_state():
    """Returns the most populated city for each state."""
    states = AnalyticsService.get_state_analytics()
    data = [
        {
            "state": s["state"],
            "city": s["highest_city"],
            "population": s["highest_city_population"]
        }
        for s in states if s["highest_city"]
    ]
    return jsonify({
        "success": True,
        "data": data
    }), 200

@analytics_bp.route("/api/compare", methods=["GET"])
def compare_two_cities():
    """
    Compares two cities by name.
    Query parameters:
    - city1: string (required)
    - city2: string (required)
    """
    c1 = request.args.get("city1", type=str)
    c2 = request.args.get("city2", type=str)

    if not c1 or not c2:
        return jsonify({
            "success": False,
            "error": "Both 'city1' and 'city2' query parameters are required."
        }), 400

    comparison = AnalyticsService.compare_cities(c1, c2)
    if not comparison:
        return jsonify({
            "success": False,
            "error": f"One or both cities not found in dataset: '{c1}', '{c2}'"
        }), 404

    return jsonify({
        "success": True,
        "data": comparison
    }), 200

@analytics_bp.route("/api/pipeline/run", methods=["POST"])
def run_pipeline():
    """
    Triggers data refresh and multithreaded ingestion pipeline.
    Optionally accepts JSON: { "max_workers": 4 }
    """
    body = request.get_json(silent=True) or {}
    max_workers = body.get("max_workers", 4)
    try:
        max_workers = int(max_workers)
    except (ValueError, TypeError):
        max_workers = 4

    try:
        result = IngestionPipeline.run(max_workers=max_workers)
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Pipeline execution failed: {str(e)}"
        }), 500

@analytics_bp.route("/api/pipeline/status", methods=["GET"])
def get_pipeline_status():
    """Returns the summary of the most recent pipeline execution."""
    summary = IngestionPipeline.get_last_run_summary()
    return jsonify({
        "success": True,
        "data": summary
    }), 200
