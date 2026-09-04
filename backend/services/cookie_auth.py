"""Cookie-based transport for the session JWT.

The token used to live in localStorage, where any XSS could read it. It now
travels in an httpOnly cookie the page cannot touch. Because cookies are sent
automatically, state-changing requests also carry a double-submit CSRF token:
a readable cookie the client echoes back in a header.
"""

import secrets

from flask import Response, request

import config

ACCESS_COOKIE = "ensetai_token"
CSRF_COOKIE = "ensetai_csrf"
CSRF_HEADER = "X-CSRF-Token"

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _secure() -> bool:
    """Only mark cookies Secure when the app is actually served over TLS."""
    return request.is_secure or request.headers.get("X-Forwarded-Proto") == "https"


def set_auth_cookies(response: Response, token: str) -> Response:
    max_age = config.JWT_EXPIRY_HOURS * 3600
    response.set_cookie(
        ACCESS_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        secure=_secure(),
        samesite="Lax",
        path="/",
    )
    # Readable by JS on purpose — it is echoed back in a header, and an
    # attacker on another origin can neither read it nor set the header.
    response.set_cookie(
        CSRF_COOKIE,
        secrets.token_urlsafe(32),
        max_age=max_age,
        httponly=False,
        secure=_secure(),
        samesite="Lax",
        path="/",
    )
    return response


def clear_auth_cookies(response: Response) -> Response:
    for name in (ACCESS_COOKIE, CSRF_COOKIE):
        response.delete_cookie(name, path="/")
    return response


def token_from_request() -> tuple[str | None, bool]:
    """Return (token, came_from_cookie).

    The Authorization header still works so scripts and curl keep functioning;
    only cookie-borne credentials need the CSRF check.
    """
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:], False
    cookie = request.cookies.get(ACCESS_COOKIE)
    if cookie:
        return cookie, True
    return None, False


def csrf_ok() -> bool:
    if request.method in SAFE_METHODS:
        return True
    sent = request.headers.get(CSRF_HEADER, "")
    expected = request.cookies.get(CSRF_COOKIE, "")
    return bool(sent) and bool(expected) and secrets.compare_digest(sent, expected)
