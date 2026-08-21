import time
import uuid
import logging
import hashlib

import bcrypt
import jwt

import config
import database
from models.user import UserRecord

logger = logging.getLogger(__name__)


class AuthError(Exception):
    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.status = status


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise AuthError("Password must be at least 8 characters", 400)
    if not any(c.isupper() for c in password):
        raise AuthError("Password must contain at least one uppercase letter", 400)
    if not any(c.isdigit() for c in password):
        raise AuthError("Password must contain at least one digit", 400)


def register_user(email: str, name: str, password: str) -> UserRecord:
    email = email.strip().lower()
    name = name.strip()

    if not email or not name or not password:
        raise AuthError("email, name, and password are required", 400)
    _validate_password(password)

    if config.ALLOWED_EMAIL_DOMAINS:
        domain = email.split("@")[-1] if "@" in email else ""
        if domain not in config.ALLOWED_EMAIL_DOMAINS:
            raise AuthError(
                f"Registration is restricted to: {', '.join(config.ALLOWED_EMAIL_DOMAINS)}", 403
            )

    with database.get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
        if existing:
            raise AuthError("An account with this email already exists", 409)

        user_id = str(uuid.uuid4())
        now = time.time()
        if email in config.ADMIN_EMAILS:
            role = "admin"
        else:
            from services.settings_service import get_setting
            role = get_setting("default_role", "student")
            if role not in {r["name"] for r in conn.execute("SELECT name FROM roles").fetchall()}:
                role = "student"
        pw_hash = hash_password(password)

        conn.execute(
            "INSERT INTO users (id, email, name, password_hash, role, created_at, last_seen) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, email, name, pw_hash, role, now, now),
        )

    return UserRecord(id=user_id, email=email, name=name, role=role)


def authenticate_user(email: str, password: str) -> UserRecord:
    email = email.strip().lower()
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT id, email, name, password_hash, role, avatar_url, is_suspended FROM users WHERE email=?", (email,)
        ).fetchone()

    if row is None or not verify_password(password, row["password_hash"]):
        raise AuthError("Invalid email or password", 401)
        
    if row["is_suspended"]:
        raise AuthError("Your account has been suspended. Contact an administrator.", 403)

    now = time.time()
    with database.get_db() as conn:
        conn.execute("UPDATE users SET last_seen=? WHERE id=?", (now, row["id"]))

    return UserRecord(id=row["id"], email=row["email"], name=row["name"], role=row["role"], avatar_url=row["avatar_url"])


def create_jwt(user: UserRecord) -> str:
    payload = {
        "sub":   user.id,
        "email": user.email,
        "name":  user.name,
        "role":  user.role,
        "exp":   int(time.time()) + config.JWT_EXPIRY_HOURS * 3600,
        "iat":   int(time.time()),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm="HS256")


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def revoke_token(token: str) -> None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"], options={"verify_exp": False})
        expires_at = payload.get("exp", 0)
    except jwt.InvalidTokenError:
        expires_at = 0
    with database.get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO revoked_tokens (token_hash, revoked_at, expires_at) VALUES (?, ?, ?)",
            (_token_hash(token), time.time(), expires_at),
        )
        # A token past its own expiry is rejected by decode_jwt anyway.
        conn.execute("DELETE FROM revoked_tokens WHERE expires_at > 0 AND expires_at < ?", (time.time(),))


def decode_jwt(token: str) -> dict:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT 1 FROM revoked_tokens WHERE token_hash=?", (_token_hash(token),)
        ).fetchone()
    if row:
        raise AuthError("Token has been revoked", 401)
    try:
        return jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired", 401)
    except jwt.InvalidTokenError as e:
        raise AuthError(f"Invalid token: {e}", 401)


def get_user_by_id(user_id: str) -> UserRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT id, email, name, role, avatar_url FROM users WHERE id=?", (user_id,)
        ).fetchone()
    if row is None:
        return None
    return UserRecord(**dict(row))


def update_user_profile(user_id: str, name: str | None, avatar_url: str | None) -> UserRecord:
    with database.get_db() as conn:
        user = get_user_by_id(user_id)
        if not user:
            raise AuthError("User not found", 404)
        
        new_name = name if name is not None else user.name
        new_avatar_url = avatar_url if avatar_url is not None else user.avatar_url
        
        conn.execute(
            "UPDATE users SET name=?, avatar_url=? WHERE id=?", (new_name, new_avatar_url, user_id)
        )
        user.name = new_name
        user.avatar_url = new_avatar_url
        return user


def change_password(user_id: str, current_password: str, new_password: str) -> None:
    with database.get_db() as conn:
        row = conn.execute("SELECT password_hash FROM users WHERE id=?", (user_id,)).fetchone()
        if row is None:
            raise AuthError("User not found", 404)
        
        if not verify_password(current_password, row["password_hash"]):
            raise AuthError("Incorrect current password", 400)
            
        _validate_password(new_password)
        new_hash = hash_password(new_password)
        
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, user_id))
