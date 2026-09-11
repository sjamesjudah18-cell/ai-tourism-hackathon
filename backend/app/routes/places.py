from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.place import Place


router = APIRouter(
    prefix="/api/places",
    tags=["Places"]
)


@router.get("/")
def get_places(
    destination_id: int | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Place)

    if destination_id is not None:
        query = query.filter(
            Place.destination_id == destination_id
        )

    return query.all()


@router.get("/{place_id}")
def get_place(
    place_id: int,
    db: Session = Depends(get_db)
):
    place = (
        db.query(Place)
        .filter(Place.id == place_id)
        .first()
    )

    if not place:
        return {
            "error": "Place not found"
        }

    return place