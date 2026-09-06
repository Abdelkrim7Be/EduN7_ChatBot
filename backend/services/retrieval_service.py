import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import config
from services import vector_store_service
from services.retrieval_types import ChunkResult

logger = logging.getLogger(__name__)


def _query_collection(doc_id: str, query: str, top_k: int) -> list[ChunkResult]:
    return vector_store_service.query_collection(doc_id, query, top_k)


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
