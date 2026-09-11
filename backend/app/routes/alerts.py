"""
Alert endpoints, and the confirmed-change endpoint.

These three routes are the full KEEP / SHOW ALTERNATIVES / CONFIRM CHANGE flow:

  POST /api/alerts/evaluate        detect issues   (read-only)
  POST /api/alerts/alternatives    propose options (read-only)
  POST /api/alerts/confirm-change  apply a change  (requires confirmed: true)

Choosing KEEP MY PLAN needs no request at all - it is the absence of a call to
the third endpoint. Nothing here changes an itinerary except the last one, and
only when the traveller has explicitly confirmed.
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services import alert_service, notification_service, reality_service
from app.services.itinerary_change_service import (
    ChangeNotConfirmed,
    ChangeTargetNotFound,
    apply_confirmed_change,
)
from app.services.trip_context_service import (
    get_candidate_places,
    places_as_dicts,
    resolve_trip_context,
)

router = APIRouter(
    prefix="/api/alerts",
    tags=["Alerts"],
)


class EvaluateRequest(BaseModel):
    destination: str
    itinerary: list[dict]
    number_of_days: int | None = None
    number_of_travelers: int | None = None
    total_budget: float | None = None
    accommodation_preference: str | None = None
    start_date: date | None = None
    trip_id: int | None = None
    persist: bool = True


@router.post("/evaluate")
def evaluate_alerts(request: EvaluateRequest, db: Session = Depends(get_db)):
    """
    Detects issues affecting this itinerary. Read-only with respect to the
    itinerary - it describes impact and never applies anything.
    """
    context = resolve_trip_context(
        db=db,
        trip_id=request.trip_id,
        destination=request.destination,
        number_of_days=request.number_of_days or len(request.itinerary) or 1,
        total_budget=request.total_budget,
        number_of_travelers=request.number_of_travelers,
        accommodation_preference=request.accommodation_preference,
        start_date=request.start_date,
    )

    reality = reality_service.build_travel_reality(
        db=db,
        destination=context.destination,
        number_of_days=context.number_of_days,
        number_of_travelers=context.number_of_travelers,
        total_budget=context.total_budget,
        accommodation_preference=context.accommodation_preference,
        itinerary=request.itinerary,
        start_date=context.start_date,
    )

    alerts = reality["alerts"]

    if request.persist and alerts:
        notification_service.sync_alerts(db=db, alerts=alerts, trip_id=context.trip_id)

    return {
        "destination": context.destination,
        "alerts": alerts,
        "summary": reality["alert_summary"],
        "overall_status": reality["overall_status"],
        "last_updated": reality["last_updated"],
    }


class AlternativesRequest(BaseModel):
    destination: str
    alert: dict
    itinerary: list[dict]
    limit: int = 3


@router.post("/alternatives")
def alternatives(request: AlternativesRequest, db: Session = Depends(get_db)):
    """
    Proposes replacements for the stop an alert affects.

    Read-only. Returning an option here changes nothing - the traveller still
    has to choose one and confirm it.
    """
    from app.routes.itinerary import _create_synthetic_places

    places = get_candidate_places(
        db=db,
        destination_name=request.destination,
        number_of_days=len(request.itinerary) or 1,
        synthetic_factory=_create_synthetic_places,
    )

    options = alert_service.generate_alternatives(
        alert=request.alert,
        itinerary=request.itinerary,
        candidate_places=places_as_dicts(places),
        limit=request.limit,
    )

    return {
        "alert_id": request.alert.get("id"),
        "affected_trip_day": request.alert.get("affected_trip_day"),
        "affected_place": request.alert.get("affected_place"),
        "options": options,
        "count": len(options),
        "note": (
            "These are suggestions only. Your itinerary has not changed and will "
            "not change until you confirm a replacement."
        ),
    }


class ConfirmChangeRequest(BaseModel):
    itinerary: list[dict]
    trip_day: int
    replace_place: str
    replacement: dict

    # Must be exactly true. The endpoint refuses anything else.
    confirmed: bool = False

    trip_id: int | None = None
    alert_id: str | None = None
    reason: str | None = None


@router.post("/confirm-change")
def confirm_change(request: ConfirmChangeRequest, db: Session = Depends(get_db)):
    """
    Applies a replacement the traveller has explicitly confirmed.

    This is the only endpoint in the application that modifies an itinerary.
    """
    try:
        result = apply_confirmed_change(
            db=db,
            itinerary=request.itinerary,
            trip_day=request.trip_day,
            replace_place=request.replace_place,
            replacement=request.replacement,
            confirmed=request.confirmed,
            trip_id=request.trip_id,
            alert_fingerprint=request.alert_id,
            reason=request.reason,
        )
    except ChangeNotConfirmed as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ChangeTargetNotFound as e:
        raise HTTPException(status_code=404, detail=str(e))

    # The alert that prompted this is resolved, so it stops nagging.
    if request.alert_id:
        notification_service.dismiss(db=db, fingerprint=request.alert_id)

    return result
