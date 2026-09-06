import hashlib
import json
import logging
import time
from collections.abc import Generator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

import database
from services.llm_factory import AUTO_FALLBACK_ORDER, build_llm, get_available_providers
from services.settings_service import get_bool, get_int, get_setting

logger = logging.getLogger(__name__)

PUBLIC_MODEL_ALLOWLIST = [
    ("auto", "auto"),
    ("cerebras", "llama3.1-8b"),
    ("groq", "openai/gpt-oss-20b"),
    ("mistral", "mistral-small-latest"),
    ("gemini", "gemini-2.0-flash"),
]

MAX_MESSAGE_CHARS = 1000
MAX_HISTORY_TURNS = 6
MAX_HISTORY_CHARS = 4000
MAX_CONTEXT_CHARS = 12000
MAX_INSTRUCTIONS_CHARS = 2000
MAX_OUTPUT_WORDS = 180


def _hash(value: str | None) -> str | None:
    if not value:
        return None
    return hashlib.sha256(value.encode()).hexdigest()[:32]


def _setting_text(key: str, default: str = "", limit: int | None = None) -> str:
    value = get_setting(key, default).strip()
    if limit is not None:
        return value[:limit]
    return value


def _suggested_questions() -> list[str]:
    raw = _setting_text("public_assistant_suggested_questions")
    questions = []
    for line in raw.splitlines():
        question = line.strip()
        if question:
            questions.append(question[:160])
        if len(questions) == 3:
            break
    return questions


def _available_pairs() -> set[tuple[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for provider in get_available_providers():
        if not provider.get("available"):
            continue
        provider_id = provider["id"]
        for model in provider.get("models", []):
            pairs.add((provider_id, model["id"]))
    if pairs.intersection(set(PUBLIC_MODEL_ALLOWLIST) - {("auto", "auto")}):
        pairs.add(("auto", "auto"))
    return pairs


def public_model_options() -> list[dict]:
    available = _available_pairs()
    options = []
    for provider, model in PUBLIC_MODEL_ALLOWLIST:
        options.append({
            "provider": provider,
            "model": model,
            "label": "Bascule automatique" if provider == "auto" else f"{provider} / {model}",
            "available": (provider, model) in available,
        })
    return options


def _configured_model() -> tuple[str, str] | None:
    provider = _setting_text("public_assistant_provider", "auto")
    model = _setting_text("public_assistant_model", "auto")
    pair = (provider, model)
    allowed = set(PUBLIC_MODEL_ALLOWLIST)
    available = _available_pairs()
    if pair in allowed and pair in available:
        return pair
    for fallback in PUBLIC_MODEL_ALLOWLIST:
        if fallback in available:
            return fallback
    return None


def is_enabled() -> bool:
    return get_bool("public_assistant_enabled", False) and bool(_setting_text("public_assistant_context"))


def public_config() -> dict:
    enabled = is_enabled() and _configured_model() is not None
    if not enabled:
        return {"enabled": False}
    return {
        "enabled": True,
        "greeting": _setting_text("public_assistant_greeting"),
        "placeholder": _setting_text("public_assistant_placeholder", "Posez une question sur ENSET AI..."),
        "suggested_questions": _suggested_questions(),
    }


def hourly_limit() -> str:
    value = get_int("public_assistant_rate_limit_per_hour", 30)
    bounded = min(max(value, 5), 120)
    return f"{bounded} per hour"


def sanitize_history(raw_history) -> list[dict[str, str]]:
    if not isinstance(raw_history, list):
        return []
    sanitized = []
    total = 0
    for item in raw_history[-MAX_HISTORY_TURNS:]:
        if not isinstance(item, dict):
            continue
        role = item.get("role")
        if role not in {"user", "assistant"}:
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        remaining = MAX_HISTORY_CHARS - total
        if remaining <= 0:
            break
        content = content[: min(remaining, 1000)]
        total += len(content)
        sanitized.append({"role": role, "content": content})
    return sanitized


def _build_messages(message: str, history: list[dict[str, str]]) -> list:
    context = _setting_text("public_assistant_context", limit=MAX_CONTEXT_CHARS)
    instructions = _setting_text("public_assistant_instructions", limit=MAX_INSTRUCTIONS_CHARS)
    fallback = _setting_text("public_assistant_fallback_message")
    system = (
        "You are the public landing-page assistant for ENSET AI.\n"
        "You are not a general-purpose assistant.\n"
        "Use only the approved public context below to answer factual questions.\n"
        "If the approved context does not support the answer, say that you do not have enough information and redirect the visitor using the fallback guidance.\n"
        "You may explain that signing in is required for authenticated product actions only when that is relevant.\n"
        "Answer in the visitor's language when possible, translating only facts supported by the approved context.\n"
        f"Keep answers concise, normally under {MAX_OUTPUT_WORDS} words.\n\n"
        f"<fallback_message>\n{fallback}\n</fallback_message>\n\n"
        f"<admin_instructions>\n{instructions}\n</admin_instructions>\n\n"
        f"<approved_public_context>\n{context}\n</approved_public_context>"
    )
    messages = [SystemMessage(content=system)]
    for turn in history:
        if turn["role"] == "user":
            messages.append(HumanMessage(content=turn["content"]))
        else:
            messages.append(AIMessage(content=turn["content"]))
    messages.append(HumanMessage(content=message))
    return messages


def record_event(
    *,
    ip_address: str | None,
    user_agent: str | None,
    outcome: str,
    provider: str | None = None,
    model: str | None = None,
    latency_ms: int | None = None,
    input_chars: int = 0,
    output_chars: int = 0,
) -> None:
    try:
        with database.get_db() as conn:
            conn.execute(
                """
                INSERT INTO public_assistant_events
                    (ip_hash, user_agent_hash, outcome, provider, model, latency_ms, input_chars, output_chars, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    _hash(ip_address),
                    _hash(user_agent),
                    outcome,
                    provider,
                    model,
                    latency_ms,
                    input_chars,
                    output_chars,
                    time.time(),
                ),
            )
    except Exception as exc:
        logger.warning("Failed to record public assistant event: %s", exc)


def stream_response(
    message: str,
    history: list[dict[str, str]],
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> Generator[str, None, None]:
    started = time.time()
    trimmed = message.strip()[:MAX_MESSAGE_CHARS]
    input_chars = len(trimmed) + sum(len(turn["content"]) for turn in history)
    if not is_enabled():
        record_event(ip_address=ip_address, user_agent=user_agent, outcome="disabled", input_chars=input_chars)
        yield f'data: {json.dumps({"type": "error", "content": "L’assistant public est momentanément indisponible."})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
        return
    if not trimmed:
        yield f'data: {json.dumps({"type": "error", "content": "Veuillez saisir une question."})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
        return

    configured = _configured_model()
    if configured is None:
        record_event(ip_address=ip_address, user_agent=user_agent, outcome="provider_error", input_chars=input_chars)
        yield f'data: {json.dumps({"type": "error", "content": "L’assistant public est momentanément indisponible."})}\n\n'
        yield f'data: {json.dumps({"type": "done"})}\n\n'
        return

    pairs = AUTO_FALLBACK_ORDER if configured == ("auto", "auto") else [configured]
    messages = _build_messages(trimmed, history)

    for provider, model in pairs:
        if (provider, model) not in set(PUBLIC_MODEL_ALLOWLIST):
            continue
        try:
            llm = build_llm(provider, model)
            output = ""
            for chunk in llm.stream(messages):
                delta = chunk.content
                if delta:
                    output += delta
                    yield f'data: {json.dumps({"type": "token", "content": delta})}\n\n'
            record_event(
                ip_address=ip_address,
                user_agent=user_agent,
                outcome="success",
                provider=provider,
                model=model,
                latency_ms=int((time.time() - started) * 1000),
                input_chars=input_chars,
                output_chars=len(output),
            )
            yield f'data: {json.dumps({"type": "done"})}\n\n'
            return
        except Exception as exc:
            logger.warning("Public assistant provider error [%s/%s]: %s", provider, model, exc)
            continue

    record_event(
        ip_address=ip_address,
        user_agent=user_agent,
        outcome="provider_error",
        latency_ms=int((time.time() - started) * 1000),
        input_chars=input_chars,
    )
    yield f'data: {json.dumps({"type": "error", "content": "L’assistant public est momentanément indisponible."})}\n\n'
    yield f'data: {json.dumps({"type": "done"})}\n\n'
