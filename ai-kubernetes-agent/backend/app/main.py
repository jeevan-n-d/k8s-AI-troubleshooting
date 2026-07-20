import sys
import os
import subprocess
import shutil
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
from app.core.config import settings
from app.api.endpoints import router as api_router
from app.models.schemas import InvestigateRequest, InvestigateResponse, ClustersResponse
from app.kubernetes.service import investigation_service, publish_progress
from app.kubernetes.executor import kubectl_executor
from app.ai.reasoner import ai_reasoner

# Configure logging using Loguru
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level="INFO"
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend orchestration service for AI Kubernetes Troubleshooting Agent",
    version="1.0.0",
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root / health endpoint
@app.get("/health")
def health_check():
    logger.info("Health check endpoint called")
    return {
        "status": "healthy",
        "service": "ai-kubernetes-agent"
    }

@app.get("/cluster/debug")
def debug_cluster():
    logger.info("Cluster debug endpoint called")
    
    # 1. Check if kubeconfig path exists
    kubeconfig_path = os.environ.get("KUBECONFIG") or settings.KUBECONFIG_PATH or os.path.expanduser("~/.kube/config")
    kubeconfig_loaded = os.path.exists(kubeconfig_path) if kubeconfig_path else False
    
    # 2. Get current context
    current_context = "Unknown"
    cluster_reachable = False
    namespaces = []
    nodes = []
    pods = []
    services = []
    events = []
    
    kubectl_bin = shutil.which("kubectl") or "kubectl"
    
    err_context = ""
    err_reachable = ""
    try:
        # Get current context
        res = subprocess.run(
            [kubectl_bin, "config", "current-context", "--kubeconfig", kubeconfig_path] if kubeconfig_loaded else [kubectl_bin, "config", "current-context"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        if res.returncode == 0:
            current_context = res.stdout.strip()
        else:
            err_context = res.stderr.strip()
            
        # Check cluster reachability
        res_reach = subprocess.run(
            [kubectl_bin, "cluster-info", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "cluster-info", "--insecure-skip-tls-verify=true"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=5
        )
        cluster_reachable = (res_reach.returncode == 0)
        if not cluster_reachable:
            err_reachable = res_reach.stderr.strip()
        
        if cluster_reachable:
            # Namespaces
            res_ns = subprocess.run(
                [kubectl_bin, "get", "namespaces", "-o", "jsonpath={.items[*].metadata.name}", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "get", "namespaces", "-o", "jsonpath={.items[*].metadata.name}", "--insecure-skip-tls-verify=true"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            if res_ns.returncode == 0:
                namespaces = [ns.strip() for ns in res_ns.stdout.split() if ns.strip()]
                
            # Nodes
            res_nodes = subprocess.run(
                [kubectl_bin, "get", "nodes", "-o", "jsonpath={.items[*].metadata.name}", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "get", "nodes", "-o", "jsonpath={.items[*].metadata.name}", "--insecure-skip-tls-verify=true"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            if res_nodes.returncode == 0:
                nodes = [n.strip() for n in res_nodes.stdout.split() if n.strip()]
                
            # Pods
            res_pods = subprocess.run(
                [kubectl_bin, "get", "pods", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "get", "pods", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--insecure-skip-tls-verify=true"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            if res_pods.returncode == 0:
                pods = [p.strip() for p in res_pods.stdout.split() if p.strip()]
                
            # Services
            res_svcs = subprocess.run(
                [kubectl_bin, "get", "services", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "get", "services", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--insecure-skip-tls-verify=true"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            if res_svcs.returncode == 0:
                services = [s.strip() for s in res_svcs.stdout.split() if s.strip()]

            # Events
            res_evts = subprocess.run(
                [kubectl_bin, "get", "events", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--kubeconfig", kubeconfig_path, "--insecure-skip-tls-verify=true"] if kubeconfig_loaded else [kubectl_bin, "get", "events", "-A", "-o", "jsonpath={.items[*].metadata.name}", "--insecure-skip-tls-verify=true"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            if res_evts.returncode == 0:
                events = [e.strip() for e in res_evts.stdout.split() if e.strip()]
                
    except Exception as e:
        logger.error(f"Error in debug_cluster: {e}")
        
    # Detailed logging
    logger.info(f"[DEBUG CLUSTER] Kubeconfig Path: {kubeconfig_path}")
    logger.info(f"[DEBUG CLUSTER] Kubeconfig Loaded: {kubeconfig_loaded}")
    logger.info(f"[DEBUG CLUSTER] Current Context: {current_context}")
    logger.info(f"[DEBUG CLUSTER] Cluster Reachable: {cluster_reachable}")
    logger.info(f"[DEBUG CLUSTER] Namespaces Found: {namespaces}")
    logger.info(f"[DEBUG CLUSTER] Nodes Found: {nodes}")
    logger.info(f"[DEBUG CLUSTER] Pods Found: {pods}")
    logger.info(f"[DEBUG CLUSTER] Services Found: {services}")
    logger.info(f"[DEBUG CLUSTER] Events Found: {events}")
    
    return {
        "kubeconfig_loaded": kubeconfig_loaded,
        "current_context": current_context,
        "err_context": err_context,
        "cluster_reachable": cluster_reachable,
        "err_reachable": err_reachable,
        "namespaces": namespaces,
        "nodes": nodes,
        "pods": pods,
        "services": services
    }

@app.get("/contexts")
def get_contexts():
    logger.info("GET /contexts endpoint called")
    try:
        exit_code, stdout, stderr = kubectl_executor.execute(["config", "get-contexts", "-o", "name"])
        contexts = [c.strip() for c in stdout.splitlines() if c.strip()]
        
        exit_code_curr, stdout_curr, stderr_curr = kubectl_executor.execute(["config", "current-context"])
        current_context = stdout_curr.strip()
        
        return {
            "status": "success",
            "current_context": current_context,
            "contexts": contexts
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cluster/info")
def get_cluster_info_live():
    logger.info("GET /cluster/info endpoint called")
    try:
        exit_code, stdout, stderr = kubectl_executor.execute(["cluster-info"])
        return {
            "status": "success",
            "info": stdout.strip()
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve cluster info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/namespaces")
def get_namespaces_live():
    logger.info("GET /namespaces endpoint called")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "namespaces"])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve namespaces: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/nodes")
def get_nodes_live():
    logger.info("GET /nodes endpoint called")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "nodes"])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve nodes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pods")
def get_pods_live(namespace: str = "default"):
    logger.info(f"GET /pods endpoint called for namespace: {namespace}")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "pods", "-n", namespace])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve pods: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/deployments")
def get_deployments_live(namespace: str = "default"):
    logger.info(f"GET /deployments endpoint called for namespace: {namespace}")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "deployments", "-n", namespace])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve deployments: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/services")
def get_services_live(namespace: str = "default"):
    logger.info(f"GET /services endpoint called for namespace: {namespace}")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "services", "-n", namespace])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve services: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/events")
def get_events_live(namespace: str = "default"):
    logger.info(f"GET /events endpoint called for namespace: {namespace}")
    try:
        exit_code, data, stderr = kubectl_executor.execute_json(["get", "events", "-n", namespace])
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve events: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/storage")
def get_storage_live(namespace: str = "default", cluster: Optional[str] = None):
    logger.info(f"GET /storage endpoint called for namespace: {namespace}, cluster: {cluster}")
    try:
        exit_code_sc, data_sc, _ = kubectl_executor.execute_json(["get", "storageclasses"], cluster)
        exit_code_pv, data_pv, _ = kubectl_executor.execute_json(["get", "persistentvolumes"], cluster)
        exit_code_pvc, data_pvc, _ = kubectl_executor.execute_json(["get", "persistentvolumeclaims", "-n", namespace], cluster)
        
        return {
            "status": "success",
            "storage_classes": data_sc,
            "persistent_volumes": data_pv,
            "persistent_volume_claims": data_pvc
        }
    except Exception as e:
        logger.exception(f"Failed to retrieve storage resources: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/clusters")
def get_available_clusters():
    logger.info("Clusters endpoint called: retrieving available contexts from local kubeconfig")
    try:
        args = ["config", "get-contexts", "-o", "name"]
        exit_code, stdout, stderr = kubectl_executor.execute(args)
        contexts = [context.strip() for context in stdout.splitlines() if context.strip()]
        return {
            "status": "success",
            "clusters": contexts
        }
    except Exception as e:
        logger.exception(f"Failed to fetch contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/investigate", response_model=InvestigateResponse)
def run_investigation(request: InvestigateRequest = InvestigateRequest()):
    logger.info(f"Root investigate endpoint called for namespace: {request.namespace}, channel: {request.channel}, cluster: {request.cluster}")
    
    try:
        # 1. Collect evidence
        evidence = investigation_service.run_investigation(request.namespace, request.channel, request.cluster)
        
        # 2. Perform AI reasoning
        publish_progress(request.channel, "AI Reasoning", "running")
        logger.info("AIReasoner: Initiating reasoning and diagnosis analysis...")
        diagnosis = ai_reasoner.analyze(evidence)
        publish_progress(request.channel, "AI Reasoning", "completed")
        publish_progress(request.channel, "Root Cause Found", "completed")
        
        return InvestigateResponse(
            status="success",
            investigation=evidence,
            diagnosis=diagnosis
        )
    except Exception as e:
        logger.exception(f"Failed to run investigation: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting local server...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
