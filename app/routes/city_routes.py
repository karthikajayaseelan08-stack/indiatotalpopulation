"""
City API and View Routes.
Serves paginated, filtered, and single-record city data.
"""
from flask import Blueprint, jsonify, request, render_template, abort
from app.repositories.city_repository import CityRepository

city_bp = Blueprint("cities", __name__)

@city_bp.route("/api/cities", methods=["GET"])
def get_cities():
    """
    Retrieves paginated cities with search, state filtering, and sorting.
    Query parameters:
    - search: string
    - state: string
    - sort: rank | city | state | population | population_year (default: population)
    - order: asc | desc (default: desc)
    - page: int (default: 1)
    - limit: int (default: 20, max: 200)
    """
    search = request.args.get("search", type=str)
    state = request.args.get("state", type=str)
    sort_by = request.args.get("sort", default="population", type=str)
    order = request.args.get("order", default="desc", type=str)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    # Validate sort_by against repository allowlist
    if sort_by not in CityRepository.ALLOWED_SORT_FIELDS:
        sort_by = "population"
    if order.lower() not in ("asc", "desc"):
        order = "desc"

    cities, meta = CityRepository.find_all(
        search=search,
        state=state,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit
    )

    return jsonify({
        "success": True,
        "data": cities,
        "pagination": meta
    }), 200

@city_bp.route("/api/cities/<int:city_id>", methods=["GET"])
def get_city_by_id(city_id: int):
    """Retrieves single city record by primary key."""
    city = CityRepository.find_by_id(city_id)
    if not city:
        return jsonify({
            "success": False,
            "error": f"City with ID {city_id} not found."
        }), 404
        
    return jsonify({
        "success": True,
        "data": city
    }), 200

@city_bp.route("/api/rankings/top", methods=["GET"])
def get_top_rankings():
    """Retrieves top N cities by population."""
    limit = request.args.get("limit", default=10, type=int)
    top_cities = CityRepository.get_top_ranked(limit=limit)
    return jsonify({
        "success": True,
        "data": top_cities
    }), 200

@city_bp.route("/api/states", methods=["GET"])
def get_states_list():
    """Returns unique list of states."""
    states = CityRepository.get_all_states()
    return jsonify({
        "success": True,
        "data": states
    }), 200
