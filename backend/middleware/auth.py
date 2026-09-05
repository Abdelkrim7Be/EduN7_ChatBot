import functools

from flask import g, jsonify, request

import database
from models.user import UserRecord
from services.auth_service import AuthError, decode_jwt
from services.cookie_auth import csrf_ok, token_from_request
from services.permissions_service import ENDPOINT_PERMISSIONS, role_has_permission


def require_auth(f):
    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        token, from_cookie = token_from_request()
        if not token:
            return jsonify({"error": "Not authenticated"}), 401
        if from_cookie and not csrf_ok():
            return jsonify({"error": "Invalid or missing CSRF token"}), 403
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
            if not hasattr(g, "user"):
                return jsonify({"error": "Forbidden"}), 403
            if g.user.role in roles:
                return f(*args, **kwargs)
            permission = ENDPOINT_PERMISSIONS.get(request.endpoint or "")
            if permission and role_has_permission(g.user.role, permission):
                return f(*args, **kwargs)
            return jsonify({"error": "Forbidden"}), 403
        return wrapped
    return decorator
