# KubePilot AI — Backend (Interview-Level Understanding)

Think of the backend as just 6 parts:

```
Frontend
   ↓
FastAPI
   ↓
Investigation Service
   ↓
Kubernetes / kubectl
   ↓
AI / OpenRouter
   ↓
Response → Frontend
```

---

## 1. FastAPI

**Purpose:** Connects frontend and backend.

```
Frontend → HTTP request → FastAPI
```

Example:

```
POST /investigate
```

---

## 2. Investigation Service

**Purpose:** Orchestrates the whole investigation.

It tells the backend:

```
Check Pods
   ↓
Read Logs
   ↓
Check Events
   ↓
Check Deployments
   ↓
Check Networking
```

Think of it as the manager.

---

## 3. Kubernetes Layer

**Purpose:** Gets information from Kubernetes.

It uses:

```
Python
 ↓
kubectl
 ↓
Kubernetes API Server
 ↓
Cluster information
```

It collects:

- Pods
- Nodes
- Deployments
- Services
- Events
- Logs

---

## 4. kubectl Executor

**Purpose:** Actually runs the kubectl commands.

For example:

```
kubectl get pods
kubectl get nodes
kubectl get events
```

Python runs these commands inside the backend container.

The container has:

```
kubectl
+
kubeconfig
```

So:

```
Backend container
      ↓
kubectl
      ↓
mounted kubeconfig
      ↓
Kubernetes cluster
```

---

## 5. AI Layer

**Purpose:** Takes the Kubernetes information and asks the LLM to analyze it.

```
Kubernetes evidence
        ↓
AI
        ↓
Root Cause
        ↓
Suggested Fix
        ↓
Confidence
```

AI doesn't directly access Kubernetes.

---

## 6. Models / Config

Two simple purposes:

**`schemas.py`**

Defines the format of requests/responses.

- What data comes in?
- What data goes out?

**`config.py`**

Reads configuration such as:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `KUBECONFIG_PATH`

---

## The One Flow You Should Memorize

If the interviewer asks **"Explain your backend architecture"**, say:

> "My backend is built with FastAPI and acts as the orchestrator. The frontend sends an investigation request to FastAPI. The investigation service coordinates the Kubernetes investigation. The Kubernetes layer uses kubectl through Python subprocess and the mounted kubeconfig to communicate with the selected Kubernetes cluster. It collects pods, logs, events, deployments and networking information. This evidence is then passed to the AI layer, which uses OpenRouter to generate root-cause analysis and recommended fixes. Finally, FastAPI returns the structured diagnosis to the frontend."

That's enough.

---

## Files → What to Remember

| File/folder | Remember this |
|---|---|
| `main.py` | Starts FastAPI |
| `api/` | API endpoints |
| `services/` | Orchestrates work |
| `kubernetes/` | Talks to Kubernetes |
| `executor.py` | Runs kubectl |
| `ai/` | AI reasoning |
| `models/` | Data structures |
| `core/config.py` | Configuration |
| `Dockerfile` | Builds backend container |