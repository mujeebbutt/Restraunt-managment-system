from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.core.database import Base


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="SET NULL"), nullable=True)
    shift_id = Column(Integer, ForeignKey("shifts.id", ondelete="SET NULL"), nullable=True)
    clock_in = Column(DateTime, default=datetime.utcnow, nullable=False)
    clock_out = Column(DateTime, nullable=True)
    date = Column(Date, default=datetime.utcnow, nullable=False)

    staff = relationship("Staff", backref="attendance_records")
    shift = relationship("Shift", backref="attendance_records")
