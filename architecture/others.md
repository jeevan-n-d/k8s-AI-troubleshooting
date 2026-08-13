# KubePilot AI — Executor, Inspector & Troubleshooter Hierarchy

## 1. `executor.py` — ACTUALLY RUNS kubectl

This is the lowest level.

The code has:

```python
subprocess.run(command, ...)
```

So its job is simply:

> Execute the Kubernetes command and return the result.

For example:

```
Executor
   ↓
kubectl get pods
   ↓
Kubernetes
   ↓
pod information
```

It doesn't decide why you're investigating.
It doesn't decide what the problem is.
It just executes commands.

---

## 2. `inspector.py` — DECIDES WHAT TO COLLECT

The inspector sits one level above the executor.

Its job is:

> Ask for specific Kubernetes information in a useful way.

For example:

```
PodInspector
     ↓
"I need pod information"
     ↓
Executor
     ↓
kubectl get pods -o json
```

Another:

```
LogsCollector
     ↓
"I need logs from this failed pod"
     ↓
Executor
     ↓
kubectl logs <pod>
```

Another:

```
EventsAnalyzer
     ↓
"I need Kubernetes events"
     ↓
Executor
     ↓
kubectl get events
```

So:

- **INSPECTOR** = WHAT information do I need?
- **EXECUTOR** = HOW do I execute kubectl to get it?

---

## 3. `troubleshooter.py` — COORDINATES THE INVESTIGATION

Now go one level higher.

`troubleshooter.py` has logic like:

```python
run_diagnostics()
```

Its job is:

> Coordinate the overall troubleshooting process.

Conceptually:

```
Troubleshooter
      │
      ├── inspect pods
      │
      ├── collect logs
      │
      └── send information for AI analysis
```

So it doesn't directly need to know how `subprocess.run()` works.

It says: "I need pod information."
The inspector handles that.
The inspector says: "I need the executor."
The executor runs: `kubectl get pods`

---

## The Hierarchy

This is the important part:

```
                 TROUBLESHOOTER
                "Investigate"
                     │
                     ▼
                  INSPECTOR
             "Collect evidence"
                     │
                     ▼
                  EXECUTOR
              "Run kubectl"
                     │
                     ▼
                  KUBECTL
                     │
                     ▼
              KUBERNETES API
```

In simple English:

| Component | Responsibility |
|---|---|
| Troubleshooter | Coordinates the troubleshooting process |
| Inspector | Decides/collects what Kubernetes information is needed |
| Executor | Actually executes kubectl |
| kubectl | Communicates with Kubernetes |
| Kubernetes | Provides the actual cluster information |

---

## Example: Pod is Crashing

Suppose you click **Investigate**.

Troubleshooter says:

> "I need to investigate this namespace."

↓

Inspector says:

> "First, I'll inspect the pods."

↓

Executor says:

> "I'll execute the command."

↓

```
kubectl get pods -o json
```

↓

Kubernetes responds:

```
pod: nginx
status: CrashLoopBackOff
restarts: 15
```

↓

Inspector returns the structured information.

↓

Troubleshooter continues:

> "This pod is problematic. Get its logs."

↓

LogsCollector:

> "I need logs."

↓

Executor:

```
kubectl logs nginx
```

↓

Kubernetes returns:

```
connection refused
```

↓

Troubleshooter now has:

```
Pod status
+
Logs
```

↓

AI Reasoner:

```
Evidence
   ↓
OpenRouter
   ↓
LLM
   ↓
Diagnosis
```