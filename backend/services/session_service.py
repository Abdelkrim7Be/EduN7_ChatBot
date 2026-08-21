import json
import time
import uuid

import config
import database
from models.session import SessionRecord


def _ensure_conversation(session_id: str, user_id: str | None = None) -> None:
    now = time.time()
    with database.get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO conversations (session_id, title, doc_ids, created_at, last_active, user_id) "
            "VALUES (?, 'New conversation', '[]', ?, ?, ?)",
            (session_id, now, now, user_id),
        )


def _load_from_db(session_id: str) -> SessionRecord | None:
    with database.get_db() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE session_id=?", (session_id,)).fetchone()
        if not row:
            return None
        msgs = conn.execute(
            "SELECT role, content FROM messages WHERE session_id=? ORDER BY created_at",
            (session_id,)
        ).fetchall()
        messages = [{"role": r["role"], "content": r["content"]} for r in msgs]
        max_msgs = config.MAX_HISTORY_TURNS * 2
        return SessionRecord(
            session_id=session_id,
            messages=messages[-max_msgs:] if messages else [],
        )


def get_or_create(session_id: str, user_id: str | None = None) -> SessionRecord:
    session = _load_from_db(session_id)
    if not session:
        _ensure_conversation(session_id, user_id)
        session = _load_from_db(session_id)

    if user_id is not None:
        with database.get_db() as conn:
            row = conn.execute(
                "SELECT user_id FROM conversations WHERE session_id=?", (session_id,)
            ).fetchone()
        if row and row["user_id"] is not None and row["user_id"] != user_id:
            raise PermissionError(f"Session {session_id} belongs to another user")

    if session:
        session.last_active = time.time()
    return session


def append_turn(
    session_id: str,
    user_msg: str,
    assistant_msg: str,
    citations: list | None = None,
    provider: str | None = None,
    model: str | None = None,
) -> None:
    now = time.time()
    citations_json = json.dumps(citations) if citations else None
    auto_title = (user_msg[:60].strip() + ("…" if len(user_msg) > 60 else ""))

    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content, citations, actual_provider, actual_model, created_at) "
            "VALUES (?, 'user', ?, NULL, NULL, NULL, ?)",
            (session_id, user_msg, now - 0.001),
        )
        conn.execute(
            "INSERT INTO messages (session_id, role, content, citations, actual_provider, actual_model, created_at) "
            "VALUES (?, 'assistant', ?, ?, ?, ?, ?)",
            (session_id, assistant_msg, citations_json, provider, model, now),
        )
        conn.execute(
            "UPDATE conversations SET last_active=? WHERE session_id=?",
            (now, session_id),
        )
        conn.execute(
            "UPDATE conversations SET title=? WHERE session_id=? AND title='New conversation'",
            (auto_title, session_id),
        )


def update_doc_ids(session_id: str, new_doc_ids: list[str]) -> None:
    if not new_doc_ids:
        return
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_ids FROM conversations WHERE session_id=?", (session_id,)
        ).fetchone()
        if row is None:
            return
        existing = set(json.loads(row["doc_ids"]))
        existing.update(new_doc_ids)
        conn.execute(
            "UPDATE conversations SET doc_ids=? WHERE session_id=?",
            (json.dumps(list(existing)), session_id),
        )


def delete(session_id: str) -> bool:
    with database.get_db() as conn:
        conn.execute("DELETE FROM conversations WHERE session_id=?", (session_id,))
    return True


def create_new(user_id: str | None = None) -> str:
    """Return a fresh conversation for the user.

    If the user already has an empty conversation, reuse it instead of
    inserting another one — otherwise every page load leaves a ghost
    "New conversation" behind in the sidebar.
    """
    if user_id:
        with database.get_db() as conn:
            row = conn.execute(
                "SELECT c.session_id FROM conversations c "
                "LEFT JOIN messages m ON m.session_id = c.session_id "
                "WHERE c.user_id = ? GROUP BY c.session_id HAVING COUNT(m.id) = 0 "
                "ORDER BY c.last_active DESC LIMIT 1",
                (user_id,),
            ).fetchone()
        if row:
            return row["session_id"]

    session_id = str(uuid.uuid4())
    now = time.time()
    with database.get_db() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO conversations (session_id, title, doc_ids, created_at, last_active, user_id) "
            "VALUES (?, 'New conversation', '[]', ?, ?, ?)",
            (session_id, now, now, user_id),
        )
    return session_id
