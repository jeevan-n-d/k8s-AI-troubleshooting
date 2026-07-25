import { useMutation, useQuery } from '@tanstack/react-query';
import { checkHealth, startInvestigation, runKubectlInvestigation, fetchAvailableClusters } from '../services/api';
import { InvestigationRequest, InvestigateRequest } from '../types';

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 15000, // check health every 15 seconds
  });
};

export const useAvailableClusters = () => {
  return useQuery({
    queryKey: ['clusters'],
    queryFn: fetchAvailableClusters,
    staleTime: 60000, // cache cluster context lists for 1 minute
  });
};

export const useStartInvestigation = () => {
  return useMutation({
    mutationFn: (payload: InvestigationRequest) => startInvestigation(payload),
  });
};

export const useKubectlInvestigation = () => {
  return useMutation({
    mutationFn: (payload: InvestigateRequest = { namespace: 'default' }) =>
      runKubectlInvestigation(payload),
  });
};
