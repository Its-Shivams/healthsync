# HealthSync Deployment & Local Operations Guide

## 1. Quick Start Commands

### Prerequisites
- Node.js (v18.x to v24.x)
- npm (v9.x to v11.x)
- Docker & Docker Compose (Optional for containerized PostgreSQL, MinIO, and Ollama)

### Step 1: Install Dependencies
```bash
# At monorepo root
npm install
```

### Step 2: Build Shared Packages
```bash
npm run build:packages
```

### Step 3: Initialize Database & Seed Synthetic Clinical Data
```bash
# Run database setup (automatically detects PostgreSQL, or activates zero-dependency local SQLite)
cd apps/api
node prisma/setup-db.js
cd ../..
```

### Step 4: Run the Backend & Frontend
```bash
# Start backend API (Port 4000)
npm run dev:api

# Start web client (Port 3000) in another terminal
npm run dev:web
```

---

## 2. Docker Compose Deployment (Production Environment)
```bash
docker compose up -d
```
This launches:
- PostgreSQL on port 5432
- MinIO Object Storage on ports 9000 & 9001
- Keycloak Identity & Access Management on port 8080
- Ollama local LLM service on port 11434

---

## 3. Running Automated Test Suites
```bash
# Run all backend unit & integration tests
npm run test

# Run AI safety & deterministic triage tests
npm run test:ai
```
