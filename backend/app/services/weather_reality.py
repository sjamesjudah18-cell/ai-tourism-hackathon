"""
The Weather category of the Reality Check.

Builds on the existing Open-Meteo integration in `weather_service` rather than
replacing it - `get_destination_weather` is still the single source of current
conditions and is left exactly as it was. What this module adds is the
per-trip-day forecast, marine and air-quality signals, and the translation of
raw numbers into advice a traveller can act on.
"""

from __future__ import annotations

from datetime import date

from app.core.http_cache import fetch_json
from app.core.reality import (
    STATUS_RANK,
    Confidence,
    DataLabel,
    Status,
    make_datapoint,
    make_section,
    make_source,
    now_utc,
    section_unavailable,
)
from app.services.weather_service import get_destination_weather

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

OPEN_METEO = "Open-Meteo"
OPEN_METEO_URL = "https://open-meteo.com/"

# Fuller WMO table than the summary map in weather_service, for forecast days.
WMO_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    56: "Freezing drizzle", 57: "Dense freezing drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}

# Codes that make outdoor sightseeing genuinely unpleasant or unsafe.
WET_CODES = {51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99}
SEVERE_CODES = {65, 82, 95, 96, 99}

MAX_FORECAST_DAYS = 16


def describe_code(code: int | None) -> str:
    if code is None:
        return "Unknown conditions"
    return WMO_CODES.get(int(code), "Mixed conditions")


def get_trip_forecast(
    latitude: float,
    longitude: float,
    number_of_days: int,
    start_date: date | None = None,
) -> list[dict] | None:
    """
    Real per-day forecast aligned to the trip's days.

    Open-Meteo publishes roughly 16 days ahead. For a trip further out we return
    None rather than extrapolating: an invented forecast for a trip three months
    away is exactly the fake data this product exists to avoid.
    """
    today = date.today()
    begin = start_date or today
    offset = (begin - today).days
    if offset < 0:
        begin, offset = today, 0

    needed = offset + max(1, number_of_days)
    if offset > MAX_FORECAST_DAYS or needed > MAX_FORECAST_DAYS:
        return None

    data = fetch_json(
        FORECAST_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "daily": ",".join([
                "weather_code",
                "temperature_2m_max",
                "temperature_2m_min",
                "apparent_temperature_max",
                "precipitation_sum",
                "precipitation_probability_max",
                "wind_speed_10m_max",
                "uv_index_max",
            ]),
            "timezone": "auto",
            "forecast_days": min(MAX_FORECAST_DAYS, max(needed, 3)),
        },
        ttl_seconds=1800.0,
    )
    if not data or "daily" not in data:
        return None

    daily = data["daily"]
    times = daily.get("time") or []
    if not times:
        return None

    results = []
    for trip_day in range(1, number_of_days + 1):
        idx = offset + trip_day - 1
        if idx >= len(times):
            break

        code = _at(daily.get("weather_code"), idx)
        t_max = _at(daily.get("temperature_2m_max"), idx)
        feels_max = _at(daily.get("apparent_temperature_max"), idx)
        rain_pct = _at(daily.get("precipitation_probability_max"), idx)
        wind = _at(daily.get("wind_speed_10m_max"), idx)
        uv = _at(daily.get("uv_index_max"), idx)

        results.append({
            "trip_day": trip_day,
            "date": times[idx],
            "weather_code": code,
            "condition": describe_code(code),
            "temp_max_c": t_max,
            "temp_min_c": _at(daily.get("temperature_2m_min"), idx),
            "feels_like_max_c": feels_max,
            "precipitation_mm": _at(daily.get("precipitation_sum"), idx),
            "rain_probability_pct": rain_pct,
            "wind_speed_max_kmh": wind,
            "uv_index_max": uv,
            "is_wet": code in WET_CODES if code is not None else False,
            "is_severe": code in SEVERE_CODES if code is not None else False,
            "outdoor_suitability": outdoor_suitability(code, rain_pct, feels_max or t_max, wind),
            "advice": day_advice(code, rain_pct, feels_max or t_max, uv, wind),
        })

    return results or None


def _at(series, index):
    if not series or index >= len(series):
        return None
    return series[index]


def outdoor_suitability(code, rain_pct, feels_like, wind) -> str:
    """Deterministic verdict on whether outdoor sightseeing will be pleasant."""
    if code is not None and code in SEVERE_CODES:
        return Status.POOR
    if (rain_pct or 0) >= 70:
        return Status.POOR
    if code is not None and code in WET_CODES:
        return Status.CAUTION
    if (rain_pct or 0) >= 40:
        return Status.CAUTION
    if feels_like is not None and feels_like >= 38:
        return Status.CAUTION
    if (wind or 0) >= 40:
        return Status.CAUTION
    if feels_like is not None and feels_like >= 34:
        return Status.FAIR
    return Status.GOOD


def day_advice(code, rain_pct, feels_like, uv, wind) -> list[str]:
    """
    Turns the numbers into sentences. A traveller should never have to
    interpret "31 C / 78% humidity" for themselves.
    """
    tips: list[str] = []

    if code is not None and code in SEVERE_CODES:
        tips.append(
            "Thunderstorms or heavy rain are forecast. Plan indoor options and keep "
            "outdoor stops flexible."
        )
    elif (rain_pct or 0) >= 60:
        tips.append(
            f"Rain is likely ({int(rain_pct)}% chance). Carry a compact umbrella and "
            "expect slower traffic."
        )
    elif (rain_pct or 0) >= 30:
        tips.append(
            f"Passing showers are possible ({int(rain_pct)}% chance). A light rain "
            "layer is worth packing."
        )

    if feels_like is not None:
        if feels_like >= 40:
            tips.append(
                "It will feel dangerously hot in the open. Keep midday free, stay "
                "hydrated, and move sightseeing to early morning."
            )
        elif feels_like >= 35:
            tips.append(
                "Hot and humid through the afternoon. Outdoor sightseeing is far more "
                "comfortable before noon or after 4:30 PM."
            )
        elif feels_like <= 12:
            tips.append("Cold enough for a proper jacket, especially after sunset.")

    if uv is not None and uv >= 8:
        tips.append(f"UV index peaks near {round(uv)} - sunscreen and a hat are not optional.")

    if (wind or 0) >= 35:
        tips.append(
            f"Strong winds up to {round(wind)} km/h may affect boat rides and rooftop venues."
        )

    if not tips:
        tips.append("Comfortable conditions for a full day of outdoor sightseeing.")

    return tips


def get_marine_conditions(latitude: float, longitude: float) -> dict | None:
    """
    Real wave data for coastal destinations. Returns None where the marine model
    has no coverage - the correct answer inland, and it must surface as
    "unavailable" rather than as calm seas.
    """
    data = fetch_json(
        MARINE_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "wave_height,wave_period,sea_surface_temperature",
            "timezone": "auto",
        },
        ttl_seconds=1800.0,
    )
    if not data or "current" not in data:
        return None

    current = data["current"]
    wave_height = current.get("wave_height")
    if wave_height is None:
        return None

    return {
        "wave_height_m": wave_height,
        "wave_period_s": current.get("wave_period"),
        "sea_surface_temperature_c": current.get("sea_surface_temperature"),
        "time": current.get("time"),
        "assessment": _wave_assessment(float(wave_height)),
    }


def _wave_assessment(wave_height: float) -> dict:
    if wave_height >= 2.5:
        return {"status": Status.POOR, "text": (
            f"Waves around {wave_height:.1f} m. Rough water - swimming is inadvisable "
            "and boat trips are often cancelled.")}
    if wave_height >= 1.5:
        return {"status": Status.CAUTION, "text": (
            f"Waves around {wave_height:.1f} m. Choppy - strong swimmers only, and "
            "follow local flag warnings.")}
    if wave_height >= 0.8:
        return {"status": Status.FAIR, "text": (
            f"Moderate swell around {wave_height:.1f} m. Fine for most beach activity.")}
    return {"status": Status.GOOD, "text": (
        f"Calm water, waves around {wave_height:.1f} m. Good conditions for the coast.")}


def get_air_quality(latitude: float, longitude: float) -> dict | None:
    """Real AQI - a genuine part of trip reality in many Indian cities."""
    data = fetch_json(
        AIR_QUALITY_URL,
        params={
            "latitude": latitude,
            "longitude": longitude,
            "current": "pm2_5,pm10,us_aqi",
            "timezone": "auto",
        },
        ttl_seconds=1800.0,
    )
    if not data or "current" not in data:
        return None

    current = data["current"]
    aqi = current.get("us_aqi")
    if aqi is None:
        return None

    return {
        "us_aqi": aqi,
        "pm2_5": current.get("pm2_5"),
        "pm10": current.get("pm10"),
        "time": current.get("time"),
        "assessment": _aqi_assessment(float(aqi)),
    }


def _aqi_assessment(aqi: float) -> dict:
    if aqi >= 201:
        return {"status": Status.POOR, "band": "Very Unhealthy", "text":
                "Air quality is very poor. Limit prolonged outdoor exertion; consider an N95 mask."}
    if aqi >= 151:
        return {"status": Status.POOR, "band": "Unhealthy", "text":
                "Unhealthy air. Anyone with asthma or a breathing condition should limit outdoor time."}
    if aqi >= 101:
        return {"status": Status.CAUTION, "band": "Unhealthy for Sensitive Groups", "text":
                "Sensitive groups may feel discomfort during long stretches outdoors."}
    if aqi >= 51:
        return {"status": Status.FAIR, "band": "Moderate", "text":
                "Acceptable air quality for most travellers."}
    return {"status": Status.GOOD, "band": "Good", "text":
            "Clean air - no restrictions on outdoor activity."}


def build_weather_section(
    destination: str,
    latitude: float,
    longitude: float,
    number_of_days: int,
    start_date: date | None = None,
    is_coastal: bool = False,
    marine_coords: tuple[float, float] | None = None,
    marine_place_name: str | None = None,
) -> dict:
    """
    The Weather category: current conditions, the trip-day forecast, and - for
    coastal destinations only - real marine conditions.

    `marine_coords` lets the caller sample waves at an actual beach in the
    itinerary rather than at the destination centroid, which for a region like
    Goa sits well inland and has no marine coverage at all.
    """
    current = get_destination_weather(destination, lat=latitude, lng=longitude)
    forecast = get_trip_forecast(latitude, longitude, number_of_days, start_date)
    is_live = bool(current.get("is_live"))

    if not is_live and forecast is None:
        return section_unavailable(
            "weather", "Weather",
            "Live weather data is temporarily unavailable for this destination.",
        )

    source = make_source(OPEN_METEO, OPEN_METEO_URL)
    sources = [source]
    live_label = DataLabel.LIVE if is_live else DataLabel.FALLBACK

    details: dict = {
        "current": {
            "temperature": make_datapoint(
                current.get("temperature"), live_label, source=source if is_live else None),
            "feels_like": make_datapoint(
                current.get("feels_like"), live_label, source=source if is_live else None),
            "condition": current.get("condition"),
            "humidity": current.get("humidity"),
            "wind_speed": current.get("wind_speed"),
            "is_live": is_live,
        },
        "forecast": forecast or [],
        "forecast_label": DataLabel.LIVE if forecast else DataLabel.UNAVAILABLE,
        "forecast_note": (
            None if forecast else
            "The daily forecast is published about 16 days ahead, so it is not yet "
            "available for these dates."
        ),
        "best_time_to_explore": current.get("best_time_to_explore"),
        "packing_advice": current.get("packing_advice"),
    }

    if is_coastal:
        m_lat, m_lng = marine_coords or (latitude, longitude)
        marine = get_marine_conditions(m_lat, m_lng)
        if marine:
            marine_source = make_source("Open-Meteo Marine", OPEN_METEO_URL)
            details["marine"] = {
                "measured_at": marine_place_name,
                "wave_height_m": make_datapoint(
                    marine["wave_height_m"], DataLabel.LIVE, unit="m", source=marine_source,
                    note=(f"Measured at {marine_place_name}" if marine_place_name else None)),
                "wave_period_s": marine.get("wave_period_s"),
                "sea_surface_temperature_c": marine.get("sea_surface_temperature_c"),
                "assessment": marine["assessment"],
            }
            sources.append(marine_source)
        else:
            details["marine_unavailable"] = (
                "Live beach-condition data is currently unavailable for this stretch of coast."
            )

    air = get_air_quality(latitude, longitude)
    if air:
        air_source = make_source("Open-Meteo Air Quality", OPEN_METEO_URL)
        details["air_quality"] = {
            "us_aqi": make_datapoint(air["us_aqi"], DataLabel.LIVE, unit="US AQI", source=air_source),
            "pm2_5": air.get("pm2_5"),
            "assessment": air["assessment"],
        }
        sources.append(air_source)

    status, summary, advice = _summarise(current, forecast, details)

    return make_section(
        key="weather",
        title="Weather",
        status=status,
        summary=summary,
        advice=advice,
        details=details,
        confidence=Confidence.HIGH if (is_live and forecast) else Confidence.MEDIUM,
        sources=sources,
        last_updated=now_utc(),
    )


def _summarise(current: dict, forecast: list[dict] | None, details: dict):
    """Rolls the whole picture into one honest headline plus actionable advice."""
    statuses = [d["outdoor_suitability"] for d in (forecast or [])]
    for extra in ("marine", "air_quality"):
        block = details.get(extra)
        if block and block.get("assessment", {}).get("status"):
            statuses.append(block["assessment"]["status"])

    status = max(statuses, key=lambda s: STATUS_RANK.get(s, 0)) if statuses else Status.FAIR

    condition = (current.get("condition") or "current conditions").lower()
    temp = current.get("temperature", "")

    if forecast:
        wet_days = [d["trip_day"] for d in forecast if d["is_wet"]]
        if wet_days:
            day_list = ", ".join(f"Day {d}" for d in wet_days)
            summary = (
                f"Currently {condition} at {temp}. Rain is expected on {day_list} of "
                "your trip, which may disrupt outdoor stops."
            )
        else:
            summary = (
                f"Currently {condition} at {temp}. No significant rain is forecast "
                "across your travel dates."
            )
    else:
        summary = f"Currently {condition} at {temp}."

    advice: list[str] = []
    for day in (forecast or [])[:3]:
        if day["advice"]:
            advice.append(f"Day {day['trip_day']}: {day['advice'][0]}")

    for extra in ("air_quality", "marine"):
        block = details.get(extra)
        if block:
            advice.append(block["assessment"]["text"])

    if not advice and current.get("packing_advice"):
        advice.append(current["packing_advice"])

    return status, summary, advice
