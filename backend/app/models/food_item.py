from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from app.core.database import Base


class FoodItem(Base):
    """
    A dish a traveller might actually order, with the detail that decides
    whether they can.

    Dietary fields are deliberately advisory: `contains` records what
    traditional preparations commonly include, not a guarantee about any
    particular kitchen. Recipes vary between restaurants, so the UI always
    pairs these with "confirm with the restaurant".
    """

    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)

    destination_id = Column(
        Integer,
        ForeignKey("destinations.id"),
        nullable=True,
        index=True,
    )

    name = Column(String(150), nullable=False)

    # street | local | premium - the three price/formality tiers we show.
    tier = Column(String(20), nullable=False, default="local")

    category = Column(String(80), nullable=True)
    description = Column(Text, nullable=True)

    ingredients = Column(JSONB, nullable=True)

    approx_price_min = Column(Float, nullable=True)
    approx_price_max = Column(Float, nullable=True)

    # 0 = not spicy, 1 = mild, 2 = medium, 3 = hot, 4 = very hot
    spice_level = Column(Integer, nullable=True)

    is_vegetarian = Column(Boolean, nullable=True)

    # Advisory dietary flags commonly present in traditional preparations,
    # e.g. ["dairy", "nuts", "egg"].
    contains = Column(JSONB, nullable=True)

    preparation = Column(Text, nullable=True)
    where_to_find = Column(Text, nullable=True)
    meal_time = Column(String(80), nullable=True)
    dietary_notes = Column(Text, nullable=True)
