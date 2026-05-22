from datetime import time

from sqlalchemy import Column, ForeignKey, Integer, String, Table, Time
from sqlalchemy.orm import relationship

from app.core.database import Base

shift_staff = Table(
    "shift_staff",
    Base.metadata,
    Column("shift_id", Integer, ForeignKey("shifts.id", ondelete="CASCADE"), primary_key=True),
    Column("staff_id", Integer, ForeignKey("staff.id", ondelete="CASCADE"), primary_key=True),
)


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    staff = relationship("Staff", secondary=shift_staff, backref="shifts")
