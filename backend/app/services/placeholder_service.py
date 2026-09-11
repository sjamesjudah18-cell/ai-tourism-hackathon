"""
Placeholder stops for under-seeded destinations.

When a destination has fewer researched places than the trip needs, the
itinerary is topped up from here. The previous implementation did this with a
hardcoded `17.3850 + idx * 0.008`, which is central Hyderabad - so a Goa trip
received filler stops 600 km from the real ones, and the route optimiser
faithfully reported 554 km of driving on Day 1.

Two rules fix that, and keep this honest:

  1. **Real coordinates.** Placeholders are scattered around the destination's
     actual centre, within a plausible urban radius, so distances, travel
     times and the map all stay meaningful.
  2. **Always flagged.** Every placeholder carries `is_placeholder = True`,
     which propagates through the recommender and into the itinerary so the UI
     can label it. These are suggested *areas* to explore, not venues we have
     verified - and the product says so rather than passing them off as real.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# Placeholders sit between these distances from the centre, which is roughly
# the spread of a real city's attractions.
MIN_RADIUS_KM = 1.5
MAX_RADIUS_KM = 8.0

KM_PER_DEGREE_LAT = 111.32

# Generic but plausible stop archetypes. Deliberately described as areas or
# categories rather than named venues, because we have not verified any venue.
TEMPLATES: list[dict] = [
    {"suffix": "Old Town & Fort Quarter", "category": "Historical", "rating": 4.5,
     "price_level": 1,
     "description": "The historic core, typically the oldest and most walkable part of the city."},
    {"suffix": "Heritage Museum District", "category": "Culture", "rating": 4.4,
     "price_level": 2,
     "description": "Where regional museums and civic collections are usually clustered."},
    {"suffix": "Traditional Bazaar", "category": "Shopping", "rating": 4.3,
     "price_level": 1,
     "description": "The main market area for local textiles, handicrafts and street snacks."},
    {"suffix": "Sunset Viewpoint", "category": "Nature", "rating": 4.5,
     "price_level": 1,
     "description": "Elevated ground with an open outlook - best in the last hour of light."},
    {"suffix": "Local Food Street", "category": "Food", "rating": 4.5,
     "price_level": 1,
     "description": "The quarter where regional cooking is concentrated and turnover is highest."},
    {"suffix": "City Gardens & Lake", "category": "Nature", "rating": 4.2,
     "price_level": 1,
     "description": "Green space for a slower morning, usually busiest at dawn and dusk."},
    {"suffix": "Outdoor Activity Area", "category": "Adventure", "rating": 4.3,
     "price_level": 2,
     "description": "Where trekking, climbing or water activity operators tend to be based."},
    {"suffix": "Arts & Crafts Centre", "category": "Culture", "rating": 4.3,
     "price_level": 1,
     "description": "Workshops and galleries for regional weaving, pottery and folk performance."},
    {"suffix": "Riverside Promenade", "category": "Nature", "rating": 4.4,
     "price_level": 1,
     "description": "A waterfront walk, typically liveliest in the evening."},
    {"suffix": "Night Market", "category": "Food", "rating": 4.4,
     "price_level": 1,
     "description": "Evening street food, generally open well after most restaurants close."},
    {"suffix": "Temple & Shrine Complex", "category": "Historical", "rating": 4.5,
     "price_level": 1,
     "description": "The principal religious site - modest dress is usually expected."},
    {"suffix": "Craft Emporium", "category": "Shopping", "rating": 4.1,
     "price_level": 2,
     "description": "State or cooperative handicraft outlets with fixed, non-negotiable pricing."},
]


@dataclass
class PlaceholderPlace:
    """
    Duck-types the Place ORM model closely enough for the recommender and
    route optimiser, which only read attributes.
    """

    id: int
    name: str
    category: str
    rating: float
    price_level: int
    description: str
    latitude: float
    longitude: float
    is_placeholder: bool = True


def build_placeholders(
    destination_name: str,
    latitude: float,
    longitude: float,
    count: int | None = None,
) -> list[PlaceholderPlace]:
    """
    Generates placeholder stops scattered around real coordinates.

    Uses a golden-angle spiral so the points spread evenly instead of forming a
    line, and is fully deterministic - the same destination always produces the
    same layout, so a refresh does not reshuffle the map.
    """
    total = len(TEMPLATES) if count is None else max(0, min(count, len(TEMPLATES)))
    if total == 0:
        return []

    # Longitude degrees shrink with latitude; without this the scatter would be
    # stretched east-west and distances would come out wrong.
    lat_rad = math.radians(latitude)
    km_per_degree_lng = KM_PER_DEGREE_LAT * max(0.1, math.cos(lat_rad))

    golden_angle = math.pi * (3.0 - math.sqrt(5.0))
    places: list[PlaceholderPlace] = []

    for index in range(total):
        template = TEMPLATES[index]

        # Even radial spread: radius grows with sqrt(index) for uniform density.
        fraction = (index + 0.5) / total
        radius_km = MIN_RADIUS_KM + (MAX_RADIUS_KM - MIN_RADIUS_KM) * math.sqrt(fraction)
        angle = index * golden_angle

        delta_lat = (radius_km * math.cos(angle)) / KM_PER_DEGREE_LAT
        delta_lng = (radius_km * math.sin(angle)) / km_per_degree_lng

        places.append(PlaceholderPlace(
            # High ids so they never collide with real database rows.
            id=900_000 + index,
            name=f"{destination_name} {template['suffix']}",
            category=template["category"],
            rating=template["rating"],
            price_level=template["price_level"],
            description=template["description"],
            latitude=round(latitude + delta_lat, 6),
            longitude=round(longitude + delta_lng, 6),
        ))

    return places
