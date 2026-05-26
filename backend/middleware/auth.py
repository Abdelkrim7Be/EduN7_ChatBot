import functools
from flask import request, jsonify, g
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
        g.user = UserRecord(
            id=payload["sub"],
            email=payload["email"],
            name=payload["name"],
            role=payload["role"],
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
