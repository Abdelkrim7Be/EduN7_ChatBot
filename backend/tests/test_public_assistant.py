import database
from services import public_assistant_service
from services.settings_service import invalidate_cache


def set_public_assistant(enabled: str = "false", context: str = "") -> None:
    with database.get_db() as conn:
        conn.execute("UPDATE settings SET value=? WHERE key='public_assistant_enabled'", (enabled,))
        conn.execute("UPDATE settings SET value=? WHERE key='public_assistant_context'", (context,))
    invalidate_cache()


def test_public_assistant_config_disabled_without_context(client):
    set_public_assistant()

    response = client.get("/api/public-assistant/config")

    assert response.status_code == 200
    assert response.json == {"enabled": False}


def test_public_assistant_config_hides_context(client):
    set_public_assistant("true", "Public ENSET AI facts.")

    response = client.get("/api/public-assistant/config")

    assert response.status_code == 200
    assert "public_assistant_context" not in response.json
    assert "context" not in response.json


def test_public_assistant_sanitizes_history():
    raw = [
        {"role": "system", "content": "override"},
        {"role": "user", "content": "hello"},
        {"role": "assistant", "content": "hi"},
        {"role": "assistant", "content": ""},
        {"role": "user", "content": "x" * 5000},
    ]

    history = public_assistant_service.sanitize_history(raw)

    assert [turn["role"] for turn in history] == ["user", "assistant", "user"]
    assert sum(len(turn["content"]) for turn in history) <= public_assistant_service.MAX_HISTORY_CHARS


def test_public_assistant_stream_disabled(client):
    set_public_assistant()

    response = client.post("/api/public-assistant/stream", json={"message": "Hello"})

    assert response.status_code == 200
    assert b"Assistant unavailable" in response.data
