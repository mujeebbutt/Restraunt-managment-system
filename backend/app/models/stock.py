from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class StockItem(Base):
    __tablename__ = "stock_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    unit = Column(String(50), nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    low_stock_threshold = Column(Float, default=0.0, nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)

    menu_item = relationship("MenuItem", backref="stock_items")
    adjustments = relationship("StockAdjustment", back_populates="stock_item", cascade="all, delete-orphan")


class StockAdjustment(Base):
    __tablename__ = "stock_adjustments"

    id = Column(Integer, primary_key=True, index=True)
    stock_item_id = Column(Integer, ForeignKey("stock_items.id", ondelete="CASCADE"), nullable=False)
    quantity_change = Column(Float, nullable=False)
    reason = Column(String(500), nullable=True)
    adjusted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    adjusted_by = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)

    stock_item = relationship("StockItem", back_populates="adjustments")
