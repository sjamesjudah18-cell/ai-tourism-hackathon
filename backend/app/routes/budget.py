from fastapi import APIRouter
from pydantic import BaseModel

from app.services.budget_service import calculate_trip_budget


router = APIRouter(
    prefix="/api/budget",
    tags=["Budget"]
)


class BudgetRequest(BaseModel):
    total_budget: float
    number_of_days: int


@router.post("/optimize")
def optimize_trip_budget(request: BudgetRequest):

    budget = calculate_trip_budget(
        total_budget=request.total_budget,
        number_of_days=request.number_of_days
    )

    return budget