import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal
from app.models.destination import Destination
from app.models.hotel import Hotel


def seed_hotels():
    db = SessionLocal()
    try:
        hyderabad = db.query(Destination).filter(Destination.name == "Hyderabad").first()
        goa = db.query(Destination).filter(Destination.name == "Goa").first()
        jaipur = db.query(Destination).filter(Destination.name == "Jaipur").first()
        delhi = db.query(Destination).filter(Destination.name == "New Delhi").first()
        mumbai = db.query(Destination).filter(Destination.name == "Mumbai").first()
        kochi = db.query(Destination).filter(Destination.name == "Kochi").first()

        if not hyderabad:
            print("Destinations not found. Run seed.py first.")
            return

        # Check existing
        existing_count = db.query(Hotel).count()
        if existing_count > 0:
            print(f"Hotels already exist ({existing_count} rows). Skipping seeding.")
            return

        hotels = [
            # HYDERABAD
            Hotel(
                destination_id=hyderabad.id,
                name="Taj Falaknuma Palace",
                latitude=17.3314,
                longitude=78.4674,
                rating=4.9,
                price_per_night=18000.0,
                description="Iconic luxury heritage palace hotel overlooking the historic city of Hyderabad."
            ),
            Hotel(
                destination_id=hyderabad.id,
                name="ITC Kohenur",
                latitude=17.4325,
                longitude=78.3776,
                rating=4.8,
                price_per_night=9500.0,
                description="Sophisticated luxury hotel overlooking Durgam Cheruvu lake with premier dining."
            ),
            Hotel(
                destination_id=hyderabad.id,
                name="Marigold Hotel Begumpet",
                latitude=17.4412,
                longitude=78.4520,
                rating=4.5,
                price_per_night=4200.0,
                description="Upscale comfort hotel in central Hyderabad with rooftop pool and modern amenities."
            ),
            Hotel(
                destination_id=hyderabad.id,
                name="Radisson Blu Plaza Banjara Hills",
                latitude=17.4239,
                longitude=78.4482,
                rating=4.6,
                price_per_night=5200.0,
                description="Refined comfort stay in posh Banjara Hills, close to shopping and dining."
            ),
            Hotel(
                destination_id=hyderabad.id,
                name="Treebo Trend The Grand Solitaire",
                latitude=17.4435,
                longitude=78.4983,
                rating=4.2,
                price_per_night=2200.0,
                description="Clean, budget-friendly stay with complimentary breakfast near Secunderabad hub."
            ),
            Hotel(
                destination_id=hyderabad.id,
                name="FabHotel Prime Abids",
                latitude=17.3912,
                longitude=78.4735,
                rating=4.1,
                price_per_night=1800.0,
                description="Affordable modern stay in downtown Abids, central to historic markets and landmarks."
            ),

            # GOA
            Hotel(
                destination_id=goa.id,
                name="Taj Exotica Resort & Spa",
                latitude=15.2678,
                longitude=73.9312,
                rating=4.9,
                price_per_night=16500.0,
                description="Mediterranean-style 5-star beachfront resort in scenic Benaulim, South Goa."
            ),
            Hotel(
                destination_id=goa.id,
                name="W Goa Vagator",
                latitude=15.6025,
                longitude=73.7389,
                rating=4.7,
                price_per_night=14000.0,
                description="Vibrant luxury coastal resort with cliffs, rock pool, and sunset parties."
            ),
            Hotel(
                destination_id=goa.id,
                name="Santana Beach Resort Candolim",
                latitude=15.5189,
                longitude=73.7667,
                rating=4.4,
                price_per_night=3800.0,
                description="Lush garden resort with direct access to Candolim beach and two swimming pools."
            ),
            Hotel(
                destination_id=goa.id,
                name="Zostel Goa Calangute",
                latitude=15.5412,
                longitude=73.7554,
                rating=4.3,
                price_per_night=1400.0,
                description="Lively backpacker and budget hub near Calangute beach with social events."
            ),

            # JAIPUR
            Hotel(
                destination_id=jaipur.id,
                name="Rambagh Palace",
                latitude=26.8978,
                longitude=75.8089,
                rating=4.9,
                price_per_night=24000.0,
                description="Former residence of the Maharaja of Jaipur, ranked among world's best luxury hotels."
            ),
            Hotel(
                destination_id=jaipur.id,
                name="Shahpura Haveli Heritage Hotel",
                latitude=26.9289,
                longitude=75.7923,
                rating=4.5,
                price_per_night=4600.0,
                description="Traditional Rajasthani comfort haveli with royal fresco art and warm hospitality."
            ),
            Hotel(
                destination_id=jaipur.id,
                name="Hotel Pearl Palace",
                latitude=26.9189,
                longitude=75.7912,
                rating=4.4,
                price_per_night=2100.0,
                description="Charming budget boutique hotel with famous Peacock rooftop restaurant."
            ),

            # NEW DELHI
            Hotel(
                destination_id=delhi.id,
                name="The Imperial New Delhi",
                latitude=28.6234,
                longitude=77.2189,
                rating=4.8,
                price_per_night=15500.0,
                description="Historic luxury 1930s hotel on Janpath with colonial charm and museum-quality art."
            ),
            Hotel(
                destination_id=delhi.id,
                name="Bloomrooms @ Janpath",
                latitude=28.6212,
                longitude=77.2201,
                rating=4.4,
                price_per_night=3900.0,
                description="Crisp, design-focused comfort hotel steps from Connaught Place and India Gate."
            ),
            Hotel(
                destination_id=delhi.id,
                name="Hotel City Star New Delhi",
                latitude=28.6432,
                longitude=77.2154,
                rating=4.2,
                price_per_night=1950.0,
                description="Top-rated budget hotel near New Delhi Railway Station with modern rooms."
            ),

            # MUMBAI
            Hotel(
                destination_id=mumbai.id,
                name="The Taj Mahal Palace",
                latitude=18.9217,
                longitude=72.8332,
                rating=4.9,
                price_per_night=22000.0,
                description="Legendary luxury landmark hotel overlooking the Gateway of India and Arabian Sea."
            ),
            Hotel(
                destination_id=mumbai.id,
                name="Residency Hotel Fort",
                latitude=18.9356,
                longitude=72.8341,
                rating=4.4,
                price_per_night=4800.0,
                description="Welcoming comfort hotel in South Mumbai's heritage district."
            ),
            Hotel(
                destination_id=mumbai.id,
                name="Hotel Suba Palace Colaba",
                latitude=18.9245,
                longitude=72.8312,
                rating=4.2,
                price_per_night=2500.0,
                description="Budget hotel near Colaba Causeway and coastal attractions."
            ),

            # KOCHI
            Hotel(
                destination_id=kochi.id,
                name="Brunton Boatyard - CGH Earth",
                latitude=9.9678,
                longitude=76.2412,
                rating=4.8,
                price_per_night=12500.0,
                description="Colonial-style harbor-front luxury heritage hotel in Fort Kochi."
            ),
            Hotel(
                destination_id=kochi.id,
                name="Forte Kochi Hotel",
                latitude=9.9654,
                longitude=76.2428,
                rating=4.6,
                price_per_night=4900.0,
                description="Charming Portuguese-heritage comfort hotel on Princess Street."
            ),
            Hotel(
                destination_id=kochi.id,
                name="Spencer Home Stay Fort Kochi",
                latitude=9.9621,
                longitude=76.2445,
                rating=4.3,
                price_per_night=1600.0,
                description="Cozy, friendly heritage homestay in central Fort Kochi with local breakfast."
            ),
        ]

        db.add_all(hotels)
        db.commit()
        print(f"HOTEL SEEDING SUCCESSFUL: Added {len(hotels)} hotels across 6 destinations.")
    except Exception as e:
        db.rollback()
        print("ERROR seeding hotels:", e)
    finally:
        db.close()


if __name__ == "__main__":
    seed_hotels()
