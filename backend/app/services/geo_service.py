"""
Resolves a destination name to coordinates.

Resolution order, most trustworthy first:
  1. The seeded `destinations` table (curated, exact).
  2. OpenStreetMap Nominatim (real geocoder, keyless) - this is what lets the
     reality engine work for destinations nobody seeded.
  3. None - callers must handle it rather than defaulting to some other city's
     coordinates, which would silently show Hyderabad's weather for Shimla.

Coordinates are deterministic data, so they are resolved here in code and never
asked of the language model.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.http_cache import fetch_json
from app.models.destination import Destination

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Coastal destinations get marine conditions; inland ones must not pretend to.
_COASTAL_HINTS = {
    "goa", "kochi", "mumbai", "chennai", "puri", "pondicherry", "puducherry",
    "vizag", "visakhapatnam", "kovalam", "varkala", "gokarna", "alibaug",
    "daman", "diu", "mangalore", "udupi", "kannur", "alleppey", "alappuzha",
    "digha", "karwar", "malvan", "tarkarli", "rameswaram", "kanyakumari",
}


def resolve_destination(
    db: Session | None,
    destination_name: str,
) -> dict[str, Any] | None:
    """
    Returns {name, latitude, longitude, source, destination_id, is_coastal}
    or None if the place genuinely could not be resolved.
    """
    name = (destination_name or "").strip()
    if not name:
        return None

    # 1. Curated database row.
    if db is not None:
        row = (
            db.query(Destination)
            .filter(Destination.name.ilike(f"%{name}%"))
            .first()
        )
        if row and row.latitude is not None and row.longitude is not None:
            return {
                "name": row.name,
                "latitude": float(row.latitude),
                "longitude": float(row.longitude),
                "state": row.state,
                "country": row.country,
                "destination_id": row.id,
                "source": "Seeded destination database",
                "is_coastal": _looks_coastal(row.name),
            }

    # 2. Real geocoder.
    geocoded = _geocode(name)
    if geocoded:
        return geocoded

    # 3. Honest failure.
    return None


def _geocode(name: str) -> dict[str, Any] | None:
    data = fetch_json(
        NOMINATIM_URL,
        params={"q": name, "format": "json", "limit": 1, "addressdetails": 1},
        ttl_seconds=86400.0,  # place coordinates do not move
        timeout=8.0,
    )
    if not data or not isinstance(data, list):
        return None

    top = data[0]
    try:
        lat = float(top["lat"])
        lon = float(top["lon"])
    except (KeyError, TypeError, ValueError):
        return None

    address = top.get("address") or {}
    display = top.get("display_name", name)

    return {
        "name": name.title(),
        "latitude": lat,
        "longitude": lon,
        "state": address.get("state"),
        "country": address.get("country"),
        "destination_id": None,
        "source": "OpenStreetMap Nominatim",
        "is_coastal": _looks_coastal(name) or _looks_coastal(display),
    }


def _looks_coastal(text: str | None) -> bool:
    lowered = (text or "").lower()
    return any(hint in lowered for hint in _COASTAL_HINTS)
