"""
Seeds researched dish-level food data.

Additive and idempotent, matching the pattern the other seed scripts use: it
adds only what is missing and never drops or rewrites existing rows.

Dietary flags in `contains` describe what TRADITIONAL preparations commonly
include. They are advisory, not a guarantee about any particular kitchen - the
UI always pairs them with "confirm with the restaurant".
"""

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.core.database import SessionLocal
from app.models.destination import Destination
from app.models.food_item import FoodItem


HYDERABAD_FOOD = [
    # ---------------------------- STREET ----------------------------------
    {
        "name": "Irani Chai",
        "tier": "street",
        "category": "Beverage",
        "description": "Strong, slow-brewed tea cut with thickened milk, served in small glasses. The social ritual of the Old City.",
        "ingredients": ["black tea", "milk", "khoya (reduced milk)", "sugar"],
        "approx_price_min": 15, "approx_price_max": 40,
        "spice_level": 0,
        "is_vegetarian": True,
        "contains": ["dairy"],
        "preparation": "Tea decoction and milk are brewed separately for hours, then combined to order.",
        "where_to_find": "Irani cafes around Charminar - Nimrah Cafe, Cafe Bahar and the older Mozamjahi Market cafes.",
        "meal_time": "Early morning and again around 4-6 PM",
        "dietary_notes": "Heavily milk-based. Black tea is rarely offered at traditional Irani cafes, so ask first if you avoid dairy.",
    },
    {
        "name": "Osmania Biscuit",
        "tier": "street",
        "category": "Bakery",
        "description": "Slightly sweet-salty shortbread biscuit, made to be dunked in Irani chai.",
        "ingredients": ["wheat flour", "butter", "milk", "sugar", "cardamom"],
        "approx_price_min": 10, "approx_price_max": 30,
        "spice_level": 0,
        "is_vegetarian": True,
        "contains": ["dairy", "gluten", "egg"],
        "preparation": "Baked fresh through the day at Irani bakeries; best within a few hours of the batch.",
        "where_to_find": "Nimrah Cafe by Charminar, Karachi Bakery outlets, and most Irani cafes.",
        "meal_time": "With morning or evening chai",
        "dietary_notes": "Recipes differ - some bakeries use egg in the dough and some do not. Ask if it matters to you.",
    },
    {
        "name": "Mirchi Bajji",
        "tier": "street",
        "category": "Snack",
        "description": "Large green chilli slit, stuffed with tangy masala, dipped in gram-flour batter and deep fried.",
        "ingredients": ["green chilli", "gram flour", "tamarind", "sesame", "peanut", "spices"],
        "approx_price_min": 15, "approx_price_max": 40,
        "spice_level": 3,
        "is_vegetarian": True,
        "contains": ["nuts"],
        "preparation": "Fried to order; the stuffing is what carries the heat rather than the chilli itself.",
        "where_to_find": "Roadside carts citywide, and along Necklace Road in the evening.",
        "meal_time": "Evening snack, especially in the rain",
        "dietary_notes": "Genuinely hot for most visitors. The stuffing commonly includes peanut and sesame.",
    },
    {
        "name": "Lukhmi",
        "tier": "street",
        "category": "Snack",
        "description": "Square, flaky pastry filled with spiced minced meat. A Hyderabadi wedding staple sold as street food.",
        "ingredients": ["wheat flour", "minced mutton", "onion", "ginger", "garlic", "spices"],
        "approx_price_min": 25, "approx_price_max": 70,
        "spice_level": 2,
        "is_vegetarian": False,
        "contains": ["meat", "gluten"],
        "preparation": "Filled, folded and shallow-fried until the crust shatters.",
        "where_to_find": "Old City bakeries and snack counters near Charminar.",
        "meal_time": "Late afternoon and evening",
        "dietary_notes": "Vegetarian versions filled with paneer or vegetables exist but are not the traditional form.",
    },
    {
        "name": "Double Ka Meetha",
        "tier": "street",
        "category": "Dessert",
        "description": "Fried bread soaked in cardamom-scented sweetened milk, finished with nuts.",
        "ingredients": ["bread", "ghee", "milk", "sugar", "cardamom", "almonds", "cashews", "saffron"],
        "approx_price_min": 40, "approx_price_max": 120,
        "spice_level": 0,
        "is_vegetarian": True,
        "contains": ["dairy", "nuts", "gluten"],
        "preparation": "Bread slices fried in ghee, then steeped in reduced milk until saturated.",
        "where_to_find": "Sweet counters across the Old City and at most Hyderabadi restaurants.",
        "meal_time": "After a meal, or as an evening sweet",
        "dietary_notes": "Contains both dairy and tree nuts in essentially every version. Not suitable for a dairy-free diet.",
    },

    # ----------------------- LOCAL RESTAURANTS ----------------------------
    {
        "name": "Hyderabadi Kacchi Dum Biryani",
        "tier": "local",
        "category": "Main",
        "description": "The city's defining dish. Raw marinated meat and partly cooked basmati are sealed in a pot and steamed together so the rice absorbs the meat juices.",
        "ingredients": ["basmati rice", "mutton or chicken", "yoghurt", "fried onion", "saffron", "mint", "whole spices"],
        "approx_price_min": 250, "approx_price_max": 600,
        "spice_level": 3,
        "is_vegetarian": False,
        "contains": ["meat", "dairy"],
        "preparation": "Kacchi means the meat goes in raw - the pot is sealed with dough and cooked slowly over a low flame.",
        "where_to_find": "Paradise and Bawarchi for the well-known version; Shah Ghouse and Shadab in the Old City for a spicier, more traditional one.",
        "meal_time": "Lunch, traditionally the main meal",
        "dietary_notes": "Marinated in yoghurt, so it contains dairy. 'Veg biryani' is a separate dish cooked differently, not the same preparation without meat.",
    },
    {
        "name": "Mirchi Ka Salan",
        "tier": "local",
        "category": "Side",
        "description": "Long green chillies in a thick peanut, sesame and tamarind gravy. The standard accompaniment to biryani.",
        "ingredients": ["green chilli", "peanut", "sesame seed", "coconut", "tamarind", "curry leaves"],
        "approx_price_min": 80, "approx_price_max": 200,
        "spice_level": 3,
        "is_vegetarian": True,
        "contains": ["nuts"],
        "preparation": "Peanut, sesame and coconut are roasted and ground into the gravy base.",
        "where_to_find": "Served alongside biryani almost everywhere in the city.",
        "meal_time": "With lunch or dinner",
        "dietary_notes": "Peanut and sesame are structural to this dish, not optional garnishes. Avoid entirely with a nut or sesame allergy.",
    },
    {
        "name": "Bagara Baingan",
        "tier": "local",
        "category": "Main",
        "description": "Small aubergines simmered whole in a roasted peanut, sesame and tamarind gravy.",
        "ingredients": ["brinjal", "peanut", "sesame seed", "coconut", "tamarind", "onion", "spices"],
        "approx_price_min": 120, "approx_price_max": 280,
        "spice_level": 2,
        "is_vegetarian": True,
        "contains": ["nuts"],
        "preparation": "Aubergines are slit, fried, then simmered in the ground gravy so they soak it up.",
        "where_to_find": "Any Hyderabadi restaurant; a reliable vegetarian main.",
        "meal_time": "Lunch or dinner",
        "dietary_notes": "Vegetarian and usually vegan, though some kitchens finish it with ghee or cream - worth asking.",
    },
    {
        "name": "Haleem",
        "tier": "local",
        "category": "Main",
        "description": "Wheat, lentils and slow-pounded meat cooked for hours into a thick, savoury paste. Seasonal, not year-round.",
        "ingredients": ["cracked wheat", "lentils", "mutton", "ghee", "fried onion", "ginger", "lemon"],
        "approx_price_min": 150, "approx_price_max": 400,
        "spice_level": 2,
        "is_vegetarian": False,
        "contains": ["meat", "gluten", "dairy"],
        "preparation": "Cooked eight hours or more in large cauldrons and pounded until the meat breaks down completely.",
        "where_to_find": "Pista House, Shah Ghouse and Old City stalls - but only in season.",
        "meal_time": "Evening, to break the fast",
        "dietary_notes": "Traditionally sold during Ramadan only. Outside that month most places do not serve it, and what is available is often frozen. Check before planning a trip around it.",
    },
    {
        "name": "Qubani Ka Meetha",
        "tier": "local",
        "category": "Dessert",
        "description": "Dried apricots stewed down to a dark, glossy compote, usually served with cream or ice cream.",
        "ingredients": ["dried apricots", "sugar", "cream"],
        "approx_price_min": 80, "approx_price_max": 250,
        "spice_level": 0,
        "is_vegetarian": True,
        "contains": ["dairy", "nuts"],
        "preparation": "Apricots are soaked overnight, then simmered until they collapse into a thick compote.",
        "where_to_find": "Hyderabadi restaurants and wedding menus across the city.",
        "meal_time": "After dinner",
        "dietary_notes": "The compote itself is dairy-free, but it is usually served with cream - ask for it plain if you need to avoid dairy. Apricot kernels are sometimes included.",
    },
    {
        "name": "Pathar Ka Gosht",
        "tier": "local",
        "category": "Starter",
        "description": "Thin mutton slices cooked directly on a heated stone slab, which gives a distinctive char.",
        "ingredients": ["mutton", "raw papaya", "yoghurt", "ginger", "garlic", "spices"],
        "approx_price_min": 250, "approx_price_max": 500,
        "spice_level": 2,
        "is_vegetarian": False,
        "contains": ["meat", "dairy"],
        "preparation": "Tenderised with raw papaya, then seared on a granite slab rather than a grill.",
        "where_to_find": "Old City kebab houses and the larger Hyderabadi restaurants.",
        "meal_time": "Dinner starter",
        "dietary_notes": "Marinated in yoghurt, so it contains dairy.",
    },

    # --------------------------- PREMIUM ----------------------------------
    {
        "name": "Nizami Dastarkhwan (heritage tasting menu)",
        "tier": "premium",
        "category": "Tasting menu",
        "description": "A multi-course spread reconstructing the Nizam-era court kitchen, served at heritage properties.",
        "ingredients": ["seasonal - set by the kitchen"],
        "approx_price_min": 2500, "approx_price_max": 6000,
        "spice_level": 2,
        "is_vegetarian": None,
        "contains": ["dairy", "nuts"],
        "preparation": "Multi-course, usually requiring a reservation and often a dress code.",
        "where_to_find": "Taj Falaknuma Palace and other heritage hotel restaurants.",
        "meal_time": "Dinner, booked ahead",
        "dietary_notes": "Vegetarian menus are available on request at most properties. Flag allergies when you book rather than on arrival.",
    },
    {
        "name": "Dum Pukht Fine Dining",
        "tier": "premium",
        "category": "Main",
        "description": "Sealed-pot slow cooking taken to a formal restaurant setting, with richer, subtler gravies than the street version.",
        "ingredients": ["mutton or chicken", "cream", "saffron", "cashew paste", "whole spices"],
        "approx_price_min": 1200, "approx_price_max": 3500,
        "spice_level": 1,
        "is_vegetarian": None,
        "contains": ["meat", "dairy", "nuts"],
        "preparation": "Cooked and served in a dough-sealed pot, opened at the table.",
        "where_to_find": "Five-star hotel restaurants in Banjara Hills and the Hitec City corridor.",
        "meal_time": "Dinner",
        "dietary_notes": "Cashew paste and cream are common in these gravies. Vegetarian versions are usually offered.",
    },
]


GOA_FOOD = [
    {
        "name": "Goan Fish Curry Rice",
        "tier": "local",
        "category": "Main",
        "description": "Day's catch in a coconut and kokum gravy, served over par-boiled red rice.",
        "ingredients": ["fish", "coconut", "kokum", "red chilli", "tamarind", "red rice"],
        "approx_price_min": 180, "approx_price_max": 500,
        "spice_level": 2,
        "is_vegetarian": False,
        "contains": ["seafood"],
        "preparation": "Coconut-based gravy soured with kokum rather than tamarind alone.",
        "where_to_find": "Beach shacks and local canteens - the inland ones are usually cheaper and fresher.",
        "meal_time": "Lunch",
        "dietary_notes": "The fish changes with the catch. Ask what came in that morning.",
    },
    {
        "name": "Pork Vindaloo",
        "tier": "local",
        "category": "Main",
        "description": "Pork in a sharp vinegar and garlic gravy - the Portuguese-descended dish, far removed from the British curry-house version.",
        "ingredients": ["pork", "palm vinegar", "garlic", "kashmiri chilli", "spices"],
        "approx_price_min": 250, "approx_price_max": 600,
        "spice_level": 3,
        "is_vegetarian": False,
        "contains": ["meat"],
        "preparation": "Marinated in vinegar for a day or more before cooking.",
        "where_to_find": "Goan family-run restaurants, particularly in the Latin Quarter of Panaji.",
        "meal_time": "Lunch or dinner",
        "dietary_notes": "Contains pork, which matters for several dietary practices. Chicken versions are common.",
    },
    {
        "name": "Bebinca",
        "tier": "street",
        "category": "Dessert",
        "description": "Layered coconut and egg-yolk cake, baked one thin layer at a time.",
        "ingredients": ["coconut milk", "egg yolk", "flour", "ghee", "sugar", "nutmeg"],
        "approx_price_min": 60, "approx_price_max": 200,
        "spice_level": 0,
        "is_vegetarian": True,
        "contains": ["egg", "dairy", "gluten"],
        "preparation": "Traditionally seven to sixteen layers, each grilled before the next is poured.",
        "where_to_find": "Bakeries across Goa and most Goan restaurant dessert menus.",
        "meal_time": "After a meal",
        "dietary_notes": "Egg yolk is fundamental to this dish - there is no traditional egg-free version.",
    },
    {
        "name": "Beach Shack Seafood Platter",
        "tier": "premium",
        "category": "Main",
        "description": "Grilled prawns, kingfish, calamari and crab, priced by the day's catch.",
        "ingredients": ["mixed seafood", "recheado masala", "lime", "butter"],
        "approx_price_min": 1200, "approx_price_max": 3500,
        "spice_level": 2,
        "is_vegetarian": False,
        "contains": ["seafood", "dairy"],
        "preparation": "Grilled to order, usually with a recheado paste or simple butter-garlic.",
        "where_to_find": "Beachfront shacks in North and South Goa.",
        "meal_time": "Dinner at sunset",
        "dietary_notes": "Confirm the price by weight before ordering - platters are often billed per kilo rather than per plate.",
    },
]


JAIPUR_FOOD = [
    {
        "name": "Pyaaz Kachori",
        "tier": "street",
        "category": "Snack",
        "description": "Flaky fried pastry packed with spiced onion filling, usually eaten with tamarind chutney.",
        "ingredients": ["wheat flour", "onion", "gram flour", "fennel", "coriander", "spices"],
        "approx_price_min": 20, "approx_price_max": 60,
        "spice_level": 2,
        "is_vegetarian": True,
        "contains": ["gluten"],
        "preparation": "Deep fried slowly so the crust stays layered rather than hardening.",
        "where_to_find": "Rawat Mishthan Bhandar near the railway station is the best-known source.",
        "meal_time": "Breakfast or mid-morning",
        "dietary_notes": "Vegetarian, but fried in shared oil. Onion-heavy, which matters for some dietary practices.",
    },
    {
        "name": "Dal Baati Churma",
        "tier": "local",
        "category": "Main",
        "description": "Baked wheat balls broken into lentils and ghee, served with a sweet crushed-wheat churma.",
        "ingredients": ["wheat", "ghee", "lentils", "jaggery", "nuts"],
        "approx_price_min": 200, "approx_price_max": 500,
        "spice_level": 2,
        "is_vegetarian": True,
        "contains": ["gluten", "dairy", "nuts"],
        "preparation": "Baatis are baked or roasted, then dipped generously in ghee before serving.",
        "where_to_find": "Chokhi Dhani and traditional Rajasthani thali restaurants.",
        "meal_time": "Lunch - it is heavy for dinner",
        "dietary_notes": "Very ghee-heavy by design. Ask for less if you would rather it were lighter.",
    },
    {
        "name": "Laal Maas",
        "tier": "local",
        "category": "Main",
        "description": "Mutton in a fiery Mathania chilli and yoghurt gravy. A genuinely hot dish, not a mild one.",
        "ingredients": ["mutton", "mathania red chilli", "yoghurt", "garlic", "ghee"],
        "approx_price_min": 350, "approx_price_max": 800,
        "spice_level": 4,
        "is_vegetarian": False,
        "contains": ["meat", "dairy"],
        "preparation": "Slow-cooked with a large quantity of soaked red chillies.",
        "where_to_find": "Heritage restaurants and Rajasthani specialists across the city.",
        "meal_time": "Dinner",
        "dietary_notes": "Among the hottest dishes in Indian regional cooking. Most kitchens will reduce the heat if you ask when ordering.",
    },
    {
        "name": "Royal Rajasthani Thali",
        "tier": "premium",
        "category": "Tasting menu",
        "description": "Multi-course thali served in a heritage hotel setting, with unlimited refills.",
        "ingredients": ["seasonal - set by the kitchen"],
        "approx_price_min": 1500, "approx_price_max": 4000,
        "spice_level": 2,
        "is_vegetarian": None,
        "contains": ["dairy", "gluten", "nuts"],
        "preparation": "Served in courses across many small bowls.",
        "where_to_find": "Heritage hotel restaurants around the old walled city.",
        "meal_time": "Dinner, booked ahead",
        "dietary_notes": "Pure-vegetarian thalis are the norm in Rajasthan. Flag allergies when booking.",
    },
]


def seed_food():
    db = SessionLocal()
    try:
        by_city = {
            "Hyderabad": HYDERABAD_FOOD,
            "Goa": GOA_FOOD,
            "Jaipur": JAIPUR_FOOD,
        }

        added = 0
        skipped = 0

        for city_name, dishes in by_city.items():
            destination = (
                db.query(Destination)
                .filter(Destination.name == city_name)
                .first()
            )
            if not destination:
                print(f"  Destination '{city_name}' not found - run seed.py first. Skipping.")
                continue

            for dish in dishes:
                exists = (
                    db.query(FoodItem)
                    .filter(
                        FoodItem.destination_id == destination.id,
                        FoodItem.name == dish["name"],
                    )
                    .first()
                )
                if exists:
                    skipped += 1
                    continue

                db.add(FoodItem(destination_id=destination.id, **dish))
                added += 1

        db.commit()
        total = db.query(FoodItem).count()
        print(f"FOOD SEEDING SUCCESSFUL: added {added}, already present {skipped}. Total: {total}.")

    except Exception as e:
        db.rollback()
        print("ERROR seeding food:", e)
    finally:
        db.close()


if __name__ == "__main__":
    seed_food()
