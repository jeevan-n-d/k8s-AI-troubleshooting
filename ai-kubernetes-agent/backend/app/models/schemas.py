from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class InvestigationRequest(BaseModel):
    namespace: Optional[str] = "default"
    pod_name: Optional[str] = None

class InvestigationResult(BaseModel):
    status: str
    pods_checked: List[str]
    root_cause: Optional[str] = None
    suggested_fix: Optional[str] = None
    metadata: Dict[str, Any] = {}

class InvestigateRequest(BaseModel):
    namespace: Optional[str] = "default"
    channel: Optional[str] = None
    cluster: Optional[str] = None

class ClustersResponse(BaseModel):
    status: str
    clusters: List[str]

class DiagnosisInfo(BaseModel):
    root_cause: str
    root_cause_type: Optional[str] = None
    severity: Optional[str] = "Critical"
    evidence: Optional[List[str]] = []
    reasoning: Optional[str] = None
    explanation: str
    fix: str
    kubectl_command: str
    kubectl_commands: Optional[List[str]] = []
    prevention: Optional[List[str]] = []
    confidence: int

class InvestigateResponse(BaseModel):
    status: str
    investigation: Dict[str, Any]
    diagnosis: DiagnosisInfo
    health_score: Optional[int] = None
