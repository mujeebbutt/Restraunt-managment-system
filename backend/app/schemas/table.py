from typing import Optional
from pydantic import BaseModel, Field

class DiningTableBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    capacity: int = Field(..., gt=0)
    shape: str = Field("square", pattern="^(square|round|rectangle)$")
    section: Optional[str] = Field(None, max_length=100)
    status: str = Field("free", pattern="^(free|occupied|pending|reserved)$")
    sort_order: int = 0

class TableCreate(DiningTableBase):
    pass

class TableUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    capacity: Optional[int] = Field(None, gt=0)
    shape: Optional[str] = Field(None, pattern="^(square|round|rectangle)$")
    section: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = Field(None, pattern="^(free|occupied|pending|reserved)$")
    sort_order: Optional[int] = None

class TableResponse(DiningTableBase):
    id: int

    class Config:
        from_attributes = True
