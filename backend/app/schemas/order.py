from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.staff import StaffResponse
from app.schemas.table import TableResponse

class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: float = Field(..., gt=0)
    variant_name: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)

class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    menu_item_id: Optional[int] = None
    name: str
    price: Decimal
    quantity: float
    variant_name: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    order_type: str = Field(..., pattern="^(dine_in|take_away)$")
    table_id: Optional[int] = None
    staff_id: Optional[int] = None
    customer_name: Optional[str] = Field(None, max_length=200)
    discount: Decimal = Field(Decimal("0.00"), ge=0.0)
    manager_pin: Optional[str] = None
    items: List[OrderItemCreate] = []

class OrderUpdate(BaseModel):
    order_type: Optional[str] = Field(None, pattern="^(dine_in|take_away)$")
    table_id: Optional[int] = None
    staff_id: Optional[int] = None
    customer_name: Optional[str] = Field(None, max_length=200)
    discount: Optional[Decimal] = Field(None, ge=0.0)
    manager_pin: Optional[str] = None
    items: Optional[List[OrderItemCreate]] = None

class OrderResponse(BaseModel):
    id: int
    order_number: str
    order_type: str
    table_id: Optional[int] = None
    staff_id: Optional[int] = None
    customer_name: Optional[str] = None
    status: str
    payment_method: Optional[str] = None
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    total: Decimal
    created_at: datetime
    paid_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    table: Optional[TableResponse] = None
    staff: Optional[StaffResponse] = None

    class Config:
        from_attributes = True

class OrderPayment(BaseModel):
    payment_method: str = Field(..., pattern="^(cash|card|online)$")
    discount: Optional[Decimal] = Field(None, ge=0.0)
    amount_paid: Optional[Decimal] = Field(None, ge=0.0)
    manager_pin: Optional[str] = None
