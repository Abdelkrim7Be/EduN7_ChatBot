import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import config

DB_PATH = Path(config.DB_PATH)
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
_MEMORY_CONN: sqlite3.Connection | None = None


def _use_postgres() -> bool:
    return bool(config.DATABASE_URL) and str(config.DB_PATH) != ":memory:"


class PostgresConnection:
    def __init__(self):
        import psycopg
        from psycopg.rows import dict_row

        self._conn = psycopg.connect(config.DATABASE_URL, row_factory=dict_row)

    def execute(self, sql: str, params: Any = None):
        return self._conn.execute(_postgres_sql(sql), params)

    def executemany(self, sql: str, params_seq):
        return self._conn.executemany(_postgres_sql(sql), params_seq)

    def commit(self) -> None:
        self._conn.commit()

    def rollback(self) -> None:
        self._conn.rollback()

    def close(self) -> None:
        self._conn.close()


def _postgres_sql(sql: str) -> str:
    uses_ignore_insert = "INSERT OR IGNORE INTO" in sql
    sql = sql.replace("INSERT OR IGNORE INTO", "INSERT INTO")
    if uses_ignore_insert and "ON CONFLICT" not in sql:
        sql = sql.rstrip()
        sql += " ON CONFLICT DO NOTHING"
    return sql.replace("?", "%s")


def _connect():
    if _use_postgres():
        return PostgresConnection()

    global _MEMORY_CONN
    if str(DB_PATH) == ":memory:":
        if _MEMORY_CONN is None:
            _MEMORY_CONN = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        return _MEMORY_CONN
    return sqlite3.connect(str(DB_PATH), check_same_thread=False)


@contextmanager
def get_db():
    if not _use_postgres():
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = _connect()
    if not _use_postgres():
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
        if _use_postgres() or str(DB_PATH) != ":memory:":
            conn.close()


def table_columns(conn, table_name: str) -> list[str]:
    if _use_postgres():
        rows = conn.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=?",
            (table_name,),
        ).fetchall()
        return [r["column_name"] for r in rows]
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table_name})").fetchall()]


def _create_sqlite_schema(conn) -> None:
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

        CREATE TABLE IF NOT EXISTS public_assistant_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip_hash TEXT,
            user_agent_hash TEXT,
            outcome TEXT NOT NULL,
            provider TEXT,
            model TEXT,
            latency_ms INTEGER,
            input_chars INTEGER NOT NULL DEFAULT 0,
            output_chars INTEGER NOT NULL DEFAULT 0,
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


def _create_postgres_schema(conn) -> None:
    statements = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL DEFAULT '',
            role TEXT NOT NULL DEFAULT 'student',
            avatar_url TEXT NOT NULL DEFAULT '',
            created_at DOUBLE PRECISION NOT NULL,
            last_seen DOUBLE PRECISION NOT NULL,
            is_suspended INTEGER NOT NULL DEFAULT 0
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS conversations (
            session_id TEXT PRIMARY KEY,
            title TEXT NOT NULL DEFAULT 'New conversation',
            doc_ids TEXT NOT NULL DEFAULT '[]',
            created_at DOUBLE PRECISION NOT NULL,
            last_active DOUBLE PRECISION NOT NULL,
            user_id TEXT REFERENCES users(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS messages (
            id BIGSERIAL PRIMARY KEY,
            session_id TEXT NOT NULL REFERENCES conversations(session_id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            citations TEXT,
            actual_provider TEXT,
            actual_model TEXT,
            created_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS documents (
            doc_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            collection_name TEXT NOT NULL,
            page_count INTEGER NOT NULL DEFAULT 0,
            chunk_count INTEGER NOT NULL DEFAULT 0,
            scope TEXT NOT NULL DEFAULT 'private',
            category TEXT NOT NULL DEFAULT 'Autres',
            security_status TEXT NOT NULL DEFAULT 'pending',
            security_verdict TEXT NOT NULL DEFAULT '',
            security_checked_at DOUBLE PRECISION,
            uploaded_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            label TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            kind TEXT NOT NULL DEFAULT 'text',
            updated_at DOUBLE PRECISION,
            updated_by TEXT
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS roles (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL DEFAULT '',
            is_builtin INTEGER NOT NULL DEFAULT 0,
            created_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_name TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
            permission TEXT NOT NULL,
            PRIMARY KEY (role_name, permission)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id BIGSERIAL PRIMARY KEY,
            user_id TEXT,
            user_email TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            details TEXT,
            ip_address TEXT,
            created_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS public_assistant_events (
            id BIGSERIAL PRIMARY KEY,
            ip_hash TEXT,
            user_agent_hash TEXT,
            outcome TEXT NOT NULL,
            provider TEXT,
            model TEXT,
            latency_ms INTEGER,
            input_chars INTEGER NOT NULL DEFAULT 0,
            output_chars INTEGER NOT NULL DEFAULT 0,
            created_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS revoked_tokens (
            token_hash TEXT PRIMARY KEY,
            revoked_at DOUBLE PRECISION NOT NULL,
            expires_at DOUBLE PRECISION NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS announcements (
            id BIGSERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_by TEXT REFERENCES users(id),
            created_at DOUBLE PRECISION NOT NULL,
            expires_at DOUBLE PRECISION
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_revoked_expires ON revoked_tokens(expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_convs_user ON conversations(user_id)",
    ]
    for statement in statements:
        conn.execute(statement)


def init_db() -> None:
    with get_db() as conn:
        if _use_postgres():
            _create_postgres_schema(conn)
        else:
            _create_sqlite_schema(conn)

        # Seed roles
        for role_name in ("student", "professor", "admin"):
            conn.execute(
                "INSERT OR IGNORE INTO roles (name, description, is_builtin, created_at) VALUES (?, ?, 1, 0)",
                (role_name, f"{role_name.capitalize()} role")
            )
        from services.permissions_service import seed_builtin_permissions
        seed_builtin_permissions(conn)

        scols = table_columns(conn, "settings")
        if "description" not in scols:
            conn.execute("ALTER TABLE settings ADD COLUMN description TEXT NOT NULL DEFAULT ''")
        if "kind" not in scols:
            conn.execute("ALTER TABLE settings ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'")
        if "updated_at" not in scols:
            conn.execute("ALTER TABLE settings ADD COLUMN updated_at REAL")
        if "updated_by" not in scols:
            conn.execute("ALTER TABLE settings ADD COLUMN updated_by TEXT")

        # Seed settings
        default_settings = [
            ("max_upload_size_mb", "50", "Max Upload Size (MB)"),
            ("max_docs_per_session", "10", "Max Docs Per Session"),
            ("allow_registration", "true", "Allow Registration"),
            ("default_role", "student", "Default Role"),
            ("system_prompt", config.RAG_SYSTEM_PROMPT, "System Prompt"),
            (
                "public_assistant_enabled",
                "false",
                "Public Assistant Enabled",
                "Show the landing-page assistant when public context is configured.",
                "boolean",
            ),
            (
                "public_assistant_context",
                "",
                "Public Assistant Context",
                "Admin-approved public knowledge. The landing assistant may answer only from this context.",
                "textarea",
            ),
            (
                "public_assistant_instructions",
                "Be concise, helpful, and clear. Answer in the visitor's language when possible.",
                "Public Assistant Instructions",
                "Behavior and tone instructions layered on top of the grounding rules.",
                "textarea",
            ),
            (
                "public_assistant_greeting",
                "Hi, I am the ENSET AI public assistant. I can answer questions covered by the public information approved by the administration.",
                "Public Assistant Greeting",
                "Greeting shown when the landing assistant opens.",
                "textarea",
            ),
            (
                "public_assistant_placeholder",
                "Ask a question about ENSET AI...",
                "Public Assistant Placeholder",
                "Input placeholder for visitors.",
                "text",
            ),
            (
                "public_assistant_fallback_message",
                "I do not have enough information in the ENSET AI public context to answer that question. You can sign in to use the full assistant or contact the administration for more details.",
                "Public Assistant Fallback",
                "Fallback used when an answer is not supported by the public context.",
                "textarea",
            ),
            (
                "public_assistant_suggested_questions",
                "",
                "Public Assistant Suggested Questions",
                "Optional starter questions, one per line. The public UI shows up to three.",
                "textarea",
            ),
            (
                "public_assistant_provider",
                "auto",
                "Public Assistant Provider",
                "Provider used globally for anonymous landing-page assistant traffic.",
                "select",
            ),
            (
                "public_assistant_model",
                "auto",
                "Public Assistant Model",
                "Model used globally for anonymous landing-page assistant traffic.",
                "select",
            ),
            (
                "public_assistant_rate_limit_per_hour",
                "30",
                "Public Assistant Hourly Limit",
                "Sustained anonymous assistant requests allowed per IP per hour.",
                "number",
            ),
        ]
        for setting in default_settings:
            if len(setting) == 3:
                k, v, l = setting
                conn.execute(
                    "INSERT OR IGNORE INTO settings (key, value, label) VALUES (?, ?, ?)",
                    (k, v, l),
                )
            else:
                k, v, l, description, kind = setting
                conn.execute(
                    "INSERT OR IGNORE INTO settings (key, value, label, description, kind) VALUES (?, ?, ?, ?, ?)",
                    (k, v, l, description, kind),
                )


        # Migrate: replace the old placeholder system prompt with the real
        # RAG prompt (the placeholder lost the citation instructions).
        conn.execute(
            "UPDATE settings SET value=? WHERE key='system_prompt' AND value=?",
            (config.RAG_SYSTEM_PROMPT, "You are ENSET AI, a helpful educational assistant."),
        )

        # Migrate: conversations — add user_id if missing
        cols = table_columns(conn, "conversations")
        if "user_id" not in cols:
            conn.execute("ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_convs_user ON conversations(user_id)")

        # Migrate: users — add password_hash if missing (tables created before this version)
        ucols = table_columns(conn, "users")
        if "password_hash" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''")
        if "avatar_url" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT ''")
        if "is_suspended" not in ucols:
            conn.execute("ALTER TABLE users ADD COLUMN is_suspended INTEGER NOT NULL DEFAULT 0")
        # Remove picture column data not needed for email/password auth (keep column for compat)

        # Migrate: documents — add category column
        dcols = table_columns(conn, "documents")
        if "category" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN category TEXT NOT NULL DEFAULT 'Autres'")
        if "security_status" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_status TEXT NOT NULL DEFAULT 'pending'")
        if "security_verdict" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_verdict TEXT NOT NULL DEFAULT ''")
        if "security_checked_at" not in dcols:
            conn.execute("ALTER TABLE documents ADD COLUMN security_checked_at REAL")
