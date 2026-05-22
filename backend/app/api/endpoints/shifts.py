from typing import List
from datetime import datetime, time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.shift import Shift
from app.models.staff import Staff
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftResponse
from app.services.auth_service import get_current_staff, Staff as StaffSchema

router = APIRouter()

def parse_time_str(time_str: str) -> time:
    try:
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format '{time_str}'. Must be HH:MM"
        )

@router.get("/", response_model=List[ShiftResponse])
def list_shifts(
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    return db.query(Shift).all()

@router.post("/", response_model=ShiftResponse, status_code=status.HTTP_201_CREATED)
def create_shift(
    shift_data: ShiftCreate,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can manage shifts")
        
    start_time_val = parse_time_str(shift_data.start_time)
    end_time_val = parse_time_str(shift_data.end_time)
    
    new_shift = Shift(
        name=shift_data.name,
        start_time=start_time_val,
        end_time=end_time_val
    )
    
    if shift_data.staff_ids is not None:
        staff_members = db.query(Staff).filter(Staff.id.in_(shift_data.staff_ids)).all()
        new_shift.staff = staff_members
        
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return new_shift

@router.put("/{shift_id}", response_model=ShiftResponse)
def update_shift(
    shift_id: int,
    shift_data: ShiftUpdate,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can manage shifts")
        
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    if shift_data.name is not None:
        shift.name = shift_data.name
    if shift_data.start_time is not None:
        shift.start_time = parse_time_str(shift_data.start_time)
    if shift_data.end_time is not None:
        shift.end_time = parse_time_str(shift_data.end_time)
        
    if shift_data.staff_ids is not None:
        staff_members = db.query(Staff).filter(Staff.id.in_(shift_data.staff_ids)).all()
        shift.staff = staff_members
        
    db.commit()
    db.refresh(shift)
    return shift

@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    current_staff: StaffSchema = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can manage shifts")
        
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    db.delete(shift)
    db.commit()
    return None
