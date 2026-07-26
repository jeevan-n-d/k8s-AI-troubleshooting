# AI Kubernetes Agent

An AI-powered assistant that inspects a Kubernetes cluster, diagnoses issues, and reports findings through a web dashboard. This README documents the project structure — what each file and folder is responsible for — so the architecture stays clear to anyone (including future you) revisiting the codebase.

> Every file in this project has exactly one responsibility. If you're ever asked *"why did you create this file?"*, the answer should never be "I don't know, AI created it."

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Root Files](#root-files)
- [Backend](#backend-folder)
- [Frontend](#frontend-folder)
- [Complete Request Flow](#complete-flow)
- [Interview Tip](#interview-tip)

---

## Overview

Think of the system like a company, where each layer only does its own job:

```
Frontend
    │
    ▼
Backend
    │
    ▼
Kubernetes
    │
    ▼
AI
```

---

## Project Structure

```text
ai-kubernetes-agent/
│
├── backend/
├── frontend/
├── docs/
├── prompts/
├── architecture/
├── docker-compose.yml
├── README.md
├── .gitignore
```

---

## Root Files

### `docker-compose.yml`

Starts the entire application — backend and frontend containers together — instead of running each service (and its environment variables, volumes, ports) manually.

```bash
docker compose up
```

**Backend service**
- `build:` — tells Docker to go into `backend/`, read the `Dockerfile`, and build the image.
- `ports: - "8000:8000"` — maps your laptop's port 8000 to the container's port 8000, so the browser can reach the backend.
- `volumes: - ./backend:/app` — maps your local source code into the container, so no rebuild is needed after code changes.
- `volumes: - ~/.kube:/root/.kube:ro` — the most important mount. Without it, the backend has no kubeconfig and cannot talk to the cluster. With it, `kubectl` works from inside the container.
- **Environment variables:**
  - `OPENROUTER_API_KEY` — used to call the AI model.
  - `OPENROUTER_MODEL` — which LLM to use (e.g. Llama, Gemma, DeepSeek).
  - `KUBECONFIG_PATH` — where the backend should look for the kubeconfig file.
- `extra_hosts: host.docker.internal` — lets the container communicate with the host machine when needed.
- `restart: always` — if the backend crashes, Docker restarts it automatically.

**Frontend service**
- Builds the Next.js app and runs it on `localhost:3000`.
- `NEXT_PUBLIC_API_BASE_URL` — tells the frontend where the backend API lives (`http://localhost:8000`). Without it, the frontend has no idea where to send requests.
- `depends_on: backend` — ensures the backend starts before the frontend.

### `README.md`
Project introduction: overview, features, tech stack, installation steps, and a link to the architecture docs.

### `architecture/`
Detailed documentation, e.g.:
```
01-System Architecture
02-Kubernetes
03-AI Pipeline
04-Backend
05-Frontend
```

### `docs/`
General documentation — screenshots, API docs, design docs, future plans, etc.

### `prompts/`
Stores AI prompts outside the Python code. Benefits: easier to edit, version-controllable, and keeps code cleaner.

---

## Backend Folder

```
backend/
```
The entire "brain" of the application.

### `app/`
Contains the actual application — everything backend-related lives here.

### `main.py`
Entry point. Starts FastAPI (the equivalent of `public static void main()` in Java or `main()` in C++). Boots `uvicorn` → FastAPI → API ready.

### `api/`
Contains endpoint definitions (e.g. `GET /pods`, `GET /nodes`, `POST /investigate`). Its only job is receiving HTTP requests — never AI logic, never `kubectl` calls.

### `endpoints.py`
Route definitions, e.g. `GET /pods` → `service.get_pods()`.

### `services/`
Business logic — where investigation actually begins (collect cluster data → AI → return report). If the endpoint is the receptionist, the service is the manager.

### `troubleshooter.py`
Main orchestration layer. Responsibilities: collect Kubernetes data → collect logs → build prompt → call AI → return diagnosis.

### `kubernetes/`
Everything related to talking to Kubernetes — nothing else.

- **`executor.py`** — the lowest layer; runs `kubectl` via `subprocess.run()` and only executes commands.
- **`inspector.py`** — wraps raw `kubectl` calls into readable functions like `inspect_pods()` instead of scattering `kubectl get pods` everywhere.
- **`service.py`** — combines pods, nodes, deployments, events, and logs into a single "cluster snapshot".

### `ai/`
Contains the AI reasoning logic.

- **`reasoner.py`** — receives the cluster snapshot, builds a prompt, calls OpenRouter, receives the AI response, and returns a diagnosis. It never executes `kubectl` directly.

### `core/`
Application configuration.

- **`config.py`** — reads environment variables (API keys, model name, kubeconfig path) instead of hardcoding them.

### `models/`
Data models.

- **`schemas.py`** — defines request/response structures using Pydantic, which automatically validates incoming JSON.

### `requirements.txt`
Python dependencies (e.g. FastAPI, uvicorn, requests, pydantic) — installed by Docker.

### `Dockerfile`
Builds the backend image: Python base image → install requirements → copy source → run `uvicorn`.

### `.env`
Stores API keys, secrets, and configuration. **Never commit this to GitHub.**

---

## Frontend Folder

```
frontend/
```
Responsible only for the UI.

### `src/`
All frontend source code.

### `app/` (Next.js App Router)
- **`layout.tsx`** — common layout (navbar, sidebar, footer) shared across every page.
- **`page.tsx`** — the main homepage.
- **`globals.css`** — global styles.

### `components/`
Reusable UI pieces (dashboard cards, buttons, navbar, sidebar) instead of repeating code.
- **`auth/`** — login/signup and authentication UI.
- **`dashboard/`** — dashboard cards, charts, statistics.
- **`layout/`** — header, sidebar, navigation.

### `hooks/`
Custom React hooks.
- **`useInvestigation.ts`** — likely handles the flow: user clicks "Investigate" → API call → loading state → response/error handling. Keeps this logic out of the UI components.

### `lib/`
Helper utilities.
- **`insforge.ts`** — handles InsForge-related configuration or helper functions used by the frontend.

### `services/`
Communication layer with the backend.
- **`api.ts`** — centralizes all backend API calls (e.g. `getPods()`, `getNodes()`, `investigateCluster()`) instead of scattering `fetch()` calls throughout the app.

### `types/`
TypeScript interfaces (e.g. `Pod`, `Node`) for strong typing.

### `public/`
Static assets — images, icons, logos.

### `package.json` / `package-lock.json`
Frontend dependencies (the Node.js equivalent of `requirements.txt`) and locked exact versions to ensure consistent installs across developers.

### `tsconfig.json`
TypeScript compiler settings.

### `tailwind.config.js` / `postcss.config.js`
Tailwind CSS configuration and its required PostCSS setup.

### `next-env.d.ts`
Auto-generated by Next.js to support TypeScript. Not meant to be edited manually.

### `Dockerfile`
Builds the frontend image: `npm install` → `npm run build` → `npm start`.

---

## Complete Flow

```text
User
 │
 ▼
Frontend (page.tsx)
 │
 ▼
useInvestigation.ts
 │
 ▼
services/api.ts
 │
 ▼
POST /investigate
 │
 ▼
api/endpoints.py
 │
 ▼
services/troubleshooter.py
 │
 ▼
kubernetes/service.py
 │
 ▼
kubernetes/inspector.py
 │
 ▼
kubernetes/executor.py
 │
 ▼
kubectl
 │
 ▼
Kubernetes API Server
 │
 ▼
Cluster Data
 │
 ▼
ai/reasoner.py
 │
 ▼
OpenRouter
 │
 ▼
LLM
 │
 ▼
Diagnosis
 │
 ▼
FastAPI Response
 │
 ▼
Frontend Dashboard
 │
 ▼
User
```

---

## Interview Tip

**Q: "Why did you separate your project into so many files?"**

> I followed the separation of concerns principle. Each layer has a single responsibility: the API layer handles HTTP requests, the service layer orchestrates business logic, the Kubernetes layer interacts with the cluster, the AI layer performs reasoning, the models define request and response schemas, and the frontend is responsible only for presentation. This modular structure makes the application easier to maintain, test, and extend.