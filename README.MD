# Kubernetes AI Troubleshooting Platform

An AI-powered Kubernetes troubleshooting platform that helps developers and DevOps engineers quickly identify and understand issues in a Kubernetes cluster.

Instead of manually inspecting cluster resources, the platform collects live Kubernetes information, analyzes it using a Large Language Model (LLM), and generates clear explanations, root cause analysis, and actionable recommendations.

## ✨ Features

- 🔍 Live Kubernetes cluster inspection
- 🤖 AI-powered root cause analysis
- 📊 Interactive cluster dashboard
- 📦 Resource Explorer for Kubernetes objects
- 📜 Pod logs and cluster events analysis
- 🚨 Severity classification and recommendations
- ⚡ FastAPI backend with Next.js frontend
- 🐳 Dockerized development environment

## 🏗️ Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- FastAPI
- Python

### Infrastructure
- Kubernetes
- Docker
- kubectl

### AI
- OpenRouter API
- Large Language Models (LLMs)

---

# Project Overview

The platform follows a simple workflow:

1. User initiates a cluster investigation.
2. The backend collects live Kubernetes resources using `kubectl`.
3. Cluster information is processed and structured.
4. An AI model analyzes the collected data.
5. The platform returns:
   - Root cause analysis
   - Issue severity
   - Recommended fixes
   - Best practices

The application is designed with a modular architecture that separates the frontend, backend, Kubernetes integration, and AI reasoning into independent components.

---

# 📚 Documentation

Detailed documentation for the project architecture, backend, Kubernetes integration, AI pipeline, and complete request flow is available in the **`architecture/`** directory.

Please refer to the architecture documents for an in-depth explanation of:

- Overall System Architecture
- Kubernetes Integration
- AI Investigation Pipeline
- Backend Architecture
- Frontend & End-to-End Request Flow

---

# 🚀 Getting Started

```bash
git clone <repository-url>
cd kubernetes-ai-troubleshooting-platform

docker compose up --build
```

Once the services are running:

- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`

---

# 📄 License

This project is intended for learning, experimentation, and demonstrating AI-assisted Kubernetes troubleshooting.