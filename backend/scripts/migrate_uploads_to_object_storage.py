#!/usr/bin/env python3
import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def migrate(sqlite_path: Path, uploads_dir: Path, delete_local: bool) -> None:
    import config
    from services import document_storage

    if not sqlite_path.exists():
        raise SystemExit(f"SQLite DB not found: {sqlite_path}")
    if config.DOCUMENT_STORAGE_BACKEND != "s3":
        raise SystemExit("Set DOCUMENT_STORAGE_BACKEND=s3 before running this migration.")

    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT doc_id, original_filename FROM documents").fetchall()
    finally:
        conn.close()

    migrated = 0
    missing = 0
    for row in rows:
        local_path = uploads_dir / f"{row['doc_id']}_{row['original_filename']}"
        if not local_path.exists():
            missing += 1
            print(f"missing local file: {local_path}")
            continue

        source = local_path
        if not delete_local:
            source = uploads_dir / f".migrating_{row['doc_id']}_{row['original_filename']}"
            source.write_bytes(local_path.read_bytes())

        document_storage.save_pdf(source, row["doc_id"], row["original_filename"])
        migrated += 1
        print(f"migrated {local_path.name}")

    print(f"done: {migrated} migrated, {missing} missing")


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload existing local PDFs to S3/MinIO.")
    parser.add_argument("--sqlite-path", default="./data/enset_ai.db")
    parser.add_argument("--uploads-dir", default="./uploads")
    parser.add_argument("--delete-local", action="store_true")
    args = parser.parse_args()

    migrate(Path(args.sqlite_path), Path(args.uploads_dir), args.delete_local)


if __name__ == "__main__":
    main()
