import sqlite3
from contextlib import contextmanager
from pathlib import Path

import config

DB_PATH = Path(config.DB_PATH)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


@contextmanager
def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id            TEXT PRIMARY KEY,
                email         TEXT UNIQUE NOT NULL,
                name          TEXT NOT NULL,
                password_hash TEXT NOT NULL DEFAULT '',
                role          TEXT NOT NULL DEFAULT 'student',
                created_at    REAL NOT NULL,
                last_seen     REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
                session_id  TEXT PRIMARY KEY,
                title       TEXT NOT NULL DEFAULT 'New conversation',
                doc_ids     TEXT NOT NULL DEFAULT '[]',
                created_at  REAL NOT NULL,
                last_active REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id       TEXT NOT NULL,
                role             TEXT NOT NULL,
                content          TEXT NOT NULL,
                citations        TEXT,
                actual_provider  TEXT,
                actual_model     TEXT,
                created_at       REAL NOT NULL,
                FOREIGN KEY (session_id) REFERENCES conversations(session_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS documents (
                doc_id            TEXT PRIMARY KEY,
                user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name              TEXT NOT NULL,
                original_filename TEXT NOT NULL,
                collection_name   TEXT NOT NULL,
                page_count        INTEGER NOT NULL DEFAULT 0,
                chunk_count       INTEGER NOT NULL DEFAULT 0,
                scope             TEXT NOT NULL DEFAULT 'private',
                uploaded_at       REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
        """)

        # Migrate: conversations — add user_id if missing
        cols = [r[1] for r in conn.execute("PRAGMA table_info(conversations)").fetchall()]
        if "user_id" not in cols:
            conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_convs_user ON conversations(user_id)")

        # Migrate: users — add password_hash if missing (tables created before this version)
        ucols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "password_hash" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")
        # Remove picture column data not needed for email/password auth (keep column for compat)

        # Migrate: documents — add category column
        dcols = [r[1] for r in conn.execute("PRAGMA table_info(documents)").fetchall()]
        if "category" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN category TEXT NOT NULL DEFAULT 'Autres'")
