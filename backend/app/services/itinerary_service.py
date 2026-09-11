from app.algorithms.recommender import recommend_places
from app.algorithms.route_optimizer import cluster_and_route_itinerary

CATEGORY_IMAGES = {
    "historical": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=900&q=80",
    "culture": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=900&q=80",
    "food": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80",
    "nature": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80",
    "adventure": "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=900&q=80",
    "beach": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
    "museum": "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80",
}

PLACE_SPECIFIC_IMAGES = {
    "charminar": "https://images.unsplash.com/photo-1600267197423-8c3f1c3f8f6a?auto=format&fit=crop&w=900&q=80",
    "golconda": "https://images.unsplash.com/photo-1605371924599-2d0365da1ae0?auto=format&fit=crop&w=900&q=80",
    "chowmahalla": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80",
    "paradise": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80",
    "shadab": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80",
    "nimrah": "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=80",
    "hussain sagar": "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?auto=format&fit=crop&w=900&q=80",
    "baga beach": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
    "amber fort": "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=80",
    "hawa mahal": "https://images.unsplash.com/photo-1609946850849-c430e37dfc1c?auto=format&fit=crop&w=900&q=80",
    "india gate": "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=80",
    "gateway of india": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80",
    "fort kochi": "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=900&q=80",
}


def get_place_image(name: str, category: str) -> str:
    name_lower = name.lower()
    for key, img in PLACE_SPECIFIC_IMAGES.items():
        if key in name_lower:
            return img
    cat_lower = (category or "").lower()
    return CATEGORY_IMAGES.get(cat_lower, CATEGORY_IMAGES["historical"])


def estimate_activity_cost(category: str, price_level: int = 1) -> int:
    cat = (category or "").lower()
    if "food" in cat:
        return 350 * price_level
    elif "adventure" in cat:
        return 600 * price_level
    elif "culture" in cat or "museum" in cat:
        return 150 * price_level
    elif "historical" in cat:
        return 100 * price_level
    else:
        return 100 * price_level


def generate_itinerary(
    places: list,
    number_of_days: int,
    interests: list[str] = None,
    budget_level: int = None
) -> dict:
    """
    Generates an optimized, day-wise structured itinerary with
    scored recommendations, route optimization, and time slots.
    """
    if number_of_days <= 0:
        raise ValueError("Number of days must be greater than 0")

    # Score and rank all candidate places
    recommendations = recommend_places(
        places=places,
        interests=interests,
        budget_level=budget_level,
        limit=max(len(places), number_of_days * 3)
    )

    # Attach images, costs, durations
    formatted_places = []
    for p in recommendations:
        cat = p.get("category", "Culture")
        cost = estimate_activity_cost(cat, p.get("price_level", 1))
        duration = "2.5 hrs" if "adventure" in cat.lower() else "1.5 hrs" if "food" in cat.lower() else "2 hrs"
        formatted_places.append({
            "place_id": p.get("id"),
            "name": p.get("name"),
            "place_name": p.get("name"),
            "category": cat,
            "rating": p.get("rating", 4.5),
            "estimated_cost": cost,
            "duration": duration,
            "latitude": p.get("latitude"),
            "longitude": p.get("longitude"),
            "description": p.get("description", ""),
            "image": get_place_image(p.get("name", ""), cat),
            "recommendation_score": p.get("recommendation_score", 85)
        })

    # Apply geographic route optimization and clustering
    day_itineraries = cluster_and_route_itinerary(
        recommended_places=formatted_places,
        number_of_days=number_of_days,
        slots_per_day=3
    )

    # Total activities cost
    total_activity_cost = sum(
        sum(act.get("estimated_cost", 0) for act in day.get("activities", []))
        for day in day_itineraries
    )

    return {
        "number_of_days": number_of_days,
        "total_activities_cost": total_activity_cost,
        "itinerary": day_itineraries
    }