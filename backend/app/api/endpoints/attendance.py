from datetime import date, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attendance import Attendance
from app.models.staff import Staff
from app.models.shift import Shift
from app.schemas.attendance import AttendanceCreate, AttendanceResponse
from app.services.auth_service import get_current_staff

router = APIRouter()

@router.get("/today", response_model=List[AttendanceResponse])
def get_today_attendance(db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    today = date.today()
    records = (
        db.query(Attendance)
        .filter(Attendance.date == today)
        .order_by(Attendance.clock_in.desc())
        .all()
    )
    return records

@router.post("/mark", response_model=AttendanceResponse)
def mark_attendance(attendance: AttendanceCreate, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    # staff can mark only themselves unless manager
    if current_staff.role != "manager" and attendance.staff_id != current_staff.id:
        raise HTTPException(status_code=403, detail="Cannot clock in for another staff")
    staff = db.query(Staff).filter(Staff.id == attendance.staff_id, Staff.is_active == True).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    shift = db.query(Shift).filter(Shift.id == attendance.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    # ensure no active attendance for staff
    active = db.query(Attendance).filter(Attendance.staff_id == staff.id, Attendance.clock_out == None).first()
    if active:
        raise HTTPException(status_code=400, detail="Staff already clocked in")
    new_att = Attendance(
        staff_id=staff.id,
        shift_id=shift.id,
        clock_in=datetime.utcnow(),
        date=date.today()
    )
    db.add(new_att)
    db.commit()
    db.refresh(new_att)
    return new_att

@router.post("/clock-out", response_model=AttendanceResponse)
def clock_out(attendance: AttendanceCreate, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    if current_staff.role != "manager" and attendance.staff_id != current_staff.id:
        raise HTTPException(status_code=403, detail="Cannot clock out for another staff")
    active = (
        db.query(Attendance)
        .filter(Attendance.staff_id == attendance.staff_id, Attendance.clock_out == None)
        .first()
    )
    if not active:
        raise HTTPException(status_code=400, detail="No active clock‑in found")
    active.clock_out = datetime.utcnow()
    db.commit()
    db.refresh(active)
    return active

@router.post("/half-leave", response_model=AttendanceResponse)
def half_leave(attendance: AttendanceCreate, db: Session = Depends(get_db), current_staff: Staff = Depends(get_current_staff)):
    # Similar to clock_out but mark as half‑day leave
    if current_staff.role != "manager" and attendance.staff_id != current_staff.id:
        raise HTTPException(status_code=403, detail="Cannot set half‑leave for another staff")
    active = (
        db.query(Attendance)
        .filter(Attendance.staff_id == attendance.staff_id, Attendance.clock_out == None)
        .first()
    )
    if not active:
        raise HTTPException(status_code=400, detail="No active clock‑in found")
    active.clock_out = datetime.utcnow()
    # you could add a flag or note for half‑leave; for simplicity set a note
    active.notes = "Half‑day leave"
    db.commit()
    db.refresh(active)
    return active
