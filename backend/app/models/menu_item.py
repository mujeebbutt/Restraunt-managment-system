from sqlalchemy import Boolean, Column, Float, ForeignKey, Integer, Numeric, String, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(String(1000), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    image_path = Column(String(500), nullable=True)
    is_available = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    variants = Column(JSON, nullable=True)

    category = relationship("Category", backref="menu_items")
