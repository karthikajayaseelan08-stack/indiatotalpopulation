"""
Pytest Fixtures and Mock Configurations.
Provides in-memory SQLite engine and mock Wikipedia HTML without requiring live internet or external MySQL.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.services.database import Base, DatabaseManager
from app.repositories.city_repository import City, CityRepository
from app import create_app

SAMPLE_WIKIPEDIA_HTML = """
<!DOCTYPE html>
<html>
<head><title>List of cities in India by population</title></head>
<body>
<table class="wikitable sortable">
  <thead>
    <tr>
      <th>City</th>
      <th>State or Union territory</th>
      <th>2011 Census</th>
      <th>2001 Census</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Mumbai ‡<sup>[1]</sup></td>
      <td>Maharashtra</td>
      <td>12,442,373</td>
      <td>11,978,450</td>
    </tr>
    <tr>
      <td>Delhi ‡</td>
      <td>Delhi</td>
      <td>11,034,555</td>
      <td>9,879,172</td>
    </tr>
    <tr>
      <td>Bengaluru ‡</td>
      <td>Karnataka</td>
      <td>8,443,675</td>
      <td>5,682,293</td>
    </tr>
    <tr>
      <td>Hyderabad</td>
      <td>Telangana</td>
      <td>6,993,262</td>
      <td>5,496,960</td>
    </tr>
    <tr>
      <td>Chennai ‡</td>
      <td>Tamil Nadu</td>
      <td>6,748,026</td>
      <td>4,343,645</td>
    </tr>
    <tr>
      <td>India</td>
      <td>Total</td>
      <td>1,210,854,977</td>
      <td>1,028,737,436</td>
    </tr>
  </tbody>
</table>
</body>
</html>
"""

@pytest.fixture
def mock_html():
    return SAMPLE_WIKIPEDIA_HTML

@pytest.fixture(scope="function")
def test_db():
    """Sets up an in-memory SQLite database for isolated test execution."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Seed with standard test data
    test_cities = [
        City(rank=1, city="Mumbai", state="Maharashtra", population=12442373, population_year=2011, source="Test Source"),
        City(rank=2, city="Delhi", state="Delhi", population=11034555, population_year=2011, source="Test Source"),
        City(rank=3, city="Bengaluru", state="Karnataka", population=8443675, population_year=2011, source="Test Source"),
        City(rank=4, city="Hyderabad", state="Telangana", population=6993262, population_year=2011, source="Test Source"),
        City(rank=5, city="Chennai", state="Tamil Nadu", population=6748026, population_year=2011, source="Test Source"),
        City(rank=6, city="Pune", state="Maharashtra", population=3124458, population_year=2011, source="Test Source"),
    ]
    session.add_all(test_cities)
    session.commit()

    # Monkey-patch DatabaseManager
    orig_engine = DatabaseManager._engine
    orig_factory = DatabaseManager._session_factory
    DatabaseManager._engine = engine
    DatabaseManager._session_factory = Session

    yield session

    session.close()
    Base.metadata.drop_all(engine)
    DatabaseManager._engine = orig_engine
    DatabaseManager._session_factory = orig_factory

@pytest.fixture
def app(test_db):
    flask_app = create_app()
    flask_app.config.update({"TESTING": True})
    return flask_app

@pytest.fixture
def client(app):
    return app.test_client()
