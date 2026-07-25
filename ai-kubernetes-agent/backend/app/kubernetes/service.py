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
        try:
            pods_result = PodInspector.inspect(namespace, cluster)
        except Exception as e:
            logger.error(f"InvestigationService: Pod check failed: {e}")
            pods_result = {
                "healthy": True,
                "total_pods": 0,
                "healthy_pods_count": 0,
                "problematic_pods": [],
                "error": str(e)
            }
        publish_progress(channel, "Checking Pods", "completed")
        
        # 2. Collect logs for failed/problematic pods
        publish_progress(channel, "Reading Logs", "running")
        try:
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
        except Exception as e:
            logger.error(f"InvestigationService: Log collection failed: {e}")
            logs_result = {
                "pod_name": "unknown",
                "lines_collected": 0,
                "critical_findings": [],
                "raw_logs_snippet": "",
                "error": str(e)
            }
        publish_progress(channel, "Reading Logs", "completed")
            
        # 3. Analyze events
        publish_progress(channel, "Analyzing Events", "running")
        try:
            events_result = EventsAnalyzer.analyze(namespace, cluster)
        except Exception as e:
            logger.error(f"InvestigationService: Event analysis failed: {e}")
            events_result = {
                "total_warnings_detected": 0,
                "warning_events": [],
                "error": str(e)
            }
        publish_progress(channel, "Analyzing Events", "completed")
        
        # 4. Inspect deployments
        publish_progress(channel, "Inspecting Deployments", "running")
        try:
            deployments_result = DeploymentInspector.inspect(namespace, cluster)
        except Exception as e:
            logger.error(f"InvestigationService: Deployment inspection failed: {e}")
            deployments_result = {
                "all_deployments_count": 0,
                "healthy": True,
                "unhealthy_deployments": [],
                "error": str(e)
            }
        publish_progress(channel, "Inspecting Deployments", "completed")
        
        # 5. Check networking status
        publish_progress(channel, "Checking Networking", "running")
        try:
            network_result = NetworkInspector.inspect(namespace, cluster)
        except Exception as e:
            logger.error(f"InvestigationService: Network check failed: {e}")
            network_result = {
                "services": [],
                "error": str(e)
            }
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
