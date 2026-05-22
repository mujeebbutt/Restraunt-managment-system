# 🍽️ Stitch Modern Restaurant Management System & POS

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-3--Tier%20Desktop-blue?style=for-the-badge" alt="Architecture">
  <img src="https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python-green?style=for-the-badge&logo=fastapi" alt="Backend">
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="Frontend">
  <img src="https://img.shields.io/badge/Shell-Electron-47848F?style=for-the-badge&logo=electron" alt="Shell">
</p>

A production-ready, white-label desktop Restaurant Management System and Point of Sale (POS) terminal application. Engineered with a high-performance asynchronous Python backend, a reactive web frontend, and enclosed in an Electron desktop shell to offer maximum structural flexibility, lightning-fast execution, and offline-first dependability.

---

## 🏗️ System Architecture & Layout

The project uses an organized monorepo architecture, splitting operational concerns into clean, decoupled tiers:

```text
.
├── backend/                  # Async Python Core API Server
│   ├── app/
│   │   ├── api/              # Routers & API endpoints (orders, menu, stock, sales)
│   │   ├── core/             # Database engines, configurations, & security hooks
│   │   ├── models/           # Declarative SQLAlchemy database schemas (SQLite)
│   │   ├── schemas/          # Strict Pydantic structural validation schemas
│   │   └── services/         # Business logic handles (Auth, automated PDF billing)
│   ├── backups/              # Automated database archive storage
│   └── invoices/             # System-generated transaction customer receipts
│
├── frontend/                 # Interactive React Dashboard & Interface
│   ├── src/
│   │   ├── components/       # UI building blocks & secure private route guards
│   │   ├── hooks/            # Global state and utility hooks
│   │   ├── pages/            # View frames (Interactive POS Grid, Live Analytics, Stock)
│   │   └── services/         # Axios API backend client adapters
│   ├── tailwind.config.js    # Adaptive UI design tokens & style variables
│   └── vite.config.js        # High-speed bundler orchestration
│
├── electron/                 # Native Desktop Window Orchestration
│   ├── main.js               # Main process system layer
│   └── preload.js            # Secure context-isolated inter-process communication
│
└── stitch_modern_restaurant_pos_interface/  # Embedded design frames & interface templates
