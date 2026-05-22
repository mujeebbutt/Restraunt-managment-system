from decimal import Decimal
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.models.order import Order, OrderItem
from app.models.table import DiningTable
from app.models.menu_item import MenuItem
from app.models.stock import StockItem, StockAdjustment
from app.models.settings import Setting
from app.models.invoice import Invoice
from app.models.staff import Staff
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderPayment
from app.services.auth_service import get_current_staff, Staff as StaffSchema
from app.services.pdf_service import generate_invoice_pdf

router = APIRouter()

def recalculate_order_totals(order: Order, db: Session, tax_rate: Decimal):
    subtotal = Decimal("0.00")
    for item in order.items:
        subtotal += item.price * Decimal(str(item.quantity))
    
    order.subtotal = subtotal
    taxable_amount = max(Decimal("0.00"), subtotal - order.discount)
    order.tax = taxable_amount * tax_rate / Decimal("100.00")
    order.total = taxable_amount + order.tax

def verify_discount_auth(db: Session, discount: Decimal, subtotal: Decimal, manager_pin: Optional[str], current_staff):
    if discount > subtotal * Decimal("0.10"):
        if current_staff.role == "manager":
            return
        if not manager_pin:
            raise HTTPException(status_code=400, detail="Discount > 10% requires Manager PIN authorization")
        manager = db.query(Staff).filter(Staff.role == "manager", Staff.pin == manager_pin, Staff.is_active == True).first()
        if not manager:
            raise HTTPException(status_code=400, detail="Invalid Manager PIN for discount authorization")

@router.get("/", response_model=List[OrderResponse])
def list_orders(
    status: Optional[str] = None,
    order_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if order_type:
        query = query.filter(Order.order_type == order_type)
    return query.order_by(Order.created_at.desc()).all()

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_data: OrderCreate,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    tax_setting = db.query(Setting).filter(Setting.key == "tax_percent").first()
    tax_percent = Decimal(tax_setting.value) if tax_setting else Decimal(str(settings.tax_percent))
    
    new_order = Order(
        order_type=order_data.order_type,
        table_id=order_data.table_id,
        staff_id=order_data.staff_id or current_staff.id,
        customer_name=order_data.customer_name,
        discount=order_data.discount,
        status="open"
    )
    
    if order_data.order_type == "dine_in" and order_data.table_id:
        table = db.query(DiningTable).filter(DiningTable.id == order_data.table_id).first()
        if not table:
             raise HTTPException(status_code=404, detail="Dining Table not found")
        table.status = "pending"
        
    db.add(new_order)
    db.flush()
    
    subtotal = Decimal("0.00")
    for item_in in order_data.items:
        menu_item = db.query(MenuItem).filter(MenuItem.id == item_in.menu_item_id).first()
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item id {item_in.menu_item_id} not found")
        if not menu_item.is_available:
            raise HTTPException(status_code=400, detail=f"Menu item '{menu_item.name}' is currently unavailable")
            
        price = menu_item.price
        name = menu_item.name
        if item_in.variant_name:
            if not menu_item.variants or item_in.variant_name not in menu_item.variants:
                raise HTTPException(
                    status_code=400,
                    detail=f"Variant '{item_in.variant_name}' not found for item '{menu_item.name}'"
                )
            price = Decimal(str(menu_item.variants[item_in.variant_name]))
            name = f"{menu_item.name} ({item_in.variant_name})"

        order_item = OrderItem(
            order_id=new_order.id,
            menu_item_id=menu_item.id,
            name=name,
            price=price,
            quantity=item_in.quantity,
            variant_name=item_in.variant_name,
            notes=item_in.notes
        )
        db.add(order_item)
        subtotal += price * Decimal(str(item_in.quantity))
        
    verify_discount_auth(db, order_data.discount, subtotal, order_data.manager_pin, current_staff)
    new_order.subtotal = subtotal
    taxable_amount = max(Decimal("0.00"), subtotal - new_order.discount)
    new_order.tax = taxable_amount * tax_percent / Decimal("100.00")
    new_order.total = taxable_amount + new_order.tax
    
    db.commit()
    db.refresh(new_order)
    return new_order

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: int,
    order_data: OrderUpdate,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != "open":
        raise HTTPException(status_code=400, detail="Cannot modify a closed or cancelled order")
        
    tax_setting = db.query(Setting).filter(Setting.key == "tax_percent").first()
    tax_percent = Decimal(tax_setting.value) if tax_setting else Decimal(str(settings.tax_percent))
    
    if order_data.order_type is not None:
        if order.order_type == "dine_in" and order_data.order_type == "take_away" and order.table_id:
            table = db.query(DiningTable).filter(DiningTable.id == order.table_id).first()
            if table:
                table.status = "free"
            order.table_id = None
        order.order_type = order_data.order_type
        
    if order_data.table_id is not None:
        if order.table_id and order.table_id != order_data.table_id:
            old_table = db.query(DiningTable).filter(DiningTable.id == order.table_id).first()
            if old_table:
                old_table.status = "free"
        
        new_table = db.query(DiningTable).filter(DiningTable.id == order_data.table_id).first()
        if new_table:
            new_table.status = "pending"
        order.table_id = order_data.table_id
        
    if order_data.staff_id is not None:
        order.staff_id = order_data.staff_id
    if order_data.customer_name is not None:
        order.customer_name = order_data.customer_name
    if order_data.discount is not None:
        order.discount = order_data.discount
        
    if order_data.items is not None:
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        for item_in in order_data.items:
            menu_item = db.query(MenuItem).filter(MenuItem.id == item_in.menu_item_id).first()
            if not menu_item:
                raise HTTPException(status_code=404, detail=f"Menu item id {item_in.menu_item_id} not found")
            if not menu_item.is_available:
                raise HTTPException(status_code=400, detail=f"Menu item '{menu_item.name}' is currently unavailable")
            
            price = menu_item.price
            name = menu_item.name
            if item_in.variant_name:
                if not menu_item.variants or item_in.variant_name not in menu_item.variants:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Variant '{item_in.variant_name}' not found for item '{menu_item.name}'"
                    )
                price = Decimal(str(menu_item.variants[item_in.variant_name]))
                name = f"{menu_item.name} ({item_in.variant_name})"

            order_item = OrderItem(
                order_id=order.id,
                menu_item_id=menu_item.id,
                name=name,
                price=price,
                quantity=item_in.quantity,
                variant_name=item_in.variant_name,
                notes=item_in.notes
            )
            db.add(order_item)
            
    db.flush()
    recalculate_order_totals(order, db, tax_percent)
    verify_discount_auth(db, order.discount, order.subtotal, order_data.manager_pin, current_staff)
    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/pay", response_model=OrderResponse)
def pay_order(
    order_id: int,
    payment_data: OrderPayment,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.status != "open":
        raise HTTPException(status_code=400, detail="Order is already closed or cancelled")
        
    order.payment_method = payment_data.payment_method
    if payment_data.discount is not None:
        order.discount = payment_data.discount
        
    tax_setting = db.query(Setting).filter(Setting.key == "tax_percent").first()
    tax_percent = Decimal(tax_setting.value) if tax_setting else Decimal(str(settings.tax_percent))
    recalculate_order_totals(order, db, tax_percent)
    verify_discount_auth(db, order.discount, order.subtotal, payment_data.manager_pin, current_staff)
    
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    
    if order.order_type == "dine_in" and order.table_id:
        table = db.query(DiningTable).filter(DiningTable.id == order.table_id).first()
        if table:
            table.status = "free"
            
    for item in order.items:
        stock_items = db.query(StockItem).filter(StockItem.menu_item_id == item.menu_item_id).all()
        for stock_item in stock_items:
            qty_deduction = item.quantity
            stock_item.quantity -= qty_deduction
            
            adjustment = StockAdjustment(
                stock_item_id=stock_item.id,
                quantity_change=-qty_deduction,
                reason=f"Checkout of Order {order.order_number}",
                adjusted_at=datetime.utcnow(),
                adjusted_by=current_staff.id
            )
            db.add(adjustment)
            
    db.flush()
    
    shop_name_setting = db.query(Setting).filter(Setting.key == "shop_name").first()
    currency_setting = db.query(Setting).filter(Setting.key == "currency").first()
    
    shop_name = shop_name_setting.value if shop_name_setting else settings.app_name
    currency = currency_setting.value if currency_setting else settings.currency
    
    pdf_path = generate_invoice_pdf(
        order=order,
        shop_name=shop_name,
        currency=currency,
        tax_percent=float(tax_percent),
        invoice_dir=settings.invoice_dir,
        db=db
    )
    
    invoice = Invoice(
        order_id=order.id,
        invoice_number=order.order_number,
        pdf_path=pdf_path,
        created_at=datetime.utcnow(),
        is_reprinted=False
    )
    db.add(invoice)
    
    db.commit()
    db.refresh(order)
    return order

@router.post("/{order_id}/print-draft")
def print_draft_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    tax_setting = db.query(Setting).filter(Setting.key == "tax_percent").first()
    tax_percent = Decimal(tax_setting.value) if tax_setting else Decimal(str(settings.tax_percent))
    recalculate_order_totals(order, db, tax_percent)
    db.commit()
    
    shop_name_setting = db.query(Setting).filter(Setting.key == "shop_name").first()
    currency_setting = db.query(Setting).filter(Setting.key == "currency").first()
    
    shop_name = shop_name_setting.value if shop_name_setting else settings.app_name
    currency = currency_setting.value if currency_setting else settings.currency
    
    pdf_path = generate_invoice_pdf(
        order=order,
        shop_name=shop_name,
        currency=currency,
        tax_percent=float(tax_percent),
        invoice_dir=settings.invoice_dir,
        db=db
    )
    
    invoice = Invoice(
        order_id=order.id,
        invoice_number=order.order_number + "-DRAFT",
        pdf_path=pdf_path,
        created_at=datetime.utcnow(),
        is_reprinted=False
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    
    return {"message": "Draft generated", "invoice_id": invoice.id}
