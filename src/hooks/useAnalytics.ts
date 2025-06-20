
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ForecastDemandInput, ForecastDemandOutput } from '@/ai/flows/forecasting';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

const ANALYTICS_DASHBOARD_QUERY_KEY = 'analyticsDashboard';
const DEMAND_FORECAST_MUTATION_KEY = 'generateDemandForecast';


interface DashboardKPIs {
  totalInventoryValue: number;
  lowStockItemsCount: number;
  outOfStockItemsCount: number;
  pendingOrdersCount: number;
  todaysRevenue: number;
  inventoryValueByCategory?: Record<string, number>;
  lastUpdated: string;
  turnoverRate?: number;
}

const fetchDashboardKPIs = async (token: string | null): Promise<{ data: DashboardKPIs, source: string }> => {
  if (!token) throw new Error("Authentication token is required.");
  
  const response = await fetch('/api/analytics/dashboard', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch dashboard KPIs' }));
    throw new Error(errorData.error || 'Failed to fetch dashboard KPIs');
  }
  return response.json();
};

export function useAnalyticsDashboard(options?: { refetchInterval?: number | false }) {
  const { token } = useAuth();
  return useQuery<{ data: DashboardKPIs, source: string }, Error>({
    queryKey: [ANALYTICS_DASHBOARD_QUERY_KEY],
    queryFn: () => fetchDashboardKPIs(token),
    enabled: !!token,
    refetchInterval: options?.refetchInterval,
  });
}

interface GenerateForecastJobResponse {
  message: string;
  jobId: string;
}

const generateDemandForecastAPI = async (input: ForecastDemandInput, token: string | null): Promise<GenerateForecastJobResponse> => {
  if (!token) throw new Error("Authentication token is required.");

  const response = await fetch('/api/analytics/forecast', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to queue forecast generation' }));
    throw new Error(errorData.error || 'Failed to queue forecast generation');
  }
  return response.json();
};

export function useGenerateDemandForecast() {
  const { toast } = useToast();
  const { token } = useAuth();

  return useMutation<GenerateForecastJobResponse, Error, ForecastDemandInput>({
    mutationKey: [DEMAND_FORECAST_MUTATION_KEY],
    mutationFn: (forecastInput) => generateDemandForecastAPI(forecastInput, token),
    onSuccess: (data, variables) => {
      toast({
        title: 'Forecast Queued',
        description: `${data.message} (Job ID: ${data.jobId}). SKU: ${variables.sku}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Forecast Queue Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    },
  });
}
