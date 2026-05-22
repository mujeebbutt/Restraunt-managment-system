import os
import sys
from decimal import Decimal
from pathlib import Path
from fastapi.testclient import TestClient

# Add current directory to path
sys.path.append(str(Path(__file__).resolve().parent))

from app.main import app
from app.core.database import SessionLocal
from app.models.staff import Staff
from app.core.init_db import init_db

def setup_test_data():
    from app.core.database import Base, engine
    # Drop all tables first for a clean state
    Base.metadata.drop_all(bind=engine)
    
    # Initialize DB (creates tables, seeds settings, tables, shifts)
    init_db()

def run_tests():
    print("Setting up test database...")
    setup_test_data()
    
    client = TestClient(app)
    
    # Test 1: Health check
    print("\n[Test 1] Health check...")
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    print("Health check OK!")
    
    # Test 2: PIN Auth Login
    print("\n[Test 2] Auth Login...")
    response = client.post("/api/auth/login", json={"pin": "mujeeb123"})
    assert response.status_code == 200
    auth_data = response.json()
    token = auth_data["access_token"]
    assert token is not None
    assert auth_data["staff"]["role"] == "manager"
    assert auth_data["staff"]["name"] == "mujeeb"
    headers = {"Authorization": f"Bearer {token}"}
    print("Auth Login OK!")
    
    # Test 3: Create Staff (Waiter)
    print("\n[Test 3] Create Staff (Waiter)...")
    response = client.post(
        "/api/staff/",
        headers=headers,
        json={"name": "John Waiter", "role": "waiter", "pin": "5555", "is_active": True}
    )
    assert response.status_code == 201
    waiter_id = response.json()["id"]
    print(f"Create Staff OK! Waiter ID: {waiter_id}")
    
    # Test 4: List tables and update Table Status
    print("\n[Test 4] List and Update Dining Tables...")
    response = client.get("/api/tables/", headers=headers)
    assert response.status_code == 200
    tables = response.json()
    assert len(tables) >= 12
    t1_id = tables[0]["id"]
    
    # Update status to reserved
    response = client.put(
        f"/api/tables/{t1_id}",
        headers=headers,
        json={"status": "reserved"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "reserved"
    print("Tables list and status update OK!")
    
    # Test 5: Category and Menu Item creation
    print("\n[Test 5] Category and Menu Item creation...")
    response = client.post(
        "/api/categories",
        headers=headers,
        json={"name": "Drinks", "icon": "glass", "color": "blue", "sort_order": 1}
    )
    assert response.status_code == 201
    category_id = response.json()["id"]
    
    response = client.post(
        "/api/menu-items",
        headers=headers,
        json={
            "name": "Iced Tea",
            "description": "Sweet lemon iced tea",
            "price": 150.00,
            "category_id": category_id,
            "is_available": True,
            "sort_order": 1
        }
    )
    assert response.status_code == 201
    menu_item_id = response.json()["id"]
    print(f"Category and Menu Item OK! Item ID: {menu_item_id}")
    
    # Test 6: Stock Item creation and link to Menu Item
    print("\n[Test 6] Stock Item creation & linking...")
    response = client.post(
        "/api/stock/",
        headers=headers,
        json={
            "name": "Tea Leaves Packet",
            "unit": "grams",
            "quantity": 500.0,
            "low_stock_threshold": 50.0,
            "menu_item_id": menu_item_id
        }
    )
    assert response.status_code == 201
    stock_item_id = response.json()["id"]
    print(f"Stock Item OK! Stock Item ID: {stock_item_id}")
    
    # Test 7: Place an Order
    print("\n[Test 7] Create Order...")
    response = client.post(
        "/api/orders/",
        headers=headers,
        json={
            "order_type": "dine_in",
            "table_id": t1_id,
            "items": [{"menu_item_id": menu_item_id, "quantity": 3, "notes": "extra lemon"}]
        }
    )
    assert response.status_code == 201
    order = response.json()
    order_id = order["id"]
    assert order["status"] == "open"
    assert order["order_number"].startswith("INV-")
    # Subtotal = 150 * 3 = 450
    # Tax = 450 * 16% = 72
    # Total = 522
    assert float(order["subtotal"]) == 450.00
    assert float(order["tax"]) == 72.00
    assert float(order["total"]) == 522.00
    
    # Verify table T1 is occupied now (pending bill)
    response = client.get(f"/api/tables/{t1_id}", headers=headers)
    assert response.json()["status"] == "pending"
    print(f"Order Creation OK! Order ID: {order_id}, Order Number: {order['order_number']}")
    
    # Test 8: Order Payment, Stock deduction, and PDF Invoice generation
    print("\n[Test 8] Process payment (Checkout)...")
    response = client.post(
        f"/api/orders/{order_id}/pay",
        headers=headers,
        json={"payment_method": "cash", "discount": 50.00}
    )
    assert response.status_code == 200
    order_paid = response.json()
    assert order_paid["status"] == "paid"
    # Subtotal = 450
    # Discount = 50
    # Tax = (450 - 50) * 16% = 64
    # Total = 400 + 64 = 464
    assert float(order_paid["subtotal"]) == 450.00
    assert float(order_paid["discount"]) == 50.00
    assert float(order_paid["tax"]) == 64.00
    assert float(order_paid["total"]) == 464.00
    
    # Verify table T1 is freed
    response = client.get(f"/api/tables/{t1_id}", headers=headers)
    assert response.json()["status"] == "free"
    
    # Verify stock deduction (500 - 3 = 497)
    response = client.get(f"/api/stock/{stock_item_id}", headers=headers)
    assert response.json()["quantity"] == 497.0
    print("Stock Deduction OK!")
    
    # Verify stock adjustment logs
    response = client.get(f"/api/stock/adjustments/all?stock_item_id={stock_item_id}", headers=headers)
    assert response.status_code == 200
    adjustments = response.json()
    assert len(adjustments) >= 1
    assert adjustments[0]["quantity_change"] == -3.0
    print("Stock Adjustment Audit Logs OK!")
    
    # Verify invoice PDF creation
    response = client.get("/api/invoices/", headers=headers)
    assert response.status_code == 200
    invoices = response.json()
    assert len(invoices) >= 1
    invoice = invoices[0]
    assert invoice["invoice_number"] == order["order_number"]
    pdf_path = invoice["pdf_path"]
    assert pdf_path is not None
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 0
    print(f"Invoice and PDF generated OK! Size: {os.path.getsize(pdf_path)} bytes")
    
    # Test 9: Get settings and Update Settings
    print("\n[Test 9] Settings configuration CRUD...")
    response = client.get("/api/settings/", headers=headers)
    assert response.status_code == 200
    settings_list = response.json()
    assert len(settings_list) > 0
    
    response = client.put(
        "/api/settings/shop_name",
        headers=headers,
        json={"value": "Grand Royal POS"}
    )
    assert response.status_code == 200
    assert response.json()["value"] == "Grand Royal POS"
    print("Settings configuration OK!")

    # Test 10: Auth Failure Cases
    print("\n[Test 10] Auth Failure Cases...")
    response = client.post("/api/auth/login", json={"pin": "wrongpin"})
    assert response.status_code == 401
    response = client.post("/api/auth/login", json={"pin": ""})
    assert response.status_code == 422 # Pydantic min_length error
    print("Auth Failure Cases OK!")

    # Test 11: Waiter Role Restrictions
    print("\n[Test 11] Waiter Role Restrictions...")
    # Login as John Waiter
    response = client.post("/api/auth/login", json={"pin": "5555"})
    assert response.status_code == 200
    waiter_token = response.json()["access_token"]
    waiter_headers = {"Authorization": f"Bearer {waiter_token}"}
    
    # Try to create a staff member (waiter is not allowed)
    response = client.post(
        "/api/staff/",
        headers=waiter_headers,
        json={"name": "Bad Actor", "role": "waiter", "pin": "9999", "is_active": True}
    )
    assert response.status_code == 403
    
    # Try to create a table (waiter is not allowed)
    response = client.post(
        "/api/tables/",
        headers=waiter_headers,
        json={"name": "T13", "capacity": 6, "shape": "round", "section": "VIP", "status": "free", "sort_order": 13}
    )
    assert response.status_code == 403
    
    # Try to update dining table parameters other than status (waiter is not allowed)
    response = client.put(
        f"/api/tables/{t1_id}",
        headers=waiter_headers,
        json={"name": "New Table Name", "capacity": 10}
    )
    assert response.status_code == 403
    
    # Waiter CAN update table status
    response = client.put(
        f"/api/tables/{t1_id}",
        headers=waiter_headers,
        json={"status": "reserved"}
    )
    assert response.status_code == 200
    
    # Try to create a category (waiter is not allowed)
    response = client.post(
        "/api/categories",
        headers=waiter_headers,
        json={"name": "Desserts", "icon": "cake", "color": "pink", "sort_order": 2}
    )
    assert response.status_code == 403
    
    # Try to update settings (waiter is not allowed)
    response = client.put(
        "/api/settings/shop_name",
        headers=waiter_headers,
        json={"value": "Hacked Name"}
    )
    assert response.status_code == 403
    print("Waiter Role Restrictions OK!")

    # Test 12: Attendance Clock-in & Clock-out Flow
    print("\n[Test 12] Attendance Flow...")
    # John Waiter clocks in
    response = client.post(
        "/api/staff/attendance/clock-in",
        headers=waiter_headers,
        json={"staff_id": waiter_id, "shift_id": 1} # Morning shift
    )
    assert response.status_code == 200
    assert response.json()["clock_out"] is None
    
    # Try to clock in again
    response = client.post(
        "/api/staff/attendance/clock-in",
        headers=waiter_headers,
        json={"staff_id": waiter_id, "shift_id": 1}
    )
    assert response.status_code == 400
    assert "already clocked in" in response.json()["detail"]
    
    # Clock out John Waiter
    response = client.post(
        "/api/staff/attendance/clock-out",
        headers=waiter_headers,
        json={"staff_id": waiter_id, "shift_id": 1}
    )
    assert response.status_code == 200
    assert response.json()["clock_out"] is not None
    
    # Try to clock out again
    response = client.post(
        "/api/staff/attendance/clock-out",
        headers=waiter_headers,
        json={"staff_id": waiter_id, "shift_id": 1}
    )
    assert response.status_code == 400
    assert "No active clock-in session" in response.json()["detail"]
    print("Attendance Flow OK!")

    # Test 13: Staff Account Inactivation & Unique PIN Check
    print("\n[Test 13] Staff Account Inactivation & Unique PIN Check...")
    # Manager sets John Waiter to inactive
    response = client.put(
        f"/api/staff/{waiter_id}",
        headers=headers,
        json={"is_active": False}
    )
    assert response.status_code == 200
    assert response.json()["is_active"] is False
    
    # Try to login as inactive John Waiter
    response = client.post("/api/auth/login", json={"pin": "5555"})
    assert response.status_code == 401
    assert "inactive" in response.json()["detail"].lower()
    
    # Try to use old waiter token
    response = client.get("/api/tables/", headers=waiter_headers)
    assert response.status_code == 401
    
    # Reactivate John Waiter and test duplicate PIN constraint
    response = client.put(
        f"/api/staff/{waiter_id}",
        headers=headers,
        json={"is_active": True}
    )
    assert response.status_code == 200
    
    # Try to create new staff with same PIN as manager ("mujeeb123")
    response = client.post(
        "/api/staff/",
        headers=headers,
        json={"name": "Duplicate PIN", "role": "waiter", "pin": "mujeeb123", "is_active": True}
    )
    assert response.status_code == 400
    assert "PIN must be unique" in response.json()["detail"]

    # Try to delete staff using waiter token
    response = client.delete(f"/api/staff/{waiter_id}", headers=waiter_headers)
    assert response.status_code == 403

    # Delete John Waiter using manager token
    response = client.delete(f"/api/staff/{waiter_id}", headers=headers)
    assert response.status_code == 204
    
    # Try to get deleted staff member
    response = client.get(f"/api/staff/{waiter_id}", headers=headers)
    assert response.status_code == 404

    print("Staff Inactivation & Unique PIN OK!")

    # Test 14: Menu Item & Category Constraints
    print("\n[Test 14] Menu Item & Category Constraints...")
    # Create menu item with non-existent category
    response = client.post(
        "/api/menu-items",
        headers=headers,
        json={
            "name": "Ghost Item",
            "price": 100.00,
            "category_id": 9999, # Non-existent
            "is_available": True
        }
    )
    assert response.status_code == 404
    
    # Make menu_item unavailable
    response = client.put(
        f"/api/menu-items/{menu_item_id}",
        headers=headers,
        json={"is_available": False}
    )
    assert response.status_code == 200
    
    # Try to place order with unavailable item
    response = client.post(
        "/api/orders/",
        headers=headers,
        json={
            "order_type": "dine_in",
            "table_id": t1_id,
            "items": [{"menu_item_id": menu_item_id, "quantity": 1}]
        }
    )
    assert response.status_code == 400
    assert "currently unavailable" in response.json()["detail"]
    
    # Restore menu item to available
    response = client.put(
        f"/api/menu-items/{menu_item_id}",
        headers=headers,
        json={"is_available": True}
    )
    assert response.status_code == 200
    print("Menu Item & Category Constraints OK!")

    # Test 15: Order Management Edge Cases
    print("\n[Test 15] Order Management Edge Cases...")
    # Create an order
    response = client.post(
        "/api/orders/",
        headers=headers,
        json={
            "order_type": "dine_in",
            "table_id": t1_id,
            "items": [{"menu_item_id": menu_item_id, "quantity": 1}]
        }
    )
    assert response.status_code == 201
    ord_id = response.json()["id"]
    
    # Pay for the order
    response = client.post(
        f"/api/orders/{ord_id}/pay",
        headers=headers,
        json={"payment_method": "cash"}
    )
    assert response.status_code == 200
    
    # Try to pay again
    response = client.post(
        f"/api/orders/{ord_id}/pay",
        headers=headers,
        json={"payment_method": "cash"}
    )
    assert response.status_code == 400
    assert "already closed or cancelled" in response.json()["detail"]
    
    # Try to modify paid order
    response = client.put(
        f"/api/orders/{ord_id}",
        headers=headers,
        json={"order_type": "take_away"}
    )
    assert response.status_code == 400
    assert "Cannot modify a closed or cancelled order" in response.json()["detail"]
    
    # Try to pay with invalid payment method (Pydantic validation check)
    # Create another order first
    response = client.post(
        "/api/orders/",
        headers=headers,
        json={
            "order_type": "take_away",
            "items": [{"menu_item_id": menu_item_id, "quantity": 1}]
        }
    )
    assert response.status_code == 201
    ord2_id = response.json()["id"]
    
    response = client.post(
        f"/api/orders/{ord2_id}/pay",
        headers=headers,
        json={"payment_method": "bitcoin"}
    )
    assert response.status_code == 422 # Pydantic validation error
    print("Order Management Edge Cases OK!")

    print("\n==========================================")
    print("ALL API VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    try:
        run_tests()
    except Exception as e:
        print(f"\nTEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
