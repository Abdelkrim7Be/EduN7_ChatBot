from flask import Blueprint, request, jsonify, g, make_response

from middleware.auth import require_auth
from services.cookie_auth import (
    set_auth_cookies,
    clear_auth_cookies,
    token_from_request,
)
from services.auth_service import (
    register_user, 
    authenticate_user, 
    create_jwt, 
    AuthError, 
    revoke_token,
    update_user_profile,
    change_password
)

auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/api/auth/register")
def register():
    data = request.get_json(silent=True) or {}
    email    = (data.get("email")    or "").strip()
    name     = (data.get("name")     or "").strip()
    password = (data.get("password") or "").strip()

    import config
    if not config.is_registration_allowed():
        return jsonify({"error": "Registration is currently disabled"}), 403

    try:
        user = register_user(email, name, password)
    except AuthError as e:
        return jsonify({"error": str(e)}), e.status

    token = create_jwt(user)
    resp = make_response(jsonify({"user": user.to_dict()}), 201)
    return set_auth_cookies(resp, token)


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
    resp = make_response(jsonify({"user": user.to_dict()}), 200)
    return set_auth_cookies(resp, token)


@auth_bp.get("/api/auth/me")
@require_auth
def me():
    return jsonify({"user": g.user.to_dict()}), 200


@auth_bp.post("/api/auth/logout")
@require_auth
def logout():
    token, _ = token_from_request()
    if token:
        revoke_token(token)
    resp = make_response(jsonify({"ok": True}), 200)
    return clear_auth_cookies(resp)


@auth_bp.put("/api/auth/profile")
@require_auth
def update_profile():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    avatar_url = data.get("avatar_url")
    
    try:
        updated_user = update_user_profile(g.user.id, name, avatar_url)
    except AuthError as e:
        return jsonify({"error": str(e)}), e.status

    # Re-issue the token so the name/avatar in the payload stay current.
    token = create_jwt(updated_user)
    resp = make_response(jsonify({"user": updated_user.to_dict()}), 200)
    return set_auth_cookies(resp, token)


@auth_bp.put("/api/auth/password")
@require_auth
def update_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    
    if not current_password or not new_password:
        return jsonify({"error": "current_password and new_password are required"}), 400
        
    try:
        change_password(g.user.id, current_password, new_password)
    except AuthError as e:
        return jsonify({"error": str(e)}), e.status
        
    return jsonify({"updated": True}), 200
