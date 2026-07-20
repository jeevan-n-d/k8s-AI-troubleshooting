import axios from 'axios';
import {
  InvestigationRequest,
  InvestigationResult,
  InvestigateRequest,
  InvestigateResponse,
  ClustersResponse
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const checkHealth = async (): Promise<{ status: string; service: string }> => {
  const { data } = await api.get('/health');
  return data;
};

export const fetchAvailableClusters = async (): Promise<ClustersResponse> => {
  const { data } = await api.get('/clusters');
  return data;
};

export const fetchContexts = async (): Promise<any> => {
  const { data } = await api.get('/contexts');
  return data;
};

export const fetchClusterInfo = async (cluster?: string): Promise<any> => {
  const { data } = await api.get('/cluster/info', { params: { cluster } });
  return data;
};

export const fetchNamespaces = async (cluster?: string): Promise<any> => {
  const { data } = await api.get('/namespaces', { params: { cluster } });
  return data;
};

export const fetchNodes = async (cluster?: string): Promise<any> => {
  const { data } = await api.get('/nodes', { params: { cluster } });
  return data;
};

export const fetchPods = async (namespace: string, cluster?: string): Promise<any> => {
  const { data } = await api.get('/pods', { params: { namespace, cluster } });
  return data;
};

export const fetchDeployments = async (namespace: string, cluster?: string): Promise<any> => {
  const { data } = await api.get('/deployments', { params: { namespace, cluster } });
  return data;
};

export const fetchServices = async (namespace: string, cluster?: string): Promise<any> => {
  const { data } = await api.get('/services', { params: { namespace, cluster } });
  return data;
};

export const fetchEvents = async (namespace: string, cluster?: string): Promise<any> => {
  const { data } = await api.get('/events', { params: { namespace, cluster } });
  return data;
};

export const fetchStorage = async (namespace: string, cluster?: string): Promise<any> => {
  const { data } = await api.get('/storage', { params: { namespace, cluster } });
  return data;
};

export const startInvestigation = async (
  payload: InvestigationRequest
): Promise<InvestigationResult> => {
  const { data } = await api.post('/api/v1/investigate', payload);
  return data;
};

export const runKubectlInvestigation = async (
  payload: InvestigateRequest = { namespace: 'default' }
): Promise<InvestigateResponse> => {
  const { data } = await api.post('/investigate', payload);
  return data;
};
