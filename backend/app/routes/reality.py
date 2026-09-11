"""
Travel Reality endpoints.

`/check` returns the whole TravelReality object. The per-section endpoints exist
so the frontend can load categories independently - the itinerary page must not
block on news or marine data, and a slow section should show a skeleton rather
than hold up the page.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import (
    culture_service,
    food_service,
    news_service,
    reality_service,
    transport_service,
)
from app.services.itinerary_service import generate_itinerary
from app.services.trip_context_service import (
    get_candidate_places,
    resolve_trip_context,
)

router = APIRouter(
    prefix="/api/reality",
    tags=["Travel Reality"],
)


class RealityRequest(BaseModel):
    trip_id: int | None = None
    destination: str | None = None
    number_of_days: int | None = None
    total_budget: float | None = None
    number_of_travelers: int | None = None
    interests: list[str] | None = None
    transport_preference: str | None = None
    accommodation_preference: str | None = None
    start_date: date | None = None
    origin: str | None = None

    # The itinerary the traveller is actually looking at. Passing it keeps the
    # reality check consistent with what is on screen; omitting it makes us
    # generate one so traffic and news relevance still work.
    itinerary: list[dict] | None = None


@router.post("/check")
def reality_check(request: RealityRequest, db: Session = Depends(get_db)):
    """The full Reality Check for a trip."""
    context = resolve_trip_context(
        db=db,
        trip_id=request.trip_id,
        destination=request.destination,
        number_of_days=request.number_of_days,
        total_budget=request.total_budget,
        number_of_travelers=request.number_of_travelers,
        interests=request.interests,
        transport_preference=request.transport_preference,
        accommodation_preference=request.accommodation_preference,
        start_date=request.start_date,
        origin=request.origin,
    )

    itinerary = request.itinerary
    if not itinerary:
        itinerary = _generate_itinerary_for(db, context)

    return reality_service.build_travel_reality(
        db=db,
        destination=context.destination,
        number_of_days=context.number_of_days,
        number_of_travelers=context.number_of_travelers,
        total_budget=context.total_budget,
        accommodation_preference=context.accommodation_preference,
        itinerary=itinerary,
        start_date=context.start_date,
        origin=context.origin,
    )


def _generate_itinerary_for(db: Session, context) -> list[dict]:
    """Builds a plan to ground the reality check when the caller sent none."""
    from app.routes.itinerary import _create_synthetic_places

    places = get_candidate_places(
        db=db,
        destination_name=context.destination,
        number_of_days=context.number_of_days,
        synthetic_factory=_create_synthetic_places,
    )
    if not places:
        return []

    result = generate_itinerary(
        places=places,
        number_of_days=context.number_of_days,
        interests=context.interests,
        budget_level=context.budget_level,
    )
    return result.get("itinerary", [])


# --------------------------------------------------------------------------
# Per-section endpoints - loaded independently by the frontend
# --------------------------------------------------------------------------

@router.get("/food")
def food_reality(
    destination: str = Query(..., description="Destination name, e.g. Hyderabad"),
    db: Session = Depends(get_db),
):
    return food_service.build_food_section(db=db, destination_name=destination)


@router.get("/transport")
def transport_reality(
    destination: str = Query(...),
    origin: str | None = Query(None, description="Starting city, if known"),
):
    return transport_service.build_transport_section(destination=destination, origin=origin)


@router.get("/culture")
def culture_reality(destination: str = Query(...)):
    return culture_service.build_culture_section(destination=destination)


@router.get("/updates")
def local_updates(destination: str = Query(...)):
    """Local news filtered for disruption relevance, without itinerary context."""
    return news_service.build_local_updates(destination=destination)
