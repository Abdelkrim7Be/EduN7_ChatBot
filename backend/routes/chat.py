import logging

from flask import Blueprint, request, jsonify, Response, stream_with_context, g

import config
from limiter_instance import limiter
from middleware.auth import require_auth
from services import session_service, chat_service, document_service

logger = logging.getLogger(__name__)
chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/api/sessions", methods=["POST"])
@require_auth
def create_session():
    session_id = session_service.create_new(g.user.id)
    return jsonify({"session_id": session_id}), 200


@chat_bp.route("/api/sessions/<session_id>", methods=["DELETE"])
@require_auth
def delete_session(session_id: str):
    try:
        session_service.get_or_create(session_id, g.user.id)  # ownership check
    except PermissionError:
        return jsonify({"error": "Access denied"}), 403
    session_service.delete(session_id)
    return jsonify({"cleared": True}), 200


@chat_bp.route("/api/chat/stream", methods=["POST"])
@require_auth
@limiter.limit(config.RATE_LIMIT_CHAT)
def chat_stream():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id", "").strip()
    message = data.get("message", "").strip()
    doc_ids: list[str] = data.get("doc_ids", [])
    provider: str = data.get("provider", config.DEFAULT_PROVIDER).strip()
    model: str = data.get("model", config.DEFAULT_MODEL).strip()

    if not message:
        return jsonify({"error": "message is required"}), 400
    if not session_id:
        return jsonify({"error": "session_id is required"}), 400

    # Verify session ownership
    try:
        session_service.get_or_create(session_id, g.user.id)
    except PermissionError:
        return jsonify({"error": "Access denied"}), 403

    # Verify access to all requested doc_ids
    for doc_id in doc_ids:
        doc = document_service.get(doc_id, g.user.id)
        if doc is None:
            return jsonify({"error": f"Document {doc_id} not found or access denied"}), 403

    def generate():
        yield from chat_service.stream_response(session_id, message, doc_ids, provider, model)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
