import pytest
import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app

@pytest.fixture
def client():
    # Use in-memory DB for tests
    os.environ["DB_PATH"] = ":memory:"
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json == {"status": "ok"}

def test_login_missing_credentials(client):
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 400
    assert "error" in response.json
