import logging

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import config

logger = logging.getLogger(__name__)


def _storage_uri() -> str:
    """Rate-limit counters must be shared across workers and survive restarts.

    Falls back to in-memory only when no Redis is configured (local dev), which
    means limits reset on reload and are per-process.
    """
    if config.REDIS_URL:
        return config.REDIS_URL
    logger.warning(
        "REDIS_URL is not set — rate limits are stored in memory and are "
        "per-process only. Set REDIS_URL for any multi-worker deployment."
    )
    return "memory://"


limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri())
