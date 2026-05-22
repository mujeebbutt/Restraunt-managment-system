from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import time

class ShiftBase(BaseModel):
    name: str = Field(..., max_length=100)
    start_time: str = Field(..., description="Start time in HH:MM format")
    end_time: str = Field(..., description="End time in HH:MM format")

class ShiftCreate(ShiftBase):
    staff_ids: Optional[List[int]] = None

class ShiftUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    staff_ids: Optional[List[int]] = None

class StaffMiniResponse(BaseModel):
    id: int
    name: str
    role: str

    class Config:
        from_attributes = True

class ShiftResponse(BaseModel):
    id: int
    name: str
    start_time: time
    end_time: time
    staff: List[StaffMiniResponse] = []

    class Config:
        from_attributes = True
