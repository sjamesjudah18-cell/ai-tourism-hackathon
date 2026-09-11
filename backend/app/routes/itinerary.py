from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.place import Place
from app.models.trip import Trip
from app.models.destination import Destination
from app.services.itinerary_service import generate_itinerary
from app.services.budget_service import calculate_trip_budget
from app.services.hotel_service import get_recommended_hotels
from app.services.weather_service import get_destination_weather
from app.services.ai_service import enrich_itinerary_with_ai
from app.services.geo_service import resolve_destination
from app.services.placeholder_service import build_placeholders

router = APIRouter(
    prefix="/api/itinerary",
    tags=["Itinerary"]
)


class ItineraryRequest(BaseModel):
    trip_id: int | None = None
    destination: str | None = None
    number_of_days: int | None = None
    total_budget: float | None = None
    number_of_travelers: int | None = 1
    interests: list[str] | None = []
    transport_preference: str | None = "Any"
    accommodation_preference: str | None = "Comfort"


def _create_synthetic_places(
    destination_name: str,
    latitude: float | None = None,
    longitude: float | None = None,
) -> list:
    """
    Placeholder stops for a destination we have not fully seeded.

    Delegates to `placeholder_service`, which scatters them around the
    destination's REAL coordinates. The previous version hardcoded Hyderabad's
    centre for every destination, which put Goa's filler stops 600 km from its
    real ones and produced itineraries claiming 554 km of driving per day.

    Falls back to Hyderabad only when coordinates genuinely cannot be resolved,
    which is also the demo destination.
    """
    return build_placeholders(
        destination_name=destination_name,
        latitude=latitude if latitude is not None else 17.3850,
        longitude=longitude if longitude is not None else 78.4867,
    )


@router.post("/generate")
def create_itinerary(
    request: ItineraryRequest,
    db: Session = Depends(get_db)
):
    destination_str = ""
    days = 3
    budget = 20000.0
    interests = []
    travelers = 1
    accommodation = "Comfort"
    transport = "Any"
    trip_id = None

    # Resolve from DB trip if trip_id provided
    if request.trip_id:
        trip = db.query(Trip).filter(Trip.id == request.trip_id).first()
        if trip:
            trip_id = trip.id
            destination_str = trip.destination
            days = trip.number_of_days
            budget = float(trip.total_budget)
            interests = trip.interests or []
            travelers = trip.number_of_travelers or 1
            accommodation = trip.accommodation_preference or "Comfort"
            transport = trip.transport_preference or "Any"

    # Override or fill from direct request
    if request.destination:
        destination_str = request.destination.strip()
    if request.number_of_days:
        days = request.number_of_days
    if request.total_budget:
        budget = float(request.total_budget)
    if request.interests:
        interests = request.interests
    if request.number_of_travelers:
        travelers = request.number_of_travelers
    if request.accommodation_preference:
        accommodation = request.accommodation_preference
    if request.transport_preference:
        transport = request.transport_preference

    if not destination_str:
        destination_str = "Hyderabad"

    # Find destination in DB
    dest_obj = (
        db.query(Destination)
        .filter(Destination.name.ilike(f"%{destination_str}%"))
        .first()
    )

    db_places = []
    if dest_obj:
        db_places = (
            db.query(Place)
            .filter(Place.destination_id == dest_obj.id)
            .all()
        )

    # If we have fewer seeded places than the trip needs, top up with
    # placeholders anchored to the destination's real coordinates.
    if len(db_places) < (days * 3):
        location = resolve_destination(db, destination_str)
        synthetic = _create_synthetic_places(
            destination_str,
            latitude=location["latitude"] if location else None,
            longitude=location["longitude"] if location else None,
        )
        candidate_places = list(db_places) + synthetic
    else:
        candidate_places = list(db_places)

    # Budget level calculation (1 = Low, 2 = Mid, 3 = High)
    budget_per_day = budget / max(1, days)
    if budget_per_day < 3000:
        budget_level = 1
    elif budget_per_day < 7000:
        budget_level = 2
    else:
        budget_level = 3

    # Generate day-by-day itinerary with route optimization
    itinerary_result = generate_itinerary(
        places=candidate_places,
        number_of_days=days,
        interests=interests,
        budget_level=budget_level
    )

    # Calculate deterministic budget breakdown
    budget_breakdown = calculate_trip_budget(
        total_budget=budget,
        number_of_days=days
    )

    # Get hotel recommendations
    hotels = get_recommended_hotels(
        db=db,
        destination_name=destination_str,
        preference=accommodation,
        days=days,
        limit=4
    )

    # Get weather
    weather = get_destination_weather(destination=destination_str)

    # Enrich with AI (Gemini 3.6 Flash)
    ai_insights = enrich_itinerary_with_ai(
        destination=destination_str,
        number_of_days=days,
        total_budget=budget,
        interests=interests,
        itinerary_days=itinerary_result.get("itinerary", [])
    )

    return {
        "trip_id": trip_id,
        "destination": destination_str,
        "number_of_days": days,
        "total_budget": budget,
        "number_of_travelers": travelers,
        "interests": interests,
        "transport_preference": transport,
        "accommodation_preference": accommodation,
        "budget_breakdown": budget_breakdown,
        "weather": weather,
        "hotels": hotels,
        "ai_insights": ai_insights,
        "total_activities_cost": itinerary_result.get("total_activities_cost", 0),
        "itinerary": itinerary_result.get("itinerary", [])
    }