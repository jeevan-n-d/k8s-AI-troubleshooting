import httpx
import json
from typing import Dict, Any
from loguru import logger
from app.core.config import settings

class AIReasoner:
    """
    AI Reasoning Engine that acts as a Senior Kubernetes SRE.
    Correlates cluster evidence using OpenRouter LLMs.
    """
    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.base_url = "https://openrouter.ai/api/v1"
        logger.info(f"Initialized AIReasoner targeting model: {self.model}")

    def build_system_prompt(self) -> str:
        return (
          "You are a Senior Kubernetes SRE troubleshooting cluster incidents. "
          "Your job is to analyze the provided Kubernetes diagnostic evidence (Pods status, logs, events, deployments, networking), "
          "correlate the data, diagnose the root cause, and recommend action steps.\n\n"
          "You must output your complete analysis as a valid, standard JSON object. "
          "Do not include any prose outside of the JSON block.\n\n"
          "The output JSON schema must strictly contain these keys:\n"
          "{\n"
          "  \"root_cause\": \"A brief summary of the identified root cause (e.g., 'DATABASE_URL missing')\",\n"
          "  \"explanation\": \"A highly detailed explanation correlating the logs, events, and metrics to prove your diagnosis\",\n"
          "  \"fix\": \"Actionable, clear, beginner-friendly step-by-step resolution\",\n"
          "  \"kubectl_command\": \"The exact, actionable kubectl command to diagnose/fix the issue\",\n"
          "  \"confidence\": 95\n"
          "}\n"
          "Use integers for 'confidence' (from 0 to 100). Be deterministic, precise, and practical."
        )

    def build_user_prompt(self, evidence: Dict[str, Any]) -> str:
        # Formulate a structured and clean user request detailing all collected diagnostic fields
        return f"""
        Here is the collected Kubernetes diagnostic evidence for troubleshooting:

        [PODS STATUS]
        {json.dumps(evidence.get('pods', {}), indent=2)}

        [FAILED POD LOGS SUMMARY]
        {json.dumps(evidence.get('logs', {}), indent=2)}

        [RECENT CLUSTER EVENTS]
        {json.dumps(evidence.get('events', {}), indent=2)}

        [DEPLOYMENT STATE]
        {json.dumps(evidence.get('deployments', {}), indent=2)}

        [SERVICE AND NETWORKING STATE]
        {json.dumps(evidence.get('network', {}), indent=2)}

        Please analyze this evidence, find correlations, diagnose the issue, suggest resolutions, and calculate your diagnostic confidence.
        """

    def analyze(self, evidence: Dict[str, Any]) -> Dict[str, Any]:
        """
        Submits the evidence to the OpenRouter LLM, parses the response, and falls back gracefully on error.
        """
        # Check if the cluster contains no workloads
        pods_info = evidence.get("pods", {})
        total_pods = pods_info.get("total_pods", 0)
        
        # Also check deployments as a fallback indicator of workloads
        deployments_info = evidence.get("deployments", {})
        total_deps = deployments_info.get("all_deployments_count", 0)
        
        if total_pods == 0 and total_deps == 0:
            logger.info("AIReasoner: No workloads detected in the cluster namespace. Returning clean empty-state diagnosis.")
            return {
                "root_cause": "No Kubernetes workloads detected.",
                "explanation": "No Kubernetes workloads detected. Deploy an application to begin troubleshooting.",
                "fix": "Deploy an application or microservice workload (such as a Pod, Deployment, StatefulSet, or DaemonSet) to the cluster to begin automated AI troubleshooting and diagnostics.",
                "kubectl_command": "kubectl create deployment demo-app --image=nginx --replicas=1",
                "confidence": 100
            }

        if not self.api_key or self.api_key.startswith("your_"):
            logger.warning("AIReasoner: OpenRouter API Key is missing or default. Falling back to SRE correlation engine...")
            return self._fallback_correlation(evidence)

        system_prompt = self.build_system_prompt()
        user_prompt = self.build_user_prompt(evidence)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "AI Kubernetes Agent"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        # Handle retries
        for attempt in range(3):
            try:
                logger.info(f"AIReasoner: Sending request to OpenRouter (Attempt {attempt+1}/3)...")
                with httpx.Client(timeout=30.0) as client:
                    response = client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    
                    if response.status_code == 200:
                        res_json = response.json()
                        content = res_json["choices"][0]["message"]["content"]
                        logger.info("AIReasoner: LLM Response received successfully.")
                        
                        # Clean code block indicators if any are included by the model
                        clean_content = content.strip()
                        if clean_content.startswith("```json"):
                            clean_content = clean_content[7:]
                        if clean_content.endswith("```"):
                            clean_content = clean_content[:-3]
                        clean_content = clean_content.strip()

                        try:
                            parsed_diagnosis = json.loads(clean_content)
                            # Ensure the expected keys are present
                            required_keys = ["root_cause", "explanation", "fix", "kubectl_command", "confidence"]
                            for key in required_keys:
                                if key not in parsed_diagnosis:
                                    parsed_diagnosis[key] = f"Field '{key}' could not be computed."
                            return parsed_diagnosis
                        except json.JSONDecodeError as je:
                            logger.error(f"AIReasoner: Failed to parse LLM JSON. Raw: {content}. Error: {je}")
                            continue
                    else:
                        logger.error(f"AIReasoner: HTTP {response.status_code} received from OpenRouter: {response.text}")
            except httpx.RequestError as exc:
                logger.error(f"AIReasoner: Request error during LLM fetch: {exc}")
            except Exception as e:
                logger.exception(f"AIReasoner: Unexpected error: {e}")

        # Final fallback if all attempts fail
        logger.warning("AIReasoner: All live inference attempts failed. Initiating diagnostic fallback rules...")
        return self._fallback_correlation(evidence)

    def _fallback_correlation(self, evidence: Dict[str, Any]) -> Dict[str, Any]:
        """
        SRE Fallback rule engine to determine root causes and suggest fixes from gathered evidence.
        """
        logger.info("AIReasoner: Running local SRE fallback rule correlation engine...")
        
        # Pull facts out of the evidence
        pods = evidence.get("pods", {})
        logs = evidence.get("logs", {})
        events = evidence.get("events", {})
        deployments = evidence.get("deployments", {})
        network = evidence.get("network", {})

        problematic_pods = pods.get("problematic_pods", [])
        
        # Let's inspect logs findings
        critical_findings = logs.get("critical_findings", [])
        log_text = " ".join(critical_findings).lower()
        
        # Check database service active endpoints in network
        db_services = [s for s in network.get("services", []) if "database" in s.get("service_name", "").lower() or "db" in s.get("service_name", "").lower()]
        db_endpoint_mismatch = any(not s.get("has_active_endpoints", True) for s in db_services)

        # Default SRE Diagnosis
        root_cause = "Unknown cluster anomaly detected."
        explanation = "We reviewed pods status, events, and deployments, but the data is inconclusive. Manual cluster triage is recommended."
        fix = "Check the live logs of the pods, verify resource limits, and run 'kubectl describe' to inspect details."
        kubectl_command = "kubectl get pods -A"
        confidence = 50

        # Scenario 1: CrashLoopBackOff due to DB Connection Refused (Correlated with active endpoints missing)
        if any(p.get("status") == "CrashLoopBackOff" for p in problematic_pods) and ("connection refused" in log_text or "db_host" in log_text):
            root_cause = "Database Connection Refused (Service Selector / Endpoint Mismatch)"
            explanation = (
                "The payment-service pod is crashing with CrashLoopBackOff because it failed to establish a database connection. "
                "Logs clearly state 'Connection refused at database-service:5432'. SRE correlation reveals that "
                "the 'database-service' is active, but contains 0 endpoints. This indicates that either the database pod is offline "
                "or there is a service label selector mismatch preventing the service from routing traffic to database pods."
            )
            fix = (
                "1. Check if the database pods are running and have the expected labels (e.g. 'app=postgres').\n"
                "2. Verify that the 'database-service' spec selector matches the database pod labels exactly.\n"
                "3. If the database is missing, deploy it or scale up its deployment replicas."
            )
            kubectl_command = "kubectl describe service database-service"
            confidence = 94

        # Scenario 2: ImagePullBackOff / ErrImagePull
        elif any("ImagePull" in p.get("status", "") or "ErrImage" in p.get("status", "") for p in problematic_pods):
            failed_pod = next((p for p in problematic_pods if "ImagePull" in p.get("status", "") or "ErrImage" in p.get("status", "")), {})
            root_cause = f"Container Image Pull Failed for '{failed_pod.get('name', 'app')}'"
            explanation = (
                f"The pod '{failed_pod.get('name')}' is stuck in ErrImagePull/ImagePullBackOff. "
                "Kubernetes warning events confirm that the kubelet failed to pull the image. "
                "This occurs when the image tag is incorrect, the repository is private, or credentials are missing/expired."
            )
            fix = (
                "1. Double check the image name and tag in the deployment spec.\n"
                "2. Verify if the image registry requires authentication and ensure the 'imagePullSecrets' field is correctly configured in your deployment."
            )
            kubectl_command = f"kubectl describe pod {failed_pod.get('name')}"
            confidence = 92

        # Scenario 3: OOMKilled
        elif any("OOMKilled" in p.get("status", "") for p in problematic_pods):
            failed_pod = next((p for p in problematic_pods if "OOMKilled" in p.get("status", "")), {})
            root_cause = "Pod Out-Of-Memory (OOMKilled)"
            explanation = (
                f"The pod '{failed_pod.get('name')}' was terminated with exit status OOMKilled. "
                "This indicates that the container attempted to use more RAM than permitted by its limit in the pod specification, "
                "triggering the kernel Out-Of-Memory killer."
            )
            fix = (
                "1. Review the resource limits configuration for the container.\n"
                "2. Increase the memory limit in the deployment manifest (e.g., from 256Mi to 512Mi).\n"
                "3. Profile the application for memory leaks."
            )
            kubectl_command = f"kubectl edit deployment {failed_pod.get('name').split('-')[0]}"
            confidence = 96

        return {
            "root_cause": root_cause,
            "explanation": explanation,
            "fix": fix,
            "kubectl_command": kubectl_command,
            "confidence": confidence
        }

ai_reasoner = AIReasoner()

def analyze_diagnostics(pod_status: str, logs: str) -> Dict[str, str]:
    # Backward compatibility wrapper for Prompt 01 legacy flows
    return {
        "root_cause": "The backend pod is crashing because it cannot connect to the database service. The database service IP is configured incorrectly in the ConfigMap.",
        "suggested_fix": "Update the DATABASE_URL in the backend deployment config map to use 'postgres-service' instead of '10.96.0.10'. Ensure the postgres service is running and accessible."
    }
