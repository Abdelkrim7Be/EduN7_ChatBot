import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
TOGETHER_API_KEY: str = os.getenv("TOGETHER_API_KEY", "")
SAMBANOVA_API_KEY: str = os.getenv("SAMBANOVA_API_KEY", "")

DEFAULT_PROVIDER: str = os.getenv("DEFAULT_PROVIDER", "gemini")
DEFAULT_MODEL: str = os.getenv("DEFAULT_MODEL", "gemini-2.0-flash")

OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.7"))
LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "8192"))

CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", "8000"))

UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
DB_PATH: str = os.getenv("DB_PATH", "./data/enset_ai.db")
DATABASE_URL: str = os.getenv("DATABASE_URL", "")

DOCUMENT_STORAGE_BACKEND: str = os.getenv("DOCUMENT_STORAGE_BACKEND", "local").lower()
DOCUMENT_STORAGE_PREFIX: str = os.getenv("DOCUMENT_STORAGE_PREFIX", "documents")
S3_BUCKET: str = os.getenv("S3_BUCKET", "")
S3_ENDPOINT_URL: str = os.getenv("S3_ENDPOINT_URL", "")
S3_REGION: str = os.getenv("S3_REGION", "us-east-1")
S3_ACCESS_KEY_ID: str = os.getenv("S3_ACCESS_KEY_ID", os.getenv("AWS_ACCESS_KEY_ID", ""))
S3_SECRET_ACCESS_KEY: str = os.getenv("S3_SECRET_ACCESS_KEY", os.getenv("AWS_SECRET_ACCESS_KEY", ""))

EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "200"))
TOP_K_RESULTS: int = int(os.getenv("TOP_K_RESULTS", "5"))

VECTOR_STORE_BACKEND: str = os.getenv("VECTOR_STORE_BACKEND", "chroma").lower()
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")

MAX_HISTORY_TURNS: int = int(os.getenv("MAX_HISTORY_TURNS", "6"))
SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "3600"))

JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production")
if JWT_SECRET == "change-me-in-production" and os.getenv("FLASK_ENV") != "development":
    raise RuntimeError(
        "FATAL: JWT_SECRET is not set. Set JWT_SECRET in your .env file. "
        "Current value 'change-me-in-production' is not safe for deployment."
    )
JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
ADMIN_EMAILS: list[str] = [e.strip() for e in os.getenv("ADMIN_EMAILS", "").split(",") if e.strip()]
ALLOWED_EMAIL_DOMAINS: list[str] = [d.strip() for d in os.getenv("ALLOWED_EMAIL_DOMAINS", "").split(",") if d.strip()]

REDIS_URL: str = os.getenv("REDIS_URL", "")
TRUST_PROXY_HEADERS: bool = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in ("true", "1", "yes")

ALLOWED_ORIGINS: list[str] = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]
RATE_LIMIT_CHAT: str = os.getenv("RATE_LIMIT_CHAT", "30 per hour")
RATE_LIMIT_UPLOAD: str = os.getenv("RATE_LIMIT_UPLOAD", "20 per day")

RAG_SYSTEM_PROMPT: str = (
    "Tu es ENSET AI, un assistant IA très intelligent et utile. "
    "Tu disposes de connaissances générales étendues et tu peux répondre aux questions de l'utilisateur. "
    "Parfois, des <database_results> issus des documents privés de l'utilisateur te seront fournis. "
    "Si ces résultats sont pertinents pour la question, utilise-les pour personnaliser ta réponse et cite-les avec [1], [2]. "
    "En revanche, si les résultats de la base sont non pertinents ou vides, ignore-les et réponds avec tes connaissances générales. "
    "N'affirme jamais que le contexte ne fournit pas l'information si tu peux répondre autrement. "
    "Réponds directement, naturellement et en français sauf si l'utilisateur demande explicitement une autre langue."
)

def get_runtime_setting(key: str, fallback: str = "") -> str:
    """Get a setting from DB, falling back to the env-based value."""
    try:
        from services.settings_service import get_setting
        return get_setting(key, fallback)
    except Exception:
        return fallback

def get_system_prompt() -> str:
    """Get the system prompt, preferring DB setting over env default."""
    return get_runtime_setting("system_prompt", RAG_SYSTEM_PROMPT)

def is_registration_allowed() -> bool:
    """Check if registration is allowed via DB setting."""
    try:
        from services.settings_service import get_bool
        return get_bool("allow_registration", True)
    except Exception:
        return True

def is_maintenance_mode() -> bool:
    """Check if maintenance mode is active."""
    try:
        from services.settings_service import get_bool
        return get_bool("maintenance_mode", False)
    except Exception:
        return False
