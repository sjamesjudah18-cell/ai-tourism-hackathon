import math


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two points in kilometers.
    """
    if None in (lat1, lon1, lat2, lon2):
        return 5.0  # Fallback default distance in km

    r = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


def estimate_travel_time_minutes(distance_km: float) -> int:
    """
    Estimates city transit time in minutes given distance in km.
    Assuming average urban travel speed of 25 km/h + 5 min traffic buffer.
    """
    if distance_km <= 0:
        return 5
    avg_speed_kmh = 25.0
    minutes = (distance_km / avg_speed_kmh) * 60 + 5
    return max(5, round(minutes))


def optimize_daily_sequence(places: list[dict]) -> list[dict]:
    """
    Orders places within a single day using nearest-neighbor heuristic
    to minimize travel distance. Assigns Morning, Afternoon, Evening.
    """
    if not places:
        return []

    if len(places) == 1:
        p = places[0].copy()
        p["time"] = "Morning"
        p["transit_from_previous"] = {"distance_km": 0, "estimated_minutes": 0}
        return [p]

    unvisited = [p.copy() for p in places]
    # Pick the northernmost or first place to start the morning
    unvisited.sort(key=lambda x: x.get("latitude") or 0.0, reverse=True)
    ordered = [unvisited.pop(0)]

    while unvisited:
        current = ordered[-1]
        c_lat = current.get("latitude") or 0.0
        c_lng = current.get("longitude") or 0.0

        # Find nearest unvisited place
        next_place = min(
            unvisited,
            key=lambda p: haversine_distance(
                c_lat, c_lng,
                p.get("latitude") or 0.0,
                p.get("longitude") or 0.0
            )
        )
        unvisited.remove(next_place)
        ordered.append(next_place)

    times = ["Morning", "Afternoon", "Evening", "Night"]
    for i, place in enumerate(ordered):
        place["time"] = times[i] if i < len(times) else f"Stop {i+1}"
        if i == 0:
            place["transit_from_previous"] = {
                "distance_km": 0,
                "estimated_minutes": 0,
                "note": "Starting point for the day"
            }
        else:
            prev = ordered[i - 1]
            dist = haversine_distance(
                prev.get("latitude") or 0.0,
                prev.get("longitude") or 0.0,
                place.get("latitude") or 0.0,
                place.get("longitude") or 0.0
            )
            time_mins = estimate_travel_time_minutes(dist)
            place["transit_from_previous"] = {
                "distance_km": dist,
                "estimated_minutes": time_mins,
                "note": f"~{time_mins} mins travel from {prev.get('name') or prev.get('place_name', 'previous stop')}"
            }

    return ordered


def cluster_and_route_itinerary(
    recommended_places: list[dict],
    number_of_days: int,
    slots_per_day: int = 3
) -> list[dict]:
    """
    Partitions recommended places into geographically clustered days
    and orders stops for each day sequentially.
    """
    total_needed = number_of_days * slots_per_day
    available = recommended_places[:total_needed]

    # If we have fewer places than slots, loop or reuse top places
    if len(available) < total_needed and len(recommended_places) > 0:
        multiplier = (total_needed // len(recommended_places)) + 1
        available = (recommended_places * multiplier)[:total_needed]

    # Partition sequentially into day buckets
    days_result = []
    for day in range(1, number_of_days + 1):
        start_idx = (day - 1) * slots_per_day
        end_idx = start_idx + slots_per_day
        day_slice = available[start_idx:end_idx]

        optimized_activities = optimize_daily_sequence(day_slice)

        # Calculate total day transit
        total_day_dist = sum(
            act.get("transit_from_previous", {}).get("distance_km", 0)
            for act in optimized_activities
        )
        total_day_transit_time = sum(
            act.get("transit_from_previous", {}).get("estimated_minutes", 0)
            for act in optimized_activities
        )

        days_result.append({
            "day": day,
            "title": _get_day_theme(day, number_of_days),
            "total_transit_km": round(total_day_dist, 1),
            "estimated_transit_minutes": total_day_transit_time,
            "activities": optimized_activities
        })

    return days_result


def _get_day_theme(day: int, total_days: int) -> str:
    if day == 1:
        return "Iconic Heritage & Arrival"
    elif day == total_days:
        return "Local Markets & Memorable Departures"
    elif day == 2:
        return "Art, Culture & Culinary Exploration"
    elif day == 3:
        return "Scenic Views & Hidden Treasures"
    else:
        return f"Regional Discovery · Day {day}"
