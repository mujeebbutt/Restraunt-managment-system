from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel, Field

class StaffBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    role: str = Field(..., pattern="^(manager|waiter|cashier)$")
    is_active: bool = True

class StaffCreate(StaffBase):
    pin: str = Field(..., min_length=4, max_length=100)

class StaffUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    role: Optional[str] = Field(None, pattern="^(manager|waiter|cashier)$")
    pin: Optional[str] = Field(None, min_length=4, max_length=100)
    is_active: Optional[bool] = None

class StaffResponse(StaffBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class AttendanceBase(BaseModel):
    staff_id: int
    shift_id: int

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceResponse(AttendanceBase):
    id: int
    clock_in: datetime
    clock_out: Optional[datetime] = None
    date: date

    class Config:
        from_attributes = True
