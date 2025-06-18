
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
  turnoverRate?: number;
}

const fetchDashboardKPIs = async (): Promise<{ data: DashboardKPIs }> => {
  const response = await fetch('/api/analytics/dashboard');
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to fetch dashboard KPIs' }));
    throw new Error(errorData.error || 'Failed to fetch dashboard KPIs');
  }
  return response.json();
};

export function useAnalyticsDashboard(options?: { refetchInterval?: number | false }) {
  return useQuery<{ data: DashboardKPIs }, Error>({
    queryKey: [ANALYTICS_DASHBOARD_QUERY_KEY],
    queryFn: fetchDashboardKPIs,
    refetchInterval: options?.refetchInterval, // e.g., 30000 for 30 seconds
  });
}


const generateDemandForecastAPI = async (input: ForecastDemandInput): Promise<ForecastDemandOutput> => {
  const response = await fetch('/api/analytics/forecast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to generate forecast' }));
    throw new Error(errorData.error || 'Failed to generate forecast');
  }
  const result = await response.json();
  return result.data; // Assuming API wraps Genkit output in { data: ... }
};

export function useGenerateDemandForecast() {
  const { toast } = useToast();
  // const queryClient = useQueryClient(); // If you need to invalidate or update other queries on success

  return useMutation<ForecastDemandOutput, Error, ForecastDemandInput>({
    mutationKey: [DEMAND_FORECAST_MUTATION_KEY],
    mutationFn: generateDemandForecastAPI,
    onSuccess: (data) => {
      toast({
        title: 'Forecast Generated',
        description: `Successfully generated demand forecast for SKU: ${data.sku}.`,
      });
      // Example: queryClient.invalidateQueries({ queryKey: ['someRelatedForecastQuery'] });
      // Return data so it can be used in the component's onSubmit
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Forecast Generation Failed',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    },
  });
}


// Placeholder for AI insights
// export function useAnalyticsInsights() { ... }

