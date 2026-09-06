import logging
import time

from flask import g, request

import database

logger = logging.getLogger(__name__)


def log_action(
    action: str,
    target_type: str | None = None,
    target_id: str | None = None,
    details: str | None = None,
    user_id: str | None = None,
    user_email: str | None = None,
) -> None:
    """Record an audit event. Reads user from g.user if not provided."""
    try:
        if user_id is None and hasattr(g, 'user'):
            user_id = g.user.id
            user_email = g.user.email
        
        ip_address = request.remote_addr if request else None
        
        with database.get_db() as conn:
            conn.execute(
                "INSERT INTO audit_log (user_id, user_email, action, target_type, target_id, details, ip_address, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (user_id, user_email, action, target_type, target_id, details, ip_address, time.time()),
            )
    except Exception as e:
        logger.error("Audit log failed: %s", e)


def get_logs(
    user_id: str | None = None,
    action: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """Retrieve audit logs with optional filters."""
    with database.get_db() as conn:
        where_clauses = []
        params: list = []
        
        if user_id:
            where_clauses.append("a.user_id = ?")
            params.append(user_id)
        if action:
            where_clauses.append("a.action LIKE ?")
            params.append(f"%{action}%")
        
        where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
        
        count_row = conn.execute(
            f"SELECT COUNT(*) AS total FROM audit_log a {where_sql}", params
        ).fetchone()
        total = count_row["total"]
        
        rows = conn.execute(
            f"""
            SELECT a.*, u.name AS user_name
            FROM audit_log a
            LEFT JOIN users u ON u.id = a.user_id
            {where_sql}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()
        
        return [dict(r) for r in rows], total
