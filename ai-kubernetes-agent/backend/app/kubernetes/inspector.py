from typing import List, Dict, Any, Optional
from loguru import logger
from app.kubernetes.executor import kubectl_executor

class PodInspector:
    """
    Inspects Kubernetes pods and identifies unhealthy/problematic ones.
    """
    @staticmethod
    def inspect(namespace: str = "default", cluster: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"PodInspector: Inspecting pods in namespace '{namespace}', cluster '{cluster}'")
        args = ["get", "pods", "-n", namespace, "-o", "json"]
        exit_code, data, stderr = kubectl_executor.execute_json(args, cluster)
        
        problematic_pods = []
        healthy_count = 0
        total_count = 0

        items = data.get("items", [])
        for item in items:
            total_count += 1
            metadata = item.get("metadata", {})
            name = metadata.get("name")
            pod_namespace = metadata.get("namespace", namespace)
            
            # Retrieve status fields
            status_obj = item.get("status", {})
            phase = status_obj.get("phase", "Unknown")
            
            # Parse container status for precise errors
            container_statuses = status_obj.get("containerStatuses", [])
            state_reason = None
            is_unhealthy = False
            restarts = 0

            for cs in container_statuses:
                state = cs.get("state", {})
                waiting = state.get("waiting")
                terminated = state.get("terminated")
                restarts += cs.get("restartCount", 0)
                
                if waiting:
                    reason = waiting.get("reason", "")
                    if reason in ["CrashLoopBackOff", "ImagePullBackOff", "ErrImagePull", "ContainerCreating", "CreateContainerConfigError"]:
                        state_reason = reason
                        is_unhealthy = True
                elif terminated:
                    reason = terminated.get("reason", "")
                    if reason in ["OOMKilled", "Error", "ContainerCannotRun"]:
                        state_reason = reason
                        is_unhealthy = True
                    elif terminated.get("exitCode", 0) != 0:
                        state_reason = f"ExitCode:{terminated.get('exitCode')}"
                        is_unhealthy = True

            node_name = status_obj.get("nodeName", "Unknown")
            pod_ip = status_obj.get("podIP", "Unknown")
            
            # Fetch container images
            spec_obj = item.get("spec", {})
            containers = spec_obj.get("containers", [])
            images = [c.get("image", "Unknown") for c in containers] if containers else []
            image_str = ", ".join(images) if images else "Unknown"
            
            # Compute ready status
            ready_count = sum(1 for cs in container_statuses if cs.get("ready", False))
            total_containers = len(container_statuses) if container_statuses else len(containers)
            ready_status = f"{ready_count}/{total_containers}" if total_containers > 0 else "0/1"

            if phase in ["Failed", "Pending"] or is_unhealthy:
                problematic_pods.append({
                    "name": name,
                    "namespace": pod_namespace,
                    "status": state_reason or phase,
                    "phase": phase,
                    "restarts": restarts,
                    "node": node_name,
                    "ip": pod_ip,
                    "image": image_str,
                    "ready_status": ready_status
                })
            else:
                healthy_count += 1

        return {
            "healthy": len(problematic_pods) == 0,
            "total_pods": total_count,
            "healthy_pods_count": healthy_count,
            "problematic_pods": problematic_pods
        }


class LogsCollector:
    """
    Collects logs from problematic pods and screens for startup exceptions or errors.
    """
    @staticmethod
    def collect(pod_name: str, namespace: str = "default", cluster: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"LogsCollector: Collecting logs for pod '{pod_name}' in namespace '{namespace}', cluster '{cluster}'")
        try:
            # Tail last 100 lines only to stay concise
            args = ["logs", pod_name, "-n", namespace, "--tail=100"]
            exit_code, stdout, stderr = kubectl_executor.execute(args, cluster)
            
            # Basic scanning for errors
            critical_keywords = ["Exception", "Error", "failed", "refused", "timeout", "missing", "Database"]
            findings = []
            for line in stdout.splitlines():
                if any(kw.lower() in line.lower() for kw in critical_keywords):
                    findings.append(line.strip())

            return {
                "pod_name": pod_name,
                "lines_collected": len(stdout.splitlines()),
                "critical_findings": findings[:10], # top 10 error findings
                "raw_logs_snippet": stdout[:2000] # max 2KB raw snippet
            }
        except Exception as e:
            logger.warning(f"LogsCollector: Failed to collect logs for pod '{pod_name}': {e}")
            return {
                "pod_name": pod_name,
                "lines_collected": 0,
                "critical_findings": [],
                "raw_logs_snippet": "",
                "error": str(e)
            }


class EventsAnalyzer:
    """
    Analyzes Kubernetes events in a namespace for schedules, mount failures, or pull issues.
    """
    @staticmethod
    def analyze(namespace: str = "default", cluster: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"EventsAnalyzer: Analyzing events in namespace '{namespace}', cluster '{cluster}'")
        args = ["get", "events", "-n", namespace, "-o", "json"]
        exit_code, data, stderr = kubectl_executor.execute_json(args, cluster)
        
        items = data.get("items", [])
        warning_events = []
        
        critical_reasons = ["FailedScheduling", "BackOff", "FailedMount", "FailedPull", "ErrImagePull", "Unhealthy", "OOMKilled"]

        for item in items:
            reason = item.get("reason")
            message = item.get("message", "")
            type_str = item.get("type", "Normal")
            
            involved_obj = item.get("involvedObject", {})
            obj_kind = involved_obj.get("kind", "Unknown")
            obj_name = involved_obj.get("name", "Unknown")

            if type_str == "Warning" or reason in critical_reasons:
                warning_events.append({
                    "reason": reason,
                    "message": message,
                    "object_kind": obj_kind,
                    "object_name": obj_name,
                    "count": item.get("count", 1)
                })

        return {
            "total_warnings_detected": len(warning_events),
            "warning_events": warning_events[:10] # Top 10 warnings
        }


class DeploymentInspector:
    """
    Inspects deployments to check replica health, availability, and conditions.
    """
    @staticmethod
    def inspect(namespace: str = "default", cluster: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"DeploymentInspector: Inspecting deployments in namespace '{namespace}', cluster '{cluster}'")
        args = ["get", "deployments", "-n", namespace, "-o", "json"]
        exit_code, data, stderr = kubectl_executor.execute_json(args, cluster)
        
        items = data.get("items", [])
        unhealthy_deployments = []

        for item in items:
            metadata = item.get("metadata", {})
            name = metadata.get("name")
            
            spec = item.get("pyspec", item.get("spec", {}))
            replicas_desired = spec.get("replicas", 1)
            
            status = item.get("status", {})
            replicas_ready = status.get("readyReplicas", 0)
            replicas_available = status.get("availableReplicas", 0)
            replicas_unavailable = status.get("unavailableReplicas", 0)

            conditions = status.get("conditions", [])
            failed_conditions = []
            for cond in conditions:
                if cond.get("type") == "Available" and cond.get("status") == "False":
                    failed_conditions.append(f"Unavailable: {cond.get('message')}")
                elif cond.get("type") == "Progressing" and cond.get("status") == "False":
                    failed_conditions.append(f"Stuck Progressing: {cond.get('message')}")

            template = spec.get("template", {})
            template_spec = template.get("spec", {})
            containers = template_spec.get("containers", [])
            images = [c.get("image") for c in containers] if containers else []
            image_str = ", ".join(images) if images else "Unknown"

            if replicas_available < replicas_desired or failed_conditions:
                unhealthy_deployments.append({
                    "name": name,
                    "replicas_desired": replicas_desired,
                    "replicas_available": replicas_available,
                    "replicas_unavailable": replicas_unavailable,
                    "failures": failed_conditions,
                    "image": image_str
                })

        return {
            "all_deployments_count": len(items),
            "healthy": len(unhealthy_deployments) == 0,
            "unhealthy_deployments": unhealthy_deployments
        }


class NetworkInspector:
    """
    Inspects Kubernetes services, selectors, endpoints, and networking.
    """
    @staticmethod
    def inspect(namespace: str = "default", cluster: Optional[str] = None) -> Dict[str, Any]:
        logger.info(f"NetworkInspector: Inspecting network and services in namespace '{namespace}', cluster '{cluster}'")
        args = ["get", "services", "-n", namespace, "-o", "json"]
        exit_code, data, stderr = kubectl_executor.execute_json(args, cluster)
        
        items = data.get("items", [])
        services_status = []

        for item in items:
            metadata = item.get("metadata", {})
            name = metadata.get("name")
            spec = item.get("spec", {})
            ports = spec.get("ports", [])
            selector = spec.get("selector", {})
            cluster_ip = spec.get("clusterIP", "None")

            # Check if this service matches any backend pod endpoints using endpoint check
            endpoint_args = ["get", "endpoints", name, "-n", namespace, "-o", "json"]
            ep_exit, ep_data, _ = kubectl_executor.execute_json(endpoint_args, cluster)
            
            has_endpoints = False
            subsets = ep_data.get("subsets", [])
            if subsets:
                for sub in subsets:
                    if sub.get("addresses"):
                        has_endpoints = True
                        break

            services_status.append({
                "service_name": name,
                "cluster_ip": cluster_ip,
                "ports": [p.get("port") for p in ports],
                "selector_configured": len(selector) > 0,
                "has_active_endpoints": has_endpoints
            })

        return {
            "services": services_status
        }

def inspect_pods(namespace: str = "default") -> List[Dict[str, Any]]:
    res = PodInspector.inspect(namespace)
    problematic = res.get("problematic_pods", [])
    if problematic:
        return [{"name": p["name"], "status": p["status"]} for p in problematic]
    return []

def get_pod_logs(pod_name: str, namespace: str = "default") -> str:
    res = LogsCollector.collect(pod_name, namespace)
    return res.get("raw_logs_snippet", "")
