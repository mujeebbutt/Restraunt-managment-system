from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.category import CategoryResponse

class MenuItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: Decimal = Field(..., gt=0.0)
    category_id: Optional[int] = None
    image_path: Optional[str] = Field(None, max_length=500)
    is_available: bool = True
    sort_order: int = 0
    variants: Optional[dict] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    price: Optional[Decimal] = Field(None, gt=0.0)
    category_id: Optional[int] = None
    image_path: Optional[str] = Field(None, max_length=500)
    is_available: Optional[bool] = None
    sort_order: Optional[int] = None
    variants: Optional[dict] = None

class MenuItemResponse(MenuItemBase):
    id: int
    category: Optional[CategoryResponse] = None

    class Config:
        from_attributes = True
