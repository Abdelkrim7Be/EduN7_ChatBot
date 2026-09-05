import io


def test_local_document_storage_round_trip(tmp_path, monkeypatch):
    import config
    from services import document_storage

    source = tmp_path / "upload.pdf"
    source.write_bytes(b"%PDF-1.4\n%%EOF\n")

    monkeypatch.setattr(config, "DOCUMENT_STORAGE_BACKEND", "local")
    monkeypatch.setattr(config, "UPLOAD_DIR", str(tmp_path / "stored"))

    saved_path = document_storage.save_pdf(source, "doc123", "course.pdf")

    assert saved_path == tmp_path / "stored" / "doc123_course.pdf"
    assert saved_path.read_bytes() == b"%PDF-1.4\n%%EOF\n"
    assert document_storage.pdf_exists("doc123", "course.pdf")
    assert document_storage.read_pdf("doc123", "course.pdf") == saved_path

    document_storage.delete_pdf("doc123", "course.pdf")

    assert not document_storage.pdf_exists("doc123", "course.pdf")


def test_s3_document_storage_uses_deterministic_object_key(tmp_path, monkeypatch):
    import config
    from services import document_storage

    stored: dict[str, bytes] = {}

    class FakeBody:
        def __init__(self, data: bytes):
            self.data = data

        def read(self) -> bytes:
            return self.data

    class FakeS3:
        def upload_file(self, filename, bucket, key, ExtraArgs=None):
            assert bucket == "docs"
            assert ExtraArgs == {"ContentType": "application/pdf"}
            stored[key] = io.FileIO(filename, "rb").read()

        def head_object(self, Bucket, Key):
            assert Bucket == "docs"
            if Key not in stored:
                raise RuntimeError("missing")

        def get_object(self, Bucket, Key):
            assert Bucket == "docs"
            return {"Body": FakeBody(stored[Key])}

        def delete_object(self, Bucket, Key):
            assert Bucket == "docs"
            stored.pop(Key, None)

    source = tmp_path / "upload.pdf"
    source.write_bytes(b"%PDF-1.4\n%%EOF\n")

    monkeypatch.setattr(config, "DOCUMENT_STORAGE_BACKEND", "s3")
    monkeypatch.setattr(config, "DOCUMENT_STORAGE_PREFIX", "rag/documents")
    monkeypatch.setattr(config, "S3_BUCKET", "docs")
    monkeypatch.setattr(document_storage, "_s3_client", lambda: FakeS3())

    document_storage.save_pdf(source, "doc123", "../course.pdf")

    assert not source.exists()
    assert stored == {"rag/documents/doc123_course.pdf": b"%PDF-1.4\n%%EOF\n"}
    assert document_storage.pdf_exists("doc123", "course.pdf")
    assert document_storage.read_pdf("doc123", "course.pdf").getvalue() == b"%PDF-1.4\n%%EOF\n"

    document_storage.delete_pdf("doc123", "course.pdf")

    assert not document_storage.pdf_exists("doc123", "course.pdf")
