from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    destination = Column(String(150), nullable=False)

    start_date = Column(Date, nullable=True)

    end_date = Column(Date, nullable=True)

    number_of_days = Column(Integer, nullable=False)

    total_budget = Column(Float, nullable=False)

    number_of_travelers = Column(
        Integer,
        nullable=False,
        default=1
    )

    interests = Column(
        JSONB,
        nullable=True
    )

    transport_preference = Column(
        String(50),
        nullable=True
    )

    accommodation_preference = Column(
        String(50),
        nullable=True
    )