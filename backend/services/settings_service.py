import logging
import database

logger = logging.getLogger(__name__)

# In-memory cache refreshed on each get_setting call if stale
_cache: dict[str, str] = {}
_cache_loaded: bool = False


def _load_cache() -> None:
    global _cache, _cache_loaded
    try:
        with database.get_db() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
            _cache = {r["key"]: r["value"] for r in rows}
            _cache_loaded = True
    except Exception as e:
        logger.error("Failed to load settings cache: %s", e)


def invalidate_cache() -> None:
    global _cache_loaded
    _cache_loaded = False


def get_setting(key: str, default: str = "") -> str:
    """Get a setting value from DB, falling back to default."""
    if not _cache_loaded:
        _load_cache()
    return _cache.get(key, default)


def get_bool(key: str, default: bool = False) -> bool:
    val = get_setting(key, str(default).lower())
    return val.lower() in ("true", "1", "yes")


def get_int(key: str, default: int = 0) -> int:
    try:
        return int(get_setting(key, str(default)))
    except (ValueError, TypeError):
        return default
