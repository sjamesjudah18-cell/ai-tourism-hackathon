# Architecture

A **modular monolith**: one FastAPI application, one PostgreSQL database, one
Next.js frontend. Deliberately not split into services — the coupling between
the itinerary engine and the reality layer is tight enough that separating them
would cost far more than it bought.

```
Next.js (App Router)  ──HTTP──▶  FastAPI  ──▶  PostgreSQL
       │                            │
       │                            ├──▶ Open-Meteo (weather / marine / air)
       │                            ├──▶ Google News RSS (local reports)
       │                            ├──▶ Nominatim (geocoding)
       │                            └──▶ Gemini (language only)
       │
       └──▶ Google Maps JS (browser key, map rendering only)
```

---

## Layering

```
routes/      HTTP surface. Thin — parsing, delegation, status codes.
services/    Where the work happens. One module per domain concern.
algorithms/  Pure functions: scoring, routing, budget maths.
models/      SQLAlchemy tables.
core/        Cross-cutting: DB session, provenance vocabulary, fail-soft HTTP.
```

### `core/reality.py` — the shared vocabulary

Defines `DataLabel`, `Confidence`, `Status`, `Severity`, `AlertType`, the
section and alert constructors, and `dedupe_and_prune`. Everything that reaches
a traveller passes through these constructors, which is what keeps provenance
labelling consistent instead of ad hoc per feature.

### `core/http_cache.py` — fail-soft I/O

`fetch_json` / `fetch_text` return `None` on *any* failure — timeout, non-200,
malformed body, DNS. They never raise. An in-process TTL cache keeps repeat
calls off the free public APIs.

---

## The Reality Engine

`reality_service.build_travel_reality` composes the eight sections.

Two properties matter more than anything else:

**Per-section isolation.** Each section is built inside `_safe_section`, which
catches everything and returns an "unavailable" section on failure. One broken
API degrades one panel; the other seven keep working. Verified by simulating a
total outage — weather and local updates go down, the remaining six stay live.

**Deterministic composition.** Overall status is the worst *known* section
(unknown sections never mask a real problem). Confidence is dragged down by
missing coverage, so a check built on half the picture cannot claim High
confidence. Neither is asked of the language model.

---

## The Alert Impact Engine

`alert_service` detects and describes. It has **no write path**. Detectors:

| Detector | Trigger | Labelled |
|---|---|---|
| Weather | Wet/severe forecast vs. exposed stops | Live (Open-Meteo) |
| Air quality | AQI ≥ 101 vs. outdoor stops | Live |
| Marine | Rough seas vs. beach stops | Live |
| Traffic | Modelled delay ≥ 45 min/day | Estimate — no source claimed |
| Local news | Real headline naming a stop | Live headline, estimated classification |
| Cost | Bottom-up estimate exceeds budget | Estimate |

Exposure is weighted by category, so a museum in the rain raises nothing while a
fort does. Alerts are grouped per day rather than per stop — three rain alerts
for one afternoon is noise, not information.

---

## The change flow

```
  detect ────▶ inform ────▶ KEEP MY PLAN ──────▶ nothing happens
     │                 └──▶ SHOW ALTERNATIVES
     │                          │
     │                          ▼
     │                     pick one ──▶ CANCEL ──▶ back
     │                          │
     │                          ▼
     └────────────────▶ CONFIRM CHANGE ──▶ itinerary_change_service
```

The last step is the only write. Enforced three ways:

1. `apply_confirmed_change` raises `ChangeNotConfirmed` unless `confirmed is
   True` — identity, not truthiness, so `1` and `"yes"` are rejected.
2. Nothing imports `itinerary_change_service` except the confirm endpoint. The
   alert and reality services have no reference to it.
3. Each applied change writes an `itinerary_changes` row, so the set of changes
   ever made equals the set a human approved.

One shared frontend component — `TravelUpdateCard` — implements the whole
interaction, so weather, traffic, closure and news alerts all behave identically
rather than each reimplementing it.

---

## Division of labour with the LLM

Deterministic code owns anything that must be *correct*: coordinates, distances,
routing, budget arithmetic, weather values, timestamps, alert thresholds.

Gemini owns language: the trip narrative, and concierge replies. The concierge
receives a grounding block assembled from real reality data and is instructed to
answer only from it, labelling every claim `[VERIFIED]` / `[ESTIMATED]` /
`[GENERAL KNOWLEDGE]` / `[UNAVAILABLE]`. A deterministic fallback answers from
the same grounded facts when Gemini is unreachable — an outage degrades the
prose, not the honesty.

---

## Data model

Existing tables are untouched. Additions are additive only:

| Table | Purpose |
|---|---|
| `food_items` | Researched dishes with advisory dietary flags |
| `travel_alerts` | Persisted alerts + read/dismissed state |
| `itinerary_changes` | Audit log of confirmed changes |

Schema is managed by `Base.metadata.create_all` on boot, matching the project's
existing approach. It is additive and never drops. There is no Alembic setup in
this project, so none was introduced.

A separate `notifications` table was **deliberately not added**. The brief listed
it as a candidate, but a notification is an alert plus read state — a second
store would mean a second alert format to keep in sync, and the two would drift.
The notification centre reads `travel_alerts` directly.

---

## Frontend

```
app/
  page.tsx        Positioning and the provenance model, up front
  planner/        Trip inputs (+ optional start date and origin)
  itinerary/      Plan first; reality loads in behind it
  reality/        The Reality Check — readiness + eight sections
components/reality/
  RealityPrimitives.tsx   StatusBadge, DataLabelChip, SourceStamp, skeletons
  TravelUpdateCard.tsx    The KEEP / ALTERNATIVES / CONFIRM flow
  RealitySection.tsx      Section envelope + per-category detail bodies
types/reality.ts          Mirrors the backend contracts
```

`lib/api.ts` wraps every reality call in `safeJson`, which resolves to `null`
rather than throwing — so a dead service renders a notice instead of an error
boundary. The one exception is `confirmItineraryChange`, which throws
deliberately: a change the traveller confirmed must either happen or say it
didn't.

Loading is staged. The itinerary renders on its own, then reality fills in
behind skeletons. The plan is never held up by an API it doesn't depend on.
