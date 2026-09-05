from dataclasses import dataclass


@dataclass
class ChunkResult:
    text: str
    score: float
    doc_id: str
    doc_name: str
    page_number: int
    chunk_index: int

    def to_dict(self) -> dict:
        return {
            "doc_id": self.doc_id,
            "doc_name": self.doc_name,
            "page_number": self.page_number,
            "chunk_index": self.chunk_index,
            "excerpt": self.text[:300],
        }
