"""Rate limiting utilities."""

import logging
import time

import redis

from app.core.config import settings
from app.core.exceptions import BadRequestException

logger = logging.getLogger(__name__)

_redis_client: redis.Redis | None = None
_memory_attempts: dict[str, list[float]] = {}


def _get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except Exception as exc:
            logger.warning("Redis unavailable for rate limiting: %s", exc)
            _redis_client = None
    return _redis_client


def check_rate_limit(key: str, max_attempts: int, window_seconds: int) -> None:
    """Raise if rate limit exceeded for the given key."""
    client = _get_redis()
    if client:
        redis_key = f"ratelimit:{key}"
        count = client.incr(redis_key)
        if count == 1:
            client.expire(redis_key, window_seconds)
        if count > max_attempts:
            raise BadRequestException("Trop de tentatives. Réessayez plus tard.")
        return

    now = time.time()
    attempts = _memory_attempts.setdefault(key, [])
    attempts[:] = [t for t in attempts if now - t < window_seconds]
    if len(attempts) >= max_attempts:
        raise BadRequestException("Trop de tentatives. Réessayez plus tard.")
    attempts.append(now)


def reset_rate_limit(key: str) -> None:
    """Remet à zéro le compteur après une authentification réussie."""
    client = _get_redis()
    if client:
        try:
            client.delete(f"ratelimit:{key}")
        except Exception as exc:
            logger.warning("Redis unavailable for rate limit reset: %s", exc)
    _memory_attempts.pop(key, None)
