from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any
from app.services.ai_service import handle_assistant_chat

router = APIRouter(
    prefix="/api/assistant",
    tags=["Assistant"]
)


class ChatRequest(BaseModel):
    message: str
    trip_context: dict[str, Any] | None = None
    history: list[dict[str, str]] | None = None


@router.post("/chat")
def chat_assistant(request: ChatRequest):
    result = handle_assistant_chat(
        message=request.message,
        trip_context=request.trip_context or {},
        history=request.history or []
    )
    return result
