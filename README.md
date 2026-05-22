# Restaurant Management System

A white-label desktop POS system for restaurants.

## Tech Stack
- **Backend:** Python, FastAPI, SQLAlchemy, SQLite
- **Frontend:** React, Tailwind CSS, Vite
- **Desktop:** Electron

## Setup

### Backend
```bash
cd backend
python -m venv venv
venv\\Scripts\\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run as Desktop App
```bash
cd frontend
npm run electron:dev
```

## Folder Structure
```
restaurant-management-system/
├── backend/          FastAPI backend
│   ├── app/
│   │   ├── api/      Route handlers
│   │   ├── models/   Database models
│   │   ├── schemas/  Pydantic schemas
│   │   ├── services/ Business logic
│   │   └── core/     Config, DB setup
│   ├── invoices/     Auto-saved PDF invoices
│   ├── uploads/      Menu item images
│   └── backups/      Local backups
├── frontend/         React + Tailwind
│   └── src/
│       ├── pages/    One file per page
│       ├── components/
│       ├── hooks/
│       └── services/ API calls
└── electron/         Desktop wrapper
```

## Default Settings
- Currency: PKR
- Tax: 16% GST
- Invoice size: 5x3 inches (thermal)
