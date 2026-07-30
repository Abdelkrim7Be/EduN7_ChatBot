import time
import uuid
import logging

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
        role = "admin" if email in config.ADMIN_EMAILS else "student"
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
            "SELECT id, email, name, password_hash, role FROM users WHERE email=?", (email,)
        ).fetchone()

    if row is None or not verify_password(password, row["password_hash"]):
        raise AuthError("Invalid email or password", 401)

    now = time.time()
    with database.get_db() as conn:
        conn.execute("UPDATE users SET last_seen=? WHERE id=?", (now, row["id"]))

    return UserRecord(id=row["id"], email=row["email"], name=row["name"], role=row["role"])


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


_revoked_tokens: set[str] = set()


def revoke_token(token: str) -> None:
    _revoked_tokens.add(token)


def decode_jwt(token: str) -> dict:
    if token in _revoked_tokens:
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
            "SELECT id, email, name, role FROM users WHERE id=?", (user_id,)
        ).fetchone()
    if row is None:
        return None
    return UserRecord(**dict(row))
