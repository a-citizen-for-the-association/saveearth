import { defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { cookieStorage, createConfig, createStorage, http, injected } from "wagmi";

// Chain IDs / RPC / currency confirmed against docs.polkadot.com
// (smart-contracts/connect) on 2026-09-21. REVM backend per ADR-0003.
export const polkadotHub = defineChain({
  id: 420420419,
  name: "Polkadot Hub",
  nativeCurrency: { name: "Polkadot", symbol: "DOT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://eth-rpc.polkadot.io/"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout.polkadot.io/" },
  },
});

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: "Polkadot Hub Testnet",
  nativeCurrency: { name: "Paseo", symbol: "PAS", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://eth-rpc-testnet.polkadot.io/"] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout-testnet.polkadot.io/" },
  },
  testnet: true,
});

export const supportedChains = [mainnet, sepolia, polkadotHub, polkadotHubTestnet] as const;

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export function blockExplorerUrl(chainId: number): string | undefined {
  return supportedChains.find((chain) => chain.id === chainId)?.blockExplorers?.default.url;
}

export const wagmiConfig = createConfig({
  chains: supportedChains,
  connectors: [injected()],
  // `ssr: true` + cookie storage keeps the server's first render and the
  // client's first render identical (both start "disconnected"); the real
  // persisted connection is rehydrated after mount instead of racing ahead
  // of React's hydration pass, which would otherwise mismatch for a
  // returning user with a previously-connected wallet.
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polkadotHub.id]: http(),
    [polkadotHubTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
