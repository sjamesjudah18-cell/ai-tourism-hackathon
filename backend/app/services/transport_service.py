"""
Transport Reality - how you get there, and how you get around once you have.

Two honesty constraints shape this module:

  * We have no fare API. So no price here is ever labelled LIVE or PROVIDER.
    Getting-there options carry indicative bands with an explicit "check the
    operator for current fares" note, and link to the real operator site.
  * We never imply booking. Links go to genuine operator websites and open
    externally; there is no in-app booking flow pretending to exist.

Local transport data is curated per city where we have it, with a generic
Indian-city profile as the fallback - labelled STATIC either way.
"""

from __future__ import annotations

from typing import Any

from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_section,
    make_source,
    now_utc,
)

# Real operator sites. These are links out, not integrations.
OPERATORS = {
    "rail": {"name": "IRCTC", "url": "https://www.irctc.co.in/"},
    "bus": {"name": "RedBus", "url": "https://www.redbus.in/"},
    "air": {"name": "Compare airline fares", "url": "https://www.google.com/travel/flights"},
    "metro_hyderabad": {"name": "Hyderabad Metro Rail", "url": "https://www.ltmetro.com/"},
    "metro_delhi": {"name": "Delhi Metro Rail Corporation", "url": "https://www.delhimetrorail.com/"},
    "metro_chennai": {"name": "Chennai Metro Rail", "url": "https://chennaimetrorail.org/"},
    "metro_kolkata": {"name": "Kolkata Metro", "url": "https://mtp.indianrailways.gov.in/"},
    "metro_mumbai": {"name": "Mumbai Metro", "url": "https://www.mmrda.maharashtra.gov.in/"},
    "metro_bengaluru": {"name": "Namma Metro (BMRCL)", "url": "https://english.bmrc.co.in/"},
}


def get_arrival_options(destination: str, origin: str | None = None) -> dict[str, Any]:
    """
    Ways of reaching the destination.

    Without an origin we cannot honestly quote a duration or a fare, so we
    describe the modes and say plainly that fares need checking. We never
    fabricate a route, a schedule, or seat availability.
    """
    modes = [
        {
            "mode": "Flight",
            "best_for": "Long distances above roughly 700 km, or when time matters more than cost.",
            "duration_note": "Typically the fastest option, but add 3-4 hours for airport transfers and security.",
            "cost_note": "Fares swing enormously with how far ahead you book.",
            "convenience": "High",
            "tradeoffs": [
                "Airports usually sit well outside the city, so add a transfer cost at both ends.",
                "Cheapest fares are non-refundable.",
            ],
            "operator": OPERATORS["air"],
        },
        {
            "mode": "Train",
            "best_for": "Overnight journeys of 400-1200 km. Usually the best value per rupee in India.",
            "duration_note": "Slower than flying but an overnight berth saves a night of accommodation.",
            "cost_note": "Fares are regulated and predictable; berths sell out weeks ahead on popular routes.",
            "convenience": "Medium",
            "tradeoffs": [
                "Book early - waitlists on popular routes clear unpredictably.",
                "Stations are central, which saves on transfers.",
            ],
            "operator": OPERATORS["rail"],
        },
        {
            "mode": "Bus",
            "best_for": "Shorter hops under about 500 km, and routes trains do not serve well.",
            "duration_note": "Journey time depends heavily on highway traffic.",
            "cost_note": "Sleeper and AC coaches cost more than ordinary seats.",
            "convenience": "Medium",
            "tradeoffs": [
                "Overnight sleeper buses save a night's stay but rest quality varies.",
                "Fewer fixed stops than rail, so confirm the drop point.",
            ],
            "operator": OPERATORS["bus"],
        },
        {
            "mode": "Driving",
            "best_for": "Groups, flexible schedules, or destinations spread over a region.",
            "duration_note": "Realistic highway speeds in India average well below the posted limit.",
            "cost_note": "Budget for fuel plus tolls, and parking at the destination.",
            "convenience": "High",
            "tradeoffs": [
                "You keep the car for local travel, which can replace local transport entirely.",
                "Driver fatigue on long routes is a real risk - plan breaks.",
            ],
            "operator": None,
        },
    ]

    return {
        "origin": origin,
        "destination": destination,
        "modes": modes,
        "label": DataLabel.STATIC,
        "fare_note": (
            "No live fare provider is connected, so no prices are quoted here. "
            "Check the operator for current fares and availability."
        ),
        "has_origin": bool(origin),
        "origin_prompt": (
            None if origin else
            "Tell us your starting city to compare journey options more specifically."
        ),
    }


# Curated local transport profiles. Fare bands are reviewed reference figures
# in INR, not live meter rates - labelled STATIC throughout.
CITY_LOCAL_TRANSPORT: dict[str, list[dict[str, Any]]] = {
    "hyderabad": [
        {
            "mode": "Metro",
            "fare_band": "Rs 10-60 per trip",
            "convenience": "High",
            "coverage": "Three lines covering Miyapur-LB Nagar, JBS-MGBS and Nagole-Raidurg.",
            "best_for": "Fast, traffic-proof travel along the corridors - Hitec City to Ameerpet, Secunderabad.",
            "limitations": [
                "Does not reach the Old City, so Charminar and Golconda still need an auto or cab.",
                "Runs roughly 6 AM to 11 PM.",
            ],
            "operator": OPERATORS["metro_hyderabad"],
        },
        {
            "mode": "Auto-rickshaw",
            "fare_band": "Rs 30-250 for typical city hops",
            "convenience": "High",
            "coverage": "Everywhere, including the narrow Old City lanes cars struggle with.",
            "best_for": "Short trips and the last mile from a metro station.",
            "limitations": [
                "Meters are often ignored - agree the fare before you get in, or use an app.",
                "Fares rise after dark and in rain.",
            ],
            "operator": None,
        },
        {
            "mode": "Ride-hailing (Uber / Ola / Rapido)",
            "fare_band": "Rs 80-500 depending on distance and surge",
            "convenience": "High",
            "coverage": "Comprehensive across the city.",
            "best_for": "Air-conditioned door-to-door travel and airport runs.",
            "limitations": [
                "Surge pricing during peak hours and rain can double the fare.",
                "Bike taxis are far cheaper but carry one passenger only.",
            ],
            "operator": None,
        },
        {
            "mode": "City bus (TSRTC)",
            "fare_band": "Rs 10-45 per trip",
            "convenience": "Medium",
            "coverage": "The widest network in the city.",
            "best_for": "Cheapest way to cover distance if you are not in a hurry.",
            "limitations": [
                "Crowded at peak times and route information is mostly in Telugu.",
                "Slower than the metro on parallel corridors.",
            ],
            "operator": None,
        },
        {
            "mode": "Rental scooter / car",
            "fare_band": "Rs 400-700 per day (scooter), Rs 1,800+ per day (car)",
            "convenience": "Medium",
            "coverage": "Self-drive, anywhere.",
            "best_for": "Day trips out of the city such as Ramoji Film City.",
            "limitations": [
                "City traffic is demanding for visitors unused to it.",
                "Parking near the Old City is very limited.",
            ],
            "operator": None,
        },
        {
            "mode": "Walking",
            "fare_band": "Free",
            "convenience": "High in specific pockets",
            "coverage": "Charminar and Laad Bazaar, Necklace Road, Durgam Cheruvu boardwalk.",
            "best_for": "The Old City heritage cluster, where stops sit within a few hundred metres.",
            "limitations": [
                "Footpaths are inconsistent and midday heat is punishing.",
                "Not practical between districts - distances are large.",
            ],
            "operator": None,
        },
    ],
}

# Used for any city without a curated profile. Deliberately generic, and
# labelled so the traveller knows it is not city-specific.
GENERIC_LOCAL_TRANSPORT: list[dict[str, Any]] = [
    {
        "mode": "Auto-rickshaw",
        "fare_band": "Rs 30-250 for typical city hops",
        "convenience": "High",
        "coverage": "Widely available in most Indian cities.",
        "best_for": "Short trips and last-mile connections.",
        "limitations": ["Agree the fare before starting, or use a ride-hailing app.",
                        "Fares rise after dark and in rain."],
        "operator": None,
    },
    {
        "mode": "Ride-hailing (Uber / Ola / Rapido)",
        "fare_band": "Rs 80-500 depending on distance and surge",
        "convenience": "High",
        "coverage": "Available in most large towns and cities.",
        "best_for": "Door-to-door travel with a fare agreed up front.",
        "limitations": ["Surge pricing at peak times.", "Coverage thins outside city limits."],
        "operator": None,
    },
    {
        "mode": "City bus",
        "fare_band": "Rs 10-45 per trip",
        "convenience": "Medium",
        "coverage": "Usually the widest network available.",
        "best_for": "Travelling cheaply without time pressure.",
        "limitations": ["Crowded at peak times.", "Route information often in the local language."],
        "operator": None,
    },
    {
        "mode": "Walking",
        "fare_band": "Free",
        "convenience": "Varies",
        "coverage": "Best within clustered heritage or market areas.",
        "best_for": "Stops that sit within a few hundred metres of each other.",
        "limitations": ["Footpath quality varies.", "Midday heat can be severe."],
        "operator": None,
    },
]

CITY_METRO_OPERATORS = {
    "delhi": "metro_delhi", "new delhi": "metro_delhi", "chennai": "metro_chennai",
    "kolkata": "metro_kolkata", "mumbai": "metro_mumbai",
    "bengaluru": "metro_bengaluru", "bangalore": "metro_bengaluru",
}


def get_local_transport(destination: str) -> dict[str, Any]:
    """Local getting-around options, curated where we have them."""
    key = (destination or "").strip().lower()

    for city, options in CITY_LOCAL_TRANSPORT.items():
        if city in key:
            return {
                "destination": destination,
                "options": options,
                "label": DataLabel.STATIC,
                "is_city_specific": True,
                "note": (
                    "Curated reference information for this city. Fare bands are "
                    "indicative and change - they are not live meter rates."
                ),
            }

    options = [dict(option) for option in GENERIC_LOCAL_TRANSPORT]
    for city, operator_key in CITY_METRO_OPERATORS.items():
        if city in key:
            options.insert(0, {
                "mode": "Metro",
                "fare_band": "Rs 10-60 per trip",
                "convenience": "High",
                "coverage": "Check the operator for the current network map.",
                "best_for": "Avoiding road traffic along the corridors it serves.",
                "limitations": ["Does not reach every neighbourhood.",
                                "Service hours are limited late at night."],
                "operator": OPERATORS[operator_key],
            })
            break

    return {
        "destination": destination,
        "options": options,
        "label": DataLabel.STATIC,
        "is_city_specific": False,
        "note": (
            f"We do not yet hold a city-specific transport profile for {destination}, "
            "so this is general guidance for Indian cities. Confirm locally."
        ),
    }


def build_transport_section(destination: str, origin: str | None = None) -> dict[str, Any]:
    """The Transport category: getting there, and getting around."""
    arrival = get_arrival_options(destination, origin)
    local = get_local_transport(destination)

    if local["is_city_specific"]:
        status = Status.GOOD
        confidence = Confidence.MEDIUM
        summary = (
            f"{destination} is well covered by autos and ride-hailing, with a metro "
            "along the main corridors. Getting around is straightforward."
        )
    else:
        status = Status.FAIR
        confidence = Confidence.LOW
        summary = (
            f"General transport guidance for {destination}. We do not hold a "
            "city-specific profile yet, so confirm options locally."
        )

    advice = [
        "No live fares are available here - treat every figure as indicative and "
        "confirm with the operator.",
    ]
    if not origin:
        advice.insert(0, "Add your starting city to compare journey options to the destination.")

    sources = [
        make_source(op["name"], op["url"])
        for op in {
            option["operator"]["name"]: option["operator"]
            for option in local["options"] if option.get("operator")
        }.values()
    ]

    return make_section(
        key="transport",
        title="Transport",
        status=status,
        summary=summary,
        advice=advice,
        details={"getting_there": arrival, "local": local},
        confidence=confidence,
        sources=sources,
        last_updated=now_utc(),
    )
