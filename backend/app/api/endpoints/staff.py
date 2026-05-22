from datetime import datetime, date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.staff import Staff
from app.models.attendance import Attendance
from app.models.shift import Shift
from app.schemas.staff import StaffCreate, StaffUpdate, StaffResponse, AttendanceCreate, AttendanceResponse
from app.services.auth_service import get_current_staff

router = APIRouter()

def verify_manager(current_staff: Staff = Depends(get_current_staff)):
    if current_staff.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation restricted to manager role only",
        )
    return current_staff

# Staff CRUD
@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    staff_data: StaffCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(verify_manager)
):
    existing = db.query(Staff).filter(Staff.pin == staff_data.pin).first()
    if existing:
        raise HTTPException(status_code=400, detail="PIN must be unique")
    
    new_staff = Staff(
        name=staff_data.name,
        role=staff_data.role,
        pin=staff_data.pin,
        is_active=staff_data.is_active
    )
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return new_staff

@router.get("/", response_model=List[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    return db.query(Staff).all()

@router.get("/attendance/history")
def get_attendance_history(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    records = db.query(Attendance).order_by(Attendance.clock_in.desc()).all()
    result = []
    for r in records:
        if not r.staff or not r.shift:
            continue
            
        result.append({
            "id": r.id,
            "staff_id": r.staff_id,
            "staff_name": r.staff.name,
            "shift_id": r.shift_id,
            "shift_name": r.shift.name,
            "clock_in": r.clock_in.isoformat() if r.clock_in else None,
            "clock_out": r.clock_out.isoformat() if r.clock_out else None,
            "date": r.date.isoformat() if r.date else None
        })
    return result

@router.get("/{staff_id}", response_model=StaffResponse)
def get_staff_by_id(
    staff_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return staff

@router.put("/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: int,
    staff_data: StaffUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(verify_manager)
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    
    if staff_data.pin is not None:
        existing = db.query(Staff).filter(Staff.pin == staff_data.pin, Staff.id != staff_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="PIN must be unique")
        staff.pin = staff_data.pin
        
    if staff_data.name is not None:
        staff.name = staff_data.name
    if staff_data.role is not None:
        staff.role = staff_data.role
    if staff_data.is_active is not None:
        staff.is_active = staff_data.is_active
        
    db.commit()
    db.refresh(staff)
    return staff

# Attendance Endpoints
@router.post("/attendance/clock-in", response_model=AttendanceResponse)
def clock_in(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.id != attendance_data.staff_id and current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Cannot clock in for another staff member")
    
    staff = db.query(Staff).filter(Staff.id == attendance_data.staff_id, Staff.is_active == True).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Active staff not found")
        
    shift = db.query(Shift).filter(Shift.id == attendance_data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    active_attendance = db.query(Attendance).filter(
        Attendance.staff_id == staff.id,
        Attendance.clock_out == None
    ).first()
    if active_attendance:
        raise HTTPException(status_code=400, detail="Staff is already clocked in")
        
    new_attendance = Attendance(
        staff_id=staff.id,
        shift_id=shift.id,
        clock_in=datetime.utcnow(),
        date=date.today()
    )
    db.add(new_attendance)
    db.commit()
    db.refresh(new_attendance)
    return new_attendance

@router.post("/attendance/clock-out", response_model=AttendanceResponse)
def clock_out(
    attendance_data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    staff_id = attendance_data.staff_id
    if current_staff.id != staff_id and current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Cannot clock out for another staff member")
        
    active_attendance = db.query(Attendance).filter(
        Attendance.staff_id == staff_id,
        Attendance.clock_out == None
    ).first()
    
    if not active_attendance:
        raise HTTPException(status_code=400, detail="No active clock-in session found for this staff member")
        
    active_attendance.clock_out = datetime.utcnow()
    db.commit()
    db.refresh(active_attendance)
    return active_attendance

@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(
    staff_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(verify_manager)
):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    db.delete(staff)
    db.commit()
    return None
