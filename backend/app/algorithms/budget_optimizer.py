def optimize_budget(
    total_budget: float,
    number_of_days: int
):
    """
    Creates a practical travel budget allocation
    based on the user's total budget and trip duration.
    """

    if total_budget <= 0:
        raise ValueError("Budget must be greater than 0.")

    if number_of_days <= 0:
        raise ValueError("Number of days must be greater than 0.")

    # Percentage allocation
    hotel_percentage = 0.35
    transport_percentage = 0.15
    food_percentage = 0.20
    activities_percentage = 0.20
    emergency_percentage = 0.10

    hotel = total_budget * hotel_percentage
    transport = total_budget * transport_percentage
    food = total_budget * food_percentage
    activities = total_budget * activities_percentage
    emergency = total_budget * emergency_percentage

    return {
        "total_budget": round(total_budget, 2),

        "hotel": round(hotel, 2),
        "transport": round(transport, 2),
        "food": round(food, 2),
        "activities": round(activities, 2),
        "emergency_buffer": round(emergency, 2),

        "daily_food_budget": round(food / number_of_days, 2),
        "daily_activity_budget": round(
            activities / number_of_days,
            2
        ),

        "remaining_budget": round(
            total_budget
            - hotel
            - transport
            - food
            - activities
            - emergency,
            2
        )
    }