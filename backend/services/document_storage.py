import io
import logging
from pathlib import Path

import config

logger = logging.getLogger(__name__)


def _safe_filename(original_filename: str) -> str:
    return Path(original_filename).name


def object_key(doc_id: str, original_filename: str) -> str:
    filename = _safe_filename(original_filename)
    prefix = config.DOCUMENT_STORAGE_PREFIX.strip("/")
    key = f"{doc_id}_{filename}"
    return f"{prefix}/{key}" if prefix else key


def local_path(doc_id: str, original_filename: str) -> Path:
    return Path(config.UPLOAD_DIR) / f"{doc_id}_{_safe_filename(original_filename)}"


def _s3_client():
    import boto3

    kwargs = {
        "region_name": config.S3_REGION,
    }
    if config.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = config.S3_ENDPOINT_URL
    if config.S3_ACCESS_KEY_ID and config.S3_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = config.S3_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = config.S3_SECRET_ACCESS_KEY
    return boto3.client("s3", **kwargs)


def _require_s3_bucket() -> str:
    if not config.S3_BUCKET:
        raise RuntimeError("S3_BUCKET is required when DOCUMENT_STORAGE_BACKEND=s3")
    return config.S3_BUCKET


def save_pdf(source_path: Path, doc_id: str, original_filename: str) -> Path | None:
    if config.DOCUMENT_STORAGE_BACKEND == "local":
        target = local_path(doc_id, original_filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        if source_path.resolve() != target.resolve():
            source_path.replace(target)
        return target

    if config.DOCUMENT_STORAGE_BACKEND == "s3":
        _s3_client().upload_file(
            str(source_path),
            _require_s3_bucket(),
            object_key(doc_id, original_filename),
            ExtraArgs={"ContentType": "application/pdf"},
        )
        source_path.unlink(missing_ok=True)
        return None

    raise RuntimeError(f"Unsupported document storage backend: {config.DOCUMENT_STORAGE_BACKEND}")


def delete_pdf(doc_id: str, original_filename: str) -> None:
    if config.DOCUMENT_STORAGE_BACKEND == "local":
        local_path(doc_id, original_filename).unlink(missing_ok=True)
        return

    if config.DOCUMENT_STORAGE_BACKEND == "s3":
        _s3_client().delete_object(
            Bucket=_require_s3_bucket(),
            Key=object_key(doc_id, original_filename),
        )
        return

    raise RuntimeError(f"Unsupported document storage backend: {config.DOCUMENT_STORAGE_BACKEND}")


def pdf_exists(doc_id: str, original_filename: str) -> bool:
    if config.DOCUMENT_STORAGE_BACKEND == "local":
        return local_path(doc_id, original_filename).exists()

    if config.DOCUMENT_STORAGE_BACKEND == "s3":
        try:
            _s3_client().head_object(
                Bucket=_require_s3_bucket(),
                Key=object_key(doc_id, original_filename),
            )
            return True
        except Exception:
            return False

    raise RuntimeError(f"Unsupported document storage backend: {config.DOCUMENT_STORAGE_BACKEND}")


def read_pdf(doc_id: str, original_filename: str) -> io.BytesIO | Path | None:
    if config.DOCUMENT_STORAGE_BACKEND == "local":
        path = local_path(doc_id, original_filename)
        return path if path.exists() else None

    if config.DOCUMENT_STORAGE_BACKEND == "s3":
        try:
            response = _s3_client().get_object(
                Bucket=_require_s3_bucket(),
                Key=object_key(doc_id, original_filename),
            )
            return io.BytesIO(response["Body"].read())
        except Exception as exc:
            logger.warning("Could not read stored PDF %s: %s", doc_id, exc)
            return None

    raise RuntimeError(f"Unsupported document storage backend: {config.DOCUMENT_STORAGE_BACKEND}")
