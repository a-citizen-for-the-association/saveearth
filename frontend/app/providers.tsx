"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { State } from "wagmi";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "../lib/wagmi";

export function Providers({ children, initialState }: { children: React.ReactNode; initialState?: State }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
