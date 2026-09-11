"""
Local Updates - real local news, filtered for itinerary relevance.

This is deliberately NOT a news feed. A raw headline dump is noise; what a
traveller needs is the two or three items that actually touch a place on their
plan. So every item is:

  1. fetched from Google News RSS (real headline, real publisher, real URL,
     real publish timestamp - nothing here is generated),
  2. classified into a disruption category by deterministic keyword matching,
  3. scored for relevance against the itinerary's places and the destination,
  4. dropped unless it clears the relevance bar.

The classification and relevance score are our own inference over a real
headline, and are labelled as such - we never restate a headline as fact
beyond what it says.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from typing import Any

from app.core.http_cache import fetch_text
from app.core.reality import (
    SEVERITY_RANK,
    Confidence,
    DataLabel,
    Severity,
    Status,
    make_section,
    make_source,
    now_utc,
    section_unavailable,
)

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search"

# Category -> (keywords, default severity). Ordered most disruptive first so an
# item matching several categories is filed under the most serious one.
DISRUPTION_CATEGORIES: list[tuple[str, list[str], str]] = [
    ("FLOODING", ["flood", "waterlogging", "water logging", "inundat", "submerged", "deluge"], Severity.HIGH),
    ("SEVERE_WEATHER", ["cyclone", "heavy rain", "red alert", "orange alert", "storm warning",
                        "heatwave", "heat wave", "imd warning", "thunderstorm warning"], Severity.HIGH),
    ("STRIKE", ["strike", "bandh", "hartal", "walkout", "protest march"], Severity.HIGH),
    ("PROTEST", ["protest", "demonstration", "rally", "agitation", "dharna"], Severity.MEDIUM),
    ("ROAD_CLOSURE", ["road closed", "road closure", "diversion", "traffic restriction",
                      "route diverted", "flyover shut", "lane closure", "no entry"], Severity.MEDIUM),
    ("ATTRACTION_CLOSURE", ["shut for visitors", "closed for visitors", "closed to public",
                            "monument closed", "museum closed", "temple closed", "park closed",
                            "entry banned", "visitors barred"], Severity.HIGH),
    ("TRANSPORT_DISRUPTION", ["metro services", "train cancelled", "trains cancelled", "flight cancel",
                              "flights cancelled", "bus services", "services suspended", "rail block",
                              "airport", "metro shut"], Severity.MEDIUM),
    ("ACCIDENT", ["accident", "collision", "crash", "derail", "mishap"], Severity.MEDIUM),
    ("MAJOR_EVENT", ["festival", "procession", "marathon", "rally event", "summit", "vip visit",
                     "match at", "concert"], Severity.LOW),
    ("CITY_DISRUPTION", ["power cut", "water supply", "curfew", "section 144", "prohibitory order"],
     Severity.MEDIUM),
]

CATEGORY_LABELS = {
    "FLOODING": "Flooding",
    "SEVERE_WEATHER": "Severe weather",
    "STRIKE": "Strike / bandh",
    "PROTEST": "Protest",
    "ROAD_CLOSURE": "Road closure",
    "ATTRACTION_CLOSURE": "Attraction closure",
    "TRANSPORT_DISRUPTION": "Transport disruption",
    "ACCIDENT": "Accident",
    "MAJOR_EVENT": "Major event",
    "CITY_DISRUPTION": "City disruption",
}

# How stale an item may be before it stops being "what's happening now".
MAX_AGE_HOURS = 72

# Words too generic to prove a headline is about a specific place.
_STOPWORDS = {
    "the", "of", "and", "fort", "palace", "museum", "lake", "park", "temple",
    "market", "bazaar", "cafe", "restaurant", "beach", "garden", "city",
    "centre", "center", "house", "hotel", "tower", "gate", "road", "street",
    "national", "old", "new", "great", "grand", "royal", "heritage", "walk",
    "trail", "point", "complex", "village", "district", "area",
}


def fetch_local_updates(destination: str, limit: int = 25) -> list[dict] | None:
    """
    Pulls recent local news for a destination. Returns None when the feed could
    not be reached, so callers can say "unavailable" instead of "all clear" -
    those are very different messages for a traveller.
    """
    query = (
        f"{destination} (traffic OR closure OR protest OR strike OR flood OR "
        f"rain OR metro OR tourists OR festival)"
    )
    xml_text = fetch_text(
        GOOGLE_NEWS_RSS,
        params={"q": query, "hl": "en-IN", "gl": "IN", "ceid": "IN:en"},
        ttl_seconds=1800.0,
        timeout=10.0,
    )
    if not xml_text:
        return None

    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return None

    cutoff = now_utc() - timedelta(hours=MAX_AGE_HOURS)
    items: list[dict] = []

    for node in root.iterfind(".//item"):
        title = _text(node, "title")
        if not title:
            continue

        published = _parse_date(_text(node, "pubDate"))
        if published and published < cutoff:
            continue

        source_node = node.find("source")
        publisher = (source_node.text or "").strip() if source_node is not None else "Google News"

        items.append({
            "title": title,
            "url": _text(node, "link"),
            "publisher": publisher,
            "published_at": published.isoformat() if published else None,
            "published_dt": published,
        })

        if len(items) >= limit:
            break

    return items


def _text(node: ET.Element, tag: str) -> str | None:
    found = node.find(tag)
    if found is None or not found.text:
        return None
    return found.text.strip()


def _sort_recency(published_at: str | None) -> float:
    """Negative epoch, so newest sorts first and undated items sort last."""
    if not published_at:
        return 0.0
    try:
        return -datetime.fromisoformat(published_at).timestamp()
    except (TypeError, ValueError):
        return 0.0


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = parsedate_to_datetime(raw)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    except (TypeError, ValueError):
        return None


def classify(title: str) -> tuple[str, str] | None:
    """Returns (category, severity) or None when a headline is not a disruption."""
    lowered = title.lower()
    for category, keywords, severity in DISRUPTION_CATEGORIES:
        if any(keyword in lowered for keyword in keywords):
            return category, severity
    return None


def place_tokens(place_name: str) -> set[str]:
    """Distinctive words from a place name, used to match it in a headline."""
    words = re.findall(r"[a-z]+", (place_name or "").lower())
    return {w for w in words if len(w) > 3 and w not in _STOPWORDS}


def match_places(title: str, itinerary: list[dict]) -> list[dict]:
    """
    Finds itinerary stops a headline plausibly refers to.

    Matching is conservative: a stop matches only when a distinctive word from
    its name appears in the headline. "Golconda" matches; "Fort" alone does not.
    """
    lowered = title.lower()
    matches: list[dict] = []

    for day in itinerary or []:
        for activity in day.get("activities", []) or []:
            name = activity.get("name") or activity.get("place_name") or ""
            tokens = place_tokens(name)
            if not tokens:
                continue
            hits = [t for t in tokens if t in lowered]
            if hits:
                matches.append({
                    "day": day.get("day"),
                    "place": name,
                    "matched_on": hits,
                })
    return matches


def build_local_updates(
    destination: str,
    itinerary: list[dict] | None = None,
    max_items: int = 6,
) -> dict:
    """
    The Local Updates category: only items that are both a real disruption and
    relevant to this trip.
    """
    raw = fetch_local_updates(destination)

    if raw is None:
        return section_unavailable(
            "local_updates", "Local Updates",
            "Live local news is temporarily unavailable. Check local sources before you travel.",
        )

    dest_token = destination.strip().lower().split(",")[0]
    relevant: list[dict] = []

    for item in raw:
        classified = classify(item["title"])
        if not classified:
            continue

        category, severity = classified
        title_lower = item["title"].lower()

        # Must be about this destination at all.
        mentions_destination = dest_token in title_lower
        place_matches = match_places(item["title"], itinerary or [])

        if not mentions_destination and not place_matches:
            continue

        relevant.append({
            "title": item["title"],
            "url": item["url"],
            "publisher": item["publisher"],
            "published_at": item["published_at"],
            "category": category,
            "category_label": CATEGORY_LABELS.get(category, category),
            "severity": severity,
            "affects_itinerary": bool(place_matches),
            "affected_stops": place_matches,
            # Our own inference over a real headline - never presented as fact.
            "classification_label": DataLabel.ESTIMATE,
            "classification_note": (
                "Category assigned automatically from the headline. Open the source "
                "article to confirm details."
            ),
        })

    # Itinerary hits first, then most severe, then most recent. Without the
    # severity term a bank strike sorts below a festival write-up.
    relevant.sort(
        key=lambda i: (
            not i["affects_itinerary"],
            -SEVERITY_RANK.get(i["severity"], 0),
            _sort_recency(i["published_at"]),
        )
    )
    trimmed = relevant[:max_items]

    itinerary_hits = [i for i in trimmed if i["affects_itinerary"]]

    if not trimmed:
        status = Status.GOOD
        summary = (
            f"No local disruptions affecting your {destination} plan were found in "
            "recent local news."
        )
        advice = ["Nothing to act on right now. This refreshes as new reports appear."]
    elif itinerary_hits:
        status = Status.CAUTION
        names = ", ".join(sorted({h["affected_stops"][0]["place"] for h in itinerary_hits}))
        summary = (
            f"{len(itinerary_hits)} recent local report(s) mention stops on your "
            f"itinerary: {names}."
        )
        advice = [
            "Open the linked source to confirm before changing plans - headlines can "
            "be out of date by the time you travel.",
            "Affected stops are flagged on your itinerary with suggested alternatives.",
        ]
    else:
        status = Status.FAIR
        summary = (
            f"{len(trimmed)} recent local report(s) for {destination} that may affect "
            "getting around, though none name a stop on your itinerary."
        )
        advice = ["Worth a glance before you set out, especially for road and metro changes."]

    return make_section(
        key="local_updates",
        title="Local Updates",
        status=status,
        summary=summary,
        advice=advice,
        details={
            "items": trimmed,
            "total_scanned": len(raw),
            "total_relevant": len(relevant),
            "itinerary_matches": len(itinerary_hits),
        },
        confidence=Confidence.MEDIUM,
        sources=[make_source("Google News", "https://news.google.com/")],
        last_updated=now_utc(),
    )
