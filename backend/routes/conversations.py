import json

from flask import Blueprint, request, jsonify, g

import database
from middleware.auth import require_auth
from services import session_service

conversations_bp = Blueprint("conversations", __name__)


@conversations_bp.get("/api/conversations")
@require_auth
def list_conversations():
    with database.get_db() as conn:
        rows = conn.execute("""
            SELECT
                c.session_id,
                c.title,
                c.doc_ids,
                c.created_at,
                c.last_active,
                COUNT(m.id) AS message_count,
                (
                    SELECT content
                    FROM messages
                    WHERE session_id = c.session_id AND role = 'assistant'
                    ORDER BY created_at DESC
                    LIMIT 1
                ) AS preview
            FROM conversations c
            LEFT JOIN messages m ON m.session_id = c.session_id
            WHERE c.user_id = ?
            GROUP BY c.session_id
            ORDER BY c.last_active DESC
        """, (g.user.id,)).fetchall()

    return jsonify({
        "conversations": [
            {
                "session_id":    r["session_id"],
                "title":         r["title"],
                "doc_ids":       json.loads(r["doc_ids"]),
                "created_at":    r["created_at"],
                "last_active":   r["last_active"],
                "message_count": r["message_count"],
                "preview":       (r["preview"] or "")[:120],
            }
            for r in rows
        ]
    }), 200


@conversations_bp.get("/api/conversations/<session_id>")
@require_auth
def get_conversation(session_id: str):
    with database.get_db() as conn:
        conv = conn.execute(
            "SELECT session_id, title, doc_ids, created_at, last_active, user_id "
            "FROM conversations WHERE session_id=?",
            (session_id,),
        ).fetchone()
        if conv is None:
            return jsonify({"error": "Not found"}), 404
        if conv["user_id"] != g.user.id:
            return jsonify({"error": "Access denied"}), 403

        msgs = conn.execute(
            "SELECT role, content, citations, actual_provider, actual_model "
            "FROM messages WHERE session_id=? ORDER BY created_at",
            (session_id,),
        ).fetchall()

    return jsonify({
        "conversation": {
            "session_id":  conv["session_id"],
            "title":       conv["title"],
            "doc_ids":     json.loads(conv["doc_ids"]),
            "created_at":  conv["created_at"],
            "last_active": conv["last_active"],
        },
        "messages": [
            {
                "role":            m["role"],
                "content":         m["content"],
                "citations":       json.loads(m["citations"]) if m["citations"] else None,
                "actual_provider": m["actual_provider"],
                "actual_model":    m["actual_model"],
            }
            for m in msgs
        ],
    }), 200


@conversations_bp.put("/api/conversations/<session_id>")
@require_auth
def update_conversation(session_id: str):
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title is required"}), 400
    with database.get_db() as conn:
        conv = conn.execute(
            "SELECT user_id FROM conversations WHERE session_id=?", (session_id,)
        ).fetchone()
        if conv is None:
            return jsonify({"error": "Not found"}), 404
        if conv["user_id"] != g.user.id:
            return jsonify({"error": "Access denied"}), 403
        conn.execute(
            "UPDATE conversations SET title=? WHERE session_id=?",
            (title, session_id),
        )
    return jsonify({"updated": True}), 200


@conversations_bp.delete("/api/conversations/<session_id>")
@require_auth
def delete_conversation(session_id: str):
    with database.get_db() as conn:
        conv = conn.execute(
            "SELECT user_id FROM conversations WHERE session_id=?", (session_id,)
        ).fetchone()
        if conv is None:
            return jsonify({"error": "Not found"}), 404
        if conv["user_id"] != g.user.id:
            return jsonify({"error": "Access denied"}), 403
    session_service.delete(session_id)
    return jsonify({"deleted": True}), 200
