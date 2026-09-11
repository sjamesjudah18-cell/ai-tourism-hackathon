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


def _create_synthetic_places(destination_name: str) -> list[dict]:
    """
    Creates dynamic high-quality place candidates if an unseeded destination is requested.
    """
    templates = [
        {"name": f"Historic Old Town & Fort of {destination_name}", "category": "Historical", "rating": 4.7, "price_level": 1, "description": f"The architectural centerpiece and ancient fortifications of {destination_name}."},
        {"name": f"{destination_name} Heritage Palace & Museum", "category": "Culture", "rating": 4.6, "price_level": 2, "description": f"Grand royal palace exhibiting regional art, royal garments, and weapons."},
        {"name": f"{destination_name} Traditional Bazaar Walk", "category": "Culture", "rating": 4.5, "price_level": 1, "description": f"Bustling traditional market filled with local textiles, handicrafts, and street snacks."},
        {"name": f"{destination_name} Panoramic Sunset Point", "category": "Nature", "rating": 4.8, "price_level": 1, "description": f"Elevated viewpoint offering sweeping vistas over the surrounding landscape."},
        {"name": f"Famous Local Food Trail of {destination_name}", "category": "Food", "rating": 4.7, "price_level": 2, "description": f"Historic food quarter featuring authentic regional delicacies and traditional desserts."},
        {"name": f"{destination_name} Botanical Sanctuary & Lake", "category": "Nature", "rating": 4.4, "price_level": 1, "description": f"Peaceful lakeside gardens popular for morning nature walks and birdwatching."},
        {"name": f"{destination_name} Adventure Trail & Gorge", "category": "Adventure", "rating": 4.6, "price_level": 2, "description": f"Outdoor trekking, zip-line, and rock-climbing spot in scenic natural surroundings."},
        {"name": f"Artisans Guild & Cultural Center", "category": "Culture", "rating": 4.5, "price_level": 1, "description": f"Live workshops showcasing generational weaving, pottery, and folk performances."},
        {"name": f"Riverside Promenade of {destination_name}", "category": "Nature", "rating": 4.5, "price_level": 1, "description": f"Clean pedestrian promenade ideal for evening strolls and boat excursions."},
        {"name": f"Night Street Food District", "category": "Food", "rating": 4.6, "price_level": 1, "description": f"Vibrant culinary alley buzzing with live grills, flatbreads, and refreshing beverages."},
        {"name": f"Sacred Hill Temple Complex", "category": "Historical", "rating": 4.7, "price_level": 1, "description": f"Ancient stone temple complex perched high with centuries-old carvings."},
        {"name": f"{destination_name} Central Craft Pavilion", "category": "Shopping", "rating": 4.3, "price_level": 2, "description": f"State-empanelled handicraft hub supporting indigenous artisans and weavers."}
    ]

    class FakePlace:
        def __init__(self, d, idx):
            self.id = 1000 + idx
            self.name = d["name"]
            self.category = d["category"]
            self.rating = d["rating"]
            self.price_level = d["price_level"]
            self.description = d["description"]
            self.latitude = 17.3850 + (idx * 0.008)
            self.longitude = 78.4867 + (idx * 0.008)

    return [FakePlace(t, i) for i, t in enumerate(templates)]


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

    # If DB places is less than days * 3, supplement with dynamic fallback places
    if len(db_places) < (days * 3):
        synthetic = _create_synthetic_places(destination_str)
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