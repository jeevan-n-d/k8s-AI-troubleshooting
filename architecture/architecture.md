# AI Kubernetes Troubleshooting Agent — Architecture

## 1. High-Level Architecture

```
                         USER
                           │
                           ▼
              ┌────────────────────────┐
              │   Next.js Frontend     │
              │       :3000            │
              └────────────┬───────────┘
                           │
                    HTTP REST API
                           │
                           ▼
              ┌────────────────────────┐
              │    FastAPI Backend     │
              │       :8000            │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ Investigation Service  │
              │     Orchestrator       │
              └────────────┬───────────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
      ┌──────────────────┐      ┌──────────────────┐
      │ Kubernetes Layer │      │     AI Layer     │
      │                  │      │                  │
      │ Inspectors       │      │ reasoner.py      │
      │ Collectors       │      │                  │
      │ Executor         │      │                  │
      └────────┬─────────┘      └────────┬─────────┘
               │                         │
               ▼                         ▼
           kubectl                  OpenRouter
               │                         │
               ▼                         ▼
      Kubernetes API Server             LLM
               │                         │
               ▼                         ▼
       Cluster Evidence            AI Diagnosis
               │                         │
               └────────────┬────────────┘
                            ▼
                     FastAPI Response
                            │
                            ▼
                    Next.js Dashboard
                            │
                            ▼
                           USER
```

The application also uses InsForge for application-level services such as authentication and database functionality.

---

## 2. Frontend

```
frontend/
└── src/
    ├── app/
    ├── components/
    ├── hooks/
    ├── lib/
    ├── services/
    └── types/
```

The frontend:

- Provides the UI
- Accepts user actions
- Sends API requests
- Receives backend responses
- Displays investigation results

It does not execute kubectl.

**Frontend → Backend**

```
Browser
   ↓
Next.js :3000
   ↓
http://localhost:8000
   ↓
FastAPI :8000
```

The frontend uses:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

For investigation:

```
POST /investigate
```

---

## 3. FastAPI Backend

```
backend/
└── app/
    ├── ai/
    ├── api/
    ├── core/
    ├── kubernetes/
    ├── models/
    ├── services/
    └── main.py
```

FastAPI is the central backend that coordinates the frontend, Kubernetes, AI, and InsForge.

The application starts with:

```
uvicorn app.main:app
```

and listens on:

```
0.0.0.0:8000
```

---

## 4. API Layer

```
app/api/
└── endpoints.py
```

Responsible for handling HTTP requests such as:

```
POST /investigate
```

The endpoint receives the frontend request and calls the investigation logic.

---

## 5. Models

```
app/models/
└── schemas.py
```

Contains Pydantic models such as:

- `InvestigationRequest`
- `InvestigationResult`
- `DiagnosisInfo`
- `InvestigationResponse`

They define and validate the structure of requests and responses.

---

## 6. Investigation Service

```
app/services/
└── troubleshooter.py
```

This is the orchestration layer.

It coordinates the investigation:

```
Investigation Service
        │
        ├── Pods
        ├── Logs
        ├── Events
        ├── Deployments
        └── Networking
```

It gathers the Kubernetes evidence before sending it to the AI layer.

---

## 7. Kubernetes Layer

```
app/kubernetes/
├── executor.py
├── inspector.py
└── service.py
```

Flow:

```
Investigation Service
        ↓
Inspectors / Collectors
        ↓
KubectlExecutor
        ↓
kubectl
        ↓
Kubernetes API Server
```

**Inspector vs Executor**

```
Inspector
   ↓
"What Kubernetes information do I need?"
   ↓
Executor
   ↓
"Run the kubectl command."
```

Examples:

```
PodInspector
     ↓
KubectlExecutor
     ↓
kubectl

LogsCollector
     ↓
KubectlExecutor
     ↓
kubectl

EventsAnalyzer
     ↓
KubectlExecutor
     ↓
kubectl
```

The executor actually executes the commands using Python's:

```python
subprocess.run()
```

---

## 8. Kubernetes Access

The backend container receives the host kubeconfig through:

```yaml
volumes:
  - ~/.kube:/root/.kube:ro
```

Flow:

```
Laptop
~/.kube/config
      ↓
Docker volume
      ↓
Backend container
/root/.kube/config
      ↓
kubectl
      ↓
Kubernetes API Server
```

The kubeconfig tells kubectl which cluster, API server, context, and credentials to use.

---

## 9. host.docker.internal

Docker Compose provides:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

This allows the backend container to reach the host machine.

The project also converts Kubernetes addresses such as:

```
127.0.0.1
localhost
```

to:

```
host.docker.internal
```

when required.

---

## 10. AI Layer

```
app/ai/
└── reasoner.py
```

The AI layer receives Kubernetes evidence and sends it to OpenRouter:

```
Kubernetes Evidence
        ↓
reasoner.py
        ↓
OpenRouter
        ↓
LLM
        ↓
Diagnosis
```

**Important:** `reasoner.py` does not execute kubectl. The Kubernetes executor does that.

---

## 11. OpenRouter

OpenRouter acts as the LLM API gateway.

Configuration:

```
OPENROUTER_API_KEY
OPENROUTER_MODEL
```

Flow:

```
Kubernetes Evidence
        ↓
AI Reasoner
        ↓
OpenRouter API
        ↓
Selected LLM
        ↓
AI Response
```

The model can be selected using `OPENROUTER_MODEL`.

---

## 12. InsForge

InsForge is a separate application backend platform.

It provides services such as:

```
InsForge
├── Authentication
├── Database
├── Storage
├── Realtime
└── Model Gateway
```

It is separate from the FastAPI backend.

The backend communicates with:

- Kubernetes
- OpenRouter
- InsForge

The backend code uses InsForge's database to publish investigation progress such as:

```
Checking Pods → running
Checking Pods → completed

Reading Logs → running
Reading Logs → completed

Analyzing Events → running
Analyzing Events → completed
```

---

## 13. Docker Architecture

Docker Compose runs two containers:

```
Docker Compose
     │
     ├───────────────┐
     ▼               ▼
 Frontend          Backend
 :3000              :8000
```

**Frontend container**

- Node.js
- Next.js
- React
- TypeScript

**Backend container**

- Python
- FastAPI
- Uvicorn
- kubectl

---

## 14. Backend Docker Image

```
python:3.12-slim
       ↓
Install system dependencies
       ↓
Install kubectl
       ↓
Install Python requirements
       ↓
COPY backend code
       ↓
FastAPI application
       ↓
Uvicorn :8000
```

---

## 15. Complete Investigation Flow

When the user clicks **Investigate**:

```
1. User
   ↓
2. Next.js Frontend
   ↓
3. POST /investigate
   ↓
4. FastAPI
   ↓
5. Investigation Service
   ↓
6. Kubernetes Inspectors
   ↓
7. KubectlExecutor
   ↓
8. subprocess.run()
   ↓
9. kubectl
   ↓
10. kubeconfig
   ↓
11. Kubernetes API Server
   ↓
12. Pods / Logs / Events /
    Deployments / Services
   ↓
13. Investigation Evidence
   ↓
14. AI Reasoner
   ↓
15. OpenRouter
   ↓
16. Selected LLM
   ↓
17. Diagnosis
   ↓
18. FastAPI Response
   ↓
19. Next.js
   ↓
20. User
```

Investigation progress can additionally be sent to the InsForge database.

---

## 16. Final Architecture

```
                              USER
                                │
                                ▼
                     ┌─────────────────────┐
                     │   Next.js Frontend  │
                     │       :3000         │
                     └──────────┬──────────┘
                                │
                         POST /investigate
                                │
                                ▼
                     ┌─────────────────────┐
                     │   FastAPI Backend   │
                     │       :8000         │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ Investigation       │
                     │ Service             │
                     └──────────┬──────────┘
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
                  ▼                           ▼
        ┌───────────────────┐       ┌──────────────────┐
        │ Kubernetes Layer  │       │     AI Layer     │
        │                   │       │                  │
        │ Inspectors        │       │ reasoner.py      │
        │ Collectors        │       │                  │
        │ Executor          │       │                  │
        └─────────┬─────────┘       └────────┬─────────┘
                  │                          │
                  ▼                          ▼
               kubectl                  OpenRouter
                  │                          │
                  ▼                          ▼
        Kubernetes API Server                LLM
                  │                          │
                  ▼                          ▼
           Cluster Evidence            AI Diagnosis
                  │                          │
                  └───────────┬──────────────┘
                              ▼
                       FastAPI Response
                              │
                              ▼
                        Next.js UI
                              │
                              ▼
                             USER


              ┌─────────────────────────────┐
              │          InsForge           │
              │                             │
              │ Authentication              │
              │ Database                    │
              │ Realtime / other services   │
              └────────────▲────────────────┘
                           │
                    Progress / app data
                           │
                        FastAPI
```

This is the full architecture README version — detailed enough to understand the project, but without explaining every line of code.