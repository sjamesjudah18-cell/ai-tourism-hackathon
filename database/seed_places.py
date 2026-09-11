import sys
from pathlib import Path

# Add the backend folder to Python's path
ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"

sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal
from app.models.destination import Destination
from app.models.place import Place


def seed_places():
    db = SessionLocal()

    try:
        # Get destinations from the database
        hyderabad = db.query(Destination).filter(
            Destination.name == "Hyderabad"
        ).first()

        goa = db.query(Destination).filter(
            Destination.name == "Goa"
        ).first()

        jaipur = db.query(Destination).filter(
            Destination.name == "Jaipur"
        ).first()

        delhi = db.query(Destination).filter(
            Destination.name == "New Delhi"
        ).first()

        mumbai = db.query(Destination).filter(
            Destination.name == "Mumbai"
        ).first()

        kochi = db.query(Destination).filter(
            Destination.name == "Kochi"
        ).first()

        if not all([hyderabad, goa, jaipur, delhi, mumbai, kochi]):
            print("ERROR: Required destinations were not found.")
            print("Run seed.py first.")
            return

        # Prevent duplicate seeding
        existing_count = db.query(Place).count()

        if existing_count > 0:
            print("Places already exist. No new data added.")
            return

        places = [

            # HYDERABAD
            Place(
                destination_id=hyderabad.id,
                name="Charminar",
                category="Historical",
                latitude=17.3616,
                longitude=78.4747,
                rating=4.7,
                price_level=1,
                description="Historic monument and iconic landmark of Hyderabad."
            ),

            Place(
                destination_id=hyderabad.id,
                name="Golconda Fort",
                category="Historical",
                latitude=17.3833,
                longitude=78.4011,
                rating=4.6,
                price_level=1,
                description="Historic fort known for its architecture, history and panoramic views."
            ),

            Place(
                destination_id=hyderabad.id,
                name="Salar Jung Museum",
                category="Museum",
                latitude=17.3714,
                longitude=78.4804,
                rating=4.5,
                price_level=1,
                description="Museum containing a large collection of art, antiques and historical objects."
            ),

            Place(
                destination_id=hyderabad.id,
                name="Hussain Sagar Lake",
                category="Nature",
                latitude=17.4239,
                longitude=78.4738,
                rating=4.4,
                price_level=1,
                description="Large lake popular for sightseeing, boating and evening views."
            ),

            # GOA
            Place(
                destination_id=goa.id,
                name="Baga Beach",
                category="Beach",
                latitude=15.5557,
                longitude=73.7517,
                rating=4.4,
                price_level=2,
                description="Popular beach known for water activities, food and nightlife."
            ),

            Place(
                destination_id=goa.id,
                name="Basilica of Bom Jesus",
                category="Historical",
                latitude=15.5009,
                longitude=73.9110,
                rating=4.6,
                price_level=1,
                description="Historic church and UNESCO World Heritage site."
            ),

            Place(
                destination_id=goa.id,
                name="Dudhsagar Falls",
                category="Nature",
                latitude=15.3144,
                longitude=74.3144,
                rating=4.7,
                price_level=2,
                description="Spectacular waterfall surrounded by lush forests."
            ),

            # JAIPUR
            Place(
                destination_id=jaipur.id,
                name="Amber Fort",
                category="Historical",
                latitude=26.9855,
                longitude=75.8513,
                rating=4.7,
                price_level=2,
                description="Magnificent hilltop fort showcasing Rajput architecture."
            ),

            Place(
                destination_id=jaipur.id,
                name="Hawa Mahal",
                category="Historical",
                latitude=26.9239,
                longitude=75.8267,
                rating=4.6,
                price_level=1,
                description="Iconic palace famous for its unique five-story facade."
            ),

            Place(
                destination_id=jaipur.id,
                name="City Palace",
                category="Historical",
                latitude=26.9258,
                longitude=75.8237,
                rating=4.5,
                price_level=2,
                description="Royal palace complex with museums and traditional architecture."
            ),

            # NEW DELHI
            Place(
                destination_id=delhi.id,
                name="India Gate",
                category="Historical",
                latitude=28.6129,
                longitude=77.2295,
                rating=4.6,
                price_level=1,
                description="War memorial and one of the most recognizable landmarks in Delhi."
            ),

            Place(
                destination_id=delhi.id,
                name="Red Fort",
                category="Historical",
                latitude=28.6562,
                longitude=77.2410,
                rating=4.5,
                price_level=1,
                description="Historic Mughal-era fort and UNESCO World Heritage site."
            ),

            Place(
                destination_id=delhi.id,
                name="Qutub Minar",
                category="Historical",
                latitude=28.5244,
                longitude=77.1855,
                rating=4.7,
                price_level=1,
                description="Historic minaret and UNESCO World Heritage site."
            ),

            # MUMBAI
            Place(
                destination_id=mumbai.id,
                name="Gateway of India",
                category="Historical",
                latitude=18.9220,
                longitude=72.8347,
                rating=4.6,
                price_level=1,
                description="Iconic waterfront monument overlooking the Arabian Sea."
            ),

            Place(
                destination_id=mumbai.id,
                name="Marine Drive",
                category="Nature",
                latitude=18.9431,
                longitude=72.8238,
                rating=4.7,
                price_level=1,
                description="Scenic coastal promenade famous for sunsets and city views."
            ),

            Place(
                destination_id=mumbai.id,
                name="Elephanta Caves",
                category="Historical",
                latitude=18.9633,
                longitude=72.9315,
                rating=4.4,
                price_level=2,
                description="Ancient rock-cut caves and UNESCO World Heritage site."
            ),

            # KOCHI
            Place(
                destination_id=kochi.id,
                name="Fort Kochi",
                category="Historical",
                latitude=9.9658,
                longitude=76.2421,
                rating=4.6,
                price_level=1,
                description="Historic coastal area known for colonial architecture and culture."
            ),

            Place(
                destination_id=kochi.id,
                name="Chinese Fishing Nets",
                category="Culture",
                latitude=9.9674,
                longitude=76.2429,
                rating=4.5,
                price_level=1,
                description="Traditional fishing structures and an iconic Kochi landmark."
            ),

            Place(
                destination_id=kochi.id,
                name="Mattancherry Palace",
                category="Historical",
                latitude=9.9581,
                longitude=76.2590,
                rating=4.4,
                price_level=1,
                description="Historic palace featuring murals and Kerala heritage."
            ),
        ]

        db.add_all(places)
        db.commit()

        print("PLACE SEEDING SUCCESSFUL")
        print(f"Added {len(places)} places.")

    except Exception as e:
        db.rollback()
        print("ERROR:", e)

    finally:
        db.close()


if __name__ == "__main__":
    seed_places()