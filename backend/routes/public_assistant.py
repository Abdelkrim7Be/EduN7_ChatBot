from flask import Blueprint, Response, jsonify, request, stream_with_context

from limiter_instance import limiter
from services import public_assistant_service

public_assistant_bp = Blueprint("public_assistant", __name__)


@public_assistant_bp.get("/api/public-assistant/config")
def config():
    return jsonify(public_assistant_service.public_config()), 200


@public_assistant_bp.post("/api/public-assistant/stream")
@limiter.limit("5 per minute")
@limiter.limit(lambda: public_assistant_service.hourly_limit())
def stream():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message") or "").strip()
    if len(message) > public_assistant_service.MAX_MESSAGE_CHARS:
        return jsonify({"error": "The message is too long."}), 400
    history = public_assistant_service.sanitize_history(data.get("history"))

    def generate():
        yield from public_assistant_service.stream_response(
            message,
            history,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
        )

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
