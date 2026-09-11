"""
Shared vocabulary for the Travel Reality layer.

Every value the product shows a traveller carries a provenance label, so the UI
can always answer "where did this come from, and how much should I trust it?".
Nothing in here talks to an external API - it only defines the contracts that
the reality services fill in.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


# --------------------------------------------------------------------------
# Provenance labelling
# --------------------------------------------------------------------------

class DataLabel:
    """How a single value was obtained. Never guess - pick the honest one."""

    LIVE = "LIVE"                  # fetched now from a named external source
    PROVIDER_PRICE = "PROVIDER"    # a real price quoted by a real provider
    ESTIMATE = "ESTIMATE"          # computed by our own deterministic model
    APPROXIMATE = "APPROXIMATE"    # a range or rounded figure, not exact
    STATIC = "STATIC"              # curated reference data, reviewed not live
    FALLBACK = "FALLBACK"          # the live source failed; this is a stand-in
    UNAVAILABLE = "UNAVAILABLE"    # we genuinely do not know


class Confidence:
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"


class Status:
    """Category-level and trip-level readiness."""

    GOOD = "GOOD"
    FAIR = "FAIR"
    CAUTION = "CAUTION"
    POOR = "POOR"
    UNKNOWN = "UNKNOWN"


# Ordered worst-last so an overall status can be derived by taking the max.
STATUS_RANK = {
    Status.UNKNOWN: 0,
    Status.GOOD: 1,
    Status.FAIR: 2,
    Status.CAUTION: 3,
    Status.POOR: 4,
}

CONFIDENCE_RANK = {
    Confidence.LOW: 0,
    Confidence.MEDIUM: 1,
    Confidence.HIGH: 2,
}


class Severity:
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


SEVERITY_RANK = {
    Severity.INFO: 0,
    Severity.LOW: 1,
    Severity.MEDIUM: 2,
    Severity.HIGH: 3,
    Severity.CRITICAL: 4,
}


class AlertType:
    WEATHER = "WEATHER"
    TRAFFIC = "TRAFFIC"
    CLOSURE = "CLOSURE"
    LOCAL_NEWS = "LOCAL_NEWS"
    COST = "COST"
    TRANSPORT = "TRANSPORT"
    AIR_QUALITY = "AIR_QUALITY"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


# --------------------------------------------------------------------------
# Building blocks returned to the frontend
# --------------------------------------------------------------------------

def make_source(
    name: str,
    url: str | None = None,
    fetched_at: datetime | None = None,
) -> dict[str, Any]:
    """
    A source is only ever attached when it is real. If a value has no source,
    callers pass None rather than inventing one.
    """
    return {
        "name": name,
        "url": url,
        "fetched_at": iso(fetched_at or now_utc()),
    }


def make_datapoint(
    value: Any,
    label: str,
    unit: str | None = None,
    source: dict[str, Any] | None = None,
    note: str | None = None,
) -> dict[str, Any]:
    """A single displayable figure plus its provenance."""
    return {
        "value": value,
        "label": label,
        "unit": unit,
        "source": source,
        "note": note,
    }


def unavailable(reason: str) -> dict[str, Any]:
    """The honest answer when a live source could not be reached."""
    return {
        "value": None,
        "label": DataLabel.UNAVAILABLE,
        "unit": None,
        "source": None,
        "note": reason,
    }


def make_section(
    key: str,
    title: str,
    status: str,
    summary: str,
    advice: list[str] | None = None,
    details: dict[str, Any] | None = None,
    confidence: str = Confidence.MEDIUM,
    sources: list[dict[str, Any]] | None = None,
    last_updated: datetime | None = None,
    available: bool = True,
    unavailable_reason: str | None = None,
) -> dict[str, Any]:
    """
    One category of the Reality Check (Weather, Traffic, Cost, ...).

    `summary` is plain language - what a traveller actually needs to know.
    `advice` is what they should do about it.
    """
    return {
        "key": key,
        "title": title,
        "status": status,
        "summary": summary,
        "advice": advice or [],
        "details": details or {},
        "confidence": confidence,
        "sources": sources or [],
        "last_updated": iso(last_updated or now_utc()),
        "available": available,
        "unavailable_reason": unavailable_reason,
    }


def section_unavailable(key: str, title: str, reason: str) -> dict[str, Any]:
    """A category whose data source could not be reached. Degrade, don't fake."""
    return make_section(
        key=key,
        title=title,
        status=Status.UNKNOWN,
        summary=reason,
        advice=[],
        details={},
        confidence=Confidence.LOW,
        sources=[],
        available=False,
        unavailable_reason=reason,
    )


def derive_overall_status(sections: list[dict[str, Any]]) -> str:
    """Worst known category wins. Unknown sections never mask a real problem."""
    known = [
        s.get("status", Status.UNKNOWN)
        for s in sections
        if s.get("available") and s.get("status") != Status.UNKNOWN
    ]
    if not known:
        return Status.UNKNOWN
    return max(known, key=lambda s: STATUS_RANK.get(s, 0))


def derive_overall_confidence(sections: list[dict[str, Any]]) -> str:
    """
    Overall confidence is dragged down by missing categories - a reality check
    built on half the picture should not claim High confidence.
    """
    available = [s for s in sections if s.get("available")]
    if not available:
        return Confidence.LOW

    coverage = len(available) / max(1, len(sections))
    scores = [
        CONFIDENCE_RANK.get(s.get("confidence", Confidence.MEDIUM), 1)
        for s in available
    ]
    avg = sum(scores) / len(scores)

    if coverage < 0.6:
        return Confidence.LOW
    if avg >= 1.6 and coverage >= 0.85:
        return Confidence.HIGH
    if avg >= 0.9:
        return Confidence.MEDIUM
    return Confidence.LOW


# --------------------------------------------------------------------------
# Alerts
# --------------------------------------------------------------------------

def make_alert(
    type: str,
    severity: str,
    title: str,
    message: str,
    source: str | None = None,
    source_url: str | None = None,
    detected_at: datetime | None = None,
    expires_at: datetime | None = None,
    affected_trip_day: int | None = None,
    affected_place: str | None = None,
    impact: str | None = None,
    confidence: str = Confidence.MEDIUM,
    estimated_delay_minutes: int | None = None,
    suggested_actions: list[str] | None = None,
    alert_id: str | None = None,
) -> dict[str, Any]:
    """
    The single alert shape used by every source - weather, traffic, closures,
    news. The notification centre reads these same objects; there is no second
    parallel format anywhere in the codebase.
    """
    detected = detected_at or now_utc()
    return {
        "id": alert_id or _alert_fingerprint(type, title, affected_trip_day, affected_place),
        "type": type,
        "severity": severity,
        "title": title,
        "message": message,
        "source": source,
        "source_url": source_url,
        "detected_at": iso(detected),
        "expires_at": iso(expires_at or (detected + timedelta(hours=12))),
        "affected_trip_day": affected_trip_day,
        "affected_place": affected_place,
        "impact": impact,
        "confidence": confidence,
        "estimated_delay_minutes": estimated_delay_minutes,
        "suggested_actions": suggested_actions or [],
    }


def _alert_fingerprint(
    type: str,
    title: str,
    day: int | None,
    place: str | None,
) -> str:
    """
    Stable id derived from what the alert is about, so the same condition
    detected twice dedupes to one alert instead of spamming the traveller.
    """
    import hashlib

    raw = f"{type}|{title.strip().lower()}|{day}|{(place or '').strip().lower()}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def dedupe_and_prune(
    alerts: list[dict[str, Any]],
    max_alerts: int = 12,
    min_severity: str = Severity.INFO,
) -> list[dict[str, Any]]:
    """
    Keeps alerts useful rather than noisy: drops expired ones, collapses
    duplicates by fingerprint (keeping the most severe), filters below the
    severity floor, and returns the most important first.
    """
    floor = SEVERITY_RANK.get(min_severity, 0)
    now = now_utc()

    by_id: dict[str, dict[str, Any]] = {}
    for alert in alerts:
        if SEVERITY_RANK.get(alert.get("severity", Severity.INFO), 0) < floor:
            continue

        expires = alert.get("expires_at")
        if expires:
            try:
                if datetime.fromisoformat(expires) < now:
                    continue
            except (ValueError, TypeError):
                pass

        key = alert["id"]
        existing = by_id.get(key)
        if existing is None:
            by_id[key] = alert
            continue

        # Same condition seen twice - keep whichever is more severe.
        if SEVERITY_RANK.get(alert["severity"], 0) > SEVERITY_RANK.get(existing["severity"], 0):
            by_id[key] = alert

    ordered = sorted(
        by_id.values(),
        key=lambda a: (
            -SEVERITY_RANK.get(a.get("severity", Severity.INFO), 0),
            a.get("affected_trip_day") or 99,
        ),
    )
    return ordered[:max_alerts]
