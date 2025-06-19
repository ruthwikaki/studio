
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ForecastDemandInput, ForecastDemandOutput } from '@/ai/flows/forecasting';
import { useToast } from './use-toast';

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
  turnoverRate?: number; // Added from previous update
}

const fetchDashboardKPIs = async (): Promise<{ data: DashboardKPIs, source: string }> => {
  const response = await fetch('/api/analytics/dashboard');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch dashboard KPIs' }));
    throw new Error(errorData.error || 'Failed to fetch dashboard KPIs');
  }
  return response.json();
};

export function useAnalyticsDashboard(options?: { refetchInterval?: number | false }) {
  return useQuery<{ data: DashboardKPIs, source: string }, Error>({
    queryKey: [ANALYTICS_DASHBOARD_QUERY_KEY],
    queryFn: fetchDashboardKPIs,
    refetchInterval: options?.refetchInterval,
  });
}

interface GenerateForecastJobResponse {
  message: string;
  jobId: string;
}

const generateDemandForecastAPI = async (input: ForecastDemandInput): Promise<GenerateForecastJobResponse> => {
  const response = await fetch('/api/analytics/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to queue forecast generation' }));
    throw new Error(errorData.error || 'Failed to queue forecast generation');
  }
  // The API now returns a job ID and message
  return response.json();
};

export function useGenerateDemandForecast() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation<GenerateForecastJobResponse, Error, ForecastDemandInput>({
    mutationKey: [DEMAND_FORECAST_MUTATION_KEY],
    mutationFn: generateDemandForecastAPI,
    onSuccess: (data, variables) => {
      toast({
        title: 'Forecast Queued',
        description: `${data.message} (Job ID: ${data.jobId}). SKU: ${variables.sku}`,
      });
      // Optionally, you might want to invalidate queries related to job statuses or forecast lists here
      // e.g., queryClient.invalidateQueries({ queryKey: ['forecastJobs'] });
      // queryClient.invalidateQueries({ queryKey: ['forecasts', variables.sku] }); // To refetch when job is done
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
