# KubePilot AI — Project Status & Release Notes

## Project Overview
**KubePilot AI** is an enterprise-grade SRE (Site Reliability Engineering) and DevOps observability/troubleshooting system. Its primary purpose is to connect natively to local and remote Kubernetes clusters, dynamically discover cluster contexts, monitor workloads, and intelligently diagnose failures in real-time. By leveraging Advanced AI reasoning models (such as LLaMA 3 70B, Claude 3.5 Sonnet, etc.) via OpenRouter or custom deterministic SRE rule correlation, KubePilot AI automatically analyzes cluster logs, events, metrics, and network configurations to provide root-cause diagnostics and actionable, copyable `kubectl` fixes.

## Tech Stack
* **Frontend:** React, Next.js (App Router), Tailwind CSS, TypeScript, Axios, `@tanstack/react-query`
* **Backend:** Python, FastAPI, Uvicorn, Pydantic (v2), Loguru (Logging), HTTPX
* **AI Engine:** OpenRouter API Integration, Custom Local SRE Fallback Correlation Engine
* **Database & Auth (BaaS Platform):** InsForge BaaS (PostgreSQL with PostgREST APIs and Realtime WebSockets)

---

## Current Capabilities
* **KubePilot Rebranding:** Fully customized sidebar, logo components, browser titles, auth screens, and about cards to KubePilot AI brand.
* **True Live Cluster Connectivity:** Subprocess-driven live cluster connectivity with kop-tls bypassing and dynamic host Docker-to-Host loopback routing.
* **Segmented SRE Planner:** Completely modernized, wider grid-based config planner card containing unified 4-column Target Scope selections.
* **Persistent History Archives:** Native InsForge BaaS investigations database schema extended to support comprehensive `cluster`, `context`, and `evidence` (jsonb) logs. Selectable history lists instantly instantiate horizontal-scrolling diagnostic modal overlays.
* **Factual Application Metrics:** The dashboard counts and lists (Running Pods, Active Deployments, Namespaces) actively filter out all default Kubernetes infrastructure namespaces (e.g., `kube-system`, `ingress-nginx`, `monitoring`, etc.) to isolate purely user application workloads.
* **Simplified Top Navbar:** Cleaned top navigation headers to focus on logo titles and active Sign Out buttons.
* **Fault-Tolerant Investigations:** If log tailing is blocked for init/waiting/ImagePullBackOff containers, the backend captures the exception gracefully and proceeds to generate diagnoses from events and workload states.

---

## Completed during this Session

### SRE Planner Card Redesign
* Increased the Planner Card width to `lg:col-span-5` inside the 12-column workspace layout.
* Implemented a strict 4-column CSS grid Target Scope segmented selector to resolve button overflow issues.
* Increased padding, vertical margins, and select field heights to Grafana/Vercel settings standards.

### Complete SRE History Archival
* Extended the `investigations` BaaS table schema with `cluster`, `context`, and `evidence` columns.
* Enhanced `page.tsx` to insert unified workload metrics and health indices into the persistent schema.
* Created a rich horizontal-scrolling audit modal to inspect historical logs, deployments, and AI playbooks.

### Kubernetes SRE Metrics Filtering
* Upgraded the `/cluster/debug` API endpoint to parse and filter out the following infrastructure namespaces from dashboard cards:
  * `kube-system`, `kube-public`, `kube-node-lease`, `local-path-storage`, `ingress-nginx`, `cert-manager`, `monitoring`, `cattle-system`, `istio-system`, `kube-flannel`, `metallb-system`.

### Infrastructure Bug Fixes
* **FastAPI CORS Fix:** Fixed container startup crashes by replacing the wildcard origin parameter with explicit trusted localhost endpoints: `["http://localhost:3000", "http://127.0.0.1:3000"]`.
* **Dynamic Context Propagation:** Added explicit selected context forwarding to the `/investigate` POST body, ensuring investigations match the operator's active context.
* **Collapsible Evidence Panels:** Added individual toggle states to Nodes, Namespaces, Pods, Deployments, Services, Events, Logs, and Storage detail panels.

---

## Architecture Changes
```
+-----------------------------------------------------------+
|                        BROWSER                            |
|                       (React JS)                          |
+-----------------------------------------------------------+
        | (REST API Calls)                 ^ (Realtime WebSocket)
        v                                  |
+------------------------------+   +------------------------+
|     FastAPI Orchestrator     |   |     InsForge BaaS      |
|           (Backend)          |   |      (PostgreSQL)      |
+------------------------------+   +------------------------+
        |                                  ^
        | Executes commands                | Saves historical data &
        v                                  | publishes progress
+------------------------------+           |
|      KubectlExecutor         |-----------+
| (Local / Mapped Kubeconfig)  |
+------------------------------+
```
* **Hoisted State Management:** Hoisted context management states up to `page.tsx` as a single source of truth, updating the sidebar footer and dashboard cards instantly on context switch.

---

## Known Issues
* No unresolved database synchronization or CORS-preflight blocks detected.

## Next Tasks
- [ ] Add interactive live YAML editor and viewer for running workloads.
- [ ] Implement live cluster-wide CPU/Memory metrics line dashboard.
- [ ] Develop Helm releases manager tab.
- [ ] Integrate Prometheus/Alertmanager alert streams.
