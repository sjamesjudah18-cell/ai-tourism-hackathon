from app.algorithms.recommender import recommend_places


def generate_itinerary(
    places,
    number_of_days: int,
    interests=None,
    budget_level=None
):
    """
    Generates a day-wise itinerary
    using recommended places.
    """

    if number_of_days <= 0:
        raise ValueError("Number of days must be greater than 0")

    recommendations = recommend_places(
        places=places,
        interests=interests,
        budget_level=budget_level,
        limit=len(places)
    )

    itinerary = []

    # Maximum 3 activities per day
    slots_per_day = 3

    place_index = 0

    for day in range(1, number_of_days + 1):

        day_places = []

        for time in ["Morning", "Afternoon", "Evening"]:

            if place_index >= len(recommendations):
                break

            place = recommendations[place_index]

            day_places.append({
                "time": time,
                "place_id": place["id"],
                "place_name": place["name"],
                "category": place["category"],
                "rating": place["rating"],
                "estimated_cost": 0,
                "description": place["description"]
            })

            place_index += 1

        itinerary.append({
            "day": day,
            "activities": day_places
        })

        if place_index >= len(recommendations):
            # Keep remaining days empty if there
            # are no more unique places available.
            continue

    return {
        "number_of_days": number_of_days,
        "itinerary": itinerary
    }