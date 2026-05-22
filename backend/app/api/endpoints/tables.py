from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.table import DiningTable
from app.schemas.table import TableCreate, TableUpdate, TableResponse
from app.services.auth_service import get_current_staff, Staff

router = APIRouter()

@router.get("/", response_model=List[TableResponse])
def list_tables(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    return db.query(DiningTable).order_by(DiningTable.sort_order).all()

@router.post("/", response_model=TableResponse, status_code=status.HTTP_201_CREATED)
def create_table(
    table_data: TableCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can create tables")
    
    new_table = DiningTable(**table_data.model_dump())
    db.add(new_table)
    db.commit()
    db.refresh(new_table)
    return new_table

@router.get("/{table_id}", response_model=TableResponse)
def get_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    table = db.query(DiningTable).filter(DiningTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table

@router.put("/{table_id}", response_model=TableResponse)
def update_table(
    table_id: int,
    table_data: TableUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    table = db.query(DiningTable).filter(DiningTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    if current_staff.role != "manager" and any(k != "status" for k, v in table_data.model_dump(exclude_unset=True).items()):
         raise HTTPException(status_code=403, detail="Waiters and cashiers can only update table status")
         
    for key, value in table_data.model_dump(exclude_unset=True).items():
        setattr(table, key, value)
        
    db.commit()
    db.refresh(table)
    return table

@router.delete("/{table_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can delete tables")
        
    table = db.query(DiningTable).filter(DiningTable.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
        
    db.delete(table)
    db.commit()
    return None
