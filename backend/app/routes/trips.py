
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import date

from app.core.database import get_db
from app.models.trip import Trip


router = APIRouter(
    prefix="/api/trips",
    tags=["Trips"]
)


class TripCreate(BaseModel):
    user_id: int
    destination: str
    start_date: date | None = None
    end_date: date | None = None
    number_of_days: int
    total_budget: float


@router.post("/")
def create_trip(
    trip_data: TripCreate,
    db: Session = Depends(get_db)
):
    trip = Trip(
        user_id=trip_data.user_id,
        destination=trip_data.destination,
        start_date=trip_data.start_date,
        end_date=trip_data.end_date,
        number_of_days=trip_data.number_of_days,
        total_budget=trip_data.total_budget
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    return {
        "message": "Trip created successfully",
        "trip": {
            "id": trip.id,
            "user_id": trip.user_id,
            "destination": trip.destination,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "number_of_days": trip.number_of_days,
            "total_budget": trip.total_budget
        }
    }


@router.get("/")
def get_trips(
    db: Session = Depends(get_db)
):
    trips = db.query(Trip).all()
    return trips


@router.get("/{trip_id}")
def get_trip(
    trip_id: int,
    db: Session = Depends(get_db)
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        return {
            "error": "Trip not found"
        }

    return trip


@router.delete("/{trip_id}")
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db)
):
    trip = (
        db.query(Trip)
        .filter(Trip.id == trip_id)
        .first()
    )

    if not trip:
        return {
            "error": "Trip not found"
        }

    db.delete(trip)
    db.commit()

    return {
        "message": "Trip deleted successfully"
    }