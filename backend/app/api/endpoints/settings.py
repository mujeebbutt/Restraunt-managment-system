import os
import shutil
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings as app_settings
from app.models.settings import Setting
from app.schemas.settings import SettingUpdate, SettingResponse
from app.services.auth_service import get_current_staff, Staff

router = APIRouter()

@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    public_keys = ["shop_name", "logo_path", "tagline", "phone", "address", "currency", "theme_color"]
    settings = db.query(Setting).filter(Setting.key.in_(public_keys)).all()
    # Default fallback values if settings not found
    settings_dict = {
        "shop_name": "HFC POS System",
        "logo_path": "",
        "tagline": "Premium Quality Food",
        "currency": "PKR",
        "theme_color": "#0f172a"
    }
    for s in settings:
        settings_dict[s.key] = s.value
    return settings_dict

@router.get("/", response_model=List[SettingResponse])
def list_settings(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    return db.query(Setting).all()

@router.put("/{key}", response_model=SettingResponse)
def update_setting(
    key: str,
    setting_data: SettingUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can update settings")
        
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value=setting_data.value)
        db.add(setting)
    else:
        setting.value = setting_data.value
    db.commit()
    db.refresh(setting)
    return setting

@router.post("/logo")
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can upload logo")
        
    os.makedirs(app_settings.upload_dir, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"logo_{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = os.path.join(app_settings.upload_dir, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    logo_path_val = f"uploads/{filename}"
    
    # Update logo_path setting in DB
    setting = db.query(Setting).filter(Setting.key == "logo_path").first()
    if not setting:
        setting = Setting(key="logo_path", value=logo_path_val)
        db.add(setting)
    else:
        setting.value = logo_path_val
    db.commit()
    db.refresh(setting)
    return {"logo_path": logo_path_val}

@router.post("/reset")
def reset_database(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can reset the database")
        
    try:
        from app.core.database import Base, engine
        from app.core.init_db import init_db
        # Drop all tables and recreate them
        Base.metadata.drop_all(bind=engine)
        init_db()
        return {"status": "success", "message": "Database reset and seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database reset failed: {str(e)}")
