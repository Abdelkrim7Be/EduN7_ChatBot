#!/usr/bin/env python3
import argparse
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def reindex(limit: int | None = None) -> None:
    import config
    import database
    from services import document_service, document_storage, vector_store_service

    database.init_db()
    query = (
        "SELECT doc_id, original_filename, collection_name "
        "FROM documents ORDER BY uploaded_at ASC"
    )
    if limit:
        query += " LIMIT ?"
        params = (limit,)
    else:
        params = ()

    with database.get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    for row in rows:
        stored = document_storage.read_pdf(row["doc_id"], row["original_filename"])
        if stored is None:
            print(f"skip missing PDF: {row['doc_id']} {row['original_filename']}")
            continue

        if isinstance(stored, Path):
            working_path = stored
            cleanup = None
        else:
            with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as cleanup:
                cleanup.write(stored.getvalue())
            working_path = Path(cleanup.name)

        try:
            pages = document_service.PyMuPDFLoader(str(working_path)).load()
            chunks = document_service._splitter.split_documents(pages)
            for index, chunk in enumerate(chunks):
                chunk.metadata.update({
                    "doc_id": row["doc_id"],
                    "doc_name": row["original_filename"],
                    "page_number": int(chunk.metadata.get("page", 0)) + 1,
                    "chunk_index": index,
                })

            vector_store_service.delete_collection(row["collection_name"])
            vector_store_service.index_documents(chunks, row["doc_id"])
            print(
                f"reindexed {row['doc_id']} into {config.VECTOR_STORE_BACKEND}: "
                f"{len(pages)} page(s), {len(chunks)} chunk(s)"
            )
        finally:
            if cleanup:
                Path(cleanup.name).unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild vector collections from stored PDFs.")
    parser.add_argument("--database-url", help="Postgres URL. Leave blank to use configured SQLite.")
    parser.add_argument("--vector-store-backend", choices=["chroma", "qdrant"])
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    if args.database_url:
        os.environ["DATABASE_URL"] = args.database_url
    if args.vector_store_backend:
        os.environ["VECTOR_STORE_BACKEND"] = args.vector_store_backend

    reindex(args.limit)


if __name__ == "__main__":
    main()
