from sqlalchemy import Column, Integer, String, Float, ForeignKey

from app.core.database import Base


class Itinerary(Base):
    __tablename__ = "itineraries"

    id = Column(Integer, primary_key=True, index=True)

    trip_id = Column(
        Integer,
        ForeignKey("trips.id"),
        nullable=False
    )

    day = Column(Integer, nullable=False)

    time = Column(String(20), nullable=True)

    place_id = Column(
        Integer,
        ForeignKey("places.id"),
        nullable=True
    )

    activity = Column(String(255), nullable=False)

    estimated_cost = Column(Float, nullable=True)