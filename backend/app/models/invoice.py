from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(100), nullable=False)
    pdf_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_reprinted = Column(Boolean, default=False, nullable=False)

    order = relationship("Order", backref="invoice")

    @property
    def payment_method(self):
        return self.order.payment_method if self.order else None

    @property
    def subtotal(self):
        return self.order.subtotal if self.order else None

    @property
    def tax(self):
        return self.order.tax if self.order else None

    @property
    def total(self):
        return self.order.total if self.order else None
