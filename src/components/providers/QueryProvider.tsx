
"use client";

import React from "react"; // Ensure React is imported
import { QueryClient, QueryClientProvider, type QueryClientConfig } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const queryClientOptions: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
};

function makeQueryClient() {
  return new QueryClient(queryClientOptions);
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // Server: always make a new query client.
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one.
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. In Next.js, React will suspend
    // on the client when using stream rendering with Suspense.
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  // Get the query client instance.
  const queryClient = getQueryClient();
  
  // State to ensure devtools only render on the client
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

