import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

import chromadb
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

import config

logger = logging.getLogger(__name__)

_embedding_fn = HuggingFaceEmbeddings(model_name=config.EMBEDDING_MODEL)


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


def _chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=config.CHROMA_HOST, port=config.CHROMA_PORT)


def _query_collection(doc_id: str, query: str, top_k: int) -> list[ChunkResult]:
    try:
        store = Chroma(
            collection_name=f"doc_{doc_id}",
            embedding_function=_embedding_fn,
            client=_chroma_client(),
        )
        results = store.similarity_search_with_score(query, k=top_k)
        chunks = []
        for doc, score in results:
            m = doc.metadata
            chunks.append(ChunkResult(
                text=doc.page_content,
                score=float(score),
                doc_id=m.get("doc_id", doc_id),
                doc_name=m.get("doc_name", "unknown"),
                page_number=int(m.get("page_number", 1)),
                chunk_index=int(m.get("chunk_index", 0)),
            ))
        return chunks
    except Exception as e:
        logger.warning("Failed to query collection doc_%s: %s", doc_id, e)
        return []


def retrieve(query: str, doc_ids: list[str], top_k: int | None = None) -> list[ChunkResult]:
    if not doc_ids:
        return []
    k = top_k or config.TOP_K_RESULTS
    all_results: list[ChunkResult] = []

    with ThreadPoolExecutor(max_workers=min(len(doc_ids), 4)) as pool:
        futures = {pool.submit(_query_collection, did, query, k): did for did in doc_ids}
        for future in as_completed(futures):
            all_results.extend(future.result())

    all_results.sort(key=lambda r: r.score)
    return all_results[:k]
