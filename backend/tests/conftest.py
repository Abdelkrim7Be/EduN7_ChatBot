import os

import pytest

os.environ["JWT_SECRET"] = "test-secret-with-at-least-32-bytes"
os.environ["REDIS_URL"] = ""
os.environ.setdefault("CHROMA_HOST", "localhost")
os.environ.setdefault("CHROMA_PORT", "8000")
os.environ.setdefault("UPLOAD_DIR", "/tmp/enset_ai_test_uploads")


@pytest.fixture
def app():
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture
def client(app):
    return app.test_client()
