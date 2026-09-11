from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.services.recommendation_service import get_recommendations


router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"]
)


class RecommendationRequest(BaseModel):
    destination_id: int
    interests: list[str] | None = None
    budget_level: int | None = None
    limit: int = 10


@router.post("/generate")
def generate_recommendations(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    recommendations = get_recommendations(
        db=db,
        destination_id=request.destination_id,
        interests=request.interests,
        budget_level=request.budget_level,
        limit=request.limit
    )

    return {
        "destination_id": request.destination_id,
        "count": len(recommendations),
        "recommendations": recommendations
    }