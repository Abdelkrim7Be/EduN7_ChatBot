import json
import logging
from collections.abc import Generator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

import config
from services import retrieval_service, session_service
from services.llm_factory import AUTO_FALLBACK_ORDER, build_llm
from services.retrieval_service import ChunkResult

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

    messages = [SystemMessage(content=config.get_system_prompt())]

    history_messages = []
    history_chars = 0
    history_chars_limit = config.MAX_HISTORY_TURNS * 1000

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

    if context.strip():
        augmented_query = (
            f"Here are some search results from the database. If they are relevant, use them to answer. "
            f"If they are NOT relevant, completely ignore them and answer using your own knowledge.\n\n"
            f"<database_results>\n{context}\n</database_results>\n\n"
            f"User: {user_query}"
        )
    else:
        augmented_query = user_query

    messages.append(HumanMessage(content=augmented_query))
    return messages


def _rewrite_query(session, user_query: str, provider: str, model: str, is_auto: bool = False) -> str:
    history_text = ""
    if session.messages:
        for msg in session.messages[-4:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
    else:
        history_text = "(No prior history. This is the first message.)\n"
    
    rewrite_prompt = (
        "Given the following conversation and a follow-up user message, "
        "determine if the follow-up message requires searching a PRIVATE document knowledge base. "
        "If the user is asking about general knowledge (e.g., 'who is the president of France?', 'what is Python?', 'capital of Spain', 'write a poem'), "
        "or if it is just a conversational greeting (like 'hi', 'hello', 'thanks'), "
        "return EXACTLY the string: __NO_SEARCH__\n"
        "Only rewrite the query for search if it clearly pertains to internal documents, strategies, or private technical details.\n"
        "Do NOT answer the query, ONLY return the rewritten query or __NO_SEARCH__.\n\n"
        f"Conversation History:\n{history_text}\n"
        f"Follow-up: {user_query}\n"
        "Output:"
    )
    
    providers_to_try = [(provider, model)]
    for p, m in AUTO_FALLBACK_ORDER:
        if (p, m) not in providers_to_try:
            providers_to_try.append((p, m))
    
    for p, m in providers_to_try:
        try:
            llm = build_llm(p, m)
            response = llm.invoke([HumanMessage(content=rewrite_prompt)])
            rewritten = response.content.strip()
            if len(rewritten) > 200 or not rewritten:
                return user_query
            return rewritten
        except ValueError:
            continue
        except Exception as e:
            logger.warning("Query rewrite failed for %s/%s: %s", p, m, e)
            continue
            
    return user_query


def stream_response(
    session_id: str,
    message: str,
    doc_ids: list[str],
    provider: str = config.DEFAULT_PROVIDER,
    model: str = config.DEFAULT_MODEL,
) -> Generator[str, None, None]:

    session = session_service.get_or_create(session_id)
    is_auto = (provider == "auto")
    
    rewrite_provider = config.DEFAULT_PROVIDER if is_auto else provider
    rewrite_model = config.DEFAULT_MODEL if is_auto else model
    
    if not doc_ids:
        # No documents selected — retrieval is a no-op, so skip the extra
        # query-rewrite LLM round-trip entirely (halves latency and cost).
        chunks = []
    else:
        search_query = _rewrite_query(session, message, rewrite_provider, rewrite_model, is_auto)
        logger.info("Original query: '%s', rewritten for search: '%s'", message, search_query)
        if "__NO_SEARCH__" in search_query:
            chunks = []
        else:
            chunks = retrieval_service.retrieve(search_query, doc_ids)

    context = _build_context(chunks) if chunks else ""
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
            try:
                for chunk in llm.stream(messages):
                    delta = chunk.content
                    if delta:
                        full_response += delta
                        yield f'data: {json.dumps({"type": "token", "content": delta})}\n\n'
            except GeneratorExit:
                # Client disconnected (stop button / navigation). Keep whatever
                # was generated so the conversation history is not lost.
                if full_response:
                    session_service.append_turn(
                        session_id, message, full_response,
                        citations=[c.to_dict() for c in chunks],
                        provider=try_provider, model=try_model,
                    )
                    session_service.update_doc_ids(session_id, doc_ids)
                raise

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
