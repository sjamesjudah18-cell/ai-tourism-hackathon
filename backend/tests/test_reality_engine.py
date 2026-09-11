"""
Tests for the reality and alert engines.

These cover the parts where a mistake would be a product failure rather than a
cosmetic bug: the no-silent-mutation rule, honest labelling, dedupe, and
fail-soft composition. They are deliberately offline - no test here touches an
external API or the database, so the suite runs anywhere.
"""

import sys
from datetime import date, timedelta
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.reality import (  # noqa: E402
    AlertType,
    Confidence,
    DataLabel,
    Severity,
    Status,
    dedupe_and_prune,
    derive_overall_confidence,
    derive_overall_status,
    make_alert,
    make_section,
    now_utc,
    section_unavailable,
)
from app.services import alert_service, cost_service, traffic_service  # noqa: E402
from app.services.itinerary_change_service import (  # noqa: E402
    ChangeNotConfirmed,
    ChangeTargetNotFound,
    apply_confirmed_change,
)


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------

@pytest.fixture
def itinerary():
    """A two-day plan with a mix of exposed and sheltered stops."""
    return [
        {
            "day": 1,
            "title": "Day one",
            "total_transit_km": 9.0,
            "estimated_transit_minutes": 30,
            "activities": [
                {
                    "name": "Golconda Fort", "category": "Historical",
                    "latitude": 17.3833, "longitude": 78.4011,
                    "estimated_cost": 100, "time": "Morning", "duration": "2 hrs",
                    "transit_from_previous": {"distance_km": 0, "estimated_minutes": 0},
                },
                {
                    "name": "Salar Jung Museum", "category": "Museum",
                    "latitude": 17.3714, "longitude": 78.4804,
                    "estimated_cost": 150, "time": "Afternoon", "duration": "2 hrs",
                    "transit_from_previous": {"distance_km": 8.5, "estimated_minutes": 25},
                },
            ],
        },
        {
            "day": 2,
            "title": "Day two",
            "total_transit_km": 5.0,
            "estimated_transit_minutes": 20,
            "activities": [
                {
                    "name": "Charminar", "category": "Historical",
                    "latitude": 17.3616, "longitude": 78.4747,
                    "estimated_cost": 100, "time": "Evening", "duration": "2 hrs",
                    "transit_from_previous": {"distance_km": 5.0, "estimated_minutes": 20},
                },
            ],
        },
    ]


@pytest.fixture
def wet_forecast():
    return [
        {
            "trip_day": 1, "date": "2026-09-12", "weather_code": 95,
            "condition": "Thunderstorm", "temp_max_c": 31, "feels_like_max_c": 35,
            "rain_probability_pct": 80, "wind_speed_max_kmh": 20, "uv_index_max": 7,
            "is_wet": True, "is_severe": True,
            "outdoor_suitability": Status.POOR, "advice": ["Plan indoor options."],
        },
        {
            "trip_day": 2, "date": "2026-09-13", "weather_code": 0,
            "condition": "Clear sky", "temp_max_c": 30, "feels_like_max_c": 32,
            "rain_probability_pct": 5, "wind_speed_max_kmh": 10, "uv_index_max": 6,
            "is_wet": False, "is_severe": False,
            "outdoor_suitability": Status.GOOD, "advice": ["Comfortable conditions."],
        },
    ]


# --------------------------------------------------------------------------
# The core product rule: nothing changes without explicit confirmation
# --------------------------------------------------------------------------

class TestNoSilentMutation:
    def test_change_refused_without_confirmation(self, itinerary):
        with pytest.raises(ChangeNotConfirmed):
            apply_confirmed_change(
                db=None, itinerary=itinerary, trip_day=1,
                replace_place="Golconda Fort",
                replacement={"name": "Chowmahalla Palace", "category": "Historical"},
                confirmed=False,
            )

    @pytest.mark.parametrize("truthy", [1, "true", "yes", [1], {"a": 1}])
    def test_truthy_values_do_not_count_as_confirmation(self, itinerary, truthy):
        """`confirmed` must be exactly True - truthiness must not open the door."""
        with pytest.raises(ChangeNotConfirmed):
            apply_confirmed_change(
                db=None, itinerary=itinerary, trip_day=1,
                replace_place="Golconda Fort",
                replacement={"name": "Chowmahalla Palace", "category": "Historical"},
                confirmed=truthy,
            )

    def test_original_itinerary_is_not_mutated(self, itinerary):
        """A confirmed change returns a new plan and leaves the input alone."""
        before = [a["name"] for a in itinerary[0]["activities"]]

        apply_confirmed_change(
            db=_NullDb(), itinerary=itinerary, trip_day=1,
            replace_place="Golconda Fort",
            replacement={
                "name": "Chowmahalla Palace", "category": "Historical",
                "latitude": 17.3578, "longitude": 78.4717, "rating": 4.7,
            },
            confirmed=True,
        )

        assert [a["name"] for a in itinerary[0]["activities"]] == before

    def test_confirmed_change_replaces_the_stop(self, itinerary):
        result = apply_confirmed_change(
            db=_NullDb(), itinerary=itinerary, trip_day=1,
            replace_place="Golconda Fort",
            replacement={
                "name": "Chowmahalla Palace", "category": "Historical",
                "latitude": 17.3578, "longitude": 78.4717, "rating": 4.7,
            },
            confirmed=True,
        )

        day_one = next(d for d in result["itinerary"] if d["day"] == 1)
        names = [a["name"] for a in day_one["activities"]]

        assert "Chowmahalla Palace" in names
        assert "Golconda Fort" not in names
        assert result["confirmed"] is True

    def test_replacement_is_marked_as_user_selected(self, itinerary):
        result = apply_confirmed_change(
            db=_NullDb(), itinerary=itinerary, trip_day=1,
            replace_place="Golconda Fort",
            replacement={
                "name": "Chowmahalla Palace", "category": "Historical",
                "latitude": 17.3578, "longitude": 78.4717,
            },
            confirmed=True,
        )

        day_one = next(d for d in result["itinerary"] if d["day"] == 1)
        chosen = next(a for a in day_one["activities"] if a["name"] == "Chowmahalla Palace")
        assert chosen["user_selected"] is True

    def test_unknown_stop_is_rejected(self, itinerary):
        with pytest.raises(ChangeTargetNotFound):
            apply_confirmed_change(
                db=_NullDb(), itinerary=itinerary, trip_day=1,
                replace_place="Somewhere Not On The Plan",
                replacement={"name": "Anywhere", "category": "Culture"},
                confirmed=True,
            )

    def test_day_is_rerouted_after_a_change(self, itinerary):
        """Transit must be recalculated, not carried over from the old stop."""
        result = apply_confirmed_change(
            db=_NullDb(), itinerary=itinerary, trip_day=1,
            replace_place="Salar Jung Museum",
            replacement={
                "name": "Ramoji Film City", "category": "Adventure",
                "latitude": 17.2543, "longitude": 78.6808,
            },
            confirmed=True,
        )

        day_one = next(d for d in result["itinerary"] if d["day"] == 1)
        # Ramoji is far out of town, so the day's transit must grow.
        assert day_one["total_transit_km"] > itinerary[0]["total_transit_km"]


class _NullDb:
    """Stands in for a Session - the audit write is best-effort and optional."""

    def add(self, *_args, **_kwargs):
        pass

    def commit(self):
        pass

    def rollback(self):
        pass


# --------------------------------------------------------------------------
# Alert detection
# --------------------------------------------------------------------------

class TestAlertDetection:
    def test_weather_alert_targets_exposed_stops_only(self, itinerary, wet_forecast):
        alerts = alert_service.detect_weather_alerts(itinerary, wet_forecast)

        assert len(alerts) == 1, "one alert per affected day, not one per stop"
        alert = alerts[0]
        assert alert["affected_trip_day"] == 1
        # The fort is open-air; the museum is not, so the fort is the subject.
        assert alert["affected_place"] == "Golconda Fort"
        assert alert["severity"] == Severity.HIGH
        assert alert["source"] == "Open-Meteo"

    def test_no_weather_alert_on_a_dry_day(self, itinerary, wet_forecast):
        alerts = alert_service.detect_weather_alerts(itinerary, [wet_forecast[1]])
        assert alerts == []

    def test_indoor_only_day_raises_no_weather_alert(self, wet_forecast):
        indoor_plan = [{
            "day": 1,
            "activities": [{"name": "Salar Jung Museum", "category": "Museum"}],
        }]
        assert alert_service.detect_weather_alerts(indoor_plan, wet_forecast[:1]) == []

    def test_traffic_alert_only_above_threshold(self, itinerary):
        light = {"days": [{"day": 1, "added_minutes": 10, "realistic_minutes": 40, "legs": []}]}
        heavy = {"days": [{"day": 1, "added_minutes": 95, "realistic_minutes": 180, "legs": []}]}

        assert alert_service.detect_traffic_alerts(itinerary, light) == []

        alerts = alert_service.detect_traffic_alerts(itinerary, heavy)
        assert len(alerts) == 1
        assert alerts[0]["severity"] == Severity.HIGH
        # Modelled, so it must not claim a source.
        assert alerts[0]["source"] is None

    def test_alerts_carry_the_full_required_shape(self, itinerary, wet_forecast):
        alert = alert_service.detect_weather_alerts(itinerary, wet_forecast)[0]

        for field in (
            "type", "severity", "title", "message", "source", "source_url",
            "detected_at", "expires_at", "affected_trip_day", "affected_place",
            "impact", "confidence",
        ):
            assert field in alert, f"alert is missing required field '{field}'"


class TestAlertHygiene:
    def test_duplicate_alerts_collapse(self):
        a = make_alert(AlertType.WEATHER, Severity.LOW, "Rain on Day 1", "msg",
                       affected_trip_day=1, affected_place="Fort")
        b = make_alert(AlertType.WEATHER, Severity.HIGH, "Rain on Day 1", "msg",
                       affected_trip_day=1, affected_place="Fort")

        result = dedupe_and_prune([a, b])

        assert len(result) == 1
        assert result[0]["severity"] == Severity.HIGH, "the more severe one survives"

    def test_expired_alerts_are_dropped(self):
        stale = make_alert(
            AlertType.TRAFFIC, Severity.HIGH, "Old news", "msg",
            expires_at=now_utc() - timedelta(hours=2),
        )
        assert dedupe_and_prune([stale]) == []

    def test_severity_floor_filters_noise(self):
        low = make_alert(AlertType.LOCAL_NEWS, Severity.INFO, "Minor", "msg")
        high = make_alert(AlertType.WEATHER, Severity.HIGH, "Major", "msg")

        result = dedupe_and_prune([low, high], min_severity=Severity.MEDIUM)

        assert len(result) == 1
        assert result[0]["title"] == "Major"

    def test_results_are_ordered_most_severe_first(self):
        alerts = [
            make_alert(AlertType.COST, Severity.LOW, "Low", "m"),
            make_alert(AlertType.WEATHER, Severity.CRITICAL, "Critical", "m"),
            make_alert(AlertType.TRAFFIC, Severity.MEDIUM, "Medium", "m"),
        ]
        titles = [a["title"] for a in dedupe_and_prune(alerts)]
        assert titles == ["Critical", "Medium", "Low"]


# --------------------------------------------------------------------------
# Alternatives are proposals, not actions
# --------------------------------------------------------------------------

class TestAlternatives:
    def test_weather_alert_prefers_sheltered_options(self, itinerary):
        alert = make_alert(
            AlertType.WEATHER, Severity.HIGH, "Rain", "msg",
            affected_trip_day=1, affected_place="Golconda Fort",
        )
        candidates = [
            {"id": 1, "name": "Open Air Ruins", "category": "Historical",
             "rating": 4.6, "latitude": 17.372, "longitude": 78.481},
            {"id": 2, "name": "City Art Museum", "category": "Museum",
             "rating": 4.6, "latitude": 17.372, "longitude": 78.481},
        ]

        options = alert_service.generate_alternatives(alert, itinerary, candidates)

        assert options[0]["name"] == "City Art Museum"
        assert options[0]["indoor"] is True

    def test_stops_already_planned_are_never_offered(self, itinerary):
        alert = make_alert(
            AlertType.WEATHER, Severity.HIGH, "Rain", "msg",
            affected_trip_day=1, affected_place="Golconda Fort",
        )
        candidates = [
            {"id": 1, "name": "Salar Jung Museum", "category": "Museum",
             "rating": 4.5, "latitude": 17.3714, "longitude": 78.4804},
            {"id": 2, "name": "Charminar", "category": "Historical",
             "rating": 4.7, "latitude": 17.3616, "longitude": 78.4747},
        ]

        options = alert_service.generate_alternatives(alert, itinerary, candidates)
        assert options == [], "both candidates are already on the plan"

    def test_no_alternatives_without_a_target_stop(self, itinerary):
        alert = make_alert(AlertType.COST, Severity.HIGH, "Over budget", "msg")
        assert alert_service.generate_alternatives(alert, itinerary, []) == []


# --------------------------------------------------------------------------
# Honest labelling and composition
# --------------------------------------------------------------------------

class TestTrafficIsNeverPresentedAsLive:
    def test_section_is_labelled_estimate_and_claims_no_source(self, itinerary):
        section = traffic_service.build_traffic_section("Hyderabad", itinerary)

        assert section["details"]["estimate_basis"]["label"] == DataLabel.ESTIMATE
        assert section["details"]["is_live"] is False
        assert section["sources"] == [], "modelled data must not cite a source"
        assert any("not live" in tip.lower() for tip in section["advice"])

    def test_peak_hours_are_slower_than_off_peak(self):
        evening = traffic_service.congestion_multiplier("Hyderabad", "Evening")
        night = traffic_service.congestion_multiplier("Hyderabad", "Night")
        assert evening > night


class TestCostReality:
    def test_getting_there_is_unavailable_without_an_origin(self):
        estimate = cost_service.estimate_trip_cost(
            destination="Hyderabad", number_of_days=4, number_of_travelers=2,
            total_budget=25000, accommodation_preference="Comfort",
        )
        line = next(l for l in estimate["lines"] if l["key"] == "getting_there")

        assert line["label"] == DataLabel.UNAVAILABLE
        assert estimate["excludes_travel_to_destination"] is True

    def test_every_line_is_a_range_not_a_fixed_price(self):
        estimate = cost_service.estimate_trip_cost(
            destination="Hyderabad", number_of_days=4, number_of_travelers=2,
            total_budget=25000, accommodation_preference="Comfort",
        )
        for line in estimate["lines"]:
            assert "range" in line
            assert line["range"]["low"] <= line["range"]["high"]
            assert line["label"] != DataLabel.LIVE, "we have no live price source"

    def test_over_budget_is_reported_honestly(self):
        estimate = cost_service.estimate_trip_cost(
            destination="Hyderabad", number_of_days=6, number_of_travelers=4,
            total_budget=5000, accommodation_preference="Luxury",
        )
        assert estimate["status"] in (Status.CAUTION, Status.POOR)
        assert estimate["total"]["low"] > estimate["stated_budget"]


class TestComposition:
    def test_overall_status_takes_the_worst_known_section(self):
        sections = [
            make_section("a", "A", Status.GOOD, "fine"),
            make_section("b", "B", Status.POOR, "bad"),
            make_section("c", "C", Status.FAIR, "ok"),
        ]
        assert derive_overall_status(sections) == Status.POOR

    def test_unavailable_sections_never_mask_a_problem(self):
        sections = [
            make_section("a", "A", Status.CAUTION, "watch out"),
            section_unavailable("b", "B", "offline"),
        ]
        assert derive_overall_status(sections) == Status.CAUTION

    def test_confidence_drops_when_coverage_is_thin(self):
        mostly_missing = [
            make_section("a", "A", Status.GOOD, "fine", confidence=Confidence.HIGH),
            section_unavailable("b", "B", "offline"),
            section_unavailable("c", "C", "offline"),
        ]
        assert derive_overall_confidence(mostly_missing) == Confidence.LOW

    def test_full_high_quality_coverage_earns_high_confidence(self):
        sections = [
            make_section(f"s{i}", f"S{i}", Status.GOOD, "fine",
                         confidence=Confidence.HIGH)
            for i in range(8)
        ]
        assert derive_overall_confidence(sections) == Confidence.HIGH

    def test_unavailable_section_is_flagged_not_faked(self):
        section = section_unavailable("weather", "Weather", "Source offline")

        assert section["available"] is False
        assert section["status"] == Status.UNKNOWN
        assert section["details"] == {}
        assert section["sources"] == []
