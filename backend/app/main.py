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

from app.routes.destinations import router as destinations_router
from app.routes.places import router as places_router
from app.routes.recommendations import router as recommendations_router
from app.routes.budget import router as budget_router
from app.routes.itinerary import router as itinerary_router
from app.routes.trips import router as trips_router

app = FastAPI(
    title="Smart Tourism API",
    description="AI-Powered Smart Tourism Ecosystem",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
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

@app.get("/")
def root():
    return {
        "message": "Smart Tourism API is running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }