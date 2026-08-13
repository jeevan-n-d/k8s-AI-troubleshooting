# KubePilot AI — Frontend

The frontend is built with Next.js, React, TypeScript, and Tailwind CSS.

Its main responsibility is to provide the UI for interacting with the Kubernetes troubleshooting platform.

The frontend does NOT directly access Kubernetes or execute kubectl commands. It communicates with the FastAPI backend through REST APIs.

---

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- React Query
- Axios
- InsForge SDK

---

## Structure

```text
frontend/
│
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   └── lib/
│
├── public/
├── Dockerfile
├── package.json
└── tsconfig.json
```

**Important folders**

- `app/` → Next.js pages and application entry points
- `components/` → Reusable UI components
- `hooks/` → Frontend logic such as investigation requests
- `services/` → API communication with FastAPI
- `types/` → TypeScript data structures
- `lib/` → Shared utilities and InsForge configuration

---

## Frontend Responsibilities

The frontend allows the user to:

1. Select a Kubernetes context
2. View cluster information
3. Start an investigation
4. View investigation progress
5. View Kubernetes evidence
6. View AI diagnosis
7. View recommended fixes
8. View investigation history

---

## API Communication

The frontend communicates with FastAPI.

```
Frontend
   ↓
POST /investigate
   ↓
FastAPI
   ↓
Kubernetes Investigation
   ↓
AI Reasoning
   ↓
JSON Response
   ↓
Frontend
```

The selected Kubernetes context is sent with the investigation request.

```json
{
  "context": "docker-desktop"
}
```

---

## Environment Variable

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

This tells the frontend where the FastAPI backend is running.

---

## Docker

The frontend uses a Node.js image because Next.js requires Node.js for building and running the application.

```
FROM node:20-alpine
```

The Dockerfile uses a multi-stage build:

```
Builder
   ↓
npm install
   ↓
npm run build
   ↓
.next
   ↓
Runner
   ↓
npm run start
```

Important runtime variables:

```
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
```

- `NODE_ENV=production` → runs Next.js in production mode
- `PORT=3000` → Next.js listens on port 3000
- `HOSTNAME=0.0.0.0` → listens on all container network interfaces

Docker Compose maps:

```
ports:
  - "3000:3000"
```

So:

```
Laptop:3000
     ↓
Docker
     ↓
Frontend Container:3000
     ↓
Next.js
```

---

## Security

The browser never receives:

- Kubernetes kubeconfig
- Kubernetes credentials
- OpenRouter API key
- kubectl access

Instead:

```
Browser
   ↓
FastAPI
   ↓
kubectl
   ↓
Kubernetes
```

The backend is responsible for Kubernetes access and AI reasoning.

---

## Interview Answer

**What is the role of the frontend?**

> The frontend is built using Next.js, React, TypeScript, and Tailwind CSS. It provides the UI where users select a Kubernetes context, trigger investigations, and view Kubernetes evidence and AI-generated diagnoses. It communicates with the FastAPI backend through REST APIs and does not directly access Kubernetes.

**Why Node.js Docker image?**

> Next.js requires Node.js to install dependencies, build the application, and run the Next.js server.

**Why `0.0.0.0`?**

> It makes the Next.js server listen on all network interfaces inside the container, allowing Docker's port mapping to forward requests from the host machine to the container.

---

That's enough for the **frontend**. The individual `.tsx` UI components aren't worth memorizing for your Kubernetes/DevOps interview.