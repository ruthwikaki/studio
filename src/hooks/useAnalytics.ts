
"use client";

import { useQuery } from '@tanstack/react-query';

const ANALYTICS_DASHBOARD_QUERY_KEY = 'analyticsDashboard';

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

// Placeholder for AI insights and forecast hooks
// export function useAnalyticsInsights() { ... }
// export function useDemandForecast() { ... }
