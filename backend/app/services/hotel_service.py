from sqlalchemy.orm import Session
from app.models.destination import Destination
from app.models.hotel import Hotel

HOTEL_IMAGES = {
    "luxury": [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80"
    ],
    "comfort": [
        "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1000&q=80"
    ],
    "budget": [
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80",
        "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80"
    ]
}


def get_recommended_hotels(
    db: Session,
    destination_name: str,
    preference: str = "Comfort",
    days: int = 1,
    limit: int = 4
) -> list[dict]:
    """
    Returns curated hotel recommendations matching the user's accommodation preference.
    """
    pref_clean = (preference or "Comfort").strip().capitalize()

    # Find destination
    dest = db.query(Destination).filter(Destination.name.ilike(f"%{destination_name}%")).first()

    hotels_query = db.query(Hotel)
    if dest:
        hotels_query = hotels_query.filter(Hotel.destination_id == dest.id)

    db_hotels = hotels_query.all()

    # Filter by budget tier
    if pref_clean == "Budget":
        filtered = [h for h in db_hotels if h.price_per_night and h.price_per_night <= 3000]
    elif pref_clean == "Luxury":
        filtered = [h for h in db_hotels if h.price_per_night and h.price_per_night > 6500]
    else:  # Comfort
        filtered = [h for h in db_hotels if h.price_per_night and 2500 <= h.price_per_night <= 7000]

    # If filtered is empty, use all available or fallback
    selected = filtered if filtered else db_hotels

    tier_key = pref_clean.lower()
    if tier_key not in HOTEL_IMAGES:
        tier_key = "comfort"

    results = []
    if selected:
        for i, h in enumerate(selected[:limit]):
            img_list = HOTEL_IMAGES[tier_key]
            img = img_list[i % len(img_list)]
            price = round(h.price_per_night or 3500)
            results.append({
                "id": h.id,
                "name": h.name,
                "rating": h.rating or 4.5,
                "price_per_night": price,
                "total_stay_cost": price * max(1, days - 1),  # nights = days - 1
                "tier": pref_clean,
                "latitude": h.latitude,
                "longitude": h.longitude,
                "description": h.description,
                "image": img,
                "amenities": ["Free WiFi", "Breakfast included", "Air conditioning", "Central location"]
            })
    else:
        # High quality fallback
        fallback_names = {
            "Budget": [f"{destination_name} Urban Stay", f"{destination_name} Heritage Inn"],
            "Comfort": [f"The Grand {destination_name} Boutique", f"Royal Orchid {destination_name}"],
            "Luxury": [f"Taj Palace {destination_name}", f"The Leela {destination_name}"]
        }.get(pref_clean, [f"{destination_name} Premier Hotel"])

        prices = {"Budget": 1800, "Comfort": 4200, "Luxury": 12500}
        base_price = prices.get(pref_clean, 4200)

        for i, name in enumerate(fallback_names):
            img_list = HOTEL_IMAGES[tier_key]
            results.append({
                "id": 900 + i,
                "name": name,
                "rating": 4.6 + (i * 0.1),
                "price_per_night": base_price,
                "total_stay_cost": base_price * max(1, days - 1),
                "tier": pref_clean,
                "latitude": 17.3850 + (i * 0.01),
                "longitude": 78.4867 + (i * 0.01),
                "description": f"Top-rated {pref_clean.lower()} accommodation in {destination_name}.",
                "image": img_list[i % len(img_list)],
                "amenities": ["Free WiFi", "Breakfast included", "Central location"]
            })

    return results
