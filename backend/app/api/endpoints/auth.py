from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.staff import Staff
from app.schemas.auth import LoginRequest, TokenResponse, StaffTokenInfo
from app.services.auth_service import create_access_token

router = APIRouter()

@router.post("/login", response_model=TokenResponse)
def login(request_data: LoginRequest, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.pin == request_data.pin, Staff.is_active == True).first()
    if not staff:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN or inactive account",
        )
    
    token_data = {"sub": str(staff.id)}
    access_token = create_access_token(data=token_data)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        staff=StaffTokenInfo(id=staff.id, name=staff.name, role=staff.role)
    )
