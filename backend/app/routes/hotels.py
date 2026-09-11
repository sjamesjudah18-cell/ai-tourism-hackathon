from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.hotel_service import get_recommended_hotels

router = APIRouter(
    prefix="/api/hotels",
    tags=["Hotels"]
)


@router.get("/")
def list_hotels(
    destination: str = Query(..., description="Name of destination, e.g. Hyderabad"),
    preference: str = Query("Comfort", description="Budget, Comfort, or Luxury"),
    days: int = Query(3, ge=1),
    limit: int = Query(6, ge=1, le=20),
    db: Session = Depends(get_db)
):
    hotels = get_recommended_hotels(
        db=db,
        destination_name=destination,
        preference=preference,
        days=days,
        limit=limit
    )
    return {
        "destination": destination,
        "count": len(hotels),
        "preference": preference,
        "hotels": hotels
    }
