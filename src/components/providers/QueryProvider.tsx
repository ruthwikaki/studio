
"use client";

import React from "react";
import { QueryClient, QueryClientProvider, type QueryClientConfig } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClientOptions: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Do not retry on 401/403/404 errors
        if (error?.response?.status === 401 || error?.response?.status === 403 || error?.response?.status === 404) {
          return false;
        }
        // Default retry for other errors (e.g., network issues)
        return failureCount < 2;
      },
    },
  },
};

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client.
    return new QueryClient(queryClientOptions);
  } else {
    // Browser: make a new query client if we don't already have one.
    if (!browserQueryClient) {
      browserQueryClient = new QueryClient(queryClientOptions);
    }
    return browserQueryClient;
  }
}

export { getQueryClient }; // Export for use in AuthContext

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {isClient && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
