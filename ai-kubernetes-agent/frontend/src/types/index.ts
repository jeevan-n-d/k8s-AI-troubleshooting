export interface InvestigationRequest {
  namespace?: string;
  pod_name?: string;
}

export interface InvestigationResult {
  status: string;
  pods_checked: string[];
  root_cause?: string;
  suggested_fix?: string;
  metadata?: {
    target_pod?: string;
    raw_logs?: string;
  };
}

export interface InvestigateRequest {
  namespace?: string;
  channel?: string;
  cluster?: string;
}

export interface ClustersResponse {
  status: string;
  clusters: string[];
}

export interface PodInfo {
  name: string;
  namespace: string;
  status: string;
  phase: string;
}

export interface PodsInspection {
  healthy: boolean;
  total_pods: number;
  healthy_pods_count: number;
  problematic_pods: PodInfo[];
  note?: string;
}

export interface LogsCollection {
  pod_name?: string;
  lines_collected?: number;
  critical_findings?: string[];
  raw_logs_snippet?: string;
  note?: string;
  message?: string;
  error?: string;
}

export interface WarningEvent {
  reason: string;
  message: string;
  object_kind: string;
  object_name: string;
  count: number;
}

export interface EventsAnalysis {
  total_warnings_detected: number;
  warning_events: WarningEvent[];
  note?: string;
}

export interface UnhealthyDeployment {
  name: string;
  replicas_desired: number;
  replicas_available: number;
  replicas_unavailable: number;
  failures: string[];
}

export interface DeploymentInspection {
  all_deployments_count: number;
  healthy: boolean;
  unhealthy_deployments: UnhealthyDeployment[];
  note?: string;
}

export interface NetworkServiceInfo {
  service_name: string;
  cluster_ip: string;
  ports: number[];
  selector_configured: boolean;
  has_active_endpoints: boolean;
}

export interface NetworkInspection {
  services: NetworkServiceInfo[];
  note?: string;
}

export interface DiagnosisInfo {
  root_cause: string;
  explanation: string;
  fix: string;
  kubectl_command: string;
  confidence: number;
}

export interface InvestigateResponse {
  status: string;
  investigation: {
    pods: PodsInspection;
    logs: LogsCollection;
    events: EventsAnalysis;
    deployments: DeploymentInspection;
    network: NetworkInspection;
  };
  diagnosis: DiagnosisInfo;
  health_score?: number | null;
}
