import logging

import chromadb
from langchain_chroma import Chroma
from langchain_core.documents import Document

import config
from services.embedding_service import get_embedding_function
from services.retrieval_types import ChunkResult

logger = logging.getLogger(__name__)


def collection_name(doc_id: str) -> str:
    return f"doc_{doc_id}"


def _chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=config.CHROMA_HOST, port=config.CHROMA_PORT)


def _qdrant_client():
    from qdrant_client import QdrantClient

    kwargs = {}
    if config.QDRANT_API_KEY:
        kwargs["api_key"] = config.QDRANT_API_KEY
    return QdrantClient(url=config.QDRANT_URL, **kwargs)


def index_documents(documents: list[Document], doc_id: str) -> None:
    name = collection_name(doc_id)

    if config.VECTOR_STORE_BACKEND == "chroma":
        Chroma.from_documents(
            documents=documents,
            embedding=get_embedding_function(),
            collection_name=name,
            client=_chroma_client(),
        )
        return

    if config.VECTOR_STORE_BACKEND == "qdrant":
        from langchain_qdrant import QdrantVectorStore

        QdrantVectorStore.from_documents(
            documents=documents,
            embedding=get_embedding_function(),
            collection_name=name,
            url=config.QDRANT_URL,
            api_key=config.QDRANT_API_KEY or None,
            force_recreate=True,
        )
        return

    raise RuntimeError(f"Unsupported vector store backend: {config.VECTOR_STORE_BACKEND}")


def delete_collection(name: str) -> None:
    try:
        if config.VECTOR_STORE_BACKEND == "chroma":
            _chroma_client().delete_collection(name)
            return

        if config.VECTOR_STORE_BACKEND == "qdrant":
            _qdrant_client().delete_collection(name)
            return

        raise RuntimeError(f"Unsupported vector store backend: {config.VECTOR_STORE_BACKEND}")
    except Exception as exc:
        logger.warning("Could not delete vector collection %s: %s", name, exc)


def query_collection(doc_id: str, query: str, top_k: int) -> list[ChunkResult]:
    name = collection_name(doc_id)
    try:
        if config.VECTOR_STORE_BACKEND == "chroma":
            store = Chroma(
                collection_name=name,
                embedding_function=get_embedding_function(),
                client=_chroma_client(),
            )
        elif config.VECTOR_STORE_BACKEND == "qdrant":
            from langchain_qdrant import QdrantVectorStore

            store = QdrantVectorStore.from_existing_collection(
                embedding=get_embedding_function(),
                collection_name=name,
                url=config.QDRANT_URL,
                api_key=config.QDRANT_API_KEY or None,
            )
        else:
            raise RuntimeError(f"Unsupported vector store backend: {config.VECTOR_STORE_BACKEND}")

        results = store.similarity_search_with_score(query, k=top_k)
        chunks = []
        for doc, score in results:
            metadata = doc.metadata
            chunks.append(
                ChunkResult(
                    text=doc.page_content,
                    score=float(score),
                    doc_id=metadata.get("doc_id", doc_id),
                    doc_name=metadata.get("doc_name", "unknown"),
                    page_number=int(metadata.get("page_number", 1)),
                    chunk_index=int(metadata.get("chunk_index", 0)),
                )
            )
        return chunks
    except Exception as exc:
        logger.warning("Failed to query collection %s: %s", name, exc)
        return []
