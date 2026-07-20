# AI Kubernetes Troubleshooting Platform

## Project Overview
The **AI Kubernetes Troubleshooting Platform** is an enterprise-grade SRE (Site Reliability Engineering) and DevOps observability/troubleshooting system. Its primary purpose is to connect natively to local and remote Kubernetes clusters, dynamically discover cluster contexts, monitor workloads, and intelligently diagnose failures in real-time. By leveraging Advanced AI reasoning models (such as Claude 3.5 Sonnet, LLaMA 3, etc.), the platform automatically correlates cluster logs, events, metrics, and network endpoint configurations to provide root-cause analyses, technical explanations, and actionable `kubectl` fixes.

## Tech Stack
* **Frontend:** React, Next.js (Pages or App Router), Tailwind CSS (3.4), TypeScript, Axios, `@tanstack/react-query`
* **Backend:** Python, FastAPI, Uvicorn, Pydantic (v2), Loguru (Logging), HTTPX
* **AI Engine:** OpenRouter API Integration (e.g., LLaMA 3 70B, Claude 3.5 Sonnet), OpenAI-compatible Client, Custom Local SRE Fallback Correlation Rule-Engine
* **Containerization:** Docker, Docker Compose
* **Kubernetes:** Native Host `kubectl` CLI Integration, mapped containerized kubeconfig routing
* **Cloud:** Multi-cluster GKE, EKS, AKS capability
* **Database (Backend Platform):** InsForge BaaS (PostgreSQL with PostgREST API)
* **Authentication:** InsForge Authentication (Email/Password + OAuth with OTP Verification)

---

## Current Architecture
The platform is organized into three major components:
1. **Frontend App (Next.js):** Communicates with the Backend APIs to retrieve live cluster information and initiate diagnostics. It integrates with **InsForge BaaS** for secure SRE authentication (Sign-in/Sign-up) and securely connects to InsForge's WebSocket Realtime channels to receive live step-by-step progress updates during cluster diagnostics.
2. **Backend Orchestrator (FastAPI):** Exposes endpoints to read live cluster workloads and trigger troubleshooting. It connects to the Kubernetes cluster using a shell-native `kubectl_executor` layer and coordinates multiple automated inspect modules.
3. **Evidence Collectors & AI Reasoner (Python):**
   - **PodInspector:** Collects live pod states, container states, and restart counts.
   - **LogsCollector:** Automatically tails and scans the last 100 lines of logs from failing pods for startup errors, database exceptions, etc.
   - **EventsAnalyzer:** Inspects warning and critical cluster events.
   - **DeploymentInspector & NetworkInspector:** Evaluates replica sets and checks service selector/active endpoint configurations.
   - **AIReasoner:** Aggregates this evidence and queries OpenRouter models to generate the final diagnosis JSON, falling back to a local SRE rule correlation engine if the LLM is unreachable.

```
+------------------+       HTTPS / REST       +-----------------------+
|  Next.js Client  | <----------------------> |  FastAPI Orchestrator |
|    (Frontend)    |                          |       (Backend)       |
+------------------+                          +-----------------------+
         ^                                                |
         | Realtime Websockets                            | Subprocess execute
         v                                                v
+------------------+                          +-----------------------+
|  InsForge BaaS   | <----------------------- |     Local Cluster     |
|   (PostgreSQL)   |     Database Sync        |    (kubectl/config)   |
+------------------+                          +-----------------------+
```

---

## Current Backend Status
The backend has been fully upgraded to a robust, live-data system that natively reads the Kubernetes cluster. Every piece of fallback or mock data has been removed from the core cluster inspector flow.

### Key Backend Achievements:
* **True Live Cluster Connectivity:** The backend no longer returns simulated static JSON when communicating with the cluster. If the cluster is unreachable or misconfigured, it actively raises an exception and bubbles the true error to the client.
* **Automatic Kubeconfig Mapping & Routing:** Resolves Docker container-to-host routing on Windows/macOS. It automatically copies the mounted `/root/.kube/config`, detects if it is running inside Docker, and replaces `127.0.0.1` or `localhost` with `host.docker.internal` to reach the host's Kubernetes API.
* **TLS Certificate Bypass:** Automatically appends `--insecure-skip-tls-verify=true` when executing `kubectl` against the mapped host-gateway config, bypassing x509 validation errors while preserving host-side security.
* **No Mock Diagnoses:** The AI Reasoner detects if the targeted cluster/namespace contains no workloads (0 pods & 0 deployments) and returns a clean, factual "No Kubernetes workloads detected" response instead of generating a fake issue.

### Available Backend API Endpoints:

| Endpoint | Method | Response Description |
|---|---|---|
| `/health` | `GET` | Verifies the backend service is running and healthy. |
| `/cluster/debug` | `GET` | Diagnostics route returning if kubeconfig is loaded, current context, cluster reachability, and lists of live namespaces, nodes, pods, and services. |
| `/contexts` | `GET` | Fetches the current context and list of all available contexts along with live metadata (Node Count, Namespace Count, K8s Version, Status, and Cluster Type). |
| `/cluster/info` | `GET` | Performs a live `kubectl cluster-info` and returns the raw output. |
| `/namespaces` | `GET` | Returns the raw list of namespaces in JSON format directly from the active cluster. |
| `/nodes` | `GET` | Returns the list of cluster nodes and their metadata in JSON. |
| `/pods` | `GET` | Returns all pods in the specified namespace (defaults to `default`). |
| `/deployments` | `GET` | Returns all deployments in the specified namespace. |
| `/services` | `GET` | Returns all services in the specified namespace. |
| `/events` | `GET` | Returns all live event logs in the specified namespace. |
| `/storage` | `GET` | Returns StorageClasses, PersistentVolumes, and PersistentVolumeClaims. |
| `/investigate` | `POST` | Orchestrates a live cluster-wide investigation, publishes steps via Realtime Websockets, queries the AI Reasoner, and saves the final diagnostic report into the PostgreSQL database. |

---

## Current Frontend Status
* **Completed:** Secured authentication pages (Sign-in, Sign-up, and email OTP verification), protected dashboard entry, websocket-based progress tracker, list of previous investigations, and a basic proof-of-concept diagnostic layout.
* **Needs Improvement:** The UI is currently a simple single-page dashboard. It does not behave like an enterprise cluster management and troubleshooting platform. The workflow and layout require a deep redesign to match high-end tools like Lens or Rancher.

---

## Current UI Issues
* **Immediate Investigation:** The dashboard automatically starts investigating the cluster on load, which is inefficient and non-standard.
* **No Cluster Discovery:** There is no cluster discovery landing screen for SREs to see and select from their kubeconfig contexts.
* **No Cluster Selection:** The user has no way of visually exploring available clusters/contexts before running diagnostics.
* **Poor Investigation Workflow:** The options for scoping investigations (Entire Cluster vs Specific Namespace/Pod) are cluttered and do not update dynamically based on the active cluster.
* **Immediate AI Report:** The AI diagnosis and troubleshooting report are shown on the home page instead of being isolated in a beautiful dedicated report card or page.
* **Proof-of-Concept Look:** The page lacks professional sidebar navigation, top bars, and tabbed resource explorers seen in enterprise tools.

---

## Target UI Vision
The application must transition to a structured, highly professional, non-automatic workflow.

```
             +----------------------------+
             |      Open Application      |
             +----------------------------+
                           |
                           v
             +----------------------------+
             | Discover K8s Contexts/Cards|
             +----------------------------+
                           |
                           v
             +----------------------------+
             |   Select Target Cluster    |
             +----------------------------+
                           |
                           v
             +----------------------------+
             | View Live Resource Explorer|
             |  (Nodes, Pods, Storage)    |
             +----------------------------+
                           |
                           v
             +----------------------------+
             |  Configure & Run AI SRE    |
             |       Investigation        |
             +----------------------------+
                           |
                           v
             +----------------------------+
             | Display Beautiful Report & |
             |     Collapsible Fixes      |
             +----------------------------+
```

---

## Development Roadmap

### 🟩 Phase 1: Professional Frontend Layout
* Implement an enterprise-grade dark UI featuring a left-side navigation sidebar, top navigation bar, and a central workspace canvas.

### ⬜ Phase 2: Cluster Discovery
* Build a dedicated "Clusters" discovery page that reads available contexts from kubeconfig and presents them as modern, high-tech cards with metadata.

### ⬜ Phase 3: Cluster Selection
* Implement active cluster highlighting with a glowing blue border and let the user set their target context.

### ⬜ Phase 4: Investigation Configuration
* Build a scoping panel (Entire Cluster vs Namespace/Deployment/Pod) with dropdowns that populate dynamically depending on the selected cluster's live resources.

### ⬜ Phase 5: Investigation Progress
* Craft a high-end progress stepper displaying the 10 real-time investigation stages with animated spinners and green checkmarks.

### ⬜ Phase 6: AI Diagnosis Dashboard
* Design a premium collapsible AI SRE report layout containing cluster health percentage, affected resources, severity badges, and copyable `kubectl` command blocks.

### ⬜ Phase 7: Advanced Kubernetes Analysis
* Implement fully-fledged tabbed live resource tables (Nodes, Pods, Services, Deployments, Storage, Events, Logs) with custom auto-refresh timers (10s, 30s, 60s, Off).

*Current Status: Phase 1 is the next immediate objective.*

---

## Important Project Rules
1. **Never use mock Kubernetes data:** Every resource list, node count, and pod log must represent live cluster data.
2. **Never hardcode workloads:** Do not write fake pod names, service names, or mock incidents.
3. **Raise exceptions immediately:** If the cluster is unreachable, let the raw error bubble up to the client so that SREs can debug their kubeconfig/access.
4. **Preserve existing backend APIs:** Retain backend routes and database schemas unless modifications are strictly required by the design.
5. **Build incrementally:** Test that the application compiles perfectly after every major frontend refactor.
6. **Keep reusable React components:** Modularize the sidebar, top navigation, loading steppers, and resource tables cleanly.
7. **Follow enterprise coding standards:** Write semantic TypeScript, clean Tailwind layouts, and robust exception handlers.

---

## Future Features
- [ ] Multi-cluster GKE/EKS dashboard support
- [ ] Live cluster-wide CPU/Memory metrics dashboard
- [ ] Interactive Pod log viewer with autoscrolling
- [ ] Real-time event timeline visualization
- [ ] Live YAML editor and viewer for running workloads
- [ ] Automated kubectl command generator and execution terminal
- [ ] Integrated Helm releases manager
- [ ] Prometheus & Grafana alerting metrics integration
- [ ] Report export (PDF/JSON)
- [ ] RBAC viewer and policy analyzer

---

## Current Goal
The next immediate development task is to **redesign the frontend layout and UI**. 
This includes implementing the left sidebar (Dashboard, Clusters, Resources, Investigation, AI Reports, Settings), top navigation bar (Current Cluster, Context, Connection Status), and laying out the central workspace canvas to look like a premium enterprise SaaS dashboard, completely replacing the proof-of-concept single-page layout without breaking the underlying backend APIs or database integrations.

---

## Notes for Future AI Agents
* **The Connection is Resolved:** The backend container connects perfectly to the host's `docker-desktop` cluster using `/tmp/mapped_kubeconfig` (with `host.docker.internal` and `--insecure-skip-tls-verify=true`). Do not touch the kubeconfig mapping or docker-compose volume mapping as they are fully optimal.
* **Backend Live Routes:** The backend has dedicated routes at `/contexts`, `/cluster/info`, `/namespaces`, `/nodes`, `/pods`, `/deployments`, `/services`, `/events`, and `/storage` that return real JSON from the cluster. Use them to feed your newly designed frontend tables!
* **Authentication is active:** The frontend already has a functional authentication state (`user`, `checkUser`, `handleSignOut`, etc.). Preserve these states and wrap your new sidebar/dashboard layout inside the authenticated user view.
