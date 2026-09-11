"""
Notification centre endpoints.

These read the same `travel_alerts` rows the rest of the application uses -
a notification is an alert plus read/dismissed state, not a separate record.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import notification_service

router = APIRouter(
    prefix="/api/notifications",
    tags=["Notifications"],
)


@router.get("/")
def list_notifications(
    trip_id: int | None = Query(None),
    include_dismissed: bool = Query(False),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return notification_service.list_notifications(
        db=db,
        trip_id=trip_id,
        include_dismissed=include_dismissed,
        limit=limit,
    )


@router.post("/{fingerprint}/read")
def mark_read(fingerprint: str, db: Session = Depends(get_db)):
    if not notification_service.mark_read(db=db, fingerprint=fingerprint):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "read", "id": fingerprint}


@router.post("/{fingerprint}/dismiss")
def dismiss(fingerprint: str, db: Session = Depends(get_db)):
    if not notification_service.dismiss(db=db, fingerprint=fingerprint):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "dismissed", "id": fingerprint}


@router.post("/read-all")
def mark_all_read(
    trip_id: int | None = Query(None),
    db: Session = Depends(get_db),
):
    count = notification_service.mark_all_read(db=db, trip_id=trip_id)
    return {"status": "ok", "marked_read": count}
