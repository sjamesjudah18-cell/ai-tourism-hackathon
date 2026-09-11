# API reference

Base URL: `http://127.0.0.1:8000` · Interactive docs: `/docs`

Endpoints added by the Travel Reality layer are marked **new**; the rest are the
original planning API and are unchanged.

---

## Travel Reality **new**

### `POST /api/reality/check`

The full TravelReality object for a trip.

```jsonc
{
  "trip_id": 12,              // or supply the fields below directly
  "destination": "Hyderabad",
  "number_of_days": 4,
  "total_budget": 25000,
  "number_of_travelers": 2,
  "interests": ["Food", "Culture", "Adventure"],
  "accommodation_preference": "Comfort",
  "start_date": "2026-09-14",  // optional; aligns the forecast to real dates
  "origin": "Bengaluru",       // optional; enables getting-there comparison
  "itinerary": [ /* ... */ ]   // optional; generated if omitted
}
```

Response:

```jsonc
{
  "destination": "Hyderabad",
  "location": { "latitude": 17.385, "longitude": 78.4867, "is_coastal": false,
                "resolved_by": "Seeded destination database" },
  "overall_status": "CAUTION",        // GOOD | FAIR | CAUTION | POOR | UNKNOWN
  "confidence": "High",               // High | Medium | Low
  "readiness_summary": "…",
  "sections": [ /* 8 sections, always in the same order */ ],
  "alerts": [ /* see the Alert shape below */ ],
  "alert_summary": { "total": 5, "by_severity": { "HIGH": 2 },
                     "affected_days": [2, 4] },
  "warnings": ["…"],
  "sources": [{ "name": "Open-Meteo", "url": "…", "fetched_at": "…" }],
  "last_updated": "2026-09-11T14:02:30Z"
}
```

Every section has the same envelope:

```jsonc
{
  "key": "weather",
  "title": "Weather",
  "status": "POOR",
  "summary": "Plain-language explanation.",
  "advice": ["What to do about it."],
  "details": { /* category-specific */ },
  "confidence": "High",
  "sources": [ /* only when real - never invented */ ],
  "last_updated": "…",
  "available": true,
  "unavailable_reason": null
}
```

An unreachable source returns `available: false` with an empty `details` and a
populated `unavailable_reason`. It never returns substitute data.

Section keys, in order: `weather`, `traffic`, `local_updates`, `cost_reality`,
`transport`, `hotel_reality`, `food_reality`, `local_culture`.

### Per-section endpoints **new**

These let the frontend load categories independently rather than blocking a page
on the full gather.

| Endpoint | Purpose |
|---|---|
| `GET /api/reality/food?destination=` | Dish-level food intelligence |
| `GET /api/reality/transport?destination=&origin=` | Getting there + around |
| `GET /api/reality/culture?destination=` | Know Before You Go |
| `GET /api/reality/updates?destination=` | Local disruption reports |

---

## Alerts **new**

### The Alert shape

Produced by every source — weather, traffic, closures, news, cost — and read by
the notification centre, the itinerary badges and the reality page alike. There
is no second alert format anywhere in the codebase.

```jsonc
{
  "id": "dc9f1b6dbfee9baf",     // stable fingerprint; identical conditions dedupe
  "type": "WEATHER",            // WEATHER|TRAFFIC|CLOSURE|LOCAL_NEWS|COST|TRANSPORT|AIR_QUALITY
  "severity": "HIGH",           // INFO|LOW|MEDIUM|HIGH|CRITICAL
  "title": "…",
  "message": "…",
  "source": "Open-Meteo",       // null when modelled by us
  "source_url": "https://…",    // null when there is no real source
  "detected_at": "…",
  "expires_at": "…",
  "affected_trip_day": 4,
  "affected_place": "Golconda Fort",
  "impact": "May add roughly 45 minutes…",
  "confidence": "High",
  "estimated_delay_minutes": 45,
  "suggested_actions": ["…"],
  "also_affected": ["Charminar"]  // other stops the same condition hits
}
```

### `POST /api/alerts/evaluate`

Detects issues affecting an itinerary. **Read-only** with respect to the plan.
Persists alerts by fingerprint when `persist` is true (the default), so
re-evaluating does not re-notify about something already dismissed.

### `POST /api/alerts/alternatives`

Proposes replacements for the stop an alert affects. **Read-only.** Weather
alerts favour sheltered options; traffic alerts favour closer ones. Stops
already on the plan are never offered.

```jsonc
{ "destination": "Hyderabad", "alert": { /* an alert */ },
  "itinerary": [ /* … */ ], "limit": 3 }
```

### `POST /api/alerts/confirm-change`

**The only endpoint in the application that modifies an itinerary.**

```jsonc
{
  "itinerary": [ /* … */ ],
  "trip_day": 4,
  "replace_place": "Golconda Fort",
  "replacement": { /* a chosen option */ },
  "confirmed": true,            // must be exactly true
  "alert_id": "dc9f1b6dbfee9baf",
  "reason": "Weather: thunderstorm expected"
}
```

`confirmed` must be exactly `true`. Anything else — `false`, omitted, `1`,
`"yes"` — returns **400** and the plan is untouched. On success the affected day
is re-routed, an audit row is written, and the prompting alert is dismissed.

---

## Notifications **new**

Backed by the same `travel_alerts` rows — a notification *is* an alert plus
read/dismissed state.

| Endpoint | Purpose |
|---|---|
| `GET /api/notifications/?trip_id=` | List active, most severe first |
| `POST /api/notifications/{fingerprint}/read` | Mark one read |
| `POST /api/notifications/{fingerprint}/dismiss` | Dismiss one |
| `POST /api/notifications/read-all?trip_id=` | Mark all read |

---

## Assistant — Travel Reality Concierge

### `POST /api/assistant/chat`

```jsonc
{
  "message": "Will it rain when I visit Golconda Fort?",
  "trip_context": { "destination": "Hyderabad", "days": 4, "budget": 25000 },
  "itinerary": [ /* optional */ ],
  "reality": { /* optional; re-gathered if omitted */ },
  "history": [{ "role": "user", "content": "…" }],
  "use_reality": true
}
```

Returns a reply in which every claim is tagged `[VERIFIED]`, `[ESTIMATED]`,
`[GENERAL KNOWLEDGE]` or `[UNAVAILABLE]`, plus `labels_used`, `intent`,
`suggested_actions` and `grounded`. With `use_reality: false` it falls back to
the original ungrounded assistant.

The concierge cannot change an itinerary. It can explain an alert and point to
alternatives; applying one still requires the confirmation flow above.

---

## Existing planning API (unchanged)

| Endpoint | Purpose |
|---|---|
| `POST /api/itinerary/generate` | Day-by-day plan, budget, hotels, weather, AI narrative |
| `POST /api/trips/` · `GET /api/trips/{id}` · `DELETE /api/trips/{id}` | Trip CRUD |
| `GET /api/destinations/` · `/{id}` | Seeded destinations |
| `GET /api/places/?destination_id=` · `/{id}` | Seeded places |
| `GET /api/hotels/?destination=&preference=&days=` | Hotel recommendations |
| `POST /api/budget/optimize` | Percentage budget split |
| `POST /api/recommendations/generate` | Scored place recommendations |
| `GET /health` | Health check |
