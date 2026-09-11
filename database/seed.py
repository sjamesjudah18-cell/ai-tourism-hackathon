import sys
from pathlib import Path

# Add the backend folder to Python's path
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"

sys.path.insert(0, str(BACKEND_DIR))


from app.core.database import SessionLocal
from app.models.destination import Destination


def seed_destinations():
    db = SessionLocal()

    destinations = [
        Destination(
            name="Hyderabad",
            country="India",
            state="Telangana",
            latitude=17.3850,
            longitude=78.4867,
            description="A historic city known for Charminar, Golconda Fort, biryani and rich cultural heritage."
        ),

        Destination(
            name="Goa",
            country="India",
            state="Goa",
            latitude=15.2993,
            longitude=74.1240,
            description="A popular coastal destination known for beaches, nightlife, Portuguese heritage and water activities."
        ),

        Destination(
            name="Jaipur",
            country="India",
            state="Rajasthan",
            latitude=26.9124,
            longitude=75.7873,
            description="The Pink City known for forts, palaces, royal heritage and traditional Rajasthani culture."
        ),

        Destination(
            name="New Delhi",
            country="India",
            state="Delhi",
            latitude=28.6139,
            longitude=77.2090,
            description="India's capital, known for historical monuments, museums, markets and diverse food."
        ),

        Destination(
            name="Mumbai",
            country="India",
            state="Maharashtra",
            latitude=19.0760,
            longitude=72.8777,
            description="A vibrant coastal city known for Bollywood, Gateway of India, food and nightlife."
        ),

        Destination(
            name="Kochi",
            country="India",
            state="Kerala",
            latitude=9.9312,
            longitude=76.2673,
            description="A scenic Kerala destination known for its backwaters, heritage streets, beaches and local cuisine."
        )
    ]

    try:
        existing_count = db.query(Destination).count()

        if existing_count > 0:
            print("Destinations already exist. No new data added.")
            return

        db.add_all(destinations)
        db.commit()

        print("DESTINATION SEEDING SUCCESSFUL")
        print(f"Added {len(destinations)} destinations.")

    except Exception as e:
        db.rollback()
        print("ERROR:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_destinations()