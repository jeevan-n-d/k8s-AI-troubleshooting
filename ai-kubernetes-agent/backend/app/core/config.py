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
