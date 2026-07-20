import subprocess
import shutil
import json
import os
import tempfile
from typing import List, Dict, Any, Tuple, Optional
from loguru import logger
from app.core.config import settings

class KubectlExecutor:
    """
    Safely executes kubectl commands using python subprocess.
    """
    def __init__(self):
        # Locate the kubectl executable
        self.kubectl_path = shutil.which("kubectl") or "kubectl"
        logger.info(f"Initialized KubectlExecutor with path: {self.kubectl_path}")
        self.kubeconfig_file = None
        self._setup_kubeconfig()

    def _setup_kubeconfig(self):
        """
        Dynamically detects, loads, and adapts kubeconfig to support container network routing.
        Replaces 127.0.0.1 or localhost with host.docker.internal inside the container.
        """
        kubeconfig_source = settings.KUBECONFIG_PATH or os.environ.get("KUBECONFIG") or os.path.expanduser("~/.kube/config")
        
        # Check if the resolved file path exists
        if os.path.exists(kubeconfig_source):
            try:
                with open(kubeconfig_source, "r") as f:
                    content = f.read()

                # If running inside a container, rewrite 127.0.0.1 or localhost to host.docker.internal
                # This routes traffic perfectly back to the host loopback where Docker Desktop/Minikube API server is listening.
                if os.path.exists("/.dockerenv") or os.environ.get("KUBERNETES_SERVICE_HOST") is None:
                    modified_content = content.replace("https://127.0.0.1:", "https://host.docker.internal:")
                    modified_content = modified_content.replace("https://localhost:", "https://host.docker.internal:")
                    
                    tmp_dir = tempfile.gettempdir()
                    self.kubeconfig_file = os.path.join(tmp_dir, "mapped_kubeconfig")
                    
                    with open(self.kubeconfig_file, "w") as f:
                        f.write(modified_content)
                    
                    logger.info(f"Kubeconfig successfully mapped from {kubeconfig_source} to {self.kubeconfig_file} with host.docker.internal routing.")
                else:
                    self.kubeconfig_file = kubeconfig_source
                    logger.info(f"Using native kubeconfig path: {self.kubeconfig_file}")
                
                # Set KUBECONFIG environment variable natively so kubectl picks it up without --kubeconfig parameter
                os.environ["KUBECONFIG"] = self.kubeconfig_file
            except Exception as e:
                logger.error(f"Failed to dynamically process kubeconfig at {kubeconfig_source}: {e}")
                self.kubeconfig_file = kubeconfig_source
        else:
            self.kubeconfig_file = None
            logger.warning(f"No valid kubeconfig found at {kubeconfig_source}")

    def execute(self, args: List[str], cluster: Optional[str] = None) -> Tuple[int, str, str]:
        """
        Executes a kubectl command with the specified arguments.
        Returns: Tuple[exit_code, stdout, stderr]
        """
        # Ensure KUBECONFIG is verified and loaded correctly
        if not self.kubeconfig_file or not os.path.exists(self.kubeconfig_file):
            raise RuntimeError(f"Kubernetes configuration (kubeconfig) file not found. Checked path: {self.kubeconfig_file or 'None'}")

        command = [self.kubectl_path]
        
        # Add dynamic context/cluster if specified
        if cluster:
            command.extend(["--context", cluster])
            
        command.extend(args)

        # Bypass TLS/x509 certificate errors for host.docker.internal
        if self.kubeconfig_file and "mapped_kubeconfig" in self.kubeconfig_file:
            command.append("--insecure-skip-tls-verify=true")

        logger.info(f"Kubeconfig path: {self.kubeconfig_file}")
        logger.info(f"Executing command: {' '.join(command)}")
        try:
            result = subprocess.run(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=15, # prevent hanging command execution
                check=False
            )
            logger.info(f"Command exit code: {result.returncode}")
            if result.returncode != 0:
                logger.error(f"Command failed: {result.stderr or result.stdout}")
                raise RuntimeError(f"Kubectl command failed with exit code {result.returncode}. Stderr: {result.stderr or result.stdout}")
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired as te:
            logger.error(f"Command timed out: {' '.join(command)}")
            raise RuntimeError(f"Command execution timeout after 15 seconds. {te.stderr or ''}")
        except Exception as e:
            if isinstance(e, RuntimeError):
                raise e
            logger.exception(f"Unexpected error executing command: {' '.join(command)}")
            raise RuntimeError(f"Unexpected error executing command: {str(e)}")

    def execute_json(self, args: List[str], cluster: Optional[str] = None) -> Tuple[int, Dict[str, Any], str]:
        """
        Executes a kubectl command and parses the output as JSON.
        Returns: Tuple[exit_code, parsed_json, stderr]
        """
        # Ensure output format is json
        json_args = list(args)
        if "-o" not in json_args and "--output" not in json_args:
            json_args.extend(["-o", "json"])

        exit_code, stdout, stderr = self.execute(json_args, cluster)
        if exit_code != 0:
            return exit_code, {}, stderr

        try:
            parsed = json.loads(stdout)
            return exit_code, parsed, stderr
        except json.JSONDecodeError as jde:
            logger.error(f"Failed to parse JSON output: {jde}")
            return -1, {}, f"JSON parsing failed: {str(jde)}. Raw output: {stdout[:200]}"

kubectl_executor = KubectlExecutor()
