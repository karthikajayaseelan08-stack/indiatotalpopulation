"""
Flask Application Factory.
Initializes logging, blueprints, database schema, error handlers, and CORS.
"""
import logging
import os
from flask import Flask, render_template, jsonify
from flask_cors import CORS
from app.config import Config
from app.routes.health_routes import health_bp
from app.routes.city_routes import city_bp
from app.routes.analytics_routes import analytics_bp
from app.repositories.city_repository import CityRepository

def setup_logging():
    """Configures structured Python logging for file and console."""
    Config.LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = Config.LOGS_DIR / "app.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] (%(name)s): %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler()
        ]
    )

def create_app() -> Flask:
    """Creates and configures the Flask application instance."""
    setup_logging()
    logger = logging.getLogger("app")
    logger.info("Initializing Indian Cities Population Analytics System...")

    app = Flask(__name__, template_folder="templates", static_folder="static")
    app.config.from_object(Config)

    # Enable CORS for API routes if needed
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register Blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(city_bp)
    app.register_blueprint(analytics_bp)

    # Template Web Views
    @app.route("/")
    def index_view():
        return render_template("dashboard.html")

    @app.route("/cities")
    def cities_view():
        return render_template("cities.html")

    @app.route("/comparison")
    def comparison_view():
        return render_template("comparison.html")

    @app.route("/about")
    def about_view():
        return render_template("about.html")

    # Custom Error Handlers (Section 28)
    @app.errorhandler(404)
    def page_not_found(e):
        logger.warning(f"404 Not Found error encountered: {e}")
        return render_template("404.html"), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        logger.error(f"500 Internal Server error encountered: {e}", exc_info=True)
        return render_template("500.html"), 500

    # Ensure schema is ready
    try:
        CityRepository.init_schema()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.warning(f"Database schema initialization deferred: {e}")

    return app
