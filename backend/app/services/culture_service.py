"""
Local Culture - "Know Before You Go".

Practical, checkable conventions a visitor benefits from knowing: what to wear
where, when photography is restricted, how tipping actually works, whether to
expect cash or card.

Written to describe conventions and institutional rules, not to characterise
people. Where a practice varies, it says so rather than flattening it into a
rule. Curated reference content, labelled STATIC - none of it is live.
"""

from __future__ import annotations

from typing import Any

from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_section,
    now_utc,
)

# Conventions that hold broadly across India. City profiles extend these.
INDIA_BASELINE: dict[str, list[str]] = {
    "dress": [
        "Covering shoulders and knees is expected at religious sites and is the safer default at heritage monuments.",
        "Footwear comes off before entering temples, mosques, gurudwaras and many historic interiors. Slip-on shoes save time.",
        "Some mosques ask women to cover their hair; scarves are usually available at the entrance.",
    ],
    "photography": [
        "Many monuments charge a separate camera fee, and tripods often need prior permission.",
        "Photography is commonly prohibited inside museum galleries, temple sanctums and at security installations.",
        "Ask before photographing people, particularly at religious sites and in markets.",
    ],
    "religious_sites": [
        "Walk clockwise around shrines where that is the local practice, and follow what others are doing.",
        "Leather items are discouraged inside some temples.",
        "Non-worshippers are welcome at most sites, but some inner sanctums are restricted.",
    ],
    "tipping": [
        "Restaurants: around 5-10% if no service charge already appears on the bill.",
        "Check the bill before tipping - a service charge is often included, and it is not the same as a government tax.",
        "Hotel porters and housekeeping: Rs 50-100 is customary. Rounding up is normal for autos and cabs.",
    ],
    "money": [
        "UPI is near-universal at shops, stalls and even street vendors, but usually needs an Indian bank account.",
        "Cards are widely accepted at hotels, malls and larger restaurants; less so at street stalls and small eateries.",
        "Carry small notes - vendors and auto drivers frequently cannot break large denominations.",
    ],
    "markets": [
        "Bargaining is expected at street markets and with tourist-facing vendors; it is not appropriate in fixed-price shops.",
        "A reasonable opening counter is around 60-70% of the first quoted price at tourist markets.",
        "Walking away politely is a normal part of the exchange and often changes the price.",
    ],
    "language": [
        "English is widely understood in cities, hotels and tourist-facing businesses.",
        "A few words of the local language is genuinely appreciated and often changes the tone of an interaction.",
    ],
    "opening_hours": [
        "Many monuments close one day a week - commonly Monday or Friday. Check before building a day around one.",
        "Shops often close in the early afternoon and reopen around 4 PM, especially in older market districts.",
        "Last entry to monuments is typically 30-60 minutes before the posted closing time.",
    ],
    "tourist_traps": [
        "Drivers who offer to take you to a 'government emporium' are usually earning commission. You are not obliged to go.",
        "Unsolicited claims that a monument is closed today are a known tactic - verify at the ticket counter itself.",
        "Agree an auto fare before setting off, or use a ride-hailing app so the price is fixed in advance.",
    ],
}

CITY_PROFILES: dict[str, dict[str, Any]] = {
    "hyderabad": {
        "display_name": "Hyderabad",
        "languages": ["Telugu", "Urdu", "Hindi", "English"],
        "greeting": "'Adaab' is a traditional Hyderabadi greeting; 'Namaskaram' is common in Telugu.",
        "additions": {
            "dress": [
                "The Old City around Charminar and Mecca Masjid is conservative in dress. Modest clothing avoids unwanted attention.",
                "Mecca Masjid requires modest dress and a head covering for women; non-Muslim visitors are welcome in the courtyard.",
            ],
            "photography": [
                "Golconda Fort and Chowmahalla Palace both charge a separate still-camera fee.",
                "Photography is restricted inside parts of the Salar Jung Museum.",
            ],
            "opening_hours": [
                "Salar Jung Museum is closed on Fridays.",
                "The Golconda Fort sound-and-light show runs in the evening and is ticketed separately from daytime entry.",
                "Laad Bazaar is busiest in the evening; many shops open late morning rather than early.",
            ],
            "markets": [
                "Laad Bazaar is the place for lacquer bangles and pearls, and bargaining is expected.",
                "Hyderabad's pearl trade has a wide quality range - buy from established shops if you want certification.",
            ],
            "tourist_traps": [
                "Pearl 'wholesale' shops reached via a driver's recommendation typically carry a commission.",
            ],
            "money": [
                "Old City stalls and Irani cafes are predominantly cash and UPI. Carry notes.",
            ],
        },
        "customs": [
            "Hyderabad has a strong Deccani culture blending Telugu and Hyderabadi Muslim traditions - both are visible in its food, language and architecture.",
            "During Ramadan the Old City stays lively late into the night and Haleem appears citywide; some daytime eateries adjust their hours.",
            "Removing footwear before entering homes is normal.",
        ],
    },
    "goa": {
        "display_name": "Goa",
        "languages": ["Konkani", "Marathi", "Hindi", "English"],
        "greeting": "'Dev boro dis dium' is a Konkani greeting; English is very widely spoken.",
        "additions": {
            "dress": [
                "Beachwear is fine on the beach but not in churches, temples or town centres.",
                "Basilica of Bom Jesus and Se Cathedral both expect covered shoulders and knees.",
            ],
            "tourist_traps": [
                "Beach shacks sometimes price seafood platters by weight rather than per plate - confirm before ordering.",
                "Unlicensed rental scooters can lead to fines. Check the paperwork and wear a helmet.",
            ],
            "opening_hours": [
                "Many North Goa venues run late but open late. Old Goa churches close by early evening.",
            ],
        },
        "customs": [
            "Drinking alcohol in public places outside licensed premises is restricted, and beach rules are enforced in season.",
            "Goa's Portuguese-Catholic and Konkani Hindu traditions both shape local life and the festival calendar.",
        ],
    },
    "jaipur": {
        "display_name": "Jaipur",
        "languages": ["Hindi", "Rajasthani", "English"],
        "greeting": "'Khamma Ghani' is the traditional Rajasthani greeting.",
        "additions": {
            "photography": [
                "Amber Fort, City Palace and Hawa Mahal each charge separate camera fees.",
            ],
            "markets": [
                "Johari Bazaar and Bapu Bazaar expect bargaining. Gemstone 'investment' offers should be treated with caution.",
            ],
            "tourist_traps": [
                "Gemstone resale schemes targeting visitors are a long-standing problem in Jaipur. Buy only what you want for itself.",
            ],
        },
        "customs": [
            "Elephant rides at Amber Fort are contested on welfare grounds; jeep transfers cover the same route.",
        ],
    },
}


def get_culture_profile(destination: str) -> dict[str, Any]:
    """
    Merges the India-wide baseline with a city profile where we have one.

    Returns the merged topics plus whether the result is city-specific, so the
    UI can be clear about how tailored the advice actually is.
    """
    key = (destination or "").strip().lower()
    profile = None
    for city, data in CITY_PROFILES.items():
        if city in key:
            profile = data
            break

    topics: dict[str, list[str]] = {k: list(v) for k, v in INDIA_BASELINE.items()}

    if profile:
        for topic, extras in profile.get("additions", {}).items():
            # City-specific points lead - they are the more useful ones.
            topics[topic] = list(extras) + topics.get(topic, [])

    return {
        "destination": destination,
        "is_city_specific": profile is not None,
        "display_name": profile["display_name"] if profile else destination,
        "languages": profile["languages"] if profile else ["Hindi", "English"],
        "greeting": profile.get("greeting") if profile else None,
        "customs": profile.get("customs", []) if profile else [],
        "topics": topics,
        "label": DataLabel.STATIC,
        "note": (
            "Curated reference guidance, reviewed rather than live. Conventions vary "
            "between families, communities and individual sites - treat this as "
            "orientation, not rules."
        ),
    }


TOPIC_TITLES = {
    "dress": "What to wear",
    "photography": "Photography",
    "religious_sites": "Religious sites",
    "tipping": "Tipping",
    "money": "Cash and cards",
    "markets": "Markets and bargaining",
    "language": "Language",
    "opening_hours": "Opening hours",
    "tourist_traps": "Common tourist traps",
}


def build_culture_section(destination: str) -> dict[str, Any]:
    """The Things To Know category of the Reality Check."""
    profile = get_culture_profile(destination)

    ordered_topics = [
        {
            "key": key,
            "title": TOPIC_TITLES.get(key, key.replace("_", " ").title()),
            "points": profile["topics"].get(key, []),
        }
        for key in [
            "dress", "religious_sites", "photography", "opening_hours",
            "money", "tipping", "markets", "tourist_traps", "language",
        ]
        if profile["topics"].get(key)
    ]

    if profile["is_city_specific"]:
        summary = (
            f"Local conventions for {profile['display_name']}, covering dress, "
            "photography rules, money, and the opening-hour quirks worth planning around."
        )
        confidence = Confidence.MEDIUM
    else:
        summary = (
            f"General guidance for travelling in India. We do not hold a "
            f"{destination}-specific culture profile yet, so confirm details locally."
        )
        confidence = Confidence.LOW

    return make_section(
        key="local_culture",
        title="Things To Know",
        status=Status.GOOD,
        summary=summary,
        advice=[
            "Check the weekly closing day for any monument you are building a day around.",
            "Carry small notes - a lot of the best food is cash-only.",
        ],
        details={
            "topics": ordered_topics,
            "customs": profile["customs"],
            "languages": profile["languages"],
            "greeting": profile["greeting"],
            "is_city_specific": profile["is_city_specific"],
            "label": profile["label"],
            "note": profile["note"],
        },
        confidence=confidence,
        sources=[],
        last_updated=now_utc(),
    )
