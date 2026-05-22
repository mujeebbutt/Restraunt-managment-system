from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.stock import StockItem, StockAdjustment
from app.schemas.stock import StockItemCreate, StockItemUpdate, StockItemResponse, StockAdjustmentCreate, StockAdjustmentResponse
from app.services.auth_service import get_current_staff, Staff

router = APIRouter()

@router.get("/", response_model=List[StockItemResponse])
def list_stock(
    low_stock_only: bool = False,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    query = db.query(StockItem)
    if low_stock_only:
        query = query.filter(StockItem.quantity <= StockItem.low_stock_threshold)
    return query.order_by(StockItem.name).all()

@router.post("/", response_model=StockItemResponse, status_code=status.HTTP_201_CREATED)
def create_stock_item(
    item_data: StockItemCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can create stock items")
        
    new_item = StockItem(**item_data.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get("/{item_id}", response_model=StockItemResponse)
def get_stock_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return item

@router.put("/{item_id}", response_model=StockItemResponse)
def update_stock_item(
    item_id: int,
    item_data: StockItemUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can update stock items")
        
    item = db.query(StockItem).filter(StockItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
        
    for key, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item

@router.post("/adjustments", response_model=StockAdjustmentResponse, status_code=status.HTTP_201_CREATED)
def create_adjustment(
    adj_data: StockAdjustmentCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    item = db.query(StockItem).filter(StockItem.id == adj_data.stock_item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
        
    item.quantity += adj_data.quantity_change
    
    new_adj = StockAdjustment(
        stock_item_id=adj_data.stock_item_id,
        quantity_change=adj_data.quantity_change,
        reason=adj_data.reason,
        adjusted_by=adj_data.adjusted_by or current_staff.id
    )
    db.add(new_adj)
    db.commit()
    db.refresh(new_adj)
    return new_adj

@router.get("/adjustments/all", response_model=List[StockAdjustmentResponse])
def list_adjustments(
    stock_item_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    query = db.query(StockAdjustment)
    if stock_item_id is not None:
        query = query.filter(StockAdjustment.stock_item_id == stock_item_id)
    return query.order_by(StockAdjustment.adjusted_at.desc()).all()
