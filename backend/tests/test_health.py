def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_auth_required(client):
    resp = client.get("/api/documents")
    assert resp.status_code == 401


def test_register_validation(client):
    resp = client.post("/api/auth/register", json={})
    assert resp.status_code == 400


def test_login_wrong_credentials(client):
    resp = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401
