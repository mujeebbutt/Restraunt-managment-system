from typing import List
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceResponse
from app.services.auth_service import get_current_staff, Staff

router = APIRouter()

@router.get("/", response_model=List[InvoiceResponse])
def list_invoices(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    return db.query(Invoice).order_by(Invoice.created_at.desc()).all()

@router.get("/{invoice_id}/pdf")
def get_invoice_pdf(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    invoice = db.query(Invoice).filter((Invoice.id == invoice_id) | (Invoice.order_id == invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if not invoice.pdf_path or not os.path.exists(invoice.pdf_path):
        raise HTTPException(status_code=404, detail="Invoice PDF file does not exist on disk")
        
    return FileResponse(
        invoice.pdf_path,
        media_type="application/pdf",
        filename=os.path.basename(invoice.pdf_path)
    )

@router.post("/{invoice_id}/reprint", response_model=InvoiceResponse)
def reprint_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    invoice = db.query(Invoice).filter((Invoice.id == invoice_id) | (Invoice.order_id == invoice_id)).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.is_reprinted = True
    db.commit()
    db.refresh(invoice)
    return invoice
