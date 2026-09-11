from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.ai_service import handle_assistant_chat
from app.services.concierge_service import handle_concierge_chat
from app.services.reality_service import build_travel_reality

router = APIRouter(
    prefix="/api/assistant",
    tags=["Assistant"]
)


class ChatRequest(BaseModel):
    message: str
    trip_context: dict[str, Any] | None = None
    history: list[dict[str, str]] | None = None

    # The itinerary on screen, so answers line up with what the traveller sees.
    itinerary: list[dict] | None = None

    # Pre-fetched reality, to avoid re-gathering it on every message. When the
    # caller does not supply it, we gather it once here.
    reality: dict[str, Any] | None = None

    # Set false to use the original assistant without reality grounding.
    use_reality: bool = True


@router.post("/chat")
def chat_assistant(request: ChatRequest, db: Session = Depends(get_db)):
    """
    The Travel Reality Concierge.

    With trip context it answers from gathered reality data and labels every
    claim VERIFIED / ESTIMATED / GENERAL KNOWLEDGE / UNAVAILABLE. Without it,
    it falls back to the original general assistant.
    """
    context = request.trip_context or {}
    destination = context.get("destination")

    if not request.use_reality or not destination:
        result = handle_assistant_chat(
            message=request.message,
            trip_context=context,
            history=request.history or [],
        )
        result.setdefault("labels_used", [])
        result.setdefault("grounded", False)
        return result

    reality = request.reality
    if reality is None:
        # Gathering reality must never break the chat - a concierge that fails
        # closed is worse than one that answers from general knowledge.
        try:
            reality = build_travel_reality(
                db=db,
                destination=destination,
                number_of_days=int(context.get("days") or context.get("number_of_days") or 3),
                number_of_travelers=int(context.get("travelers") or 1),
                total_budget=float(context.get("budget") or 0),
                accommodation_preference=context.get("hotel") or "Comfort",
                itinerary=request.itinerary or [],
            )
        except Exception as e:
            print("Concierge could not gather reality:", e)
            reality = None

    return handle_concierge_chat(
        message=request.message,
        reality=reality,
        itinerary=request.itinerary,
        history=request.history,
    )
