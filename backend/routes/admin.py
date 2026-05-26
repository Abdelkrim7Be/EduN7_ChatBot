from flask import Blueprint, request, jsonify

import database
from middleware.auth import require_auth, require_role

admin_bp = Blueprint("admin", __name__)

VALID_ROLES = {"student", "professor", "admin"}


@admin_bp.get("/api/admin/users")
@require_auth
@require_role("admin")
def list_users():
    with database.get_db() as conn:
        rows = conn.execute("""
            SELECT
                u.id, u.email, u.name, u.role, u.created_at, u.last_seen,
                COUNT(DISTINCT c.session_id) AS conversation_count,
                COUNT(DISTINCT d.doc_id)     AS document_count
            FROM users u
            LEFT JOIN conversations c ON c.user_id = u.id
            LEFT JOIN documents     d ON d.user_id = u.id
            GROUP BY u.id
            ORDER BY u.last_seen DESC
        """).fetchall()
    return jsonify({
        "users": [
            {
                "id":                 r["id"],
                "email":              r["email"],
                "name":               r["name"],
                "role":               r["role"],
                "created_at":         r["created_at"],
                "last_seen":          r["last_seen"],
                "conversation_count": r["conversation_count"],
                "document_count":     r["document_count"],
            }
            for r in rows
        ]
    }), 200


@admin_bp.put("/api/admin/users/<user_id>/role")
@require_auth
@require_role("admin")
def update_role(user_id: str):
    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "").strip()
    if role not in VALID_ROLES:
        return jsonify({"error": f"role must be one of {sorted(VALID_ROLES)}"}), 400
    with database.get_db() as conn:
        conn.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
    return jsonify({"updated": True}), 200


@admin_bp.get("/api/admin/stats")
@require_auth
@require_role("admin", "professor")
def stats():
    with database.get_db() as conn:
        row = conn.execute("""
            SELECT
                (SELECT COUNT(*) FROM users)         AS user_count,
                (SELECT COUNT(*) FROM conversations) AS conversation_count,
                (SELECT COUNT(*) FROM messages)      AS message_count,
                (SELECT COUNT(*) FROM documents)     AS document_count,
                (SELECT COUNT(*) FROM documents WHERE scope='shared') AS shared_doc_count
        """).fetchone()
    return jsonify({
        "user_count":        row["user_count"],
        "conversation_count": row["conversation_count"],
        "message_count":     row["message_count"],
        "document_count":    row["document_count"],
        "shared_doc_count":  row["shared_doc_count"],
    }), 200


@admin_bp.get("/api/admin/documents")
@require_auth
@require_role("admin", "professor")
def list_admin_documents():
    scope = request.args.get("scope", "all")
    with database.get_db() as conn:
        if scope in ("private", "shared"):
            rows = conn.execute("""
                SELECT d.*, u.name AS uploader_name, u.email AS uploader_email
                FROM documents d
                JOIN users u ON u.id = d.user_id
                WHERE d.scope = ?
                ORDER BY d.uploaded_at DESC
            """, (scope,)).fetchall()
        else:
            rows = conn.execute("""
                SELECT d.*, u.name AS uploader_name, u.email AS uploader_email
                FROM documents d
                JOIN users u ON u.id = d.user_id
                ORDER BY d.uploaded_at DESC
            """).fetchall()
    return jsonify({
        "documents": [
            {
                "doc_id":            r["doc_id"],
                "name":              r["name"],
                "original_filename": r["original_filename"],
                "collection_name":   r["collection_name"],
                "page_count":        r["page_count"],
                "chunk_count":       r["chunk_count"],
                "scope":             r["scope"],
                "category":          r["category"],
                "uploaded_at":       r["uploaded_at"],
                "uploader_name":     r["uploader_name"],
                "uploader_email":    r["uploader_email"],
            }
            for r in rows
        ]
    }), 200


@admin_bp.delete("/api/admin/documents/<doc_id>")
@require_auth
@require_role("admin")
def delete_admin_document(doc_id: str):
    from services import document_service
    from flask import g
    deleted = document_service.delete(doc_id, g.user.id, role="admin")
    if not deleted:
        return jsonify({"error": "Document not found"}), 404
    return jsonify({"deleted": True}), 200
