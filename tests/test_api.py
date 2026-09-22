"""
Tests for REST API Endpoints.
"""
def test_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["status"] == "healthy"

def test_cities_listing_and_pagination(client):
    res = client.get("/api/cities?page=1&limit=3")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]) == 3
    assert data["pagination"]["total"] == 6
    assert data["pagination"]["total_pages"] == 2

def test_cities_search(client):
    res = client.get("/api/cities?search=mumbai")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 1
    assert data["data"][0]["city"] == "Mumbai"

def test_cities_state_filter(client):
    res = client.get("/api/cities?state=Maharashtra")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 2

def test_cities_get_by_id(client):
    # Find Mumbai's id
    res = client.get("/api/cities?search=mumbai")
    mumbai_id = res.get_json()["data"][0]["id"]
    res2 = client.get(f"/api/cities/{mumbai_id}")
    assert res2.status_code == 200
    assert res2.get_json()["data"]["city"] == "Mumbai"

def test_cities_get_by_invalid_id(client):
    res = client.get("/api/cities/999999")
    assert res.status_code == 404
    assert res.get_json()["success"] is False

def test_rankings_top(client):
    res = client.get("/api/rankings/top?limit=3")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["data"]) == 3
    assert data["data"][0]["population"] >= data["data"][1]["population"]

def test_analytics_summary_endpoint(client):
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["total_cities"] == 6

def test_compare_endpoint(client):
    res = client.get("/api/compare?city1=Mumbai&city2=Bengaluru")
    assert res.status_code == 200
    data = res.get_json()
    assert data["data"]["larger_city"] == "Mumbai"

def test_compare_missing_params(client):
    res = client.get("/api/compare?city1=Mumbai")
    assert res.status_code == 400
    assert res.get_json()["success"] is False
