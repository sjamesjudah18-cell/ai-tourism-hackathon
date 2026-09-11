from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.sql import func

from app.core.database import Base


class ItineraryChange(Base):
    """
    An audit record of a change the traveller explicitly confirmed.

    Every row here corresponds to a CONFIRM CHANGE action. Nothing writes to
    this table automatically, so its contents are a complete record of
    user-approved modifications - if a row exists, a human pressed the button.
    """

    __tablename__ = "itinerary_changes"

    id = Column(Integer, primary_key=True, index=True)

    trip_id = Column(Integer, ForeignKey("trips.id"), nullable=True, index=True)

    # The alert that prompted the change, where there was one.
    alert_fingerprint = Column(String(32), nullable=True, index=True)

    trip_day = Column(Integer, nullable=False)

    replaced_place = Column(String(250), nullable=False)
    replacement_place = Column(String(250), nullable=False)

    reason = Column(Text, nullable=True)

    confirmed_at = Column(DateTime(timezone=True), server_default=func.now())
