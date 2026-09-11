from sqlalchemy import Column, Integer, Text, ForeignKey

from app.core.database import Base


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    place_id = Column(
        Integer,
        ForeignKey("places.id"),
        nullable=False
    )

    rating = Column(Integer, nullable=False)

    review_text = Column(Text, nullable=True)