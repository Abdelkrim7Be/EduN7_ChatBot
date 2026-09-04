import sqlite3
from contextlib import contextmanager
from pathlib import Path

import config

DB_PATH = Path(config.DB_PATH)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
_MEMORY_CONN: sqlite3.Connection | None = None


def _connect() -> sqlite3.Connection:
    global _MEMORY_CONN
    if str(DB_PATH) == ":memory:":
        if _MEMORY_CONN is None:
            _MEMORY_CONN = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        return _MEMORY_CONN
    return sqlite3.connect(str(DB_PATH), check_same_thread=False)


@contextmanager
def get_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        if str(DB_PATH) != ":memory:":
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
                avatar_url    TEXT NOT NULL DEFAULT '',
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
                category          TEXT NOT NULL DEFAULT 'Autres',
                security_status   TEXT NOT NULL DEFAULT 'pending',
                security_verdict  TEXT NOT NULL DEFAULT '',
                security_checked_at REAL,
                uploaded_at       REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                label TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                kind TEXT NOT NULL DEFAULT 'text',
                updated_at REAL,
                updated_by TEXT
            );

            CREATE TABLE IF NOT EXISTS roles (
                name TEXT PRIMARY KEY,
                description TEXT NOT NULL DEFAULT '',
                is_builtin INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS role_permissions (
                role_name TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
                permission TEXT NOT NULL,
                PRIMARY KEY (role_name, permission)
            );

            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_email TEXT,
                action TEXT NOT NULL,
                target_type TEXT,
                target_id TEXT,
                details TEXT,
                ip_address TEXT,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_hash TEXT PRIMARY KEY,
                revoked_at REAL NOT NULL,
                expires_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS announcements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'info',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_by TEXT REFERENCES users(id),
                created_at REAL NOT NULL,
                expires_at REAL
            );

            CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at);
            CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_tokens(expires_at);
        """)

        # Seed roles
        for role_name in ("student", "professor", "admin"):
            conn.execute(
                "INSERT OR IGNORE INTO roles (name, description, is_builtin, created_at) VALUES (?, ?, 1, 0)",
                (role_name, f"{role_name.capitalize()} role")
            )
        from services.permissions_service import seed_builtin_permissions
        seed_builtin_permissions(conn)

        # Seed settings
        default_settings = [
            ("max_upload_size_mb", "50", "Max Upload Size (MB)"),
            ("max_docs_per_session", "10", "Max Docs Per Session"),
            ("allow_registration", "true", "Allow Registration"),
            ("default_role", "student", "Default Role"),
            ("system_prompt", config.RAG_SYSTEM_PROMPT, "System Prompt")
        ]
        for k, v, l in default_settings:
            conn.execute("INSERT OR IGNORE INTO settings (key, value, label) VALUES (?, ?, ?)", (k, v, l))


        # Migrate: replace the old placeholder system prompt with the real
        # RAG prompt (the placeholder lost the citation instructions).
        conn.execute(
            "UPDATE settings SET value=? WHERE key='system_prompt' AND value=?",
            (config.RAG_SYSTEM_PROMPT, "You are ENSET AI, a helpful educational assistant."),
        )

        # Migrate: conversations — add user_id if missing
        cols = [r[1] for r in conn.execute("PRAGMA table_info(conversations)").fetchall()]
        if "user_id" not in cols:
            conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_convs_user ON conversations(user_id)")

        # Migrate: users — add password_hash if missing (tables created before this version)
        ucols = [r[1] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "password_hash" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")
        if "avatar_url" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
        if "is_suspended" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0")
        # Remove picture column data not needed for email/password auth (keep column for compat)

        # Migrate: documents — add category column
        dcols = [r[1] for r in conn.execute("PRAGMA table_info(documents)").fetchall()]
        if "category" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN category TEXT NOT NULL DEFAULT 'Autres'")
        if "security_status" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_status TEXT NOT NULL DEFAULT 'pending'")
        if "security_verdict" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_verdict TEXT NOT NULL DEFAULT ''")
        if "security_checked_at" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_checked_at REAL")
