"""
Shared trip resolution.

Both the itinerary endpoint and the reality endpoints need the same thing: turn
a loose request (trip_id, or destination + days + budget) into concrete trip
parameters and a set of candidate places.

This existed inline in `routes/itinerary.py`. Rather than duplicate it into the
reality routes - where the two copies would inevitably drift - the logic is
lifted here and both callers use it.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models.destination import Destination
from app.models.place import Place
from app.models.trip import Trip


@dataclass
class TripContext:
    destination: str
    number_of_days: int
    total_budget: float
    number_of_travelers: int
    interests: list[str] = field(default_factory=list)
    transport_preference: str = "Any"
    accommodation_preference: str = "Comfort"
    start_date: date | None = None
    trip_id: int | None = None
    origin: str | None = None

    @property
    def budget_level(self) -> int:
        """1 = Low, 2 = Mid, 3 = High, from spend per day."""
        per_day = self.total_budget / max(1, self.number_of_days)
        if per_day < 3000:
            return 1
        if per_day < 7000:
            return 2
        return 3


def resolve_trip_context(
    db: Session,
    trip_id: int | None = None,
    destination: str | None = None,
    number_of_days: int | None = None,
    total_budget: float | None = None,
    number_of_travelers: int | None = None,
    interests: list[str] | None = None,
    transport_preference: str | None = None,
    accommodation_preference: str | None = None,
    start_date: date | None = None,
    origin: str | None = None,
) -> TripContext:
    """
    Builds trip parameters, preferring an explicit request value over a stored
    trip, and falling back to the Hyderabad demo defaults.
    """
    context = TripContext(
        destination="",
        number_of_days=3,
        total_budget=20000.0,
        number_of_travelers=1,
    )

    if trip_id:
        trip = db.query(Trip).filter(Trip.id == trip_id).first()
        if trip:
            context.trip_id = trip.id
            context.destination = trip.destination
            context.number_of_days = trip.number_of_days
            context.total_budget = float(trip.total_budget)
            context.interests = trip.interests or []
            context.number_of_travelers = trip.number_of_travelers or 1
            context.accommodation_preference = trip.accommodation_preference or "Comfort"
            context.transport_preference = trip.transport_preference or "Any"
            context.start_date = trip.start_date

    if destination:
        context.destination = destination.strip()
    if number_of_days:
        context.number_of_days = number_of_days
    if total_budget:
        context.total_budget = float(total_budget)
    if interests:
        context.interests = interests
    if number_of_travelers:
        context.number_of_travelers = number_of_travelers
    if accommodation_preference:
        context.accommodation_preference = accommodation_preference
    if transport_preference:
        context.transport_preference = transport_preference
    if start_date:
        context.start_date = start_date
    if origin:
        context.origin = origin.strip()

    if not context.destination:
        context.destination = "Hyderabad"

    return context


def get_candidate_places(
    db: Session,
    destination_name: str,
    number_of_days: int,
    synthetic_factory=None,
) -> list[Any]:
    """
    Places to build an itinerary from.

    Uses seeded places where we have enough of them, and tops up with the
    caller's synthetic generator for destinations nobody has seeded yet.
    """
    destination = (
        db.query(Destination)
        .filter(Destination.name.ilike(f"%{destination_name}%"))
        .first()
    )

    db_places: list[Any] = []
    if destination:
        db_places = (
            db.query(Place)
            .filter(Place.destination_id == destination.id)
            .all()
        )

    if len(db_places) < (number_of_days * 3):
        # Placeholders must sit around the destination's real coordinates, or
        # every derived distance and the whole map become nonsense.
        from app.services.geo_service import resolve_destination
        from app.services.placeholder_service import build_placeholders

        location = resolve_destination(db, destination_name)
        placeholders = build_placeholders(
            destination_name=destination_name,
            latitude=location["latitude"] if location else 17.3850,
            longitude=location["longitude"] if location else 78.4867,
        )
        return list(db_places) + placeholders

    return list(db_places)


def places_as_dicts(places: list[Any]) -> list[dict]:
    """
    Normalises place objects (ORM rows or synthetic stand-ins) into plain dicts,
    which is what the alternatives engine expects.
    """
    return [
        {
            "id": getattr(p, "id", None),
            "name": getattr(p, "name", None),
            "category": getattr(p, "category", None),
            "rating": getattr(p, "rating", None),
            "price_level": getattr(p, "price_level", None),
            "description": getattr(p, "description", None),
            "latitude": getattr(p, "latitude", None),
            "longitude": getattr(p, "longitude", None),
        }
        for p in places
        if getattr(p, "name", None)
    ]
