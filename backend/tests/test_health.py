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


# ── New endpoints added in feat/admin-ui-ingest ───────────────────────────────

def test_document_status_requires_auth(client):
    resp = client.get("/api/documents/fakeid/status")
    assert resp.status_code == 401


def test_document_preview_requires_auth(client):
    resp = client.get("/api/documents/fakeid/preview")
    assert resp.status_code == 401


def test_admin_conversations_requires_auth(client):
    resp = client.get("/api/admin/conversations")
    assert resp.status_code == 401


def test_admin_settings_requires_auth(client):
    resp = client.get("/api/admin/settings")
    assert resp.status_code == 401


def test_settings_seeded_on_init(client):
    """Settings table seeds defaults on first boot."""
    import database
    with database.get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM settings").fetchone()[0]
    assert count > 0


def test_documents_status_column_exists(client):
    """documents table has status column after migration."""
    import database
    with database.get_db() as conn:
        cols = [r[1] for r in conn.execute("PRAGMA table_info(documents)").fetchall()]
    assert "status" in cols
    assert "error_message" in cols
