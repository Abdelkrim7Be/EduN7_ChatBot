import re
import time
import uuid
import logging
from pathlib import Path

import chromadb
import pymupdf
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma

import config
import database
from models.document import DocumentRecord
from services.embedding_service import get_embedding_function

logger = logging.getLogger(__name__)


class PyMuPDFLoader:
    def __init__(self, file_path: str):
        self.file_path = file_path

    def load(self) -> list[Document]:
        docs: list[Document] = []
        with pymupdf.open(self.file_path) as pdf:
            for page_index, page in enumerate(pdf):
                docs.append(
                    Document(
                        page_content=page.get_text(),
                        metadata={
                            "source": self.file_path,
                            "page": page_index,
                            "total_pages": pdf.page_count,
                        },
                    )
                )
        return docs

_PDF_RISK_PATTERNS = [
    (b"/JavaScript", "JavaScript"),
    (b"/JS", "JavaScript"),
    (b"/OpenAction", "auto-open action"),
    (b"/AA", "additional action"),
    (b"/Launch", "launch action"),
    (b"/EmbeddedFile", "embedded file"),
    (b"/RichMedia", "rich media"),
    (b"/XFA", "XFA form"),
    (b"/AcroForm", "interactive form"),
]

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


def scan_pdf_security(file_path: str) -> dict:
    """Lightweight PDF inspection before parser/indexer ingestion.

    This is intentionally conservative metadata, not a replacement for an
    antivirus engine or sandbox. It catches risky active-PDF features that are
    inappropriate for this RAG/document workflow.
    """
    path = Path(file_path)
    try:
        data = path.read_bytes()
    except OSError as exc:
        return {
            "status": "failed",
            "verdict": f"Impossible de lire le fichier: {exc}",
            "checked_at": time.time(),
        }

    if not data.startswith(b"%PDF-"):
        return {
            "status": "blocked",
            "verdict": "Fichier rejeté: signature PDF invalide",
            "checked_at": time.time(),
        }

    found = []
    lowered = data.lower()
    for pattern, label in _PDF_RISK_PATTERNS:
        if pattern.lower() in lowered:
            found.append(label)

    if found:
        unique = sorted(set(found))
        return {
            "status": "warning",
            "verdict": "Contenu actif détecté: " + ", ".join(unique),
            "checked_at": time.time(),
        }

    return {
        "status": "clean",
        "verdict": "PDF vérifié: aucun contenu actif connu détecté",
        "checked_at": time.time(),
    }


def is_security_blocking(scan: dict) -> bool:
    return scan.get("status") in {"blocked", "failed", "warning"}


def uploaded_path(doc_id: str, original_filename: str) -> Path:
    return Path(config.UPLOAD_DIR) / f"{doc_id}_{original_filename}"


def _record_from_row(row) -> DocumentRecord:
    return DocumentRecord(
        doc_id=row["doc_id"],
        name=row["name"],
        original_filename=row["original_filename"],
        collection_name=row["collection_name"],
        page_count=row["page_count"],
        chunk_count=row["chunk_count"],
        uploaded_at=float(row["uploaded_at"] or 0),
        scope=row["scope"],
        category=row["category"] or "Autres",
        security_status=row["security_status"] or "pending",
        security_verdict=row["security_verdict"] or "",
        security_checked_at=(
            float(row["security_checked_at"])
            if row["security_checked_at"] is not None
            else None
        ),
    )


def ensure_security_scan(doc_id: str, original_filename: str, current_status: str | None = None) -> dict:
    if current_status and current_status not in {"pending", "unchecked"}:
        with database.get_db() as conn:
            row = conn.execute(
                "SELECT security_status, security_verdict, security_checked_at FROM documents WHERE doc_id=?",
                (doc_id,),
            ).fetchone()
        if row:
            return {
                "status": row["security_status"] or "pending",
                "verdict": row["security_verdict"] or "",
                "checked_at": row["security_checked_at"],
            }

    scan = scan_pdf_security(str(uploaded_path(doc_id, original_filename)))
    with database.get_db() as conn:
        conn.execute(
            "UPDATE documents SET security_status=?, security_verdict=?, security_checked_at=? WHERE doc_id=?",
            (scan["status"], scan["verdict"], scan["checked_at"], doc_id),
        )
    return scan


_splitter = RecursiveCharacterTextSplitter(
    chunk_size=config.CHUNK_SIZE,
    chunk_overlap=config.CHUNK_OVERLAP,
    add_start_index=True,
)


def _chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=config.CHROMA_HOST, port=config.CHROMA_PORT)


def ingest(file_path: str, original_filename: str, user_id: str, scope: str = "private") -> DocumentRecord:
    doc_id = str(uuid.uuid4())[:8]

    new_path = Path(file_path).parent / f"{doc_id}_{original_filename}"
    Path(file_path).rename(new_path)
    file_path = str(new_path)

    security = scan_pdf_security(file_path)
    if is_security_blocking(security):
        Path(file_path).unlink(missing_ok=True)
        raise ValueError(security["verdict"])

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
        embedding=get_embedding_function(),
        collection_name=f"doc_{doc_id}",
        client=_chroma_client(),
    )

    category = detect_category(original_filename)
    record = DocumentRecord.create(
        doc_id=doc_id,
        name=original_filename,
        original_filename=original_filename,
        page_count=len(pages),
        chunk_count=len(chunks),
        scope=scope,
        category=category,
        security_status=security["status"],
        security_verdict=security["verdict"],
        security_checked_at=security["checked_at"],
    )

    with database.get_db() as conn:
        conn.execute(
            "INSERT INTO documents "
            "(doc_id, user_id, name, original_filename, collection_name, page_count, chunk_count, scope, category, "
            "security_status, security_verdict, security_checked_at, uploaded_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record.doc_id, user_id, record.name, record.original_filename,
                record.collection_name, record.page_count, record.chunk_count,
                record.scope, record.category, record.security_status,
                record.security_verdict, record.security_checked_at, time.time(),
            ),
        )

    logger.info(
        "Document ingested: %d pages, %d chunks (scope=%s)",
        len(pages), len(chunks), scope,
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
        # Owner can always delete. Professors/admins may moderate shared
        # documents only — never another user's private document.
        if row["user_id"] != user_id:
            if role == "admin" and user_id == "":
                pass  # explicit admin-console moderation
            elif role in ("professor", "admin") and row["scope"] == "shared":
                pass
            else:
                return False

        conn.execute("DELETE FROM documents WHERE doc_id=?", (doc_id,))

    try:
        _chroma_client().delete_collection(row["collection_name"])
    except Exception as e:
        logger.warning("Could not delete ChromaDB collection %s: %s", row["collection_name"], e)

    path = uploaded_path(doc_id, row["original_filename"])
    if path.exists():
        path.unlink()
    return True


def list_accessible(user_id: str) -> list[DocumentRecord]:
    with database.get_db() as conn:
        rows = conn.execute(
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, scope, category, "
            "security_status, security_verdict, security_checked_at, uploaded_at "
            "FROM documents WHERE user_id=? OR scope='shared' "
            "ORDER BY uploaded_at DESC",
            (user_id,),
        ).fetchall()

    records = []
    stale_ids = []
    for r in rows:
        path = uploaded_path(r["doc_id"], r["original_filename"])
        if not path.exists():
            stale_ids.append(r["doc_id"])
            try:
                _chroma_client().delete_collection(r["collection_name"])
            except Exception:
                pass
            continue
        if (r["security_status"] or "pending") == "pending":
            ensure_security_scan(r["doc_id"], r["original_filename"], r["security_status"])
            refreshed = get(r["doc_id"], user_id)
            if refreshed:
                records.append(refreshed)
            continue
        records.append(_record_from_row(r))

    if stale_ids:
        with database.get_db() as conn:
            conn.executemany("DELETE FROM documents WHERE doc_id=?", [(did,) for did in stale_ids])

    return records


def get(doc_id: str, user_id: str | None = None) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, user_id AS owner_id, name, original_filename, collection_name, "
            "page_count, chunk_count, scope, category, security_status, security_verdict, "
            "security_checked_at, uploaded_at FROM documents WHERE doc_id=?",
            (doc_id,),
        ).fetchone()
    if row is None:
        return None
    if user_id is not None and row["owner_id"] != user_id and row["scope"] != "shared":
        return None  # Access denied — caller should treat as 403
    if (row["security_status"] or "pending") == "pending":
        ensure_security_scan(row["doc_id"], row["original_filename"], row["security_status"])
        return get(doc_id, user_id)
    return _record_from_row(row)


def get_by_name(filename: str, user_id: str) -> DocumentRecord | None:
    with database.get_db() as conn:
        row = conn.execute(
            "SELECT doc_id, name, original_filename, collection_name, page_count, chunk_count, scope, category, "
            "security_status, security_verdict, security_checked_at, uploaded_at "
            "FROM documents WHERE original_filename=? AND user_id=?",
            (filename, user_id),
        ).fetchone()
    if row is None:
        return None
    return _record_from_row(row)
