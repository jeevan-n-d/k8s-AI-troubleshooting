import httpx
from loguru import logger
from typing import Dict, Any, Optional

def publish_progress(channel: Optional[str], step: str, status: str):
    if not channel:
        return
    url = "https://9iw722cb.ap-southeast.insforge.app/api/database/records/investigations"
    headers = {
        "apikey": "anon_967ac35e0c77f242eca06c1d8d0d0b7f75adf13002ebc2d7a8b5a0f4dbc52c15",
        "Authorization": "Bearer anon_967ac35e0c77f242eca06c1d8d0d0b7f75adf13002ebc2d7a8b5a0f4dbc52c15",
        "Content-Type": "application/json"
    }
    
    # Database inserts must be an array on InsForge (PostgREST)
    payload = [{
        "user_id": "progress_update",
        "namespace": channel,
        "root_cause": step,
        "fix": status,
        "status": "progress_update"
    }]
    
    try:
        with httpx.Client(timeout=2.0) as client:
            response = client.post(url, headers=headers, json=payload)
            if response.status_code not in [200, 201]:
                logger.warning(f"Failed to publish progress: {response.status_code} - {response.text}")
            else:
                logger.info(f"Published progress event successfully: {step} - {status} to {channel}")
    except Exception as e:
        logger.error(f"Error publishing progress: {e}")

from app.kubernetes.inspector import (
    PodInspector,
    LogsCollector,
    EventsAnalyzer,
    DeploymentInspector,
    NetworkInspector
)

class InvestigationService:
    """
    Orchestrates evidence collection by calling all inspectors in parallel/sequence.
    Acts like a junior DevOps engineer gathering data.
    """
    @staticmethod
    def run_investigation(namespace: str = "default", channel: str = None, cluster: str = None) -> Dict[str, Any]:
        logger.info(f"InvestigationService: Starting comprehensive investigation on namespace '{namespace}', cluster '{cluster}'")
        
        # 1. Check pods status
        publish_progress(channel, "Checking Pods", "running")
        pods_result = PodInspector.inspect(namespace, cluster)
        publish_progress(channel, "Checking Pods", "completed")
        
        # 2. Collect logs for failed/problematic pods
        publish_progress(channel, "Reading Logs", "running")
        logs_result = {}
        problematic_pods = pods_result.get("problematic_pods", [])
        if problematic_pods:
            primary_failed_pod = problematic_pods[0]["name"]
            logs_result = LogsCollector.collect(primary_failed_pod, namespace, cluster)
        else:
            logger.info("InvestigationService: No problematic pods found. Skipping log collection.")
            logs_result = {
                "message": "No problematic pods detected in namespace. No logs collected.",
                "lines_collected": 0,
                "critical_findings": []
            }
        publish_progress(channel, "Reading Logs", "completed")
            
        # 3. Analyze events
        publish_progress(channel, "Analyzing Events", "running")
        events_result = EventsAnalyzer.analyze(namespace, cluster)
        publish_progress(channel, "Analyzing Events", "completed")
        
        # 4. Inspect deployments
        publish_progress(channel, "Inspecting Deployments", "running")
        deployments_result = DeploymentInspector.inspect(namespace, cluster)
        publish_progress(channel, "Inspecting Deployments", "completed")
        
        # 5. Check networking status
        publish_progress(channel, "Checking Networking", "running")
        network_result = NetworkInspector.inspect(namespace, cluster)
        publish_progress(channel, "Checking Networking", "completed")

        logger.info(f"InvestigationService: Investigation completed for namespace '{namespace}', cluster '{cluster}'")
        return {
            "pods": pods_result,
            "logs": logs_result,
            "events": events_result,
            "deployments": deployments_result,
            "network": network_result
        }

investigation_service = InvestigationService()
