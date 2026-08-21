import logging
import config

logger = logging.getLogger(__name__)

PROVIDER_CATALOG = {
    "gemini": {
        "name": "Gemini",
        "description": "Free · 1M token context · Strong quality",
        "badge": "Free",
        "models": [
            {"id": "gemini-2.0-flash",   "name": "Gemini 2.0 Flash", "description": "Latest · Fast · Free"},
            {"id": "gemini-1.5-flash",   "name": "Gemini 1.5 Flash", "description": "Stable · Free"},
            {"id": "gemini-1.5-pro",     "name": "Gemini 1.5 Pro",   "description": "Most capable · 1M ctx"},
        ],
    },
    "cerebras": {
        "name": "Cerebras",
        "description": "Ultra-fast · Wafer-scale chip · Free tier",
        "badge": "Fastest",
        "models": [
            {"id": "qwen-3-235b-a22b-instruct-2507", "name": "Qwen 3 235B",   "description": "Newest · Largest"},
            {"id": "gpt-oss-120b",                   "name": "GPT-OSS 120B",  "description": "High quality · Fast"},
            {"id": "llama3.1-8b",                    "name": "Llama 3.1 8B",  "description": "Fastest · Lightweight"},
        ],
    },
    "groq": {
        "name": "Groq",
        "description": "Fast inference · Free tier",
        "badge": "Fast",
        "models": [
            {"id": "openai/gpt-oss-20b",   "name": "GPT-OSS 20B",       "description": "Fastest · Lightweight"},
            {"id": "openai/gpt-oss-120b",  "name": "GPT-OSS 120B",      "description": "High quality · Fast"},
            {"id": "groq/compound",        "name": "Groq Compound",     "description": "Agentic · Tool use"},
            {"id": "groq/compound-mini",   "name": "Groq Compound Mini","description": "Agentic · Fastest"},
        ],
    },
    "mistral": {
        "name": "Mistral",
        "description": "European AI · Strong reasoning · Free tier",
        "badge": "Free",
        "models": [
            {"id": "mistral-small-latest",  "name": "Mistral Small",  "description": "Fast · Free tier"},
            {"id": "open-mistral-7b",       "name": "Mistral 7B",     "description": "Lightweight · Free"},
            {"id": "open-mixtral-8x7b",     "name": "Mixtral 8x7B",   "description": "Great for coding"},
        ],
    },
    "openrouter": {
        "name": "OpenRouter",
        "description": "100+ models · Many free · One key",
        "badge": "Free",
        "models": [
            {"id": "google/gemma-4-31b-it:free",                 "name": "Gemma 4 31B",       "description": "Free · Google · Fast"},
            {"id": "nvidia/nemotron-3-super-120b-a12b:free",     "name": "Nemotron 120B",     "description": "Free · NVIDIA · Large"},
            {"id": "openai/gpt-oss-20b:free",                    "name": "GPT-OSS 20B",       "description": "Free · Fast"},
            {"id": "z-ai/glm-5.2:free",                          "name": "GLM 5.2",           "description": "Free · Capable"},
        ],
    },
    "together": {
        "name": "Together AI",
        "description": "100+ open-source models · Fast inference",
        "badge": "Fast",
        "models": [
            {"id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",   "name": "Llama 3.3 70B",    "description": "High quality · Fast"},
            {"id": "Qwen/Qwen2.5-7B-Instruct-Turbo",            "name": "Qwen 2.5 7B",      "description": "Fast · Efficient"},
            {"id": "deepseek-ai/DeepSeek-V4-Pro",                "name": "DeepSeek V4 Pro",  "description": "Best reasoning"},
            {"id": "openai/gpt-oss-120b",                        "name": "GPT-OSS 120B",     "description": "Large · Capable"},
        ],
    },
    "sambanova": {
        "name": "SambaNova",
        "description": "Ultra-fast · Free · Llama 4 · DeepSeek R1",
        "badge": "Fastest",
        "models": [
            {"id": "Meta-Llama-3.3-70B-Instruct",                "name": "Llama 3.3 70B",    "description": "High quality · Free"},
            {"id": "DeepSeek-V3.2",                              "name": "DeepSeek V3.2",    "description": "Strong reasoning"},
            {"id": "gpt-oss-120b",                               "name": "GPT-OSS 120B",     "description": "Large · Capable"},
            {"id": "MiniMax-M3",                                 "name": "MiniMax M3",       "description": "Newest · Capable"},
        ],
    },
}

BADGE_PRIORITY = ["Free", "Fastest", "Fast", "Powerful", "Standard", "Private"]

AUTO_FALLBACK_ORDER = [
    ("cerebras",   "llama3.1-8b"),
    ("sambanova",  "Meta-Llama-3.3-70B-Instruct"),
    ("groq",       "openai/gpt-oss-20b"),
    ("groq",       "groq/compound-mini"),
    ("groq",       "openai/gpt-oss-120b"),
    ("mistral",    "mistral-small-latest"),
    ("openrouter", "google/gemma-4-31b-it:free"),
    ("gemini",     "gemini-2.0-flash"),
]


def get_available_providers() -> list[dict]:
    result = []

    for pid, meta in PROVIDER_CATALOG.items():
        if pid == "gemini":
            available = bool(config.GEMINI_API_KEY)
            reason = None if available else "Set GEMINI_API_KEY in .env — free at aistudio.google.com"
            models = meta["models"] if available else []

        elif pid == "cerebras":
            available = bool(config.CEREBRAS_API_KEY)
            reason = None if available else "Set CEREBRAS_API_KEY in .env — free at cloud.cerebras.ai"
            models = meta["models"] if available else []

        elif pid == "groq":
            available = bool(config.GROQ_API_KEY)
            reason = None if available else "Set GROQ_API_KEY in .env — free at console.groq.com"
            models = meta["models"] if available else []

        elif pid == "mistral":
            available = bool(config.MISTRAL_API_KEY)
            reason = None if available else "Set MISTRAL_API_KEY in .env — free at console.mistral.ai"
            models = meta["models"] if available else []

        elif pid == "openrouter":
            available = bool(config.OPENROUTER_API_KEY)
            reason = None if available else "Set OPENROUTER_API_KEY in .env — free at openrouter.ai"
            models = meta["models"] if available else []

        elif pid == "together":
            available = bool(config.TOGETHER_API_KEY)
            reason = None if available else "Set TOGETHER_API_KEY in .env — free credit at api.together.ai"
            models = meta["models"] if available else []

        elif pid == "sambanova":
            available = bool(config.SAMBANOVA_API_KEY)
            reason = None if available else "Set SAMBANOVA_API_KEY in .env — free at cloud.sambanova.ai"
            models = meta["models"] if available else []

        result.append({
            "id": pid,
            "name": meta["name"],
            "description": meta["description"],
            "badge": meta["badge"],
            "available": available,
            "unavailable_reason": reason,
            "models": models,
        })

    return result


def build_llm(provider: str, model: str):
    if provider == "gemini":
        if not config.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY not set")
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=config.GEMINI_API_KEY,
            temperature=config.LLM_TEMPERATURE,
            max_output_tokens=config.LLM_MAX_TOKENS,
            max_retries=0,
            streaming=True,
        )

    elif provider == "cerebras":
        if not config.CEREBRAS_API_KEY:
            raise ValueError("CEREBRAS_API_KEY not set")
        # Cerebras exposes an OpenAI-compatible API — no extra package needed
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=config.CEREBRAS_API_KEY,
            base_url="https://api.cerebras.ai/v1",
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    elif provider == "groq":
        if not config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY not set")
        from langchain_groq import ChatGroq
        return ChatGroq(
            model=model,
            api_key=config.GROQ_API_KEY,
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            max_retries=0,
            streaming=True,
        )

    elif provider == "anthropic":
        if not config.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not set")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(
            model=model,
            api_key=config.ANTHROPIC_API_KEY,
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    elif provider == "mistral":
        if not config.MISTRAL_API_KEY:
            raise ValueError("MISTRAL_API_KEY not set")
        from langchain_mistralai import ChatMistralAI
        return ChatMistralAI(
            model=model,
            api_key=config.MISTRAL_API_KEY,
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    elif provider == "openrouter":
        if not config.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=config.OPENROUTER_API_KEY,
            base_url="https://openrouter.ai/api/v1",
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    elif provider == "together":
        if not config.TOGETHER_API_KEY:
            raise ValueError("TOGETHER_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=config.TOGETHER_API_KEY,
            base_url="https://api.together.xyz/v1",
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    elif provider == "sambanova":
        if not config.SAMBANOVA_API_KEY:
            raise ValueError("SAMBANOVA_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            api_key=config.SAMBANOVA_API_KEY,
            base_url="https://api.sambanova.ai/v1",
            temperature=config.LLM_TEMPERATURE,
            max_tokens=config.LLM_MAX_TOKENS,
            streaming=True,
        )

    else:
        raise ValueError(f"Unknown provider: {provider!r}")
