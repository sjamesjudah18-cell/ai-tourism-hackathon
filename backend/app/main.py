from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.models.user import User
from app.models.destination import Destination
from app.models.place import Place
from app.models.hotel import Hotel
from app.models.trip import Trip
from app.models.itinerary import Itinerary
from app.models.review import Review
from app.models.food_item import FoodItem
from app.models.travel_alert import TravelAlert
from app.models.itinerary_change import ItineraryChange

from app.routes.destinations import router as destinations_router
from app.routes.places import router as places_router
from app.routes.recommendations import router as recommendations_router
from app.routes.budget import router as budget_router
from app.routes.itinerary import router as itinerary_router
from app.routes.trips import router as trips_router
from app.routes.hotels import router as hotels_router
from app.routes.assistant import router as assistant_router
from app.routes.reality import router as reality_router
from app.routes.alerts import router as alerts_router
from app.routes.notifications import router as notifications_router

app = FastAPI(
    title="AI Tourism API",
    description="Travel Reality Intelligence - plan with the full picture",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(destinations_router)
app.include_router(places_router)
app.include_router(recommendations_router)
app.include_router(budget_router)
app.include_router(itinerary_router)
app.include_router(trips_router)
app.include_router(hotels_router)
app.include_router(assistant_router)
app.include_router(reality_router)
app.include_router(alerts_router)
app.include_router(notifications_router)

@app.get("/")
def root():
    return {
        "message": "AI Tourism API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }