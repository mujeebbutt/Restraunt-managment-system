from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String

from app.core.database import Base


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    role = Column(
        Enum("manager", "waiter", "cashier", name="staff_role"),
        nullable=False,
    )
    pin = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
