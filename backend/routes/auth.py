from flask import Blueprint, request, jsonify, g

from middleware.auth import require_auth
from services.auth_service import register_user, authenticate_user, create_jwt, AuthError

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip()
    name     = (data.get("name")     or "").strip()
    password = (data.get("password") or "").strip()

    try:
        user = register_user(email, name, password)
    except AuthError as e:
        return jsonify({"error": str(e)}), e.status

    token = create_jwt(user)
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.post("/api/auth/login")
def login():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    try:
        user = authenticate_user(email, password)
    except AuthError as e:
        return jsonify({"error": str(e)}), e.status

    token = create_jwt(user)
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.get("/api/auth/me")
@require_auth
def me():
    return jsonify({"user": g.user.to_dict()}), 200


@auth_bp.post("/api/auth/logout")
def logout():
    return jsonify({"ok": True}), 200
