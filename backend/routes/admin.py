import re
import time
from pathlib import Path

from flask import Blueprint, Response, g, jsonify, request, send_file, stream_with_context

import config
import database
from middleware.auth import require_auth, require_role
from services import (
    audit_service,
    document_service,
    document_storage,
    public_assistant_service,
)
from services.llm_factory import available_model_pairs, get_available_providers, parse_model_pair
from services.permissions_service import (
    PERMISSIONS,
    get_role_permissions,
    normalize_permissions,
    set_role_permissions,
)

admin_bp = Blueprint("admin", __name__)

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 500
AUDIT_REDACTED_SETTINGS = {
    "system_prompt",
    "public_assistant_context",
    "public_assistant_instructions",
    "public_assistant_greeting",
    "public_assistant_fallback_message",
    "public_assistant_suggested_questions",
}
PUBLIC_ASSISTANT_TEXT_LIMITS = {
    "public_assistant_context": public_assistant_service.MAX_CONTEXT_CHARS,
    "public_assistant_instructions": public_assistant_service.MAX_INSTRUCTIONS_CHARS,
    "public_assistant_greeting": 2000,
    "public_assistant_placeholder": 200,
    "public_assistant_fallback_message": 2000,
    "public_assistant_suggested_questions": 1000,
}


def _page_args() -> tuple[int, int]:
    """Read limit/offset query params, clamped to sane bounds."""
    try:
        limit = int(request.args.get("limit", DEFAULT_PAGE_SIZE))
    except (TypeError, ValueError):
        limit = DEFAULT_PAGE_SIZE
    try:
        offset = int(request.args.get("offset", 0))
    except (TypeError, ValueError):
        offset = 0
    return max(1, min(limit, MAX_PAGE_SIZE)), max(0, offset)


def _setting_audit_details(key: str, value: str) -> str:
    if key in AUDIT_REDACTED_SETTINGS:
        return f"New value: [redacted, {len(value)} chars]"
    return f"New value: {value}"


def _validate_setting_value(key: str, value) -> tuple[str | None, str | None]:
    text = str(value)
    if key == "public_assistant_enabled":
        normalized = text.strip().lower()
        if normalized not in {"true", "false"}:
            return None, "value must be true or false"
        return normalized, None

    if key in PUBLIC_ASSISTANT_TEXT_LIMITS:
        limit = PUBLIC_ASSISTANT_TEXT_LIMITS[key]
        if len(text) > limit:
            return None, f"value must be at most {limit} characters"
        return text, None

    if key == "public_assistant_rate_limit_per_hour":
        try:
            limit = int(text)
        except (TypeError, ValueError):
            return None, "value must be a number"
        if limit < 5 or limit > 120:
            return None, "value must be between 5 and 120"
        return str(limit), None

    if key == "public_assistant_provider":
        provider = text.strip()
        allowed = {option["provider"] for option in public_assistant_service.public_model_options()}
        if provider not in allowed:
            return None, "provider is not allowed for the public assistant"
        return provider, None

    if key == "public_assistant_model":
        model = text.strip()
        allowed = {option["model"] for option in public_assistant_service.public_model_options()}
        if model not in allowed:
            return None, "model is not allowed for the public assistant"
        return model, None

    if key.startswith("model_mode_"):
        pair = parse_model_pair(text.strip())
        if pair is None:
            return None, "value must use provider:model format"
        if pair not in available_model_pairs():
            return None, "model mode must reference a configured provider and available model"
        return text.strip(), None

    return text, None


@admin_bp.get("/api/admin/users")
@require_auth
@require_role("admin")
def list_users():
    limit, offset = _page_args()
    role = (request.args.get("role") or "").strip()
    search = (request.args.get("search") or "").strip()
    status = (request.args.get("status") or "all").strip().lower()
    with database.get_db() as conn:
        params: list[object] = []
        filters = []
        if role:
            filters.append("u.role = ?")
            params.append(role)
        if search:
            filters.append("(u.name LIKE ? OR u.email LIKE ?)")
            params.extend([f"%{search}%", f"%{search}%"])
        if status == "active":
            filters.append("u.is_suspended = 0")
        elif status == "suspended":
            filters.append("u.is_suspended = 1")
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        total = conn.execute(
            f"SELECT COUNT(*) AS c FROM users u {where}",
            params,
        ).fetchone()["c"]

        role_count_filters = []
        role_count_params: list[object] = []
        if search:
            role_count_filters.append("(u.name LIKE ? OR u.email LIKE ?)")
            role_count_params.extend([f"%{search}%", f"%{search}%"])
        if status == "active":
            role_count_filters.append("u.is_suspended = 0")
        elif status == "suspended":
            role_count_filters.append("u.is_suspended = 1")
        role_count_where = f"WHERE {' AND '.join(role_count_filters)}" if role_count_filters else ""
        role_rows = conn.execute(
            f"SELECT u.role, COUNT(*) AS c FROM users u {role_count_where} GROUP BY u.role",
            role_count_params,
        ).fetchall()

        status_count_filters = []
        status_count_params: list[object] = []
        if role:
            status_count_filters.append("u.role = ?")
            status_count_params.append(role)
        if search:
            status_count_filters.append("(u.name LIKE ? OR u.email LIKE ?)")
            status_count_params.extend([f"%{search}%", f"%{search}%"])
        status_count_where = f"WHERE {' AND '.join(status_count_filters)}" if status_count_filters else ""
        status_row = conn.execute(
            f"""
                SELECT
                    COUNT(*) AS all_count,
                    SUM(CASE WHEN u.is_suspended = 0 THEN 1 ELSE 0 END) AS active_count,
                    SUM(CASE WHEN u.is_suspended = 1 THEN 1 ELSE 0 END) AS suspended_count
                FROM users u
                {status_count_where}
            """,
            status_count_params,
        ).fetchone()

        rows = conn.execute(f"""
            SELECT
                u.id, u.email, u.name, u.role, u.created_at, u.last_seen, u.is_suspended,
                COUNT(DISTINCT c.session_id) AS conversation_count,
                COUNT(DISTINCT d.doc_id)     AS document_count
            FROM users u
            LEFT JOIN conversations c ON c.user_id = u.id
            LEFT JOIN documents     d ON d.user_id = u.id
            {where}
            GROUP BY u.id
            ORDER BY u.last_seen DESC
            LIMIT ? OFFSET ?
        """, (*params, limit, offset)).fetchall()
    role_counts = {r["role"]: r["c"] for r in role_rows}
    return jsonify({
        "total": total,
        "role_counts": role_counts,
        "status_counts": {
            "all": status_row["all_count"] or 0,
            "active": status_row["active_count"] or 0,
            "suspended": status_row["suspended_count"] or 0,
        },
        "users": [
            {
                "id":                 r["id"],
                "email":              r["email"],
                "name":               r["name"],
                "role":               r["role"],
                "created_at":         r["created_at"],
                "last_seen":          r["last_seen"],
                "is_suspended":       bool(r["is_suspended"]),
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
    with database.get_db() as conn:
        valid_roles = {r["name"] for r in conn.execute("SELECT name FROM roles").fetchall()}
    if role not in valid_roles:
        return jsonify({"error": f"role must be one of {sorted(valid_roles)}"}), 400
    if user_id == g.user.id and role != "admin":
        return jsonify({"error": "You cannot remove your own admin role"}), 400
    with database.get_db() as conn:
        conn.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
    audit_service.log_action("user.role_changed", "user", user_id, f"Changed to {role}")
    return jsonify({"updated": True}), 200


@admin_bp.delete("/api/admin/users/<user_id>")
@require_auth
@require_role("admin")
def delete_user(user_id: str):
    if user_id == g.user.id:
        return jsonify({"error": "You cannot delete your own account"}), 400
    with database.get_db() as conn:
        doc_ids = [r["doc_id"] for r in conn.execute("SELECT doc_id FROM documents WHERE user_id=?", (user_id,)).fetchall()]
        
    for did in doc_ids:
        document_service.delete(did, user_id, "admin")
        
    with database.get_db() as conn:
        conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    audit_service.log_action("user.deleted", "user", user_id)
    return jsonify({"deleted": True}), 200


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
def list_shared_documents():
    scope = request.args.get("scope", "all").lower()
    search = (request.args.get("search") or "").strip()
    limit, offset = _page_args()
    with database.get_db() as conn:
        filters = []
        params: list[object] = []
        if scope == "shared":
            filters.append("d.scope = 'shared'")
        elif scope == "private":
            filters.append("d.scope = 'private'")
        if search:
            filters.append(
                "(d.name LIKE ? OR d.original_filename LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR d.category LIKE ?)"
            )
            params.extend([f"%{search}%"] * 5)
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""

        total = conn.execute(
            f"""
                SELECT COUNT(*) AS c
                FROM documents d
                LEFT JOIN users u ON u.id = d.user_id
                {where_clause}
            """,
            params,
        ).fetchone()["c"]

        count_filters = []
        count_params: list[object] = []
        if search:
            count_filters.append(
                "(d.name LIKE ? OR d.original_filename LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR d.category LIKE ?)"
            )
            count_params.extend([f"%{search}%"] * 5)
        count_where = f"WHERE {' AND '.join(count_filters)}" if count_filters else ""
        scope_rows = conn.execute(f"""
            SELECT d.scope, COUNT(*) AS c
            FROM documents d
            LEFT JOIN users u ON u.id = d.user_id
            {count_where}
            GROUP BY d.scope
        """, count_params).fetchall()

        rows = conn.execute(f"""
            SELECT d.*, u.name AS uploader_name, u.email AS uploader_email
            FROM documents d
            LEFT JOIN users u ON u.id = d.user_id
            {where_clause}
            ORDER BY d.uploaded_at DESC
            LIMIT ? OFFSET ?
        """, params + [limit, offset]).fetchall()
    documents = []
    for r in rows:
        security = document_service.ensure_security_scan(
            r["doc_id"],
            r["original_filename"],
            r["security_status"],
        )
        documents.append({
            "doc_id":              r["doc_id"],
            "name":                r["name"],
            "original_filename":   r["original_filename"],
            "collection_name":     r["collection_name"],
            "page_count":          r["page_count"],
            "chunk_count":         r["chunk_count"],
            "scope":               r["scope"],
            "category":            "Other" if r["category"] == "Autres" else (r["category"] or "Other"),
            "security_status":     security["status"],
            "security_verdict":    security["verdict"],
            "security_checked_at": security["checked_at"],
            "uploaded_at":         r["uploaded_at"],
            "uploader_name":       r["uploader_name"] or "Deleted account",
            "uploader_email":      r["uploader_email"] or "—",
        })
    scope_counts = {r["scope"]: r["c"] for r in scope_rows}
    return jsonify({
        "total": total,
        "scope_counts": {
            "all": sum(scope_counts.values()),
            "shared": scope_counts.get("shared", 0),
            "private": scope_counts.get("private", 0),
        },
        "documents": documents,
    }), 200


@admin_bp.get("/api/admin/documents/<doc_id>/file")
@require_auth
@require_role("admin", "professor")
def preview_document_file(doc_id: str):
    doc = document_service.get(doc_id, None)
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


@admin_bp.delete("/api/admin/documents/<doc_id>")
@require_auth
@require_role("admin")
def delete_document(doc_id: str):
    success = document_service.delete(doc_id, user_id="", role="admin")
    if not success:
        return jsonify({"error": "Failed to delete document or not found"}), 404
    audit_service.log_action("document.deleted", "document", doc_id)
    return jsonify({"deleted": True}), 200


@admin_bp.get("/api/admin/conversations")
@require_auth
@require_role("admin")
def list_conversations():
    search = request.args.get("search", "").strip()
    limit, offset = _page_args()
    count_query = "SELECT COUNT(*) AS c FROM conversations c LEFT JOIN users u ON u.id = c.user_id"
    query = """
        SELECT c.session_id, c.title, c.created_at, c.last_active, 
               u.name as user_name, u.email as user_email,
               (SELECT COUNT(*) FROM messages m WHERE m.session_id = c.session_id) as message_count,
               (SELECT content FROM messages m WHERE m.session_id = c.session_id ORDER BY created_at DESC LIMIT 1) as last_message
        FROM conversations c
        LEFT JOIN users u ON u.id = c.user_id
    """
    params = []
    if search:
        where = " WHERE u.name LIKE ? OR u.email LIKE ? OR c.title LIKE ?"
        query += where
        count_query += where
        params = [f"%{search}%", f"%{search}%", f"%{search}%"]

    query += " ORDER BY c.last_active DESC LIMIT ? OFFSET ?"

    with database.get_db() as conn:
        total = conn.execute(count_query, params).fetchone()["c"]
        rows = conn.execute(query, params + [limit, offset]).fetchall()

    return jsonify({
        "total": total,
        "conversations": [
            {
                "session_id": r["session_id"],
                "title": r["title"],
                "created_at": r["created_at"],
                "last_active": r["last_active"],
                "user_name": r["user_name"],
                "user_email": r["user_email"],
                "message_count": r["message_count"],
                "last_message": r["last_message"],
            }
            for r in rows
        ]
    }), 200


@admin_bp.get("/api/admin/conversations/<session_id>")
@require_auth
@require_role("admin")
def get_conversation(session_id: str):
    with database.get_db() as conn:
        c_row = conn.execute("SELECT * FROM conversations WHERE session_id=?", (session_id,)).fetchone()
        if not c_row:
            return jsonify({"error": "Conversation not found"}), 404
            
        m_rows = conn.execute("SELECT * FROM messages WHERE session_id=? ORDER BY created_at ASC", (session_id,)).fetchall()
        
    return jsonify({
        "conversation": {
            "session_id": c_row["session_id"],
            "title": c_row["title"],
            "created_at": c_row["created_at"],
            "last_active": c_row["last_active"],
            "doc_ids": c_row["doc_ids"],
        },
        "messages": [
            {
                "id": r["id"],
                "role": r["role"],
                "content": r["content"],
                "citations": r["citations"],
                "actual_provider": r["actual_provider"],
                "actual_model": r["actual_model"],
                "created_at": r["created_at"],
            }
            for r in m_rows
        ]
    }), 200


@admin_bp.delete("/api/admin/conversations/<session_id>")
@require_auth
@require_role("admin")
def delete_conversation(session_id: str):
    with database.get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE session_id=?", (session_id,))
    audit_service.log_action("conversation.deleted", "conversation", session_id)
    return jsonify({"deleted": True}), 200


@admin_bp.get("/api/admin/settings")
@require_auth
@require_role("admin")
def get_settings():
    with database.get_db() as conn:
        rows = conn.execute("SELECT key, value, label, description, kind, updated_at, updated_by FROM settings").fetchall()
    return jsonify({
        "settings": [dict(r) for r in rows]
    }), 200


@admin_bp.get("/api/admin/public-assistant/model-options")
@require_auth
@require_role("admin")
def public_assistant_model_options():
    return jsonify({"options": public_assistant_service.public_model_options()}), 200


@admin_bp.post("/api/admin/public-assistant/preview")
@require_auth
@require_role("admin")
def public_assistant_preview():
    data = request.get_json(silent=True) or {}
    message = str(data.get("message") or "").strip()
    if len(message) > public_assistant_service.MAX_MESSAGE_CHARS:
        return jsonify({"error": "The message is too long."}), 400

    overrides = {}
    raw_settings = data.get("settings") or {}
    if isinstance(raw_settings, dict):
        for key, value in raw_settings.items():
            if not str(key).startswith("public_assistant_"):
                continue
            normalized, validation_error = _validate_setting_value(str(key), value)
            if validation_error:
                return jsonify({"error": f"{key}: {validation_error}"}), 400
            overrides[str(key)] = normalized

    history = public_assistant_service.sanitize_history(data.get("history"))

    def generate():
        yield from public_assistant_service.stream_response(
            message,
            history,
            ip_address=request.remote_addr,
            user_agent=request.headers.get("User-Agent"),
            overrides=overrides,
            require_enabled=False,
            record_events=False,
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


def _health_item(name: str, status: str, detail: str = "") -> dict:
    return {"name": name, "status": status, "detail": detail}


def _platform_health_items() -> list[dict]:
    items = []
    try:
        with database.get_db() as conn:
            conn.execute("SELECT 1").fetchone()
        items.append(_health_item("Database", "ok", "Connection and query succeeded"))
    except Exception as exc:
        items.append(_health_item("Database", "error", str(exc)))

    try:
        if config.REDIS_URL:
            import redis
            redis.from_url(config.REDIS_URL, socket_connect_timeout=1, socket_timeout=1).ping()
            items.append(_health_item("Rate limits", "ok", "Redis is reachable"))
        else:
            items.append(_health_item("Rate limits", "warning", "Using in-memory counters"))
    except Exception as exc:
        items.append(_health_item("Rate limits", "error", str(exc)))

    try:
        if config.DOCUMENT_STORAGE_BACKEND == "local":
            path = Path(config.UPLOAD_DIR)
            path.mkdir(parents=True, exist_ok=True)
            items.append(_health_item("Document storage", "ok", f"Local path: {path}"))
        elif config.DOCUMENT_STORAGE_BACKEND == "s3":
            from services import document_storage
            document_storage._s3_client().head_bucket(Bucket=config.S3_BUCKET)
            items.append(_health_item("Document storage", "ok", f"S3 bucket: {config.S3_BUCKET}"))
        else:
            items.append(_health_item("Document storage", "error", f"Unsupported backend: {config.DOCUMENT_STORAGE_BACKEND}"))
    except Exception as exc:
        items.append(_health_item("Document storage", "error", str(exc)))

    try:
        if config.VECTOR_STORE_BACKEND == "chroma":
            from services import vector_store_service
            vector_store_service._chroma_client().heartbeat()
            items.append(_health_item("Vector store", "ok", "Chroma is reachable"))
        elif config.VECTOR_STORE_BACKEND == "qdrant":
            from services import vector_store_service
            vector_store_service._qdrant_client().get_collections()
            items.append(_health_item("Vector store", "ok", "Qdrant is reachable"))
        else:
            items.append(_health_item("Vector store", "error", f"Unsupported backend: {config.VECTOR_STORE_BACKEND}"))
    except Exception as exc:
        items.append(_health_item("Vector store", "error", str(exc)))

    providers = get_available_providers()
    available = [provider for provider in providers if provider.get("available")]
    items.append(_health_item(
        "LLM providers",
        "ok" if available else "warning",
        f"{len(available)} of {len(providers)} configured",
    ))

    public_config = public_assistant_service.public_config()
    items.append(_health_item(
        "Landing assistant",
        "ok" if public_config.get("enabled") else "warning",
        "Enabled and ready" if public_config.get("enabled") else "Disabled or missing public context/model",
    ))
    return items


@admin_bp.get("/api/admin/platform-health")
@require_auth
@require_role("admin")
def platform_health():
    items = _platform_health_items()
    if any(item["status"] == "error" for item in items):
        overall = "error"
    elif any(item["status"] == "warning" for item in items):
        overall = "warning"
    else:
        overall = "ok"
    return jsonify({"overall": overall, "components": items, "checked_at": time.time()}), 200


@admin_bp.put("/api/admin/settings/<key>")
@require_auth
@require_role("admin")
def update_setting(key: str):
    data = request.get_json(silent=True) or {}
    value = data.get("value")
    if value is None:
        return jsonify({"error": "value is required"}), 400
    value, validation_error = _validate_setting_value(key, value)
    if validation_error:
        return jsonify({"error": validation_error}), 400
        
    with database.get_db() as conn:
        row = conn.execute("SELECT key FROM settings WHERE key=?", (key,)).fetchone()
        if not row:
            return jsonify({"error": "setting not found"}), 404
            
        conn.execute(
            "UPDATE settings SET value=?, updated_at=?, updated_by=? WHERE key=?", 
            (value, time.time(), g.user.email, key)
        )
    from services.settings_service import invalidate_cache
    invalidate_cache()
    audit_service.log_action("setting.changed", "setting", key, _setting_audit_details(key, str(value)))
    return jsonify({"updated": True}), 200


@admin_bp.get("/api/admin/roles")
@require_auth
@require_role("admin")
def get_roles():
    with database.get_db() as conn:
        rows = conn.execute("""
            SELECT r.name, r.description, r.is_builtin, r.created_at,
                   COUNT(u.id) AS user_count
            FROM roles r
            LEFT JOIN users u ON u.role = r.name
            GROUP BY r.name
            ORDER BY r.is_builtin DESC, r.name ASC
        """).fetchall()
    return jsonify({
        "permissions": PERMISSIONS,
        "roles": [
            {
                **dict(r),
                "is_builtin": bool(r["is_builtin"]),
                "permissions": get_role_permissions(r["name"]),
            }
            for r in rows
        ],
    }), 200


@admin_bp.post("/api/admin/roles")
@require_auth
@require_role("admin")
def create_role():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip().lower()
    description = (data.get("description") or "").strip()
    permissions = normalize_permissions(data.get("permissions") or [])
    
    if not name:
        return jsonify({"error": "name is required"}), 400
    if not re.fullmatch(r"[a-z0-9_-]{2,40}", name):
        return jsonify({"error": "name must be 2-40 lowercase letters, digits, _ or -"}), 400
        
    with database.get_db() as conn:
        row = conn.execute("SELECT name FROM roles WHERE name=?", (name,)).fetchone()
        if row:
            return jsonify({"error": "role already exists"}), 400
            
        conn.execute(
            "INSERT INTO roles (name, description, is_builtin, created_at) VALUES (?, ?, 0, ?)",
            (name, description, time.time())
        )
    set_role_permissions(name, permissions)
    audit_service.log_action("role.created", "role", name, description)
    return jsonify({"created": True, "name": name}), 201


@admin_bp.put("/api/admin/roles/<role_name>/permissions")
@require_auth
@require_role("admin")
def update_role_permissions(role_name: str):
    data = request.get_json(silent=True) or {}
    permissions = normalize_permissions(data.get("permissions") or [])
    with database.get_db() as conn:
        row = conn.execute("SELECT name FROM roles WHERE name=?", (role_name,)).fetchone()
        if not row:
            return jsonify({"error": "role not found"}), 404
    updated = set_role_permissions(role_name, permissions)
    audit_service.log_action(
        "role.permissions_changed",
        "role",
        role_name,
        ", ".join(updated),
    )
    return jsonify({"permissions": updated}), 200


@admin_bp.delete("/api/admin/roles/<role_name>")
@require_auth
@require_role("admin")
def delete_role(role_name: str):
    with database.get_db() as conn:
        row = conn.execute("SELECT is_builtin FROM roles WHERE name=?", (role_name,)).fetchone()
        if not row:
            return jsonify({"error": "role not found"}), 404
            
        if row["is_builtin"]:
            return jsonify({"error": "cannot delete built-in role"}), 400
            
        # Optional: check if users are using this role and reject or reassign
        users_count = conn.execute("SELECT COUNT(*) as c FROM users WHERE role=?", (role_name,)).fetchone()["c"]
        if users_count > 0:
            return jsonify({"error": f"cannot delete role: {users_count} users are currently assigned to it"}), 400
            
        conn.execute("DELETE FROM roles WHERE name=?", (role_name,))
    audit_service.log_action("role.deleted", "role", role_name)
    return jsonify({"deleted": True}), 200


@admin_bp.get("/api/admin/audit-log")
@require_auth
@require_role("admin")
def get_audit_log():
    user_id = request.args.get("user_id")
    action = request.args.get("action")
    limit = min(int(request.args.get("limit", 50)), 200)
    offset = int(request.args.get("offset", 0))
    
    logs, total = audit_service.get_logs(user_id=user_id, action=action, limit=limit, offset=offset)
    return jsonify({"logs": logs, "total": total}), 200


@admin_bp.put("/api/admin/users/<user_id>/suspend")
@require_auth
@require_role("admin")
def suspend_user(user_id: str):
    data = request.get_json(silent=True) or {}
    suspended = bool(data.get("suspended", True))
    if user_id == g.user.id and suspended:
        return jsonify({"error": "You cannot suspend your own account"}), 400
    with database.get_db() as conn:
        conn.execute("UPDATE users SET is_suspended=? WHERE id=?", (int(suspended), user_id))
    action = "user.suspended" if suspended else "user.unsuspended"
    audit_service.log_action(action, "user", user_id)
    return jsonify({"updated": True, "is_suspended": suspended}), 200


@admin_bp.get("/api/admin/stats/extended")
@require_auth
@require_role("admin")
def extended_stats():
    import time as _time
    now = _time.time()
    day_ago = now - 86400
    week_ago = now - 604800
    month_ago = now - 2592000
    
    with database.get_db() as conn:
        base = conn.execute("""
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM users WHERE is_suspended = 1) AS suspended_users,
                (SELECT COUNT(*) FROM conversations) AS total_conversations,
                (SELECT COUNT(*) FROM messages) AS total_messages,
                (SELECT COUNT(*) FROM documents) AS total_documents,
                (SELECT COUNT(*) FROM documents WHERE scope='shared') AS shared_documents
        """).fetchone()
        
        # Activity over time periods
        active_today = conn.execute(
            "SELECT COUNT(DISTINCT user_id) AS c FROM conversations WHERE last_active > ?", (day_ago,)
        ).fetchone()["c"]
        
        msgs_today = conn.execute(
            "SELECT COUNT(*) AS c FROM messages WHERE created_at > ?", (day_ago,)
        ).fetchone()["c"]
        
        msgs_week = conn.execute(
            "SELECT COUNT(*) AS c FROM messages WHERE created_at > ?", (week_ago,)
        ).fetchone()["c"]
        
        msgs_month = conn.execute(
            "SELECT COUNT(*) AS c FROM messages WHERE created_at > ?", (month_ago,)
        ).fetchone()["c"]
        
        new_users_week = conn.execute(
            "SELECT COUNT(*) AS c FROM users WHERE created_at > ?", (week_ago,)
        ).fetchone()["c"]
        
        uploads_week = conn.execute(
            "SELECT COUNT(*) AS c FROM documents WHERE uploaded_at > ?", (week_ago,)
        ).fetchone()["c"]
        
        # Role breakdown
        role_rows = conn.execute(
            "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
        ).fetchall()
        roles_breakdown = {r["role"]: r["count"] for r in role_rows}
        
        # Top users by messages
        top_users = conn.execute("""
            SELECT u.name, u.email, COUNT(m.id) AS message_count
            FROM users u
            JOIN conversations c ON c.user_id = u.id
            JOIN messages m ON m.session_id = c.session_id AND m.role = 'user'
            GROUP BY u.id
            ORDER BY message_count DESC
            LIMIT 5
        """).fetchall()
        
        # Messages per day (last 30 days)
        daily_msgs = conn.execute("""
            SELECT 
                CAST((created_at - ?) / 86400 AS INTEGER) AS day_offset,
                COUNT(*) AS count
            FROM messages
            WHERE created_at > ?
            GROUP BY day_offset
            ORDER BY day_offset
        """, (month_ago, month_ago)).fetchall()
        
        # Provider usage
        provider_usage = conn.execute("""
            SELECT actual_provider, actual_model, COUNT(*) AS count
            FROM messages
            WHERE role = 'assistant' AND actual_provider IS NOT NULL
            GROUP BY actual_provider, actual_model
            ORDER BY count DESC
        """).fetchall()
        
        # Recent activity
        recent = conn.execute("""
            SELECT a.action, a.user_email, a.target_type, a.details, a.created_at
            FROM audit_log a
            ORDER BY a.created_at DESC
            LIMIT 10
        """).fetchall()

        public_assistant = conn.execute("""
            SELECT
                COUNT(*) AS total_requests,
                SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS requests_today,
                SUM(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS successful_requests,
                SUM(CASE WHEN outcome != 'success' THEN 1 ELSE 0 END) AS failed_requests,
                AVG(latency_ms) AS avg_latency_ms
            FROM public_assistant_events
        """, (day_ago,)).fetchone()

        public_assistant_outcomes = conn.execute("""
            SELECT outcome, COUNT(*) AS count
            FROM public_assistant_events
            GROUP BY outcome
            ORDER BY count DESC
        """).fetchall()
        
    return jsonify({
        "totals": dict(base),
        "activity": {
            "active_users_today": active_today,
            "messages_today": msgs_today,
            "messages_this_week": msgs_week,
            "messages_this_month": msgs_month,
            "new_users_this_week": new_users_week,
            "uploads_this_week": uploads_week,
        },
        "roles_breakdown": roles_breakdown,
        "top_users": [dict(r) for r in top_users],
        "daily_messages": [dict(r) for r in daily_msgs],
        "provider_usage": [dict(r) for r in provider_usage],
        "public_assistant": {
            **dict(public_assistant),
            "outcomes": [dict(r) for r in public_assistant_outcomes],
        },
        "recent_activity": [dict(r) for r in recent],
    }), 200


@admin_bp.get("/api/admin/announcements")
@require_auth
@require_role("admin")
def list_announcements():
    with database.get_db() as conn:
        rows = conn.execute("""
            SELECT a.*, u.name AS author_name
            FROM announcements a
            LEFT JOIN users u ON u.id = a.created_by
            ORDER BY a.created_at DESC
        """).fetchall()
    return jsonify({"announcements": [dict(r) for r in rows]}), 200


@admin_bp.post("/api/admin/announcements")
@require_auth
@require_role("admin")
def create_announcement():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()
    ann_type = (data.get("type") or "info").strip()
    expires_at = data.get("expires_at")
    
    if not title or not content:
        return jsonify({"error": "title and content are required"}), 400
    
    import time as _time
    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO announcements (title, content, type, is_active, created_by, created_at, expires_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
            (title, content, ann_type, g.user.id, _time.time(), expires_at),
        )
    audit_service.log_action("announcement.created", "announcement", None, title)
    return jsonify({"created": True}), 201


@admin_bp.delete("/api/admin/announcements/<int:ann_id>")
@require_auth
@require_role("admin")
def delete_announcement(ann_id: int):
    with database.get_db() as conn:
        conn.execute("DELETE FROM announcements WHERE id=?", (ann_id,))
    audit_service.log_action("announcement.deleted", "announcement", str(ann_id))
    return jsonify({"deleted": True}), 200


@admin_bp.put("/api/admin/announcements/<int:ann_id>/toggle")
@require_auth
@require_role("admin")
def toggle_announcement(ann_id: int):
    with database.get_db() as conn:
        conn.execute("UPDATE announcements SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id=?", (ann_id,))
    audit_service.log_action("announcement.toggled", "announcement", str(ann_id))
    return jsonify({"toggled": True}), 200


@admin_bp.get("/api/announcements/active")
@require_auth
def active_announcements():
    import time as _time
    now = _time.time()
    with database.get_db() as conn:
        rows = conn.execute("""
            SELECT id, title, content, type, created_at
            FROM announcements
            WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > ?)
            ORDER BY created_at DESC
        """, (now,)).fetchall()
    return jsonify({"announcements": [dict(r) for r in rows]}), 200
