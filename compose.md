# KubePilot AI — Docker Compose

Docker Compose is used to run the frontend and backend containers together.

---

## Services

```
Frontend → localhost:3000
Backend  → localhost:8000
```

**Backend**

- Builds from `backend/Dockerfile`
- Exposes port `8000`
- Mounts `~/.kube` so the backend can access the Kubernetes kubeconfig
- Provides OpenRouter and Kubernetes configuration through environment variables
- Uses `host.docker.internal` to allow the container to reach the host machine

**Frontend**

- Builds from `frontend/Dockerfile`
- Exposes port `3000`
- Uses `NEXT_PUBLIC_API_BASE_URL` to know where the FastAPI backend is located
- Starts after the backend container

---

## Run the Project

```
docker compose up --build
```

Access:

```
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Swagger:  http://localhost:8000/docs
```

---

## Main Flow

```
Browser
   ↓
Frontend :3000
   ↓
FastAPI Backend :8000
   ↓
kubectl
   ↓
Kubernetes Cluster
```

---

## Important Volumes

```
- ~/.kube:/root/.kube:ro
```

Makes the host's kubeconfig available to the backend container as read-only.

```
- ./backend:/app
```

Development bind mount that makes local backend code available inside the container.