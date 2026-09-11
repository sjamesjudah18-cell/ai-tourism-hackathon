from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey

from app.core.database import Base


class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    destination_id = Column(
        Integer,
        ForeignKey("destinations.id"),
        nullable=False
    )
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    rating = Column(Float, nullable=True)
    price_level = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)