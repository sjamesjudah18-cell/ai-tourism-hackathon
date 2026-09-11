"""
The Travel Reality Concierge.

Extends the existing Gemini assistant so it can answer reality questions -
"will it rain when I visit?", "how much should I expect to spend?", "why did I
get this alert?" - grounded in the actual reality data rather than the model's
own impressions.

The division of labour is the one the whole product runs on: deterministic code
establishes the facts, and the model does language. So this module assembles a
grounding block from real reality sections and instructs the model to answer
only from it, labelling every claim:

    VERIFIED          - from a named live source we fetched
    ESTIMATED         - from our own deterministic model
    GENERAL KNOWLEDGE - the model's background knowledge, not our data
    UNAVAILABLE       - we do not have this

The model is told explicitly never to claim live conditions that are not in the
grounding block. A fallback path answers without the model at all, so the
assistant still works when Gemini is unreachable.
"""

from __future__ import annotations

import json
from typing import Any

from app.core.reality import DataLabel
from app.services.ai_service import PRIMARY_MODEL, get_genai_client

LABELS = ["VERIFIED", "ESTIMATED", "GENERAL KNOWLEDGE", "UNAVAILABLE"]


def build_grounding(reality: dict[str, Any] | None, itinerary: list[dict] | None) -> str:
    """
    Turns the reality object into a compact factual block for the prompt.

    Only facts we actually hold go in. Anything missing is stated as
    unavailable, so the model has no gap to fill with invention.
    """
    if not reality:
        return (
            "NO REALITY DATA IS AVAILABLE for this trip. You may answer from general "
            "knowledge only, and must label it GENERAL KNOWLEDGE. Do not state any "
            "current weather, traffic, price or closure as if you had checked it."
        )

    lines: list[str] = []
    lines.append(f"DESTINATION: {reality.get('destination')}")
    lines.append(f"TRIP LENGTH: {reality.get('number_of_days')} days")
    lines.append(f"OVERALL READINESS: {reality.get('overall_status')} "
                 f"(confidence: {reality.get('confidence')})")
    lines.append(f"DATA FETCHED AT: {reality.get('last_updated')}")

    for section in reality.get("sections", []) or []:
        title = section.get("title")
        if not section.get("available"):
            lines.append(
                f"\n[{title}] UNAVAILABLE - {section.get('unavailable_reason')}"
            )
            continue

        source_names = ", ".join(
            s["name"] for s in section.get("sources", []) or [] if s.get("name")
        )
        provenance = f"source: {source_names}" if source_names else "modelled by us, not a live source"

        lines.append(f"\n[{title}] status={section.get('status')} ({provenance})")
        lines.append(f"  summary: {section.get('summary')}")
        for tip in (section.get("advice") or [])[:3]:
            lines.append(f"  advice: {tip}")

        lines.extend(_section_facts(section))

    alerts = reality.get("alerts") or []
    if alerts:
        lines.append(f"\n[ACTIVE ALERTS] {len(alerts)} affecting this trip:")
        for alert in alerts:
            lines.append(
                f"  - id={alert.get('id')} | {alert.get('severity')} {alert.get('type')} "
                f"| day {alert.get('affected_trip_day')} | {alert.get('affected_place')}"
            )
            lines.append(f"    {alert.get('title')}")
            lines.append(f"    impact: {alert.get('impact')} | source: {alert.get('source') or 'modelled'}")
    else:
        lines.append("\n[ACTIVE ALERTS] none currently affecting this trip.")

    if itinerary:
        lines.append("\n[ITINERARY]")
        for day in itinerary:
            names = [
                a.get("name") or a.get("place_name")
                for a in day.get("activities", []) or []
            ]
            lines.append(f"  Day {day.get('day')}: {', '.join(n for n in names if n)}")

    return "\n".join(lines)


def _section_facts(section: dict) -> list[str]:
    """Pulls the handful of concrete numbers worth grounding on, per section."""
    key = section.get("key")
    details = section.get("details") or {}
    out: list[str] = []

    if key == "weather":
        current = details.get("current") or {}
        temp = (current.get("temperature") or {}).get("value")
        if temp:
            live = "VERIFIED live" if current.get("is_live") else "FALLBACK, not live"
            out.append(f"  current temperature: {temp} ({live})")
        for day in (details.get("forecast") or [])[:7]:
            out.append(
                f"  forecast Day {day['trip_day']} ({day.get('date')}): {day.get('condition')}, "
                f"max {day.get('temp_max_c')}C, rain chance {day.get('rain_probability_pct')}%, "
                f"outdoor suitability {day.get('outdoor_suitability')}"
            )
        if details.get("forecast_note"):
            out.append(f"  forecast note: {details['forecast_note']}")
        if details.get("marine_unavailable"):
            out.append(f"  marine: UNAVAILABLE - {details['marine_unavailable']}")

    elif key == "traffic":
        out.append(
            f"  modelled transit: {details.get('total_realistic_minutes')} min total, "
            f"{details.get('total_added_minutes')} min more than the flat-speed plan "
            "(ESTIMATED, not live traffic)"
        )
        for day in (details.get("days") or [])[:7]:
            out.append(
                f"  Day {day.get('day')}: {day.get('realistic_minutes')} min "
                f"(+{day.get('added_minutes')}), congestion {day.get('congestion_level')}"
            )

    elif key == "cost_reality":
        total = details.get("total") or {}
        out.append(
            f"  estimated total: Rs {total.get('low')}-{total.get('high')} "
            f"vs stated budget Rs {details.get('stated_budget')} (ESTIMATED, ranges not quotes)"
        )
        for line in details.get("lines") or []:
            rng = line.get("range") or {}
            out.append(
                f"  {line.get('title')}: Rs {rng.get('low')}-{rng.get('high')} "
                f"[{line.get('label')}]"
            )

    elif key == "food_reality":
        for tier in details.get("tiers") or []:
            names = ", ".join(i["name"] for i in tier.get("items", [])[:6])
            out.append(f"  {tier.get('label')}: {names}")

    elif key == "local_updates":
        for item in (details.get("items") or [])[:5]:
            out.append(
                f"  news: \"{item.get('title')}\" ({item.get('publisher')}, "
                f"{item.get('category_label')})"
            )

    elif key == "hotel_reality":
        for hotel in (details.get("hotels") or [])[:4]:
            out.append(
                f"  {hotel.get('name')}: Rs {hotel.get('price_per_night')}/night "
                f"[{DataLabel.APPROXIMATE}], {hotel.get('distance_to_plan_km')} km from your stops"
            )

    elif key == "transport":
        local = details.get("local") or {}
        for option in (local.get("options") or [])[:6]:
            out.append(f"  {option.get('mode')}: {option.get('fare_band')} [STATIC reference]")

    return out


SYSTEM_RULES = """You are the Travel Reality Concierge for AI Tourism.

Your job is to tell travellers what to REALLY expect - honestly, including when
the honest answer is "we don't know".

ABSOLUTE RULES:
1. Answer ONLY from the GROUNDING DATA below. It is the only information you
   have actually checked.
2. Label every factual claim with exactly one of:
   [VERIFIED] - it is in the grounding data and came from a named live source
   [ESTIMATED] - it is in the grounding data but was modelled by us, not measured
   [GENERAL KNOWLEDGE] - background knowledge, NOT checked for this trip
   [UNAVAILABLE] - we do not have this information
3. NEVER state current weather, traffic, prices, closures, availability or
   conditions as fact unless they appear in the grounding data. If asked about
   something not there, say [UNAVAILABLE] and suggest where to check.
4. Traffic figures are modelled, never live. Always label them [ESTIMATED].
5. Prices are ranges and estimates, never guaranteed quotes.
6. You may NEVER change the traveller's itinerary. You can explain an alert and
   suggest they view alternatives, but the change only happens when they
   confirm it themselves.
7. For dietary questions, never be absolute: recipes vary between kitchens.
   Always advise confirming with the restaurant.

Be concise and practical: 2-5 sentences, plain language, no marketing tone."""

RESPONSE_FORMAT = """Respond as raw JSON only, no code fences:
{
  "reply": "your answer, with [VERIFIED]/[ESTIMATED]/[GENERAL KNOWLEDGE]/[UNAVAILABLE] labels inline",
  "labels_used": ["VERIFIED", "ESTIMATED"],
  "suggested_actions": ["short follow-up 1", "short follow-up 2", "short follow-up 3"],
  "intent": "weather | cost | traffic | food | transport | culture | alert_explanation | alternatives | general",
  "references_alert_id": "alert id if the question was about a specific alert, else null"
}"""


def handle_concierge_chat(
    message: str,
    reality: dict[str, Any] | None = None,
    itinerary: list[dict] | None = None,
    history: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Answers a trip-reality question, grounded in real data and explicitly
    labelled. Falls back to a deterministic answer when Gemini is unavailable.
    """
    grounding = build_grounding(reality, itinerary)
    client = get_genai_client()

    if client:
        history_text = ""
        if history:
            recent = history[-6:]
            history_text = "\n\nRECENT CONVERSATION:\n" + "\n".join(
                f"{turn.get('role', 'user')}: {turn.get('content', '')}" for turn in recent
            )

        prompt = (
            f"{SYSTEM_RULES}\n\n"
            f"===== GROUNDING DATA (the only facts you have checked) =====\n"
            f"{grounding}\n"
            f"===== END GROUNDING DATA ====="
            f"{history_text}\n\n"
            f"TRAVELLER ASKS: {message}\n\n{RESPONSE_FORMAT}"
        )

        try:
            response = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt,
            )
            parsed = _parse_json(response.text)
            if parsed:
                return {
                    "reply": parsed.get("reply", "").strip()
                    or _fallback(message, reality)["reply"],
                    "labels_used": [
                        label for label in parsed.get("labels_used", [])
                        if label in LABELS
                    ],
                    "suggested_actions": parsed.get("suggested_actions") or _default_actions(reality),
                    "intent": parsed.get("intent", "general"),
                    "references_alert_id": parsed.get("references_alert_id"),
                    "grounded": reality is not None,
                    "ai_powered": True,
                }
        except Exception as e:
            print("Concierge fallback triggered:", e)

    return _fallback(message, reality)


def _parse_json(text: str | None) -> dict | None:
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    try:
        return json.loads(cleaned.strip())
    except (json.JSONDecodeError, TypeError):
        return None


def _section(reality: dict | None, key: str) -> dict | None:
    if not reality:
        return None
    for section in reality.get("sections", []) or []:
        if section.get("key") == key:
            return section
    return None


def _fallback(message: str, reality: dict | None) -> dict[str, Any]:
    """
    Deterministic answers from the reality data when the model is unreachable.

    These are built from the same grounded facts and carry the same labels, so
    a Gemini outage degrades the wording, not the honesty.
    """
    lowered = message.lower()

    def reply(text: str, labels: list[str], intent: str) -> dict[str, Any]:
        return {
            "reply": text,
            "labels_used": labels,
            "suggested_actions": _default_actions(reality),
            "intent": intent,
            "references_alert_id": None,
            "grounded": reality is not None,
            "ai_powered": False,
        }

    if not reality:
        return reply(
            "[UNAVAILABLE] I don't have live data for this trip yet. Open the Reality "
            "Check to gather current weather, traffic and local updates, and I'll be "
            "able to answer specifically.",
            ["UNAVAILABLE"], "general",
        )

    if any(word in lowered for word in ("rain", "weather", "temperature", "hot", "forecast")):
        section = _section(reality, "weather")
        if section and section.get("available"):
            return reply(f"[VERIFIED] {section['summary']} " + " ".join(section.get("advice", [])[:2]),
                         ["VERIFIED"], "weather")
        return reply("[UNAVAILABLE] Live weather data could not be fetched for these dates.",
                     ["UNAVAILABLE"], "weather")

    if any(word in lowered for word in ("cost", "spend", "budget", "money", "expensive", "afford")):
        section = _section(reality, "cost_reality")
        if section and section.get("available"):
            return reply(f"[ESTIMATED] {section['summary']} " + " ".join(section.get("advice", [])[:2]),
                         ["ESTIMATED"], "cost")
        return reply("[UNAVAILABLE] I couldn't build a cost estimate for this trip.",
                     ["UNAVAILABLE"], "cost")

    if any(word in lowered for word in ("traffic", "travel time", "how long", "commute", "delay")):
        section = _section(reality, "traffic")
        if section and section.get("available"):
            return reply(
                f"[ESTIMATED] {section['summary']} These are modelled travel times based on "
                "typical peak hours, not live traffic - check a maps app on the day.",
                ["ESTIMATED"], "traffic")
        return reply("[UNAVAILABLE] I don't have travel-time figures for this plan yet.",
                     ["UNAVAILABLE"], "traffic")

    if any(word in lowered for word in ("eat", "food", "dish", "veg", "restaurant", "biryani", "allerg")):
        section = _section(reality, "food_reality")
        if section and section.get("available"):
            return reply(
                f"[VERIFIED] {section['summary']} Ingredients and preparation vary between "
                "restaurants - if you have an allergy or a strict dietary requirement, "
                "confirm with the restaurant before ordering.",
                ["VERIFIED"], "food")
        return reply(
            "[UNAVAILABLE] I don't have researched dish information for this destination yet.",
            ["UNAVAILABLE"], "food")

    if "alert" in lowered or "why" in lowered:
        alerts = reality.get("alerts") or []
        if alerts:
            top = alerts[0]
            return reply(
                f"[{'VERIFIED' if top.get('source') else 'ESTIMATED'}] {top['title']}. "
                f"{top['message']} Impact: {top.get('impact')}. You can keep your plan or "
                "view alternatives - nothing changes until you confirm.",
                ["VERIFIED" if top.get("source") else "ESTIMATED"], "alert_explanation")
        return reply("[VERIFIED] There are no active alerts affecting your trip right now.",
                     ["VERIFIED"], "alert_explanation")

    return reply(
        f"[VERIFIED] {reality.get('readiness_summary')} Ask me about weather, costs, "
        "traffic, food or any alert on your plan and I'll tell you what we've actually "
        "checked versus what's only an estimate.",
        ["VERIFIED"], "general",
    )


def _default_actions(reality: dict | None) -> list[str]:
    if reality and reality.get("alerts"):
        return [
            "Why did I get this alert?",
            "What happens if it rains on Day 2?",
            "How much should I expect to spend?",
        ]
    return [
        "Will it rain during my trip?",
        "How much should I expect to spend?",
        "What should I know before I go?",
    ]
