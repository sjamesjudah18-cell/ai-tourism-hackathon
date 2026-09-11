from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.place import Place
from app.models.trip import Trip
from app.models.destination import Destination
from app.services.itinerary_service import generate_itinerary


router = APIRouter(
    prefix="/api/itinerary",
    tags=["Itinerary"]
)


class ItineraryRequest(BaseModel):
    trip_id: int
    interests: list[str] | None = None
    budget_level: int | None = None


@router.post("/generate")
def create_itinerary(
    request: ItineraryRequest,
    db: Session = Depends(get_db)
):
    # Find the trip
    trip = (
        db.query(Trip)
        .filter(Trip.id == request.trip_id)
        .first()
    )

    if not trip:
        return {
            "error": "Trip not found"
        }

    # Find the destination
    destination = (
        db.query(Destination)
        .filter(Destination.name.ilike(trip.destination))
        .first()
    )

    if not destination:
        return {
            "error": "Destination not found"
        }

    # Find places for the destination
    places = (
        db.query(Place)
        .filter(Place.destination_id == destination.id)
        .all()
    )

    if not places:
        return {
            "error": "No places found for this destination"
        }

    # Generate itinerary
    itinerary = generate_itinerary(
        places=places,
        number_of_days=trip.number_of_days,
        interests=request.interests,
        budget_level=request.budget_level
    )

    return {
        "trip_id": trip.id,
        "destination": destination.name,
        "total_budget": trip.total_budget,
        **itinerary
    }