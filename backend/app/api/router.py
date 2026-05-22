from fastapi import APIRouter

from app.api.endpoints import auth, staff, tables, menu, orders, stock, settings, invoices, shifts

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff"])
api_router.include_router(tables.router, prefix="/tables", tags=["Tables"])
api_router.include_router(menu.router, tags=["Menu"])
api_router.include_router(orders.router, prefix="/orders", tags=["Orders"])
api_router.include_router(stock.router, prefix="/stock", tags=["Stock"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["Shifts"])
