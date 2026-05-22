from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class StockItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    unit: str = Field(..., min_length=1, max_length=50)
    quantity: float = Field(0.0, ge=0.0)
    low_stock_threshold: float = Field(0.0, ge=0.0)
    menu_item_id: Optional[int] = None

class StockItemCreate(StockItemBase):
    pass

class StockItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    unit: Optional[str] = Field(None, min_length=1, max_length=50)
    quantity: Optional[float] = Field(None, ge=0.0)
    low_stock_threshold: Optional[float] = Field(None, ge=0.0)
    menu_item_id: Optional[int] = None

class StockItemResponse(StockItemBase):
    id: int

    class Config:
        from_attributes = True

class StockAdjustmentCreate(BaseModel):
    stock_item_id: int
    quantity_change: float
    reason: Optional[str] = Field(None, max_length=500)
    adjusted_by: Optional[int] = None

class StockAdjustmentResponse(BaseModel):
    id: int
    stock_item_id: int
    quantity_change: float
    reason: Optional[str] = None
    adjusted_at: datetime
    adjusted_by: Optional[int] = None

    class Config:
        from_attributes = True
