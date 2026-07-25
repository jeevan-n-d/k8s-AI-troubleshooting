from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "anthropic/claude-3-haiku"
    KUBECONFIG_PATH: str = ""
    
    # FastAPI settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI Kubernetes Troubleshooting Agent"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

def is_system_namespace(namespace: str) -> bool:
    """
    Single source of truth to check if a namespace is a Kubernetes system namespace.
    """
    system_namespaces = {
        "kube-system", "kube-public", "kube-node-lease", "local-path-storage",
        "ingress-nginx", "cert-manager", "monitoring", "cattle-system",
        "istio-system", "kube-flannel", "metallb-system"
    }
    return namespace in system_namespaces
