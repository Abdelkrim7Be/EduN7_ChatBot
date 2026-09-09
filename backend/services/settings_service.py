import logging
import time

import database

logger = logging.getLogger(__name__)

# In-memory cache refreshed on each get_setting call if stale.
# invalidate_cache() only clears this process's copy, so with multiple
# gunicorn workers a write made through one worker would otherwise never
# reach the others; the TTL bounds how long any worker can serve a stale
# value regardless of which process handled the update.
_CACHE_TTL_SECONDS = 5

_cache: dict[str, str] = {}
_cache_loaded: bool = False
_cache_loaded_at: float = 0.0


def _load_cache() -> None:
    global _cache, _cache_loaded, _cache_loaded_at
    try:
        with database.get_db() as conn:
            rows = conn.execute("SELECT key, value FROM settings").fetchall()
            _cache = {r["key"]: r["value"] for r in rows}
            _cache_loaded = True
            _cache_loaded_at = time.time()
    except Exception as e:
        logger.error("Failed to load settings cache: %s", e)


def invalidate_cache() -> None:
    global _cache_loaded
    _cache_loaded = False


def get_setting(key: str, default: str = "") -> str:
    """Get a setting value from DB, falling back to default."""
    if not _cache_loaded or time.time() - _cache_loaded_at > _CACHE_TTL_SECONDS:
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
