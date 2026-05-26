# Deployment Guide — Inventory Management System

This document covers deploying the SV Enterprises inventory application to a production or staging server.

## Architecture overview

| Component | Default port | Notes |
|-----------|--------------|-------|
| Frontend (Next.js) | 3000 | Serves UI; calls backend API |
| Backend (Express) | 4000 | REST API at `/api/v1` |
| MongoDB | 27017 | Persistent data store |

## Prerequisites

- Node.js 20+ on the server
- MongoDB 7+ (managed Atlas or self-hosted)
- Reverse proxy (nginx, Caddy, or cloud load balancer) for HTTPS
- Domain names for frontend and API (or single domain with path routing)

## Environment variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | API port (e.g. `4000`) |
| `MONGODB_URI` | Production MongoDB connection string |
| `JWT_SECRET` | Long random secret (32+ characters) |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `CORS_ORIGIN` | Frontend URL, e.g. `https://inventory.example.com` |

### Frontend (`frontend/.env.local` or build-time env)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Full API base, e.g. `https://api.inventory.example.com/api/v1` |
| `JWT_SECRET` | Must match backend `JWT_SECRET` (for middleware) |

## Build and run

```bash
# From repository root
npm install
npm run build

# Seed production DB once (idempotent)
npm run seed -w backend

# Start backend (use process manager in production)
npm run start -w backend

# Start frontend
npm run start -w frontend
```

Recommended: use **PM2**, **systemd**, or your platform’s process manager for both services.

## MongoDB

- Use a dedicated database user with read/write on the `inventory` database only.
- Enable authentication and network restrictions (VPC / IP allowlist).
- Schedule regular backups (Atlas automated backups or `mongodump` cron).

## HTTPS and reverse proxy

Example nginx locations:

- `https://inventory.example.com` → Next.js on port 3000
- `https://api.inventory.example.com` → Express on port 4000

Set `CORS_ORIGIN` to the frontend origin. Ensure cookies work if you rely on `inventory_token` cookie (SameSite, Secure in production).

## Post-deploy checklist

1. Change all demo passwords from seed data.
2. Confirm `JWT_SECRET` is unique per environment.
3. Run health check: `GET /api/v1/health`
4. Log in as Admin and verify dashboard, reports, and audit log.
5. Log in as warehouse users and test Stock In / Out on a phone-sized viewport.

## Docker (optional)

Local development uses `docker-compose.yml` for MongoDB only. For full container deployment, extend compose with backend and frontend services, or deploy to Kubernetes / ECS with the same env vars above.

## Updates

1. Pull latest code
2. `npm install && npm run build`
3. Restart backend and frontend processes
4. Review `PROGRESS.md` for any migration or seed notes
