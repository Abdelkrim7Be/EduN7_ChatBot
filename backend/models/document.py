import time
from dataclasses import dataclass


@dataclass
class DocumentRecord:
    doc_id: str
    name: str
    original_filename: str
    collection_name: str
    page_count: int
    chunk_count: int
    uploaded_at: float
    scope: str = "private"
    category: str = "Autres"

    def to_dict(self) -> dict:
        return {
            "doc_id": self.doc_id,
            "name": self.name,
            "original_filename": self.original_filename,
            "collection_name": self.collection_name,
            "page_count": self.page_count,
            "chunk_count": self.chunk_count,
            "uploaded_at": self.uploaded_at,
            "scope": self.scope,
            "category": self.category,
        }

    @staticmethod
    def create(
        doc_id: str,
        name: str,
        original_filename: str,
        page_count: int,
        chunk_count: int,
        scope: str = "private",
        category: str = "Autres",
    ) -> "DocumentRecord":
        return DocumentRecord(
            doc_id=doc_id,
            name=name,
            original_filename=original_filename,
            collection_name=f"doc_{doc_id}",
            page_count=page_count,
            chunk_count=chunk_count,
            uploaded_at=time.time(),
            scope=scope,
            category=category,
        )
