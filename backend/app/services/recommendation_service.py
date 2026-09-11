from sqlalchemy.orm import Session

from app.models.place import Place
from app.algorithms.recommender import recommend_places


def get_recommendations(
    db: Session,
    destination_id: int,
    interests: list[str] | None = None,
    budget_level: int | None = None,
    limit: int = 10
):
    """
    Gets places for a destination from the database
    and sends them to the recommendation algorithm.
    """

    places = (
        db.query(Place)
        .filter(Place.destination_id == destination_id)
        .all()
    )

    recommendations = recommend_places(
        places=places,
        interests=interests,
        budget_level=budget_level,
        limit=limit
    )

    return recommendations