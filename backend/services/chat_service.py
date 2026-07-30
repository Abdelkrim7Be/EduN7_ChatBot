import json
import logging
from typing import Generator

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

import config
from services import retrieval_service, session_service
from services.retrieval_service import ChunkResult
from services.llm_factory import build_llm, AUTO_FALLBACK_ORDER

logger = logging.getLogger(__name__)


def _is_retriable(e: Exception) -> bool:
    if isinstance(e, (TimeoutError, ConnectionError)):
        return True
    msg = str(e).lower()
    return any(x in msg for x in ["429", "resource_exhausted", "quota", "rate limit", "rate_limit", "ratelimiterror"])


def _friendly_error(provider: str, model: str, exc: Exception) -> str:
    msg = str(exc)
    if isinstance(exc, (TimeoutError, ConnectionError)) or "timeout" in msg.lower() or "connect" in msg.lower():
        return f"**Could not reach {provider.title()}.** Check your internet connection and try again."
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg or "quota" in msg.lower() or "rate" in msg.lower():
        return (
            f"**{provider.title()} quota exceeded** — you've hit the free-tier rate limit for `{model}`. "
            "Please switch to another provider using the model selector in the header (try Cerebras, Groq, or Mistral)."
        )
    if "401" in msg or "403" in msg or "authentication" in msg.lower() or "api key" in msg.lower():
        return f"**{provider.title()} API key is invalid or expired.** Check your `.env` file."
    if "404" in msg or "not found" in msg.lower() or "does not exist" in msg.lower():
        return f"**Model `{model}` not found on {provider.title()}.** It may have been renamed or removed."
    if "402" in msg or "insufficient" in msg.lower() or "credit" in msg.lower():
        return f"**{provider.title()} account has no credits.** Add billing at the provider's website."
    return f"**{provider.title()} error:** {msg[:200]}"


def _build_context(chunks: list[ChunkResult]) -> str:
    lines = []
    for i, chunk in enumerate(chunks, 1):
        lines.append(
            f'<document id="{i}" source="{chunk.doc_name}" page="{chunk.page_number}">\n'
            f'{chunk.text}\n'
            f'</document>'
        )
    return "\n\n".join(lines)


def _build_messages(session_id: str, user_query: str, context: str) -> list:
    session = session_service.get_or_create(session_id)
    messages = [SystemMessage(content=config.RAG_SYSTEM_PROMPT)]

    max_ctx_chars = 32000
    if len(context) > max_ctx_chars:
        context = context[:max_ctx_chars] + "\n... [context truncated]"

    history_chars_limit = 16000
    history_chars = 0
    history_messages = []

    for turn in reversed(session.messages):
        turn_len = len(turn["content"])
        if history_chars + turn_len > history_chars_limit:
            break
        history_chars += turn_len
        if turn["role"] == "user":
            history_messages.insert(0, HumanMessage(content=turn["content"]))
        else:
            history_messages.insert(0, AIMessage(content=turn["content"]))

    messages.extend(history_messages)

    augmented_query = (
        f"<context>\n{context}\n</context>\n\n"
        f"Answer the following question using ONLY the document context above when relevant.\n"
        f"Question: {user_query}"
    )
    messages.append(HumanMessage(content=augmented_query))
    return messages


def stream_response(
    session_id: str,
    message: str,
    doc_ids: list[str],
    provider: str = config.DEFAULT_PROVIDER,
    model: str = config.DEFAULT_MODEL,
) -> Generator[str, None, None]:

    chunks = retrieval_service.retrieve(message, doc_ids)

    if not chunks:
        no_ctx = "I could not find relevant information in the uploaded documents to answer your question."
        yield f'data: {json.dumps({"type": "token", "content": no_ctx})}\n\n'
        yield f'data: {json.dumps({"type": "citations", "citations": []})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
        session_service.append_turn(session_id, message, no_ctx)
        return

    context = _build_context(chunks)
    messages = _build_messages(session_id, message, context)

    is_auto = provider == "auto"
    providers_to_try = AUTO_FALLBACK_ORDER if is_auto else [(provider, model)]

    for try_provider, try_model in providers_to_try:
        try:
            llm = build_llm(try_provider, try_model)
        except ValueError:
            continue

        full_response = ""
        try:
            for chunk in llm.stream(messages):
                delta = chunk.content
                if delta:
                    full_response += delta
                    yield f'data: {json.dumps({"type": "token", "content": delta})}\n\n'

        except Exception as e:
            logger.warning("LLM error [%s/%s]: %s", try_provider, try_model, e)
            if is_auto and _is_retriable(e) and not full_response:
                logger.info("Auto: falling back from %s to next provider", try_provider)
                continue
            yield f'data: {json.dumps({"type": "error", "content": _friendly_error(try_provider, try_model, e)})}\n\n'
            yield f'data: {json.dumps({"type": "done"})}\n\n'
            return

        # Success
        if is_auto:
            yield f'data: {json.dumps({"type": "provider_used", "provider": try_provider, "model": try_model})}\n\n'
        citations_list = [c.to_dict() for c in chunks]
        yield f'data: {json.dumps({"type": "citations", "citations": citations_list})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
        session_service.append_turn(
            session_id, message, full_response,
            citations=citations_list,
            provider=try_provider,
            model=try_model,
        )
        session_service.update_doc_ids(session_id, doc_ids)
        return

    yield f'data: {json.dumps({"type": "error", "content": "All providers are currently rate-limited. Please wait a moment and try again."})}\n\n'
    yield f'data: {json.dumps({"type": "done"})}\n\n'
