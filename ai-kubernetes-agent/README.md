# AI Kubernetes Troubleshooting Agent

An on-demand troubleshooting system that monitors Kubernetes clusters and uses AI reasoning to diagnose issues, identify root causes, and suggest resolutions.

## Architecture

```text
Frontend (Next.js)
    ↓
FastAPI Backend (Orchestrator)
    ↓
Kubernetes Investigation Layer (Mocked)
    ↓
AI Kubernetes Agent (Mocked)
    ↓
LLM Reasoning (OpenRouter via InsForge) (Mocked)
    ↓
Root Cause + Suggested Fix
    ↓
Frontend Diagnosis Page
```

## Project Structure

```text
ai-kubernetes-agent/
├── backend/                  # FastAPI Backend Orchestrator
│   ├── app/
│   │   ├── api/              # API Route endpoints
│   │   ├── core/             # Configuration & environments
│   │   ├── kubernetes/       # Kubernetes interaction layer
│   │   ├── ai/               # AI Diagnostics and LLM interaction
│   │   ├── services/         # Orchestrator & logic services
│   │   └── models/           # Pydantic schemas
│   └── Dockerfile
├── frontend/                 # Next.js App Router Web UI
│   ├── src/
│   │   ├── app/              # Next.js App Router (Layouts & Pages)
│   │   ├── components/       # Reusable components
│   │   ├── services/         # API HTTP Client handlers
│   │   ├── hooks/            # React Query Custom hooks
│   │   └── types/            # TypeScript interfaces
│   └── Dockerfile
├── docs/                     # Documentation placeholders
├── prompts/                  # System prompts placeholders
├── docker-compose.yml        # Docker orchestration definitions
└── README.md
```

## Running the Application

To run the complete system locally with Docker:

```bash
docker compose up --build
```

Access the environments:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
