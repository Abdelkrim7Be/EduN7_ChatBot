import os
import logging
from pathlib import Path

from flask import Blueprint, request, jsonify, g

import config
from limiter_instance import limiter
from middleware.auth import require_auth
from services import document_service, session_service

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
    # Only professors/admins may create shared documents
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
        # Replace existing doc with same name for this user
        try:
            existing = document_service.get_by_name(safe_name, g.user.id)
            if existing:
                document_service.delete(existing.doc_id, g.user.id, g.user.role)
        except Exception:
            pass

        save_path = upload_dir / safe_name
        f.save(str(save_path))

        try:
            record = document_service.ingest(str(save_path), safe_name, g.user.id, requested_scope)
            records.append(record.to_dict())
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
