import os
import time
import uuid
import logging
from pathlib import Path

import chromadb
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

import config
import database
from models.document import DocumentRecord

logger = logging.getLogger(__name__)

_embedding_fn = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    add_start_index=True,
)


def _chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=config.CHROMA_HOST, port=config.CHROMA_PORT)


def ingest(file_path: str, original_filename: str, user_id: str, scope: str = "private") -> DocumentRecord:
    doc_id = str(uuid.uuid4())[:8]

    pages = PyMuPDFLoader(file_path).load()
    chunks = _splitter.split_documents(pages)

    for i, chunk in enumerate(chunks):
        chunk.metadata.update({
            "doc_id": doc_id,
            "doc_name": original_filename,
            "page_number": int(chunk.metadata.get("page", 0)) + 1,
            "chunk_index": i,
        })

    Chroma.from_documents(
        documents=chunks,
        embedding=_embedding_fn,
        collection_name=f"doc_{doc_id}",
        client=_chroma_client(),
    )

    record = DocumentRecord.create(
        doc_id=doc_id,
        name=original_filename,
        original_filename=original_filename,
        page_count=len(pages),
        chunk_count=len(chunks),
        scope=scope,
    )

    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO documents "
            "(doc_id, user_id, name, original_filename, collection_name, page_count, chunk_count, scope, uploaded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record.doc_id, user_id, record.name, record.original_filename,
                record.collection_name, record.page_count, record.chunk_count,
                record.scope, time.time(),
            ),
        )

    logger.info(
        "Ingested %s: %d pages, %d chunks → collection doc_%s (user=%s, scope=%s)",
        original_filename, len(pages), len(chunks), doc_id, user_id, scope,
    )
    return record


def delete(doc_id: str, user_id: str, role: str = "student") -> bool:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT user_id, collection_name, original_filename, scope FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return False
        # Only owner, or professor/admin for shared docs, can delete
        if row["user_id"] != user_id and role not in ("professor", "admin"):
            return False

        conn.execute("DELETE FROM documents WHERE doc_id=?", (doc_id,))

    try:
        _chroma_client().delete_collection(row["collection_name"])
    except Exception as e:
        logger.warning("Could not delete ChromaDB collection %s: %s", row["collection_name"], e)

    uploaded_path = Path(config.UPLOAD_DIR) / f"{doc_id}_{row['original_filename']}"
    if uploaded_path.exists():
        uploaded_path.unlink()
    return True


def list_accessible(user_id: str) -> list[DocumentRecord]:
    with database.get_db() as conn:
        rows = conn.execute(
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, scope, uploaded_at "
            "FROM documents WHERE user_id=? OR scope='shared' "
            "ORDER BY uploaded_at DESC",
            (user_id,),
        ).fetchall()
    return [
        DocumentRecord(
            doc_id=r["doc_id"],
            name=r["name"],
            original_filename=r["original_filename"],
            collection_name=r["collection_name"],
            page_count=r["page_count"],
            chunk_count=r["chunk_count"],
            uploaded_at=str(r["uploaded_at"]),
            scope=r["scope"],
        )
        for r in rows
    ]


def get(doc_id: str, user_id: str | None = None) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, user_id AS owner_id, name, original_filename, collection_name, "
            "page_count, chunk_count, scope, uploaded_at FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
    if row is None:
        return None
    if user_id is not None and row["owner_id"] != user_id and row["scope"] != "shared":
        return None  # Access denied — caller should treat as 403
    return DocumentRecord(
        doc_id=row["doc_id"],
        name=row["name"],
        original_filename=row["original_filename"],
        collection_name=row["collection_name"],
        page_count=row["page_count"],
        chunk_count=row["chunk_count"],
        uploaded_at=str(row["uploaded_at"]),
        scope=row["scope"],
    )


def get_by_name(filename: str, user_id: str) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, scope, uploaded_at "
            "FROM documents WHERE original_filename=? AND user_id=?",
            (filename, user_id),
        ).fetchone()
    if row is None:
        return None
    return DocumentRecord(
        doc_id=row["doc_id"],
        name=row["name"],
        original_filename=row["original_filename"],
        collection_name=row["collection_name"],
        page_count=row["page_count"],
        chunk_count=row["chunk_count"],
        uploaded_at=str(row["uploaded_at"]),
        scope=row["scope"],
    )
