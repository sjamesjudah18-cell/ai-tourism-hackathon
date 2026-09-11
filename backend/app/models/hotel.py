from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey

from app.core.database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(
        Integer,
        ForeignKey("destinations.id"),
        nullable=False
    )
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    rating = Column(Float, nullable=True)
    price_per_night = Column(Float, nullable=True)
    description = Column(Text, nullable=True)