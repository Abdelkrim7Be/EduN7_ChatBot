import logging


class FakePage:
    def __init__(self):
        self.metadata = {"page": 0}


class FakeLoader:
    def __init__(self, file_path):
        self.file_path = file_path

    def load(self):
        return [FakePage()]


class FakeSplitter:
    def split_documents(self, pages):
        return pages


def test_document_ingestion_log_excludes_private_identifiers(tmp_path, caplog, monkeypatch):
    from services import document_service
    import database

    secret_name = "SECRET_PRIVATE_COURS.pdf"
    user_id = "private-user-123"
    upload_path = tmp_path / secret_name
    upload_path.write_bytes(b"%PDF-1.4\n%%EOF\n")

    monkeypatch.setattr(document_service, "PyMuPDFLoader", FakeLoader)
    monkeypatch.setattr(document_service, "_splitter", FakeSplitter())
    monkeypatch.setattr(
        document_service.Chroma,
        "from_documents",
        lambda **kwargs: None,
    )
    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, role, created_at, last_seen) "
            "VALUES (?, ?, ?, ?, ?, 0, 0)",
            (user_id, "private-user@example.com", "Private User", "hash", "student"),
        )

    with caplog.at_level(logging.INFO, logger="services.document_service"):
        document_service.ingest(str(upload_path), secret_name, user_id, "private")

    log_text = "\n".join(record.getMessage() for record in caplog.records)
    assert secret_name not in log_text
    assert user_id not in log_text
    assert "private" in log_text
