"""
Fail-soft HTTP with a small in-process TTL cache.

Two jobs:
  1. No external API may ever raise into a request handler. Callers get None
     and render "temporarily unavailable" instead of a 500.
  2. Avoid hammering free public APIs - identical calls inside the TTL window
     reuse the previous response.

Deliberately in-process and dependency-free: this is a single-process modular
monolith, and a Redis dependency would be more moving parts than the problem
warrants.
"""

from __future__ import annotations

import threading
import time
from typing import Any, Callable

import requests

# Public APIs we use ask for an identifying User-Agent (Nominatim requires it).
USER_AGENT = "AI-Tourism/1.0 (travel reality intelligence; hackathon project)"

DEFAULT_TIMEOUT = 6.0

_lock = threading.Lock()
_cache: dict[str, tuple[float, Any]] = {}


def cache_get(key: str) -> Any | None:
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.time():
            _cache.pop(key, None)
            return None
        return value


def cache_set(key: str, value: Any, ttl_seconds: float) -> None:
    with _lock:
        _cache[key] = (time.time() + ttl_seconds, value)


def cache_clear() -> None:
    """Used by tests; not exposed over HTTP."""
    with _lock:
        _cache.clear()


def cached(key: str, ttl_seconds: float, producer: Callable[[], Any]) -> Any:
    """
    Returns the cached value, or computes and stores it. A producer that
    returns None is not cached, so a transient failure retries next time
    rather than being pinned for the whole TTL.
    """
    hit = cache_get(key)
    if hit is not None:
        return hit

    value = producer()
    if value is not None:
        cache_set(key, value, ttl_seconds)
    return value


def fetch_json(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    ttl_seconds: float = 600.0,
    params: dict[str, Any] | None = None,
) -> dict[str, Any] | list[Any] | None:
    """
    GETs JSON. Returns None on any failure - never raises.
    """
    cache_key = f"json::{url}::{sorted((params or {}).items())}"

    def _produce():
        try:
            response = requests.get(
                url,
                params=params,
                timeout=timeout,
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
            if response.status_code != 200:
                return None
            return response.json()
        except Exception:
            # Intentionally broad: connection errors, timeouts, malformed JSON
            # and DNS failures must all degrade to "unavailable", never a 500.
            return None

    return cached(cache_key, ttl_seconds, _produce)


def fetch_text(
    url: str,
    *,
    timeout: float = DEFAULT_TIMEOUT,
    ttl_seconds: float = 900.0,
    params: dict[str, Any] | None = None,
) -> str | None:
    """GETs text (used for RSS). Returns None on any failure - never raises."""
    cache_key = f"text::{url}::{sorted((params or {}).items())}"

    def _produce():
        try:
            response = requests.get(
                url,
                params=params,
                timeout=timeout,
                headers={"User-Agent": USER_AGENT},
            )
            if response.status_code != 200:
                return None
            return response.text
        except Exception:
            return None

    return cached(cache_key, ttl_seconds, _produce)
