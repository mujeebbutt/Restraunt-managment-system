from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel

class InvoiceOrderInfo(BaseModel):
    id: int
    order_number: str

    class Config:
        from_attributes = True

class InvoiceResponse(BaseModel):
    id: int
    order_id: int
    invoice_number: str
    pdf_path: Optional[str] = None
    created_at: datetime
    is_reprinted: bool
    
    # Expose order details
    payment_method: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    total: Optional[Decimal] = None
    order: Optional[InvoiceOrderInfo] = None

    class Config:
        from_attributes = True
