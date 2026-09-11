def calculate_interest_match(place_category, interests):
    """
    Calculates how well a place matches the user's interests.
    """

    if not interests:
        return 0.5

    place_category = place_category.lower()

    for interest in interests:
        if interest.lower() in place_category:
            return 1.0

    return 0.0


def calculate_rating_score(rating):
    """
    Converts a place rating from 0-5 into a 0-1 score.
    """

    if rating is None:
        return 0.5

    return min(rating / 5.0, 1.0)


def calculate_budget_score(price_level, budget_level):
    """
    Checks whether the place fits the user's budget preference.

    price_level:
        1 = Low
        2 = Medium
        3 = High

    budget_level:
        1 = Low
        2 = Medium
        3 = High
    """

    if price_level is None or budget_level is None:
        return 0.5

    difference = abs(price_level - budget_level)

    if difference == 0:
        return 1.0

    if difference == 1:
        return 0.6

    return 0.2


def calculate_score(place, interests=None, budget_level=None):
    """
    Calculates the overall recommendation score.

    Score:
    40% Interest Match
    30% Rating
    20% Budget Compatibility
    10% Base Preference
    """

    interest_score = calculate_interest_match(
        place.category,
        interests
    )

    rating_score = calculate_rating_score(
        place.rating
    )

    budget_score = calculate_budget_score(
        place.price_level,
        budget_level
    )

    preference_score = 0.5

    final_score = (
        0.40 * interest_score
        + 0.30 * rating_score
        + 0.20 * budget_score
        + 0.10 * preference_score
    )

    return round(final_score * 100, 2)


def recommend_places(
    places,
    interests=None,
    budget_level=None,
    limit=10
):
    """
    Calculates scores for all places,
    sorts them from highest to lowest,
    and returns the best recommendations.
    """

    recommendations = []

    for place in places:

        score = calculate_score(
            place,
            interests,
            budget_level
        )

        recommendations.append({
            "id": place.id,
            "name": place.name,
            "category": place.category,
            "rating": place.rating,
            "price_level": place.price_level,
            "description": place.description,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "recommendation_score": score,
            # Placeholder stops carry this through so the UI can label them as
            # suggested areas rather than venues we have verified.
            "is_placeholder": getattr(place, "is_placeholder", False)
        })

    recommendations.sort(
        key=lambda x: x["recommendation_score"],
        reverse=True
    )

    return recommendations[:limit]