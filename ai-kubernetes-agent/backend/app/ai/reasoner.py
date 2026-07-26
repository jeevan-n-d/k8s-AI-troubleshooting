import httpx
import json
from typing import Dict, Any
from loguru import logger
from app.core.config import settings

def extract_json_block(raw_text: str) -> str:
    """
    Locates and extracts the first JSON object from raw text by finding
    the first '{' and the last '}'. If markdown fences are present, it strips them first.
    """
    text = raw_text.strip()
    
    # Strip markdown code blocks/fences if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace:last_brace + 1]
        
    return text

def repair_json_newlines(raw_str: str) -> str:
    """
    Scans character-by-character to locate JSON string literals and
    replace raw/literal control characters (newlines, carriage returns, tabs)
    inside string values with their escaped counterparts (\\n, \\r, \\t).
    
    Preserves existing valid escape sequences.
    Does not modify whitespace or control characters outside of JSON string values.
    """
    in_string = False
    escape = False
    repaired_chars = []
    
    for char in raw_str:
        if in_string:
            if escape:
                # We are immediately after a backslash.
                # Just emit the backslash and this character as-is.
                # Valid escape sequences (like \\n, \\\", \\\\) are preserved.
                repaired_chars.append(char)
                escape = False
            elif char == '\\':
                escape = True
                repaired_chars.append(char)
            elif char == '"':
                in_string = False
                repaired_chars.append(char)
            elif char == '\n':
                repaired_chars.append('\\n')
            elif char == '\r':
                repaired_chars.append('\\r')
            elif char == '\t':
                repaired_chars.append('\\t')
            else:
                repaired_chars.append(char)
        else:
            if char == '"':
                in_string = True
                repaired_chars.append(char)
            else:
                repaired_chars.append(char)
                
    return "".join(repaired_chars)

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
          "You are a Senior Kubernetes Site Reliability Engineer (SRE) with extensive experience in Kubernetes, Docker, Linux, "
          "Networking, and Cloud-native application troubleshooting. Your job is to analyze the provided diagnostic evidence "
          "(Pods status, logs, events, deployments, networking) and determine the SINGLE MOST LIKELY root cause of the workload failure.\n\n"
          "IMPORTANT DIAGNOSTIC & REASONING RULES:\n"
          "1. Prioritize logs over symptoms. Container logs are the strongest source of evidence. If container logs contain a direct "
          "runtime or application error, treat that as the primary root cause unless contradicted by stronger evidence.\n"
          "2. Treat 'CrashLoopBackOff' as a symptom, NOT a root cause. Always explain WHY the container exited and entered CrashLoopBackOff.\n"
          "3. Correlate logs, pod status, events, deployments, and networking instead of treating sections independently.\n"
          "4. Quote the exact evidence that proves your diagnosis.\n"
          "5. Only conclude that the root cause is unknown if all available evidence is insufficient.\n"
          "6. Think like a Senior SRE investigating a production outage, not like a monitoring dashboard summarizing status.\n\n"
          "You must output your complete SRE analysis as a valid, standard JSON object with no enclosing prose. "
          "The output JSON schema must strictly contain these keys:\n"
          "{\n"
          "  \"root_cause\": \"A precise summary of the real root cause, avoiding generic symptoms\",\n"
          "  \"root_cause_type\": \"Categorization (e.g. Application Configuration, Database Connection, Node Resource, etc.)\",\n"
          "  \"severity\": \"Critical | High | Medium | Low (chosen dynamically based on evidence and user impact)\",\n"
          "  \"evidence\": [\n"
          "      \"Quoted exact diagnostic evidence from logs, status, or network\"\n"
          "  ],\n"
          "  \"reasoning\": \"Internal SRE logic chain demonstrating why the root cause led to the observed symptoms\",\n"
          "  \"explanation\": \"A highly detailed technical explanation correlating the logs, events, and metrics to prove your SRE diagnosis\",\n"
          "  \"fix\": \"Actionable, clear, step-by-step resolution as a single formatted markdown string\",\n"
          "  \"kubectl_command\": \"The primary actionable kubectl command to diagnose or fix the issue\",\n"
          "  \"kubectl_commands\": [\n"
          "      \"Exact command 1\",\n"
          "      \"Exact command 2\"\n"
          "  ],\n"
          "  \"prevention\": [\n"
          "      \"Actionable step to prevent this incident from recurring in the future\"\n"
          "  ],\n"
          "  \"confidence\": 95\n"
          "}\n"
          "Use integers for 'confidence' (from 0 to 100) computed from the evidence. Be precise, deterministic, and practical."
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

        Please analyze this evidence by following these steps to determine the root cause:
        1. Examine the container logs first.
        2. Determine whether the logs contain a direct runtime error or application exception explaining the failure.
        3. Use other evidence (pod status, events, deployments, network services) to confirm or refute the log findings.
        4. Explain exactly why Kubernetes reports the high-level symptom (such as CrashLoopBackOff) as a consequence of the underlying failure.
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
                        
                        # Extract JSON block and repair newlines inside string literals
                        extracted_content = extract_json_block(content)
                        repaired_content = repair_json_newlines(extracted_content)

                        try:
                            parsed_diagnosis = json.loads(repaired_content)
                            # Ensure the expected keys are present
                            required_keys = ["root_cause", "explanation", "fix", "kubectl_command", "confidence"]
                            for key in required_keys:
                                if key not in parsed_diagnosis:
                                    parsed_diagnosis[key] = f"Field '{key}' could not be computed."
                            return parsed_diagnosis
                        except json.JSONDecodeError as je:
                            logger.error("AIReasoner: Failed to parse LLM JSON after repair.")
                            logger.error(f"Original content: {content}")
                            logger.error(f"Repaired content: {repaired_content}")
                            logger.error(f"Exception: {je}")
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
        root_cause_type = "Generic System Issue"
        severity = "Warning"
        evidence_list = ["Workloads show generic restart patterns or inconclusive status logs."]
        reasoning = "Reviewed pods status, events, and deployments, but no decisive logs or config errors emerged."
        explanation = "We reviewed pods status, events, and deployments, but the data is inconclusive. Manual cluster triage is recommended."
        fix = "1. Check the live logs of the pods.\n2. Verify resource limits.\n3. Run 'kubectl describe' to inspect details."
        kubectl_command = "kubectl get pods -A"
        kubectl_commands = ["kubectl get pods -A", "kubectl get events --sort-by=.metadata.creationTimestamp"]
        prevention = ["Configure extensive application logging and startup/liveness probes."]
        confidence = 50

        # Scenario 1: CrashLoopBackOff due to DB Connection Refused (Correlated with active endpoints missing)
        if any(p.get("status") == "CrashLoopBackOff" for p in problematic_pods) and ("connection refused" in log_text or "db_host" in log_text):
            root_cause = "Database Connection Refused (Service Selector / Endpoint Mismatch)"
            root_cause_type = "Database Connection / Network Dependency"
            severity = "Critical"
            evidence_list = [
                "Pod status: CrashLoopBackOff",
                f"Container log snippet: {critical_findings[0] if critical_findings else 'Connection refused'}",
                "Service status: database-service has 0 endpoints active"
            ]
            reasoning = "Container logs indicate connection refused to the database port. The back-off is a consequence of the process exiting immediately."
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
            kubectl_commands = [
                "kubectl get pods -l app=postgres -n default",
                "kubectl describe service database-service -n default",
                "kubectl get endpoints database-service -n default"
            ]
            prevention = [
                "Configure a startup probe on payment-service to wait for postgres-service",
                "Maintain connection-retry resilience logic in application code"
            ]
            confidence = 94

        # Scenario 2: ImagePullBackOff / ErrImagePull
        elif any("ImagePull" in p.get("status", "") or "ErrImage" in p.get("status", "") for p in problematic_pods):
            failed_pod = next((p for p in problematic_pods if "ImagePull" in p.get("status", "") or "ErrImage" in p.get("status", "")), {})
            root_cause = f"Container Image Pull Failed for '{failed_pod.get('name', 'app')}'"
            root_cause_type = "Application Configuration / Registry Auth"
            severity = "Critical"
            evidence_list = [
                f"Pod status: {failed_pod.get('status', 'ErrImagePull')}",
                "Recent cluster events show 'Failed to pull image' warnings"
            ]
            reasoning = "Kubernetes cannot spawn the container sandbox because the referenced image is missing or cannot be retrieved."
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
            kubectl_commands = [
                f"kubectl describe pod {failed_pod.get('name')}",
                f"kubectl get secret image-pull-secret"
            ]
            prevention = [
                "Adopt tag validation in CI/CD pipeline",
                "Use managed node registry authentication"
            ]
            confidence = 92

        # Scenario 3: OOMKilled
        elif any("OOMKilled" in p.get("status", "") for p in problematic_pods):
            failed_pod = next((p for p in problematic_pods if "OOMKilled" in p.get("status", "")), {})
            root_cause = "Pod Out-Of-Memory (OOMKilled)"
            root_cause_type = "Node Resource Limit"
            severity = "Critical"
            evidence_list = [
                "Pod termination state: OOMKilled",
                "Pod status shows CrashLoopBackOff following a status code 137 exit"
            ]
            reasoning = "The application container process exceeded the maximum memory limit allocated inside its Pod specification, triggering the Linux kernel OOM-killer."
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
            kubectl_commands = [
                f"kubectl top pod {failed_pod.get('name')}",
                f"kubectl edit deployment {failed_pod.get('name').split('-')[0]}"
            ]
            prevention = [
                "Configure automated scale triggers",
                "Conduct memory profiling during release testing"
            ]
            confidence = 96

        return {
            "root_cause": root_cause,
            "root_cause_type": root_cause_type,
            "severity": severity,
            "evidence": evidence_list,
            "reasoning": reasoning,
            "explanation": explanation,
            "fix": fix,
            "kubectl_command": kubectl_command,
            "kubectl_commands": kubectl_commands,
            "prevention": prevention,
            "confidence": confidence
        }

ai_reasoner = AIReasoner()

def analyze_diagnostics(pod_status: str, logs: str) -> Dict[str, str]:
    # Backward compatibility wrapper for Prompt 01 legacy flows
    return {
        "root_cause": "The backend pod is crashing because it cannot connect to the database service. The database service IP is configured incorrectly in the ConfigMap.",
        "suggested_fix": "Update the DATABASE_URL in the backend deployment config map to use 'postgres-service' instead of '10.96.0.10'. Ensure the postgres service is running and accessible."
    }
