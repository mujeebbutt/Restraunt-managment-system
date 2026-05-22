from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    event,
    func,
    select,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(100), unique=True, nullable=False, index=True)
    order_type = Column(
        Enum("dine_in", "take_away", name="order_type"),
        nullable=False,
    )
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="SET NULL"), nullable=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    customer_name = Column(String(200), nullable=True)
    status = Column(
        Enum("open", "paid", "cancelled", name="order_status"),
        nullable=False,
        default="open",
    )
    payment_method = Column(
        Enum("cash", "card", "online", name="payment_method"),
        nullable=True,
    )
    subtotal = Column(Numeric(10, 2), default=0.0, nullable=False)
    discount = Column(Numeric(10, 2), default=0.0, nullable=False)
    tax = Column(Numeric(10, 2), default=0.0, nullable=False)
    total = Column(Numeric(10, 2), default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at = Column(DateTime, nullable=True)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    table = relationship("DiningTable", backref="orders")
    staff = relationship("Staff", backref="orders")


@event.listens_for(Order, "before_insert")
def generate_order_number(mapper, connection, target):
    if target.order_number:
        return
    prefix = "INV"
    highest_id = connection.execute(select(func.max(Order.id))).scalar()
    next_index = (highest_id or 0) + 1
    target.order_number = f"{prefix}-{next_index:04d}"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(200), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Float, default=1.0, nullable=False)
    variant_name = Column(String(100), nullable=True)
    notes = Column(String(500), nullable=True)

    order = relationship("Order", back_populates="items")
