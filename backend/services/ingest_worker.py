import logging
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ingest")


def submit(fn, *args, **kwargs):
    future = _pool.submit(fn, *args, **kwargs)
    future.add_done_callback(
        lambda f: logger.error("Ingest task raised: %s", f.exception())
        if f.exception()
        else None
    )
    return future
