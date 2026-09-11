from app.algorithms.budget_optimizer import optimize_budget


def calculate_trip_budget(
    total_budget: float,
    number_of_days: int
):
    """
    Calculates the optimized budget allocation
    for a trip.
    """

    return optimize_budget(
        total_budget=total_budget,
        number_of_days=number_of_days
    )