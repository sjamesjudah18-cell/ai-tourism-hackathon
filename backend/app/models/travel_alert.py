from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class TravelAlert(Base):
    """
    A persisted alert, in exactly the shape `core.reality.make_alert` produces.

    The notification centre reads these same rows - there is deliberately no
    separate `notifications` table. A second store would mean a second alert
    format to keep in sync, and the two would drift. Read/dismissed state lives
    here alongside the alert instead.
    """

    __tablename__ = "travel_alerts"

    id = Column(Integer, primary_key=True, index=True)

    # Stable fingerprint from make_alert - the same condition detected twice
    # collapses onto one row rather than notifying the traveller twice.
    fingerprint = Column(String(32), nullable=False, index=True)

    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True, index=True)

    type = Column(String(40), nullable=False)
    severity = Column(String(20), nullable=False)

    title = Column(String(300), nullable=False)
    message = Column(Text, nullable=False)

    source = Column(String(160), nullable=True)
    source_url = Column(Text, nullable=True)

    detected_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

    affected_trip_day = Column(Integer, nullable=True)
    affected_place = Column(String(250), nullable=True)

    impact = Column(Text, nullable=True)
    confidence = Column(String(20), nullable=True)
    estimated_delay_minutes = Column(Integer, nullable=True)

    # Notification state.
    is_read = Column(Boolean, nullable=False, default=False)
    is_dismissed = Column(Boolean, nullable=False, default=False)
