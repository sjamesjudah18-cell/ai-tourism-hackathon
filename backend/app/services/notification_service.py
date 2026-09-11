"""
The notification centre.

Reads the same `TravelAlert` rows everything else uses. There is no second
alert format and no separate notifications table - a notification IS an alert,
plus read/dismissed state.

`sync_alerts` upserts freshly detected alerts by fingerprint, so re-evaluating
a trip does not re-notify the traveller about a condition they have already
seen and dismissed.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.core.reality import SEVERITY_RANK, iso, now_utc
from app.models.travel_alert import TravelAlert


def sync_alerts(
    db: Session,
    alerts: list[dict],
    trip_id: int | None = None,
) -> list[TravelAlert]:
    """
    Persists detected alerts, keyed on fingerprint.

    An existing row keeps its read/dismissed state - the traveller's decision to
    dismiss something survives the next refresh. Only the content is refreshed,
    in case severity or wording has changed.
    """
    stored: list[TravelAlert] = []

    for alert in alerts:
        fingerprint = alert.get("id")
        if not fingerprint:
            continue

        query = db.query(TravelAlert).filter(TravelAlert.fingerprint == fingerprint)
        if trip_id is not None:
            query = query.filter(TravelAlert.trip_id == trip_id)
        existing = query.first()

        if existing:
            existing.severity = alert.get("severity", existing.severity)
            existing.title = alert.get("title", existing.title)
            existing.message = alert.get("message", existing.message)
            existing.impact = alert.get("impact", existing.impact)
            stored.append(existing)
            continue

        row = TravelAlert(
            fingerprint=fingerprint,
            trip_id=trip_id,
            type=alert.get("type", "LOCAL_NEWS"),
            severity=alert.get("severity", "INFO"),
            title=(alert.get("title") or "")[:300],
            message=alert.get("message") or "",
            source=alert.get("source"),
            source_url=alert.get("source_url"),
            expires_at=_parse(alert.get("expires_at")),
            affected_trip_day=alert.get("affected_trip_day"),
            affected_place=alert.get("affected_place"),
            impact=alert.get("impact"),
            confidence=alert.get("confidence"),
            estimated_delay_minutes=alert.get("estimated_delay_minutes"),
        )
        db.add(row)
        stored.append(row)

    try:
        db.commit()
        for row in stored:
            db.refresh(row)
    except Exception:
        db.rollback()

    return stored


def _parse(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def list_notifications(
    db: Session,
    trip_id: int | None = None,
    include_dismissed: bool = False,
    limit: int = 30,
) -> dict[str, Any]:
    """Alerts as notifications, newest and most severe first."""
    query = db.query(TravelAlert)

    if trip_id is not None:
        query = query.filter(TravelAlert.trip_id == trip_id)
    if not include_dismissed:
        query = query.filter(TravelAlert.is_dismissed.is_(False))

    rows = query.order_by(TravelAlert.detected_at.desc()).limit(limit).all()

    now = now_utc()
    active = [
        row for row in rows
        if row.expires_at is None or _aware(row.expires_at) >= now
    ]

    active.sort(
        key=lambda r: (
            -SEVERITY_RANK.get(r.severity, 0),
            -(r.detected_at.timestamp() if r.detected_at else 0),
        )
    )

    serialised = [serialise(row) for row in active]

    return {
        "notifications": serialised,
        "unread_count": sum(1 for row in active if not row.is_read),
        "total": len(serialised),
    }


def _aware(value: datetime) -> datetime:
    """Postgres can hand back naive datetimes; normalise before comparing."""
    if value.tzinfo is None:
        from datetime import timezone

        return value.replace(tzinfo=timezone.utc)
    return value


def serialise(row: TravelAlert) -> dict[str, Any]:
    """
    Notification shape. It carries the alert's own fields plus the action the
    traveller can take, which is what makes it a notification rather than a log
    line.
    """
    return {
        "id": row.fingerprint,
        "row_id": row.id,
        "type": row.type,
        "severity": row.severity,
        "title": row.title,
        "message": row.message,
        "source": row.source,
        "source_url": row.source_url,
        "detected_at": iso(_aware(row.detected_at)) if row.detected_at else None,
        "expires_at": iso(_aware(row.expires_at)) if row.expires_at else None,
        "affected_trip_day": row.affected_trip_day,
        "affected_place": row.affected_place,
        "impact": row.impact,
        "confidence": row.confidence,
        "estimated_delay_minutes": row.estimated_delay_minutes,
        "is_read": row.is_read,
        "is_dismissed": row.is_dismissed,
        "action": _action_for(row),
    }


def _action_for(row: TravelAlert) -> dict[str, Any] | None:
    """The one thing the traveller can do about this notification."""
    if row.affected_trip_day:
        return {
            "label": f"Review Day {row.affected_trip_day}",
            "target": "itinerary",
            "trip_day": row.affected_trip_day,
        }
    if row.type == "COST":
        return {"label": "Review costs", "target": "reality", "section": "cost_reality"}
    if row.type == "LOCAL_NEWS":
        return {"label": "Read the report", "target": "source", "url": row.source_url}
    return {"label": "Open Reality Check", "target": "reality"}


def mark_read(db: Session, fingerprint: str) -> bool:
    return _set_flag(db, fingerprint, "is_read", True)


def dismiss(db: Session, fingerprint: str) -> bool:
    return _set_flag(db, fingerprint, "is_dismissed", True)


def mark_all_read(db: Session, trip_id: int | None = None) -> int:
    query = db.query(TravelAlert).filter(TravelAlert.is_read.is_(False))
    if trip_id is not None:
        query = query.filter(TravelAlert.trip_id == trip_id)

    rows = query.all()
    for row in rows:
        row.is_read = True

    try:
        db.commit()
    except Exception:
        db.rollback()
        return 0
    return len(rows)


def _set_flag(db: Session, fingerprint: str, field: str, value: bool) -> bool:
    row = (
        db.query(TravelAlert)
        .filter(TravelAlert.fingerprint == fingerprint)
        .first()
    )
    if not row:
        return False

    setattr(row, field, value)
    try:
        db.commit()
    except Exception:
        db.rollback()
        return False
    return True
