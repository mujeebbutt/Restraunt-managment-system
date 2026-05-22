import os
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings

from app.core.database import get_db
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.schemas.menu_item import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from app.services.auth_service import get_current_staff, Staff

router = APIRouter()

# Categories Endpoints
@router.get("/categories", response_model=List[CategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    return db.query(Category).order_by(Category.sort_order).all()

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can create categories")
        
    new_cat = Category(**category_data.model_dump())
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    return new_cat

@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can update categories")
        
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    for key, value in category_data.model_dump(exclude_unset=True).items():
        setattr(cat, key, value)
        
    db.commit()
    db.refresh(cat)
    return cat

@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can delete categories")
        
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(cat)
    db.commit()
    return None

# Menu Items Endpoints
@router.get("/menu-items", response_model=List[MenuItemResponse])
def list_menu_items(
    category_id: Optional[int] = None,
    available_only: bool = False,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    query = db.query(MenuItem)
    if category_id is not None:
        query = query.filter(MenuItem.category_id == category_id)
    if available_only:
        query = query.filter(MenuItem.is_available == True)
        
    return query.order_by(MenuItem.sort_order).all()

@router.post("/menu-items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    item_data: MenuItemCreate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can create menu items")
        
    if item_data.category_id is not None:
        cat = db.query(Category).filter(Category.id == item_data.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
            
    new_item = MenuItem(**item_data.model_dump())
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/menu-items/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    item_data: MenuItemUpdate,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can update menu items")
        
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
        
    if item_data.category_id is not None:
        cat = db.query(Category).filter(Category.id == item_data.category_id).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Category not found")
            
    for key, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
        
    db.commit()
    db.refresh(item)
    return item

@router.delete("/menu-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can delete menu items")
        
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
        
    db.delete(item)
    db.commit()
    return None

@router.post("/menu-items/{item_id}/image", response_model=MenuItemResponse)
def upload_item_image(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_staff: Staff = Depends(get_current_staff)
):
    if current_staff.role != "manager":
        raise HTTPException(status_code=403, detail="Only managers can upload images")
        
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
        
    # Check file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp"]:
        raise HTTPException(status_code=400, detail="Only image files (.jpg, .jpeg, .png, .webp) are allowed")
        
    # Generate a unique file name
    file_name = f"item_{item_id}{ext}"
    file_path = os.path.join(settings.upload_dir, file_name)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update menu item image path
    item.image_path = f"/uploads/{file_name}"
    db.commit()
    db.refresh(item)
    return item
