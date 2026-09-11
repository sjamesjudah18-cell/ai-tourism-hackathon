import os
import json
from dotenv import load_dotenv
from google import genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PRIMARY_MODEL = "gemini-3.6-flash"


def get_genai_client():
    if not GEMINI_API_KEY:
        return None
    try:
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print("Warning: Could not initialize Gemini client:", e)
        return None


def enrich_itinerary_with_ai(
    destination: str,
    number_of_days: int,
    total_budget: float,
    interests: list[str],
    itinerary_days: list[dict]
) -> dict:
    """
    Enriches structured itinerary with an AI narrative, local insider tips,
    and cultural etiquette using Gemini 3.6 Flash.
    """
    client = get_genai_client()
    interests_str = ", ".join(interests) if interests else "general sightseeing, food and culture"

    # Quick overview of planned activities for grounding
    activities_summary = []
    for d in itinerary_days:
        acts = [a.get("name") or a.get("place_name") for a in d.get("activities", [])]
        activities_summary.append(f"Day {d.get('day')}: {', '.join(filter(None, acts))}")
    activities_context = "\n".join(activities_summary)

    prompt = f"""You are a luxury travel curator and expert local guide for {destination}, India.
A traveler has planned a {number_of_days}-day journey with a budget of ₹{total_budget:,.0f}.
Their interests are: {interests_str}.

Here is their confirmed structured route:
{activities_context}

Provide a JSON object with:
1. "trip_tagline": A catchy 6-10 word editorial tagline.
2. "ai_summary": A 2-3 sentence inspiring travel overview personalized to their interests.
3. "insider_tips": A list of 3 concise, practical insider tips (e.g. best times to visit, local customs, photo spots).
4. "culinary_highlights": A list of 2 must-try authentic dishes/drinks for this destination.
5. "local_etiquette": One brief sentence on respectful local customs.

Return ONLY raw JSON with no markdown backticks, no markdown code fence."""

    if client:
        try:
            response = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=prompt
            )
            text = response.text.strip()
            # Clean possible markdown formatting
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            parsed = json.loads(text)
            return {
                "trip_tagline": parsed.get("trip_tagline", f"Discover the Soul of {destination}"),
                "ai_summary": parsed.get("ai_summary", f"An immersive {number_of_days}-day journey tailored around {interests_str}."),
                "insider_tips": parsed.get("insider_tips", [
                    f"Start mornings early before 10 AM to beat peak tourist rush.",
                    f"Carry cash for local markets and auto-rickshaw fares.",
                    f"Try authentic local eateries near the heritage quarters."
                ]),
                "culinary_highlights": parsed.get("culinary_highlights", ["Traditional regional specialties", "Local tea and snacks"]),
                "local_etiquette": parsed.get("local_etiquette", "Dress modestly when visiting active heritage and religious sites."),
                "ai_powered": True
            }
        except Exception as e:
            print("Gemini itinerary enrichment fallback triggered:", e)

    # Deterministic fallback
    return {
        "trip_tagline": f"Experience the Heritage, Flavors & Vibrancy of {destination}",
        "ai_summary": f"Your personalized {number_of_days}-day adventure across {destination} brings together iconic landmarks, authentic local food, and scenic spots optimized to your ₹{total_budget:,.0f} budget.",
        "insider_tips": [
            f"Explore historic monuments in the morning between 8:30 AM and 11 AM to enjoy pleasant weather and fewer crowds.",
            f"Keep a UPI app and small cash notes handy for local artisan bazaars and street stalls.",
            f"Sunset is the best time for photography and lakeside promenades."
        ],
        "culinary_highlights": [
            f"Signature local delicacies and street street food in {destination}'s oldest quarters",
            "Artisanal regional chai and freshly baked evening refreshments"
        ],
        "local_etiquette": "Dress comfortably and remove footwear before entering heritage sanctuaries and sacred courtyards.",
        "ai_powered": False
    }


def handle_assistant_chat(
    message: str,
    trip_context: dict = None,
    history: list[dict] = None
) -> dict:
    """
    Handles conversational travel assistant queries with Gemini 3.6 Flash.
    Returns reply, actionable suggestions, and optional modification intent.
    """
    client = get_genai_client()
    trip_context = trip_context or {}
    dest = trip_context.get("destination", "your destination")
    days = trip_context.get("days", 3)
    budget = trip_context.get("budget", 20000)
    interests = trip_context.get("interests", [])

    system_prompt = f"""You are the SmartTourism AI Travel Concierge, a knowledgeable, concise, and helpful travel companion for tourists in India.
Current User Trip Context:
- Destination: {dest}
- Duration: {days} days
- Budget: ₹{budget:,.0f}
- Interests: {', '.join(interests) if interests else 'General sightseeing'}

Respond directly to the user's question or request in 2-4 friendly, informative sentences.
If they ask to modify their trip (e.g. make it cheaper, add food, relax pace, suggest places), provide concrete recommendations tailored to {dest}.
Always offer 2-3 quick follow-up suggested questions or actions for the user.

Format your response as a JSON object:
{{
  "reply": "Your conversational answer here...",
  "suggested_actions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
  "intent": "general_info" | "budget_reduction" | "add_food" | "relax_schedule" | "weather_inquiry"
}}
Return ONLY raw JSON, no code fences."""

    user_query = f"User asks: {message}"

    if client:
        try:
            response = client.models.generate_content(
                model=PRIMARY_MODEL,
                contents=f"{system_prompt}\n\n{user_query}"
            )
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            parsed = json.loads(text)
            return {
                "reply": parsed.get("reply", "I'm here to help tailor your trip to perfection!"),
                "suggested_actions": parsed.get("suggested_actions", [
                    "What are the best dinner spots?",
                    "How can I save ₹2,000 on hotels?",
                    "What is the best transport option?"
                ]),
                "intent": parsed.get("intent", "general_info")
            }
        except Exception as e:
            print("Gemini assistant chat fallback triggered:", e)

    # High quality fallback
    msg_lower = message.lower()
    if "cheap" in msg_lower or "budget" in msg_lower or "reduce" in msg_lower or "save" in msg_lower:
        return {
            "reply": f"To optimize your budget in {dest}, consider opting for Comfort or Budget heritage stays which can save up to 40% on accommodation. Using the local metro or auto-rickshaws for short transit between clustered attractions will easily keep daily transit under ₹300!",
            "suggested_actions": ["Show budget hotels", "View low-cost activities", "Rebalance daily budget"],
            "intent": "budget_reduction"
        }
    elif "food" in msg_lower or "restaurant" in msg_lower or "veg" in msg_lower or "biryani" in msg_lower or "eat" in msg_lower:
        return {
            "reply": f"{dest} is world-renowned for its culinary culture! Don't miss stopping by authentic local eateries in the heritage district for breakfast, and enjoying traditional dining in the evening. There are abundant pure-vegetarian and multi-cuisine options available across all main hubs.",
            "suggested_actions": ["Show top food spots", "Vegetarian food guide", "Evening street food spots"],
            "intent": "add_food"
        }
    elif "weather" in msg_lower or "rain" in msg_lower or "temp" in msg_lower:
        return {
            "reply": f"The climate in {dest} is generally warm and pleasant during daytime, cooling down nicely after sunset. We recommend exploring monuments in the morning and enjoying indoor museums or breezy promenades in the afternoon.",
            "suggested_actions": ["View 3-day forecast", "What should I pack?", "Best time for photography"],
            "intent": "weather_inquiry"
        }
    else:
        return {
            "reply": f"I've tailored your itinerary in {dest} to maximize your time while keeping travel distances minimal. Feel free to ask about modifying activities, finding local food, or getting transport tips!",
            "suggested_actions": ["Make Day 2 cheaper", "Add more food experiences", "What should I pack?"],
            "intent": "general_info"
        }
