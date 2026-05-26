import os
import uuid
import logging
from pathlib import Path

from flask import Blueprint, request, jsonify, g

import config
from limiter_instance import limiter
from middleware.auth import require_auth
from services import document_service, session_service
from services.ingest_worker import submit as submit_ingest

logger = logging.getLogger(__name__)
documents_bp = Blueprint("documents", __name__)

ALLOWED_SCOPES = {"private", "shared"}
PRIVILEGED_ROLES = {"professor", "admin"}


@documents_bp.route("/api/documents/upload", methods=["POST"])
@require_auth
@limiter.limit(config.RATE_LIMIT_UPLOAD)
def upload():
    files = request.files.getlist("files[]")
    if not files or all(f.filename == "" for f in files):
        return jsonify({"error": "No files provided"}), 400

    session_id = request.form.get("session_id", "").strip()

    requested_scope = request.form.get("scope", "private").strip()
    if requested_scope not in ALLOWED_SCOPES:
        requested_scope = "private"
    if requested_scope == "shared" and g.user.role not in PRIVILEGED_ROLES:
        requested_scope = "private"

    records = []
    upload_dir = Path(config.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    for f in files:
        if not f.filename.lower().endswith(".pdf"):
            return jsonify({"error": f"Only PDF files accepted, got: {f.filename}"}), 422

        safe_name = os.path.basename(f.filename)

        # Remove any previous doc with the same filename for this user
        try:
            existing = document_service.get_by_name(safe_name, g.user.id)
            if existing:
                document_service.delete(existing.doc_id, g.user.id, g.user.role)
        except Exception:
            pass

        doc_id = str(uuid.uuid4())[:8]
        # Save with doc_id prefix so each file has a unique, stable path for preview
        save_path = upload_dir / f"{doc_id}_{safe_name}"
        f.save(str(save_path))

        # Create DB record immediately (status='uploading') — returns before processing
        record = document_service.create_pending(doc_id, safe_name, g.user.id, requested_scope)
        records.append(record.to_dict())

        # Process in background thread
        submit_ingest(document_service.process, doc_id, str(save_path), safe_name)

    if session_id and records:
        session_service.update_doc_ids(session_id, [r["doc_id"] for r in records])

    return jsonify({"documents": records}), 200


@documents_bp.route("/api/documents/<doc_id>/status", methods=["GET"])
@require_auth
def get_document_status(doc_id: str):
    result = document_service.get_status(doc_id, g.user.id, g.user.role)
    if result is None:
        return jsonify({"error": "Not found or access denied"}), 404
    return jsonify(result), 200


@documents_bp.route("/api/documents/<doc_id>/preview", methods=["GET"])
@require_auth
def get_document_preview(doc_id: str):
    page = request.args.get("page", 1, type=int)
    result = document_service.get_preview(doc_id, g.user.id, g.user.role, page)
    if result is None:
        return jsonify({"error": "Not found or access denied"}), 404
    if "error" in result:
        code = 409 if result["error"] == "not_ready" else 404
        return jsonify({"error": result["error"]}), code
    return jsonify(result), 200


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
