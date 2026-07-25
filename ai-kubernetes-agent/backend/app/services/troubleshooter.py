from loguru import logger
from app.kubernetes.inspector import inspect_pods, get_pod_logs
from app.ai.reasoner import analyze_diagnostics
from app.models.schemas import InvestigationRequest, InvestigationResult

def run_diagnostics(request: InvestigationRequest) -> InvestigationResult:
    """
    Orchestrator service to inspect cluster health and run AI troubleshooting.
    """
    logger.info(f"Starting diagnostics orchestrator for namespace: {request.namespace}")
    
    # 1. Inspect kubernetes layer (placeholder)
    pods = inspect_pods(request.namespace)
    pods_checked = [p["name"] for p in pods]
    
    # 2. Extract logs/reasons (placeholder)
    target_pod = request.pod_name or (pods_checked[1] if len(pods_checked) > 1 else None)
    logs = ""
    if target_pod:
        logs = get_pod_logs(target_pod, request.namespace)
        
    # 3. Analyze with AI layer (placeholder)
    analysis = analyze_diagnostics("CrashLoopBackOff", logs)
    
    return InvestigationResult(
        status="completed",
        pods_checked=pods_checked,
        root_cause=analysis["root_cause"],
        suggested_fix=analysis["suggested_fix"],
        metadata={"target_pod": target_pod, "raw_logs": logs}
    )
