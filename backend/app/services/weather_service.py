import requests

# Fallback coordinates for major cities
CITY_COORDINATES = {
    "hyderabad": {"lat": 17.3850, "lng": 78.4867, "temp": 29, "condition": "Sunny & Pleasant", "advice": "Light breathable cottons, sunglasses, sun hat & water bottle."},
    "goa": {"lat": 15.2993, "lng": 74.1240, "temp": 28, "condition": "Tropical & Breezy", "advice": "Beachwear, UV sunscreen, linen shirts, sandals & shades."},
    "jaipur": {"lat": 26.9124, "lng": 75.7873, "temp": 26, "condition": "Clear & Sunny", "advice": "Cotton clothes, comfortable walking shoes for forts, evening light layer."},
    "delhi": {"lat": 28.6139, "lng": 77.2090, "temp": 27, "condition": "Pleasant Breeze", "advice": "Comfortable sneakers, casual modest clothing, sunglasses."},
    "new delhi": {"lat": 28.6139, "lng": 77.2090, "temp": 27, "condition": "Pleasant Breeze", "advice": "Comfortable sneakers, casual modest clothing, sunglasses."},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "temp": 30, "condition": "Coastal & Warm", "advice": "Breathable clothing, light cottons, umbrella during monsoon."},
    "kochi": {"lat": 9.9312, "lng": 76.2673, "temp": 29, "condition": "Tropical Coastal", "advice": "Light linen clothes, rain gear, mosquito repellent, walking flats."}
}

WEATHER_CODE_MAP = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    51: "Light drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    71: "Slight snow",
    80: "Rain showers",
    95: "Thunderstorm"
}


def get_destination_weather(destination: str, lat: float = None, lng: float = None) -> dict:
    """
    Fetches real-time weather from Open-Meteo or returns high-fidelity fallback.
    """
    dest_key = destination.lower().strip()
    fallback_info = CITY_COORDINATES.get(dest_key, {
        "lat": 17.3850,
        "lng": 78.4867,
        "temp": 28,
        "condition": "Pleasant & Clear",
        "advice": "Light comfortable travel attire, water bottle, and sunglasses."
    })

    target_lat = lat if lat is not None else fallback_info.get("lat", 17.3850)
    target_lng = lng if lng is not None else fallback_info.get("lng", 78.4867)

    try:
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={target_lat}&longitude={target_lng}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
            f"&timezone=auto"
        )
        resp = requests.get(url, timeout=3.5)
        if resp.status_code == 200:
            data = resp.json()
            curr = data.get("current", {})
            code = curr.get("weather_code", 0)
            condition = WEATHER_CODE_MAP.get(code, "Pleasant")
            temp = round(curr.get("temperature_2m", 28))
            feels_like = round(curr.get("apparent_temperature", temp))
            humidity = curr.get("relative_humidity_2m", 50)
            wind = curr.get("wind_speed_10m", 10)

            return {
                "destination": destination,
                "temperature": f"{temp}°C",
                "feels_like": f"{feels_like}°C",
                "condition": condition,
                "humidity": f"{humidity}%",
                "wind_speed": f"{wind} km/h",
                "packing_advice": fallback_info.get("advice", "Comfortable travel clothing and hydration."),
                "best_time_to_explore": "Early morning (8 AM - 11 AM) & evening golden hour (4:30 PM - 7:30 PM)",
                "is_live": True
            }
    except Exception:
        pass

    # Reliable fallback
    return {
        "destination": destination,
        "temperature": f"{fallback_info.get('temp', 28)}°C",
        "feels_like": f"{fallback_info.get('temp', 28) + 1}°C",
        "condition": fallback_info.get("condition", "Pleasant & Clear"),
        "humidity": "55%",
        "wind_speed": "12 km/h",
        "packing_advice": fallback_info.get("advice", "Light comfortable travel attire and hydration."),
        "best_time_to_explore": "Morning (8:30 AM - 11:30 AM) & Evening (4 PM - 7:30 PM)",
        "is_live": False
    }
