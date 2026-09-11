# AI Tourism — Travel with the full picture

Most trips don't go wrong because the itinerary was bad. They go wrong because
of rain on the wrong afternoon, an hour lost to traffic, a monument that closes
on Fridays, or costs nobody budgeted for.

AI Tourism plans the trip **and** checks the conditions against that specific
plan — then tells you what it verified, what it estimated, and what it simply
doesn't know.

---

## The two rules the codebase is built around

**1. Never fabricate data.** Every value carries a provenance label:

| Label | Meaning |
|---|---|
| `LIVE` | Fetched now from a named external source |
| `ESTIMATE` | Calculated by our own deterministic model |
| `APPROXIMATE` | A range or rounded figure, not exact |
| `STATIC` | Curated reference data, reviewed rather than live |
| `FALLBACK` | The live source failed; this is a stand-in |
| `UNAVAILABLE` | We genuinely do not know |

If a source is unreachable, the section says so. It never substitutes
plausible-looking data.

**2. The AI recommends, the user decides.** No itinerary ever changes without an
explicit confirmation. This is enforced structurally, not by convention:

- `itinerary_change_service.apply_confirmed_change` raises unless `confirmed`
  is *exactly* `True` — truthy values are rejected.
- No other module imports it, so there is no path from detection to mutation.
- Every applied change writes an `itinerary_changes` audit row.

---

## Running it locally

### Prerequisites

- Python 3.12+, Node 20+, PostgreSQL
- `backend/.env` with `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`,
  `DB_NAME`, `GEMINI_API_KEY`
- `frontend/.env.local` with `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

> The Gemini key is read server-side only and is never sent to the browser.

### Backend

```bash
cd backend
python -m venv venv
venv/Scripts/activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://127.0.0.1:8000  (docs at /docs)
```

Tables are created on boot via `Base.metadata.create_all`, which is additive and
never drops anything.

### Seed the database

Run in order — each script is idempotent and only adds what is missing:

```bash
python database/seed.py         # 6 destinations
python database/seed_places.py  # 57 places
python database/seed_hotels.py  # 22 hotels
python database/seed_food.py    # 21 researched dishes
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000
```

### Tests

```bash
cd backend && python -m pytest tests/ -q     # 33 tests, offline
cd frontend && npm run build                 # type-check + production build
```

---

## The Hyderabad demo, end to end

Destination **Hyderabad** · **4 days** · **2 travellers** · **₹25,000** ·
Food + Culture + Adventure · **Comfort** stay.

1. **Home** (`/`) — click the *Hyderabad (4 Days · ₹25k)* preset.
2. **Planner** (`/planner`) — the benchmark is pre-filled. Optionally add a
   start date (aligns the forecast to your real travel days) and a starting
   city (enables getting-there comparison). Generate.
3. **Itinerary** (`/itinerary`) — the plan renders first; live conditions load
   in behind it. Day tabs filter both the timeline and the map. Stops affected
   by an alert are flagged, and amber-pulsed on the map.
4. **Reality Check** (`/reality`) — trip readiness, confidence, and all eight
   categories: Weather, Traffic, Local Updates, Cost Reality, Transport,
   Accommodation, Food, Things To Know.
5. **An alert** — under *Needs your decision*, choose **Keep my plan** or
   **Show alternatives** → pick one → **Confirm change**. Only that last click
   modifies anything; the day is then re-routed and conditions re-assessed.
6. **Notification centre** — the bell in the navbar, reading the same alert
   objects.
7. **Concierge** — ask *"Will it rain when I visit Golconda Fort?"* or
   *"How much should I really expect to spend?"*. Answers are labelled
   `[VERIFIED]` / `[ESTIMATED]` / `[GENERAL KNOWLEDGE]` / `[UNAVAILABLE]`.

---

## Where the data comes from

| Source | Used for | Live? |
|---|---|---|
| Open-Meteo | Current conditions, 16-day forecast | Yes |
| Open-Meteo Marine | Wave height, sea temperature (coastal only) | Yes |
| Open-Meteo Air Quality | US AQI, PM2.5 | Yes |
| Google News RSS | Local disruption reports, with publisher + link | Yes |
| OpenStreetMap Nominatim | Geocoding arbitrary destinations | Yes |
| Google Gemini | Language only — narrative, concierge replies | Yes |
| Seeded Postgres | Places, hotels, dishes | Curated |
| Internal models | Traffic, costs, routing | Computed |

**There is no live traffic feed.** The Google Maps key is a browser key, and the
Routes API needs a billed server key. Travel time is therefore modelled from
distance, time of day, day of week and city size — and labelled `ESTIMATE`
everywhere it appears. It is never presented as live.

---

## Architecture

A modular monolith. FastAPI + SQLAlchemy + PostgreSQL behind a Next.js App
Router frontend.

```
backend/app/
  core/reality.py          Provenance labels, status, the Alert shape, dedupe
  core/http_cache.py       Fail-soft fetch + in-process TTL cache
  services/
    reality_service.py     Composes TravelReality; per-section isolation
    alert_service.py       Detects impact + proposes alternatives (read-only)
    itinerary_change_service.py   The ONLY write path; requires confirmation
    weather_reality.py     Forecast, marine, air quality, advice translation
    traffic_service.py     Deterministic congestion model
    cost_service.py        Bottom-up cost ranges
    news_service.py        Real headlines, itinerary-relevance filtered
    food_service.py / culture_service.py / transport_service.py
    concierge_service.py   Grounded, labelled Gemini answers
```

Deterministic work — coordinates, distances, routing, budget maths, alert rules
— happens in code. Gemini is used only for language.

Each reality section is built inside its own guard, so a failure in one degrades
that section to "unavailable" and leaves the other seven intact.
