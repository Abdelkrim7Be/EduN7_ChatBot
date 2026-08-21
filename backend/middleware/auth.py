import functools
from flask import request, jsonify, g

import database
from services.auth_service import decode_jwt, AuthError
from models.user import UserRecord


def require_auth(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header[7:]
        try:
            payload = decode_jwt(token)
        except AuthError as e:
            return jsonify({"error": str(e)}), e.status
        # Re-read the live user row: role changes and suspensions must take
        # effect immediately, not only once the old token expires.
        with database.get_db() as conn:
            row = conn.execute(
                "SELECT id, email, name, role, avatar_url, is_suspended FROM users WHERE id=?",
                (payload["sub"],),
            ).fetchone()
        if row is None:
            return jsonify({"error": "Account no longer exists"}), 401
        if row["is_suspended"]:
            return jsonify({"error": "Your account has been suspended."}), 403

        g.user = UserRecord(
            id=row["id"],
            email=row["email"],
            name=row["name"],
            role=row["role"],
            avatar_url=row["avatar_url"] or "",
        )
        return f(*args, **kwargs)
    return wrapped


def require_role(*roles):
    def decorator(f):
        @functools.wraps(f)
        def wrapped(*args, **kwargs):
            if not hasattr(g, "user") or g.user.role not in roles:
                return jsonify({"error": "Forbidden"}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator
