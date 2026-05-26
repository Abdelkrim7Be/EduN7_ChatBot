import re
import time
import uuid
import logging
from pathlib import Path

import fitz  # PyMuPDF — used for preview text extraction
import chromadb
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

import config
import database
from models.document import DocumentRecord

logger = logging.getLogger(__name__)

_CATEGORY_RULES = [
    ("Cours",        r"\b(cours|cm|chapitre|lecture|poly|polycopie|support)\b"),
    ("TD / TP",      r"\b(td|tp|travaux|exercice|atelier|labo|pratique)\b"),
    ("Examens",      r"\b(exam|examen|ds|controle|contrôle|qcm|epreuve|épreuve|partiel)\b"),
    ("Projets",      r"\b(projet|rapport|pfe|memoire|mémoire|stage|these)\b"),
    ("Corrections",  r"\b(correction|corrige|corrigé|solution|reponse|réponse)\b"),
]


def detect_category(filename: str) -> str:
    normalized = re.sub(r"[_\-\s\.]+", " ", filename.lower())
    for category, pattern in _CATEGORY_RULES:
        if re.search(pattern, normalized):
            return category
    return "Autres"


_embedding_fn = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    add_start_index=True,
)


def _chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=config.CHROMA_HOST, port=config.CHROMA_PORT)


def _set_status(doc_id: str, status: str, error_message: str | None = None,
                page_count: int | None = None, chunk_count: int | None = None) -> None:
    with database.get_db() as conn:
        if page_count is not None and chunk_count is not None:
            conn.execute(
                "UPDATE documents SET status=?, error_message=?, page_count=?, chunk_count=? WHERE doc_id=?",
                (status, error_message, page_count, chunk_count, doc_id),
            )
        else:
            conn.execute(
                "UPDATE documents SET status=?, error_message=? WHERE doc_id=?",
                (status, error_message, doc_id),
            )


def create_pending(
    doc_id: str,
    original_filename: str,
    user_id: str,
    scope: str = "private",
) -> DocumentRecord:
    """Create a DB record immediately with status='uploading'. Returns before processing begins."""
    category = detect_category(original_filename)
    record = DocumentRecord.create(
        doc_id=doc_id,
        name=original_filename,
        original_filename=original_filename,
        page_count=0,
        chunk_count=0,
        scope=scope,
        category=category,
        status="uploading",
    )
    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO documents "
            "(doc_id, user_id, name, original_filename, collection_name, "
            "page_count, chunk_count, scope, category, status, uploaded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record.doc_id, user_id, record.name, record.original_filename,
                record.collection_name, record.page_count, record.chunk_count,
                record.scope, record.category, record.status, time.time(),
            ),
        )
    return record


def process(doc_id: str, file_path: str, original_filename: str) -> None:
    """Run the full ingest pipeline in a background thread, updating status at each stage."""
    try:
        _set_status(doc_id, "parsing")
        pages = PyMuPDFLoader(file_path).load()

        _set_status(doc_id, "chunking")
        chunks = _splitter.split_documents(pages)
        for i, chunk in enumerate(chunks):
            chunk.metadata.update({
                "doc_id": doc_id,
                "doc_name": original_filename,
                "page_number": int(chunk.metadata.get("page", 0)) + 1,
                "chunk_index": i,
            })

        _set_status(doc_id, "embedding")
        Chroma.from_documents(
            documents=chunks,
            embedding=_embedding_fn,
            collection_name=f"doc_{doc_id}",
            client=_chroma_client(),
        )

        _set_status(doc_id, "ready", page_count=len(pages), chunk_count=len(chunks))
        logger.info(
            "Processed %s: %d pages, %d chunks → collection doc_%s",
            original_filename, len(pages), len(chunks), doc_id,
        )
    except Exception as exc:
        logger.error("Ingest failed for doc %s: %s", doc_id, exc)
        _set_status(doc_id, "failed", error_message=str(exc))


def get_status(doc_id: str, user_id: str, role: str = "student") -> dict | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, user_id AS owner_id, scope, status, error_message, "
            "page_count, chunk_count FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
    if row is None:
        return None
    if row["owner_id"] != user_id and row["scope"] != "shared" and role not in ("professor", "admin"):
        return None
    return {
        "doc_id":        row["doc_id"],
        "status":        row["status"],
        "error_message": row["error_message"],
        "page_count":    row["page_count"],
        "chunk_count":   row["chunk_count"],
    }


def get_preview(doc_id: str, user_id: str, role: str, page: int = 1) -> dict | None:
    """Extract text from one page of the stored PDF. Returns None if not found/accessible."""
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT user_id AS owner_id, scope, original_filename, status "
            "FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
    if row is None:
        return None
    if row["owner_id"] != user_id and row["scope"] != "shared" and role not in ("professor", "admin"):
        return None
    if row["status"] != "ready":
        return {"error": "not_ready"}

    file_path = Path(config.UPLOAD_DIR) / f"{doc_id}_{row['original_filename']}"
    if not file_path.exists():
        return {"error": "file_not_found"}

    pdf = fitz.open(str(file_path))
    total_pages = len(pdf)
    page = max(1, min(page, total_pages))
    text = pdf[page - 1].get_text()
    pdf.close()

    return {"page": page, "total_pages": total_pages, "text": text}


def delete(doc_id: str, user_id: str, role: str = "student") -> bool:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT user_id, collection_name, original_filename, scope FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
        if row is None:
            return False
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
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, "
            "scope, category, status, uploaded_at "
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
            category=r["category"] or "Autres",
            status=r["status"] or "ready",
        )
        for r in rows
    ]


def get(doc_id: str, user_id: str | None = None) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, user_id AS owner_id, name, original_filename, collection_name, "
            "page_count, chunk_count, scope, category, status, uploaded_at "
            "FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
    if row is None:
        return None
    if user_id is not None and row["owner_id"] != user_id and row["scope"] != "shared":
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
        category=row["category"] or "Autres",
        status=row["status"] or "ready",
    )


def get_by_name(filename: str, user_id: str) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, "
            "scope, category, status, uploaded_at "
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
        category=row["category"] or "Autres",
        status=row["status"] or "ready",
    )
