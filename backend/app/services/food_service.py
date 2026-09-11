"""
Local Food Intelligence.

Covers all three tiers a traveller actually eats across - street, local
restaurant, and premium - rather than only the expensive picks a guide tends to
list.

The dietary handling is the careful part. Recipes vary between kitchens, so
nothing here is stated absolutely: `contains` describes what traditional
preparations commonly include, and every warning is phrased as "may contain" /
"can vary" / "confirm before ordering". A traveller with a real allergy must be
pushed towards asking the restaurant, never towards trusting this page.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.core.reality import (
    Confidence,
    DataLabel,
    Status,
    make_section,
    now_utc,
)
from app.models.destination import Destination
from app.models.food_item import FoodItem

TIER_ORDER = ["street", "local", "premium"]

TIER_LABELS = {
    "street": "Street food",
    "local": "Local restaurants",
    "premium": "Premium dining",
}

SPICE_LABELS = {
    0: "Not spicy",
    1: "Mild",
    2: "Medium",
    3: "Hot",
    4: "Very hot",
}

# How each advisory flag is phrased to the traveller. Never absolute.
DIETARY_PHRASING = {
    "dairy": "Traditional versions usually contain dairy (ghee, curd or cream).",
    "nuts": "Often prepared with nuts, and kitchens may share equipment with nut dishes.",
    "egg": "Some preparations include egg.",
    "gluten": "Typically contains wheat.",
    "meat": "Contains meat in the traditional preparation.",
    "seafood": "Contains seafood in the traditional preparation.",
    "alcohol": "May be prepared with alcohol.",
    "onion_garlic": "Usually made with onion and garlic, which matters for some dietary practices.",
}

STANDING_DISCLAIMER = (
    "Ingredients and preparation vary between restaurants. If you have an allergy "
    "or a strict dietary requirement, confirm with the restaurant before ordering."
)


def get_food_items(db: Session, destination_name: str) -> list[FoodItem]:
    """Dishes recorded for a destination. Empty list when we have none."""
    destination = (
        db.query(Destination)
        .filter(Destination.name.ilike(f"%{destination_name}%"))
        .first()
    )
    if not destination:
        return []

    return (
        db.query(FoodItem)
        .filter(FoodItem.destination_id == destination.id)
        .all()
    )


def serialise_item(item: FoodItem) -> dict[str, Any]:
    contains = item.contains or []
    return {
        "id": item.id,
        "name": item.name,
        "tier": item.tier,
        "tier_label": TIER_LABELS.get(item.tier, item.tier),
        "category": item.category,
        "description": item.description,
        "ingredients": item.ingredients or [],
        "price_range": _price_range(item),
        "price_label": DataLabel.APPROXIMATE,
        "spice_level": item.spice_level,
        "spice_label": SPICE_LABELS.get(item.spice_level, "Varies"),
        "is_vegetarian": item.is_vegetarian,
        "diet_label": _diet_label(item.is_vegetarian),
        "contains": contains,
        "dietary_warnings": [
            DIETARY_PHRASING[flag] for flag in contains if flag in DIETARY_PHRASING
        ],
        "preparation": item.preparation,
        "where_to_find": item.where_to_find,
        "meal_time": item.meal_time,
        "dietary_notes": item.dietary_notes,
        "disclaimer": STANDING_DISCLAIMER,
    }


def _price_range(item: FoodItem) -> str:
    low, high = item.approx_price_min, item.approx_price_max
    if low is None and high is None:
        return "Price varies"
    if low is not None and high is not None:
        if low == high:
            return f"Rs {int(low):,}"
        return f"Rs {int(low):,}-{int(high):,}"
    return f"Rs {int(low or high):,}"


def _diet_label(is_vegetarian: bool | None) -> str:
    if is_vegetarian is True:
        return "Vegetarian"
    if is_vegetarian is False:
        return "Non-vegetarian"
    return "Both versions common"


def build_food_section(db: Session, destination_name: str) -> dict[str, Any]:
    """The Food category, grouped into the three tiers."""
    items = get_food_items(db, destination_name)

    if not items:
        return make_section(
            key="food_reality",
            title="Food",
            status=Status.UNKNOWN,
            summary=(
                f"We do not yet hold researched dish-level information for "
                f"{destination_name}."
            ),
            advice=[
                "Ask your accommodation for the neighbourhood people actually eat in - "
                "it is rarely the one in the guidebook.",
                STANDING_DISCLAIMER,
            ],
            details={"tiers": [], "total_items": 0},
            confidence=Confidence.LOW,
            sources=[],
            available=False,
            unavailable_reason=(
                f"No food data has been researched for {destination_name} yet."
            ),
        )

    serialised = [serialise_item(item) for item in items]

    tiers = []
    for tier in TIER_ORDER:
        tier_items = [i for i in serialised if i["tier"] == tier]
        if tier_items:
            tiers.append({
                "tier": tier,
                "label": TIER_LABELS[tier],
                "items": tier_items,
                "count": len(tier_items),
            })

    veg_count = sum(1 for i in serialised if i["is_vegetarian"] is True)
    street_count = sum(1 for i in serialised if i["tier"] == "street")

    summary = (
        f"{len(serialised)} researched dishes across {len(tiers)} tier(s) - "
        f"{street_count} street food option(s) and {veg_count} vegetarian option(s)."
    )

    advice = [
        "Street stalls with a queue and high turnover are generally the safer bet - "
        "food that moves fast has not been sitting out.",
        "Spice levels here describe the traditional preparation; most kitchens will "
        "adjust if you ask when ordering.",
        STANDING_DISCLAIMER,
    ]

    return make_section(
        key="food_reality",
        title="Food",
        status=Status.GOOD,
        summary=summary,
        advice=advice,
        details={
            "tiers": tiers,
            "total_items": len(serialised),
            "vegetarian_count": veg_count,
            "data_label": DataLabel.STATIC,
            "data_note": (
                "Researched reference information, reviewed rather than live. "
                "Prices are indicative and change."
            ),
            "disclaimer": STANDING_DISCLAIMER,
        },
        confidence=Confidence.MEDIUM,
        sources=[],
        last_updated=now_utc(),
    )
