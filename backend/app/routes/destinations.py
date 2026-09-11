from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.destination import Destination


router = APIRouter(
    prefix="/api/destinations",
    tags=["Destinations"]
)


@router.get("/")
def get_destinations(db: Session = Depends(get_db)):
    destinations = db.query(Destination).all()

    return destinations


@router.get("/{destination_id}")
def get_destination(
    destination_id: int,
    db: Session = Depends(get_db)
):
    destination = (
        db.query(Destination)
        .filter(Destination.id == destination_id)
        .first()
    )

    if not destination:
        return {
            "error": "Destination not found"
        }

    return destination