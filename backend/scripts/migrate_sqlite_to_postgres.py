#!/usr/bin/env python3
import argparse
import os
import sqlite3
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


TABLES = [
    "users",
    "roles",
    "role_permissions",
    "conversations",
    "messages",
    "documents",
    "settings",
    "audit_log",
    "public_assistant_events",
    "revoked_tokens",
    "announcements",
]


def _sqlite_rows(sqlite_path: Path, table: str) -> tuple[list[str], list[sqlite3.Row]]:
    source = sqlite3.connect(str(sqlite_path))
    source.row_factory = sqlite3.Row
    try:
        columns = [row[1] for row in source.execute(f"PRAGMA table_info({table})").fetchall()]
        rows = source.execute(f"SELECT * FROM {table}").fetchall()
        return columns, rows
    finally:
        source.close()


def migrate(sqlite_path: Path, database_url: str, truncate: bool) -> None:
    if not sqlite_path.exists():
        raise SystemExit(f"SQLite DB not found: {sqlite_path}")

    import config
    import database

    os.environ["DATABASE_URL"] = database_url
    config.DATABASE_URL = database_url
    database.init_db()

    with psycopg.connect(database_url) as target:
        if truncate:
            target.execute(
                "TRUNCATE TABLE "
                + ", ".join(TABLES)
                + " RESTART IDENTITY CASCADE"
            )

        for table in TABLES:
            columns, rows = _sqlite_rows(sqlite_path, table)
            if not rows:
                continue
            placeholders = ", ".join(["%s"] * len(columns))
            column_sql = ", ".join(columns)
            query = f"INSERT INTO {table} ({column_sql}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
            target.executemany(query, ([row[column] for column in columns] for row in rows))
            print(f"migrated {len(rows)} row(s) from {table}")

        target.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Copy ENSET AI SQLite metadata into Postgres.")
    parser.add_argument("--sqlite-path", default="./data/enset_ai.db")
    parser.add_argument("--database-url", required=True)
    parser.add_argument("--truncate", action="store_true", help="Clear target tables before import.")
    args = parser.parse_args()

    migrate(Path(args.sqlite_path), args.database_url, args.truncate)


if __name__ == "__main__":
    main()
