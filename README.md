# Inventory Management System

Centralized inventory and stock movement application for **SV Enterprises** — disposal product manufacturing and trading across multiple warehouses (Vasai, Goregaon).

## Architecture

```
inventory/
├── backend/          # Express + TypeScript + MongoDB (Mongoose)
├── frontend/         # Next.js App Router + Tailwind CSS
├── docs/             # SOW and project documents
├── docker-compose.yml
├── PROGRESS.md       # Task completion tracker
└── package.json      # npm workspaces (monorepo)
```

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Express 5, TypeScript, Zod validation |
| Database | MongoDB 7 (Docker locally) |
| Auth | JWT + bcrypt + httpOnly cookie |

Backend uses a **feature-module** layout (`modules/auth`, `modules/stock`, etc.) with shared middleware, models, and utilities — designed to scale as new warehouses and features are added.

## Prerequisites

- Node.js 20+
- Docker Desktop (for local MongoDB)
- npm 10+

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start MongoDB

```bash
npm run db:up
```

MongoDB runs as a **single-node replica set** (`rs0`) so stock receive/transfer operations can use transactions. Wait ~30s after first start for replica set initiation, or run:

```bash
npm run db:init
```

If you use an existing standalone MongoDB volume from before this change, recreate it once:

```bash
docker compose down -v && npm run db:up && npm run db:init
```

### 3. Configure environment

```bash
cp .env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

### 4. Seed initial data

```bash
npm run seed -w backend
```

Creates warehouses (Vasai, Goregaon), sample brands/products, and users:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@inventory.local | Admin@123 |
| Vasai | vasai@inventory.local | Vasai@123 |
| Goregaon | goregaon@inventory.local | Goregaon@123 |

### 5. Run development servers

```bash
npm run dev
```

- **Frontend:** http://localhost:3000  
- **Backend API:** http://localhost:4000/api/v1  
- **Health check:** http://localhost:4000/api/v1/health  
- **Login:** http://localhost:3000/login  

Copy `JWT_SECRET` into `frontend/.env.local` (must match `backend/.env`) for route protection middleware.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | API only |
| `npm run dev:frontend` | UI only |
| `npm run build` | Build both packages |
| `npm run db:up` | Start MongoDB container |
| `npm run db:down` | Stop MongoDB container |
| `npm run seed -w backend` | Seed database |

## API Modules (backend)

| Route prefix | Module |
|--------------|--------|
| `/api/v1/health` | Health check |
| `/api/v1/auth` | Login, logout, current user |
| `/api/v1/users` | User management (Admin only) |
| `/api/v1/warehouses` | List (auth), CRUD (admin) |
| `/api/v1/brands` | List (auth), CRUD (admin) |
| `/api/v1/products` | List (auth), CRUD (admin), `?brandId=` filter |
| `/api/v1/stock` | Stock In / Out |
| `/api/v1/inventory` | Inventory views |
| `/api/v1/transfers` | Inter-warehouse transfers |
| `/api/v1/imports` | Tally Excel import |
| `/api/v1/reports` | Reports |
| `/api/v1/audit` | Audit log (admin) |

## Documentation

| Document | Description |
|----------|-------------|
| [docs/USER_GUIDE.md](./docs/USER_GUIDE.md) | End-user workflows (warehouse + admin) |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Production deployment checklist |
| [PROGRESS.md](./PROGRESS.md) | Development phase tracker |

## Progress

See **[PROGRESS.md](./PROGRESS.md)** for detailed task tracking by phase.

## SOW Reference

Original scope document: `docs/Scope of work - SV Enterprises .docx.pdf`
# Inventory
