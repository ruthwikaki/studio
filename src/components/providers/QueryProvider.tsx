
"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react'; // Added useEffect

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // queryClient instance can still be created with useState as it's stable
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false, // Optional: disable refetch on window focus
      },
    },
  }));

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This effect runs only on the client, after the initial render
    setIsClient(true);
  }, []);

  // If not on the client yet, render children directly or a placeholder.
  // This avoids running QueryClientProvider's setup during SSR if it's causing issues.
  if (!isClient) {
    // Render children directly. SSR will still proceed for them.
    // Query functionality will attach on the client once QueryClientProvider mounts.
    return <>{children}</>;
  }

  // Once on the client, render the full provider
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
