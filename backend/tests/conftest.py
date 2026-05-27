import os
import pytest

os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("CHROMA_HOST", "localhost")
os.environ.setdefault("CHROMA_PORT", "8000")
os.environ.setdefault("UPLOAD_DIR", "/tmp/ensetai_test_uploads")


@pytest.fixture
def app():
    from app import create_app
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture
def client(app):
    return app.test_client()
