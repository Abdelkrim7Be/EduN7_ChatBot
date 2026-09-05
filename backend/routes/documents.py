import logging
import os
from pathlib import Path

from flask import Blueprint, g, jsonify, request, send_file

import config
from limiter_instance import limiter
from middleware.auth import require_auth
from services import document_service, document_storage, session_service
from services.permissions_service import role_has_permission

logger = logging.getLogger(__name__)
documents_bp = Blueprint("documents", __name__)

ALLOWED_SCOPES = {"private", "shared"}
PRIVILEGED_ROLES = {"professor", "admin"}

PDF_MAGIC = b"%PDF-"


def _max_upload_bytes() -> int:
    from services.settings_service import get_int
    return get_int("max_upload_size_mb", 50) * 1024 * 1024


@documents_bp.route("/api/documents/upload", methods=["POST"])
@require_auth
@limiter.limit(config.RATE_LIMIT_UPLOAD)
def upload():
    files = request.files.getlist("files[]")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files provided"}), 400

    session_id = request.form.get("session_id", "").strip()
    # Only professors/admins may create shared documents
    requested_scope = request.form.get("scope", "private").strip()
    if requested_scope not in ALLOWED_SCOPES:
        requested_scope = "private"
    if (
        requested_scope == "shared"
        and g.user.role not in PRIVILEGED_ROLES
        and not role_has_permission(g.user.role, "library.upload_shared")
    ):
        requested_scope = "private"

    records = []
    upload_dir = Path(config.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    max_bytes = _max_upload_bytes()

    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            return jsonify({"error": f"Only PDF files accepted, got: {f.filename}"}), 422

        # Reject oversized or non-PDF payloads before touching disk.
        f.stream.seek(0, os.SEEK_END)
        size = f.stream.tell()
        f.stream.seek(0)
        if size > max_bytes:
            return jsonify({
                "error": f"{f.filename} is {size // (1024 * 1024)} MB — the limit is {max_bytes // (1024 * 1024)} MB"
            }), 413
        if f.stream.read(5) != PDF_MAGIC:
            return jsonify({"error": f"{f.filename} is not a valid PDF file"}), 422
        f.stream.seek(0)

        safe_name = os.path.basename(f.filename)
        # Replace existing doc with same name for this user
        try:
            existing = document_service.get_by_name(safe_name, g.user.id)
            if existing:
                document_service.delete(existing.doc_id, g.user.id, g.user.role)
        except Exception:
            pass

        save_path = upload_dir / f"{g.user.id}_{safe_name}"
        f.save(str(save_path))

        try:
            record = document_service.ingest(str(save_path), safe_name, g.user.id, requested_scope)
            records.append(record.to_dict())
        except ValueError as e:
            logger.warning("Security scan rejected %s: %s", safe_name, e)
            return jsonify({"error": f"Security scan failed: {e}"}), 422
        except Exception as e:
            logger.error("Ingestion failed for %s: %s", safe_name, e)
            return jsonify({"error": f"Ingestion failed: {e}"}), 500

    if session_id and records:
        session_service.update_doc_ids(session_id, [r["doc_id"] for r in records])

    return jsonify({"documents": records}), 200


@documents_bp.route("/api/documents", methods=["GET"])
@require_auth
def list_documents():
    docs = document_service.list_accessible(g.user.id)
    return jsonify({"documents": [r.to_dict() for r in docs]}), 200


@documents_bp.route("/api/documents/<doc_id>", methods=["DELETE"])
@require_auth
def delete_document(doc_id: str):
    deleted = document_service.delete(doc_id, g.user.id, g.user.role)
    if not deleted:
        return jsonify({"error": "Document not found or access denied"}), 404
    return jsonify({"deleted": True}), 200

@documents_bp.route("/api/documents/<doc_id>/status", methods=["GET"])
@require_auth
def document_status(doc_id: str):
    doc = document_service.get(doc_id, g.user.id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({
        "doc_id": doc.doc_id,
        "status": "ready",
        "error_message": None,
        "page_count": doc.page_count,
        "chunk_count": doc.chunk_count
    }), 200


@documents_bp.route("/api/documents/<doc_id>/file", methods=["GET"])
@require_auth
def document_file(doc_id: str):
    doc = document_service.get(doc_id, g.user.id)
    if not doc:
        return jsonify({"error": "Document not found"}), 404
    stored_pdf = document_storage.read_pdf(doc.doc_id, doc.original_filename)
    if stored_pdf is None:
        return jsonify({"error": "Document file not found"}), 404
    response = send_file(
        stored_pdf,
        mimetype="application/pdf",
        as_attachment=False,
        download_name=doc.original_filename,
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Content-Security-Policy"] = "sandbox"
    return response
