from datetime import time, datetime
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models.category import Category
from app.models.invoice import Invoice
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderItem
from app.models.shift import Shift
from app.models.staff import Staff
from app.models.stock import StockItem, StockAdjustment
from app.models.table import DiningTable
from app.models.attendance import Attendance
from app.models.settings import Setting

HFC_MENU = {
  "Ice Cream Cup": [
    { "name": "Pista", "variants": { "Small": 100, "Regular": 200 } },
    { "name": "Kulfa", "variants": { "Small": 100, "Regular": 200 } },
    { "name": "Mangeo", "variants": { "Small": 100, "Regular": 200 } },
    { "name": "Strawberry", "variants": { "Small": 100, "Regular": 200 } },
    { "name": "Chocolate", "variants": { "Small": 100, "Regular": 200 } },
    { "name": "Roasted Almond", "variants": { "Regular": 200 } },
    { "name": "CheesKake", "variants": { "Small": 100, "Regular": 200 } }
  ],
  "Ice Cream Shake": [
    { "name": "Pista", "price": 380 },
    { "name": "Kulfa", "price": 380 },
    { "name": "Mangeo", "price": 380 },
    { "name": "Strawberry", "price": 380 },
    { "name": "Chocolate", "price": 400 },
    { "name": "Roasted Almond", "price": 380 },
    { "name": "Chees Kake", "price": 380 }
  ],
  "Ice Cream Family Pack": [
    { "name": "Pista (700ml)", "price": 350 },
    { "name": "Kulfa (700ml)", "price": 350 },
    { "name": "Mangeo (700ml)", "price": 350 },
    { "name": "Strawberry (700ml)", "price": 350 },
    { "name": "Chocolate (700ml)", "price": 350 },
    { "name": "Roasted Almond (700ml)", "price": 350 },
    { "name": "Chees Kake (700ml)", "price": 350 }
  ],
  "Pizza Regular Flavors": [
    { "name": "Chicken Tikka Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } },
    { "name": "Chicken Fajita Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } },
    { "name": "Chicken Tandoori Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } },
    { "name": "Super Supreme Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } },
    { "name": "Hot & Spicy Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } },
    { "name": "Vegitable Pizza", "variants": { "S": 600, "M": 1050, "L": 1450 } }
  ],
  "Pizza Special Flavors": [
    { "name": "Loaded Chicken Special Pizza", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Malai Boti Flavour", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "BBQ Flavour", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Cheese Stick", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Cheese Lover", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Kabab Tonight", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Pepperoni Pizza", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Flavour Split", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Grill Chicken Bte Pizza", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Chicken Peri Peri Pizza", "variants": { "S": 650, "M": 1200, "L": 1650 } },
    { "name": "Creamy Chicken Tikka", "variants": { "S": 650, "M": 1200, "L": 1650 } }
  ],
  "Pizza Premium Crust Flavors": [
    { "name": "Stuffed Crust Chicken Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "Lazania Crust Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "Kabab Crust Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "Crown Crust Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "Chees Stuff Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "White Sauce Stuff Pizza", "variants": { "M": 1349, "L": 1849 } },
    { "name": "Kabab & Cheese Crust Pizza", "variants": { "M": 1349, "L": 1849 } }
  ],
  "Value Deals": [
    { "name": "Deal 1 (3 Regular Small Pizza, 0.5L Drink)", "price": 1150 },
    { "name": "Deal 2 (2 Medium Pizza, 1L Drink)", "price": 2250 },
    { "name": "Deal 3 (2 Large Pizza, 1L Drink)", "price": 2850 },
    { "name": "Deal 4 (1 Zinger Burger, Fries, Regular Drink)", "price": 650 },
    { "name": "Deal 5 (1 Zinger Burger, 2 Pcs Hot Wings, Fries, Regular Drink)", "price": 700 },
    { "name": "Deal 6 (1 Zinger Burger, 1 Warp Roll, Fries, Regular Drink)", "price": 999 },
    { "name": "Deal 7 (4 Pcs Hot Wings, Fries, Regular Drink, 1 Club Sandwich)", "price": 899 },
    { "name": "Deal 8 (2 Zinger Burger, 2 Fries, 2 Regular Drink)", "price": 1250 },
    { "name": "Deal 9 (3 Zinger Burger, 3 Fries, 1L Cold Drink)", "price": 2750 },
    { "name": "Deal 10 (1 Special Large Pizza, 8 Pcs Hot Wings, 1L Cold Drink)", "price": 2150 },
    { "name": "B.B.Q 2 Person Platter (Reshmi Kabab, Tikka Boti, Malai Boti, Kalmi Tikka, Tikka Pieces, Fries, 1L Drink, Raita, Salad, 4 Roti)", "price": 2250 },
    { "name": "B.B.Q 4 Person Platter (Reshmi Kabab, Tikka Boti, Malai Boti, Kalmi Tikka, Tikka Pieces, Quarter Platter, Fries, 1.5L Drink, Raita, Salad, 8 Roti)", "price": 4450 }
  ],
  "Chicken Broast": [
    { "name": "Full Broast (2 Leg, 2 Thai, 2 Wings, 2 Chest, 4 Burger Bun, 4 Dip Sauce, 1.5L Cold Drink, 1 Large Fries)", "price": 2950 },
    { "name": "Half Broast (1 Leg, 1 Thai, 1 Wings, 1 Chest, 2 Burger Bun, 2 Dip Sauce, 1L Cold Drink, 1 Medium Fries)", "price": 1550 },
    { "name": "Quarter Broast (1 Leg & 1 Thai OR 1 Wings & 1 Chest, 1 Burger Bun, 2 Dip Sauce, 500ml Cold Drink, 1 Small Fries)", "price": 750 }
  ],
  "Continental": [
    { "name": "Honey Mustard Wings", "price": 350 },
    { "name": "Hot Wings (6Pcs)", "price": 299 },
    { "name": "Garlic Mayo Wings (6Pcs)", "price": 399 },
    { "name": "Chicken Strips (5Pcs)", "price": 499 },
    { "name": "Chicken Nuggets (8Pcs)", "price": 399 },
    { "name": "Dynamite Chicken (8Pcs)", "price": 499 },
    { "name": "Loaded Fries", "price": 499 },
    { "name": "BBQ Fries", "price": 249 },
    { "name": "Garlic Mayo Fries", "price": 299 },
    { "name": "Masala Fries", "price": 249 },
    { "name": "Plain Fries", "price": 199 }
  ],
  "Steaks": [
    { "name": "Sizzling Chef's Special Steak", "price": 1100 },
    { "name": "Mushroom Chicken Steak", "price": 950 },
    { "name": "Black Pepper Chicken Steak", "price": 950 },
    { "name": "Jalapeno Chicken Steak", "price": 950 },
    { "name": "BBQ Chicken Steak", "price": 950 },
    { "name": "Red Hot Chicken Steak", "price": 950 },
    { "name": "Chicken Corn Steak", "price": 950 }
  ],
  "Pasta": [
    { "name": "Creamy Alfredo Special Pasta", "price": 550 },
    { "name": "Crunchy Cheezy Pasta", "price": 600 },
    { "name": "Fettuccini Pasta", "price": 450 },
    { "name": "Alfredo Pasta", "price": 450 },
    { "name": "Macaroni Pasta", "price": 450 }
  ],
  "Sandwiches & Burgers": [
    { "name": "Club Sandwich", "price": 500 },
    { "name": "BBQ Chicken Sandwich", "price": 450 },
    { "name": "Pepperoni Chicken Sandwich", "price": 450 },
    { "name": "Grill Chicken Jalapeno Burger", "price": 499 },
    { "name": "Mushroom Grill Burger", "price": 499 },
    { "name": "Grill Chicken BBQ Burger", "price": 450 },
    { "name": "Red Hot Burger", "price": 450 },
    { "name": "Crispy Classic Burger", "price": 450 },
    { "name": "Al Baick Mate Zinger Burger", "price": 499 }
  ],
  "BBQ & Fish": [
    { "name": "Chicken Kabab (4Pcs)", "price": 550 },
    { "name": "Reshmi Kabab (4Pcs)", "price": 650 },
    { "name": "Malkhmali Kabab (4Pcs)", "price": 1150 },
    { "name": "Lebani Kabab (4Pcs)", "price": 1100 },
    { "name": "Rajasthani Boti (12Pcs)", "price": 1000 },
    { "name": "Kastori Boti (12Pcs)", "price": 1100 },
    { "name": "Malai Boti (12Pcs)", "price": 1100 },
    { "name": "Tikka Boti (12Pcs)", "price": 950 },
    { "name": "Tikka Pieces (Chest)", "price": 380 },
    { "name": "Tikka Pieces (Leg)", "price": 350 },
    { "name": "Grill Fish (1 Kg)", "price": 2400 },
    { "name": "Mutton Chops (10Pcs)", "price": 3200 }
  ],
  "Wraps & Rolls": [
    { "name": "Peri Peri Chicken Wrap", "price": 499 },
    { "name": "BBQ Chicken Wrap", "price": 499 },
    { "name": "Italian Chicken Wrap", "price": 549 },
    { "name": "Spicy Chicken Tikka Roll", "price": 349 },
    { "name": "Garlic Mayo Roll", "price": 399 },
    { "name": "Crispy Zinger Roll Paratha", "price": 499 }
  ],
  "Tandoor & Extras": [
    { "name": "Roti / Naan / Pr Head", "price": 150 },
    { "name": "Extra Raita & Salad", "price": 50 },
    { "name": "Dip Sauce", "price": 30 }
  ],
  "Drinks": [
    { "name": "Water (Large)", "price": 130 },
    { "name": "Water (Small)", "price": 80 },
    { "name": "Soft Drink", "price": 90 },
    { "name": "Regular Tin", "price": 130 },
    { "name": "1 Liter Drink", "price": 170 },
    { "name": "1.5 Liter Drink", "price": 220 }
  ]
}

CATEGORY_META = {
  "Ice Cream Cup": {"icon": "icecream", "color": "#ec4899"},
  "Ice Cream Shake": {"icon": "local_bar", "color": "#db2777"},
  "Ice Cream Family Pack": {"icon": "kitchen", "color": "#be185d"},
  "Pizza Regular Flavors": {"icon": "local_pizza", "color": "#f97316"},
  "Pizza Special Flavors": {"icon": "local_pizza", "color": "#ea580c"},
  "Pizza Premium Crust Flavors": {"icon": "local_pizza", "color": "#c2410c"},
  "Value Deals": {"icon": "local_offer", "color": "#e11d48"},
  "Chicken Broast": {"icon": "kebab_dining", "color": "#b91c1c"},
  "Continental": {"icon": "lunch_dining", "color": "#84cc16"},
  "Steaks": {"icon": "restaurant", "color": "#4d7c0f"},
  "Pasta": {"icon": "dinner_dining", "color": "#06b6d4"},
  "Sandwiches & Burgers": {"icon": "lunch_dining", "color": "#059669"},
  "BBQ & Fish": {"icon": "kebab_dining", "color": "#b45309"},
  "Wraps & Rolls": {"icon": "wrap_text", "color": "#0284c7"},
  "Tandoor & Extras": {"icon": "flatware", "color": "#4b5563"},
  "Drinks": {"icon": "local_drink", "color": "#3b82f6"}
}

def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Settings
        if db.query(Setting).filter(Setting.key == "shop_name").first() is None:
            db.add_all(
                [
                    Setting(key="shop_name", value="Restaurant POS"),
                    Setting(key="currency", value="PKR"),
                    Setting(key="tax_percent", value="16.0"),
                    Setting(key="invoice_prefix", value="INV"),
                ]
            )

        # Shifts
        if db.query(Shift).count() == 0:
            db.add_all(
                [
                    Shift(name="Morning", start_time=time(8, 0), end_time=time(16, 0)),
                    Shift(name="Evening", start_time=time(16, 0), end_time=time(0, 0)),
                    Shift(name="Night", start_time=time(0, 0), end_time=time(8, 0)),
                ]
            )

        # Dining Tables
        if db.query(DiningTable).count() == 0:
            # VIP Tables
            db.add_all(
                [
                    DiningTable(
                        name=f"V{i}",
                        capacity=6,
                        shape="round",
                        section="VIP Section",
                        status="free",
                        sort_order=i,
                    )
                    for i in range(1, 6)
                ]
            )
            # Main Hall Tables
            db.add_all(
                [
                    DiningTable(
                        name=f"M{i}",
                        capacity=4,
                        shape="square",
                        section="Main Hall",
                        status="free",
                        sort_order=i + 10,
                    )
                    for i in range(1, 13)
                ]
            )

        # Staff Accounts
        if db.query(Staff).filter(Staff.name == "mujeeb").first() is None:
            db.add(
                Staff(
                    name="mujeeb",
                    role="manager",
                    pin="mujeeb123",
                    is_active=True
                )
            )
        # Seed addition staff for testing roles
        if db.query(Staff).filter(Staff.name == "cashier1").first() is None:
            db.add(
                Staff(
                    name="cashier1",
                    role="cashier",
                    pin="1111",
                    is_active=True
                )
            )
        if db.query(Staff).filter(Staff.name == "waiter1").first() is None:
            db.add(
                Staff(
                    name="waiter1",
                    role="waiter",
                    pin="2222",
                    is_active=True
                )
            )

        # Categories & Menu Items (Clear existing mocks first)
        if db.query(Category).count() == 0 or db.query(MenuItem).count() == 0:
            # Delete any existing menu records to ensure a clean HFC Menu setup
            db.query(StockAdjustment).delete()
            db.query(StockItem).delete()
            db.query(OrderItem).delete()
            db.query(Invoice).delete()
            db.query(Order).delete()
            db.query(MenuItem).delete()
            db.query(Category).delete()
            db.commit()

            sort_order_cat = 1
            for cat_name, items in HFC_MENU.items():
                meta = CATEGORY_META.get(cat_name, {"icon": "restaurant", "color": "#10b981"})
                category = Category(
                    name=cat_name,
                    icon=meta["icon"],
                    color=meta["color"],
                    sort_order=sort_order_cat,
                    is_active=True
                )
                db.add(category)
                db.flush()  # Populates category.id

                sort_order_item = 1
                for item in items:
                    name = item["name"]
                    variants = item.get("variants")
                    price = item.get("price")
                    
                    if variants:
                        # For variant items, base price is the first/lowest variant price
                        base_price = list(variants.values())[0]
                    else:
                        base_price = price

                    menu_item = MenuItem(
                        name=name,
                        description=f"Fresh {name} served standard from our kitchen.",
                        price=base_price,
                        category_id=category.id,
                        is_available=True,
                        sort_order=sort_order_item,
                        variants=variants
                    )
                    db.add(menu_item)
                    db.flush()  # Populates menu_item.id

                    # Create central tracking StockItem for raw ingredients
                    stock_item = StockItem(
                        name=f"Raw {name}",
                        unit="pcs" if "Drink" not in name and "Water" not in name else "bottles",
                        quantity=250.0,  # Seed ample stock to allow billing validation
                        low_stock_threshold=15.0,
                        menu_item_id=menu_item.id
                    )
                    db.add(stock_item)
                    db.flush()

                    # Restocking adjustment log
                    adjustment = StockAdjustment(
                        stock_item_id=stock_item.id,
                        quantity_change=250.0,
                        reason="Initial automated production inventory seed",
                        adjusted_at=datetime.utcnow()
                    )
                    db.add(adjustment)

                    sort_order_item += 1
                sort_order_cat += 1

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
