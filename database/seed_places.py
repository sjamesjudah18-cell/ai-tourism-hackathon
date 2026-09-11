import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal
from app.models.destination import Destination
from app.models.place import Place


def seed_places():
    db = SessionLocal()
    try:
        hyderabad = db.query(Destination).filter(Destination.name == "Hyderabad").first()
        goa = db.query(Destination).filter(Destination.name == "Goa").first()
        jaipur = db.query(Destination).filter(Destination.name == "Jaipur").first()
        delhi = db.query(Destination).filter(Destination.name == "New Delhi").first()
        mumbai = db.query(Destination).filter(Destination.name == "Mumbai").first()
        kochi = db.query(Destination).filter(Destination.name == "Kochi").first()

        if not all([hyderabad, goa, jaipur, delhi, mumbai, kochi]):
            print("Required destinations missing. Run seed.py first.")
            return

        all_places = [
            # HYDERABAD (16 rich places)
            {"destination_id": hyderabad.id, "name": "Charminar", "category": "Historical", "latitude": 17.3616, "longitude": 78.4747, "rating": 4.7, "price_level": 1, "description": "16th-century mosque with four grand arches, iconic symbol of Hyderabad."},
            {"destination_id": hyderabad.id, "name": "Golconda Fort", "category": "Historical", "latitude": 17.3833, "longitude": 78.4011, "rating": 4.6, "price_level": 1, "description": "Acoustically brilliant medieval fortress with royal halls and sound & light show."},
            {"destination_id": hyderabad.id, "name": "Salar Jung Museum", "category": "Culture", "latitude": 17.3714, "longitude": 78.4804, "rating": 4.5, "price_level": 1, "description": "One of the world's largest one-man art collections, featuring the Veiled Rebecca."},
            {"destination_id": hyderabad.id, "name": "Hussain Sagar Lake & Buddha Statue", "category": "Nature", "latitude": 17.4239, "longitude": 78.4738, "rating": 4.4, "price_level": 1, "description": "Heart-shaped lake featuring the towering monolithic Buddha statue reached by boat."},
            {"destination_id": hyderabad.id, "name": "Chowmahalla Palace", "category": "Historical", "latitude": 17.3578, "longitude": 78.4717, "rating": 4.7, "price_level": 2, "description": "Opulent palace of the Nizams of Hyderabad, boasting majestic courtyards and vintage cars."},
            {"destination_id": hyderabad.id, "name": "Paradise Biryani Landmark", "category": "Food", "latitude": 17.4415, "longitude": 78.4872, "rating": 4.6, "price_level": 2, "description": "Legendary culinary stop known for authentic Hyderabadi Dum Biryani and Mirchi Ka Salan."},
            {"destination_id": hyderabad.id, "name": "Laad Bazaar & Choodi Market", "category": "Culture", "latitude": 17.3618, "longitude": 78.4728, "rating": 4.5, "price_level": 1, "description": "Vibrant historic bazaar adjacent to Charminar famous for lacquer bangles and pearls."},
            {"destination_id": hyderabad.id, "name": "Qutb Shahi Tombs", "category": "Historical", "latitude": 17.3934, "longitude": 78.3962, "rating": 4.6, "price_level": 1, "description": "Architecturally stunning domed tombs set in landscaped heritage gardens near Golconda."},
            {"destination_id": hyderabad.id, "name": "Ramoji Film City", "category": "Adventure", "latitude": 17.2543, "longitude": 78.6808, "rating": 4.6, "price_level": 3, "description": "World's largest film studio complex offering stunt shows, themed sets, and adventure rides."},
            {"destination_id": hyderabad.id, "name": "Shadab Restaurant Old City", "category": "Food", "latitude": 17.3664, "longitude": 78.4789, "rating": 4.7, "price_level": 1, "description": "Historic eatery serving authentic Haleem, Boti Kebab, and traditional Osmania Chai."},
            {"destination_id": hyderabad.id, "name": "Durgam Cheruvu Secret Lake & Cable Bridge", "category": "Adventure", "latitude": 17.4328, "longitude": 78.3846, "rating": 4.5, "price_level": 1, "description": "Scenic freshwater lake with illuminated cable-stayed bridge, kayaking, and boardwalk cafes."},
            {"destination_id": hyderabad.id, "name": "Birla Mandir", "category": "Culture", "latitude": 17.4062, "longitude": 78.4691, "rating": 4.7, "price_level": 1, "description": "Pure white Rajasthani marble temple perched atop Naubat Pahad hill overlooking the city."},
            {"destination_id": hyderabad.id, "name": "Shilparamam Arts & Crafts Village", "category": "Culture", "latitude": 17.4526, "longitude": 78.3776, "rating": 4.4, "price_level": 1, "description": "Rural cultural village presenting traditional handicrafts, folk dances, and artisan stalls."},
            {"destination_id": hyderabad.id, "name": "KBR National Park Nature Walk", "category": "Nature", "latitude": 17.4208, "longitude": 78.4239, "rating": 4.5, "price_level": 1, "description": "Green biological sanctuary in Jubilee Hills with morning jogging trails and peacocks."},
            {"destination_id": hyderabad.id, "name": "Nimrah Cafe & Bakery", "category": "Food", "latitude": 17.3615, "longitude": 78.4742, "rating": 4.8, "price_level": 1, "description": "Iconic cafe directly facing Charminar serving Irani Chai, warm Osmania biscuits, and tie biscuits."},
            {"destination_id": hyderabad.id, "name": "Nehru Zoological Park", "category": "Nature", "latitude": 17.3508, "longitude": 78.4513, "rating": 4.3, "price_level": 1, "description": "Extensive safari wildlife park featuring lion safari, nocturnal animal house, and boat rides."},

            # GOA
            {"destination_id": goa.id, "name": "Baga Beach", "category": "Beach", "latitude": 15.5557, "longitude": 73.7517, "rating": 4.4, "price_level": 2, "description": "Popular North Goa beach known for water activities, beach shacks, and night vibes."},
            {"destination_id": goa.id, "name": "Basilica of Bom Jesus", "category": "Historical", "latitude": 15.5009, "longitude": 73.9110, "rating": 4.6, "price_level": 1, "description": "UNESCO World Heritage Baroque church housing mortal remains of St. Francis Xavier."},
            {"destination_id": goa.id, "name": "Dudhsagar Falls", "category": "Nature", "latitude": 15.3144, "longitude": 74.3144, "rating": 4.7, "price_level": 2, "description": "Four-tiered majestic waterfall cascading down the Western Ghats."},
            {"destination_id": goa.id, "name": "Aguada Fort & Lighthouse", "category": "Historical", "latitude": 15.4923, "longitude": 73.7734, "rating": 4.5, "price_level": 1, "description": "17th-century Portuguese fortress overlooking Sinquerim beach and the Arabian Sea."},
            {"destination_id": goa.id, "name": "Fontainhas Latin Quarter", "category": "Culture", "latitude": 15.4989, "longitude": 73.8312, "rating": 4.7, "price_level": 1, "description": "Colorful heritage neighborhood in Panaji with narrow streets and Portuguese villas."},
            {"destination_id": goa.id, "name": "Curlies Beach Shack & Cafe", "category": "Food", "latitude": 15.5867, "longitude": 73.7432, "rating": 4.4, "price_level": 2, "description": "Iconic Anjuna beach shack serving fresh Goan fish curry, cocktails, and sunset views."},
            {"destination_id": goa.id, "name": "Palolem Beach & Silent Noise", "category": "Beach", "latitude": 15.0102, "longitude": 74.0234, "rating": 4.8, "price_level": 2, "description": "Crescent-shaped South Goa paradise beach fringed by coconut palms and calm waters."},
            {"destination_id": goa.id, "name": "Grand Island Scuba & Snorkel", "category": "Adventure", "latitude": 15.3521, "longitude": 73.7821, "rating": 4.6, "price_level": 3, "description": "Offshore island boat excursion with coral reef snorkeling, dolphin spotting, and diving."},

            # JAIPUR
            {"destination_id": jaipur.id, "name": "Amber Fort", "category": "Historical", "latitude": 26.9855, "longitude": 75.8513, "rating": 4.7, "price_level": 2, "description": "Magnificent hilltop fort showcasing Rajput architecture and Sheesh Mahal (mirror palace)."},
            {"destination_id": jaipur.id, "name": "Hawa Mahal", "category": "Historical", "latitude": 26.9239, "longitude": 75.8267, "rating": 4.6, "price_level": 1, "description": "Iconic pink honeycomb facade with 953 jharokhas built for royal women to view street festivities."},
            {"destination_id": jaipur.id, "name": "City Palace", "category": "Historical", "latitude": 26.9258, "longitude": 75.8237, "rating": 4.5, "price_level": 2, "description": "Royal palace complex blending Rajasthani and Mughal architectural styles."},
            {"destination_id": jaipur.id, "name": "Jantar Mantar", "category": "Culture", "latitude": 26.9247, "longitude": 75.8245, "rating": 4.6, "price_level": 1, "description": "UNESCO-listed 18th-century astronomical observatory with world's largest stone sundial."},
            {"destination_id": jaipur.id, "name": "Nahargarh Fort Sunset Point", "category": "Adventure", "latitude": 26.9372, "longitude": 75.8156, "rating": 4.6, "price_level": 1, "description": "Aravalli hilltop fort offering panoramic sunset vistas over the Pink City."},
            {"destination_id": jaipur.id, "name": "Chokhi Dhani Ethnic Village", "category": "Food", "latitude": 26.7667, "longitude": 75.8256, "rating": 4.5, "price_level": 2, "description": "Traditional Rajasthani cultural resort offering authentic Dal Baati Churma and folk dances."},
            {"destination_id": jaipur.id, "name": "Johari Bazaar & Bapu Bazaar", "category": "Culture", "latitude": 26.9201, "longitude": 75.8278, "rating": 4.5, "price_level": 1, "description": "Celebrated pink city bazaars famous for Jaipuri textiles, blue pottery, and gemstone jewelry."},

            # NEW DELHI
            {"destination_id": delhi.id, "name": "India Gate & Kartavya Path", "category": "Historical", "latitude": 28.6129, "longitude": 77.2295, "rating": 4.6, "price_level": 1, "description": "Grand 42-meter triumphal war memorial arch with landscaped ceremonial gardens."},
            {"destination_id": delhi.id, "name": "Red Fort (Lal Qila)", "category": "Historical", "latitude": 28.6562, "longitude": 77.2410, "rating": 4.5, "price_level": 1, "description": "Historic Mughal citadel in Old Delhi crafted in vibrant red sandstone."},
            {"destination_id": delhi.id, "name": "Qutub Minar Complex", "category": "Historical", "latitude": 28.5244, "longitude": 77.1855, "rating": 4.7, "price_level": 1, "description": "World's tallest brick minaret surrounded by ancient Iron Pillar and ruins."},
            {"destination_id": delhi.id, "name": "Humayun's Tomb", "category": "Historical", "latitude": 28.5933, "longitude": 77.2507, "rating": 4.7, "price_level": 1, "description": "UNESCO World Heritage garden tomb that inspired the Taj Mahal architecture."},
            {"destination_id": delhi.id, "name": "Chandni Chowk Food Walk", "category": "Food", "latitude": 28.6506, "longitude": 77.2304, "rating": 4.7, "price_level": 1, "description": "Famous culinary street walk exploring Paranthe Wali Gali, Natraj Dahi Bhalla, and Jalebi Wala."},
            {"destination_id": delhi.id, "name": "Lotus Temple", "category": "Culture", "latitude": 28.5535, "longitude": 77.2588, "rating": 4.5, "price_level": 1, "description": "Bahá'í House of Worship shaped like a blooming lotus, open to people of all faiths."},
            {"destination_id": delhi.id, "name": "Hauz Khas Village & Fort", "category": "Adventure", "latitude": 28.5534, "longitude": 77.1945, "rating": 4.5, "price_level": 2, "description": "Hip neighborhood combining 13th-century medieval lake ruins with cafes and art boutiques."},

            # MUMBAI
            {"destination_id": mumbai.id, "name": "Gateway of India", "category": "Historical", "latitude": 18.9220, "longitude": 72.8347, "rating": 4.6, "price_level": 1, "description": "Majestic arch monument overlooking Mumbai Harbour and the Arabian Sea."},
            {"destination_id": mumbai.id, "name": "Marine Drive & Queen's Necklace", "category": "Nature", "latitude": 18.9431, "longitude": 72.8238, "rating": 4.7, "price_level": 1, "description": "3.6-kilometer seaside promenade famous for ocean breeze, sunsets, and city skyline."},
            {"destination_id": mumbai.id, "name": "Elephanta Caves Ferry & Island", "category": "Historical", "latitude": 18.9633, "longitude": 72.9315, "rating": 4.4, "price_level": 2, "description": "Rock-cut cave temples dedicated to Shiva reached by a picturesque harbour boat ride."},
            {"destination_id": mumbai.id, "name": "Chhatrapati Shivaji Maharaj Terminus", "category": "Historical", "latitude": 18.9398, "longitude": 72.8354, "rating": 4.7, "price_level": 1, "description": "Victorian Gothic UNESCO landmark railway station and architectural marvel."},
            {"destination_id": mumbai.id, "name": "Bademiya Street Food Colaba", "category": "Food", "latitude": 18.9228, "longitude": 72.8331, "rating": 4.5, "price_level": 2, "description": "Open-air culinary icon famed for melt-in-mouth kebabs, baida roti, and rolls since 1946."},
            {"destination_id": mumbai.id, "name": "Bandstand & Bandra Fort", "category": "Culture", "latitude": 19.0435, "longitude": 72.8195, "rating": 4.6, "price_level": 1, "description": "Scenic promenade facing the Bandra-Worli Sea Link with Portuguese fort ruins."},

            # KOCHI
            {"destination_id": kochi.id, "name": "Fort Kochi & Beach Walk", "category": "Historical", "latitude": 9.9658, "longitude": 76.2421, "rating": 4.6, "price_level": 1, "description": "Colonial-era streets, Portuguese churches, and breezy beachfront walkway."},
            {"destination_id": kochi.id, "name": "Chinese Fishing Nets", "category": "Culture", "latitude": 9.9674, "longitude": 76.2429, "rating": 4.5, "price_level": 1, "description": "Fixed land installations operated by fishermen, an enduring symbol of Kochi."},
            {"destination_id": kochi.id, "name": "Mattancherry Palace (Dutch Palace)", "category": "Historical", "latitude": 9.9581, "longitude": 76.2590, "rating": 4.4, "price_level": 1, "description": "Palace featuring remarkable Hindu temple murals depicting scenes from the Ramayana."},
            {"destination_id": kochi.id, "name": "Kochi Backwaters Boat Cruise", "category": "Nature", "latitude": 9.9723, "longitude": 76.2625, "rating": 4.8, "price_level": 2, "description": "Peaceful journey through Kerala's interconnected canals, lagoons, and coconut groves."},
            {"destination_id": kochi.id, "name": "Kashi Art Cafe", "category": "Food", "latitude": 9.9681, "longitude": 76.2443, "rating": 4.7, "price_level": 2, "description": "Iconic bohemian art gallery cafe serving fresh Kerala coffees, cakes, and artisanal snacks."},
        ]

        # Check each place by name and destination_id; add if missing
        added = 0
        for p in all_places:
            exists = db.query(Place).filter(
                Place.destination_id == p["destination_id"],
                Place.name == p["name"]
            ).first()
            if not exists:
                db.add(Place(**p))
                added += 1

        db.commit()
        print(f"PLACES SEEDING SUCCESSFUL: Added {added} new places. Total places in DB: {db.query(Place).count()}.")
    except Exception as e:
        db.rollback()
        print("ERROR seeding places:", e)
    finally:
        db.close()


if __name__ == "__main__":
    seed_places()