import { defineChain } from "viem";
import { foundry, mainnet, sepolia } from "viem/chains";
import { cookieStorage, createConfig, createStorage, http, injected, mock } from "wagmi";

/**
 * True only when the app is deliberately built/started for Playwright E2E
 * runs (see e2e/global-setup.ts) — never in a real production build. Gates
 * both the `foundry`/Anvil chain and the `mock` connector below.
 */
const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true";

// Anvil's well-known default dev accounts (default mnemonic "test test
// test ... junk"). Public and the same for every Anvil install — not a
// secret. Anvil signs transactions from these itself; the mock connector
// just forwards RPC calls to it (see the mock() call below).
export const E2E_OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
export const E2E_SECOND_MEMBER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as const;
export const E2E_STRANGER_ADDRESS = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as const;

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

// `foundry` (Anvil's default chain id, 31337) is always included — it's
// inert without a local node listening on 127.0.0.1:8545, matching the
// same "just another chain with no deployment configured" fallback as any
// other unconfigured chain (see NetworkBadge / useSaveEarthContracts).
//
// Order matters here beyond display: wagmi's `mock` connector (used only in
// E2E test mode) connects to `config.chains[0]` when no chainId is given —
// see e2e/golden-paths.spec.ts's plain `.click()` on CONNECT WALLET, which
// never specifies one. `foundry` must lead in test mode so a fresh mock
// connection lands on the local Anvil chain instead of mainnet.
export const supportedChains = isE2ETestMode
  ? ([foundry, mainnet, sepolia, polkadotHub, polkadotHubTestnet] as const)
  : ([mainnet, sepolia, polkadotHub, polkadotHubTestnet, foundry] as const);

export type SupportedChainId = (typeof supportedChains)[number]["id"];

export function blockExplorerUrl(chainId: number): string | undefined {
  return supportedChains.find((chain) => chain.id === chainId)?.blockExplorers?.default.url;
}

export const wagmiConfig = createConfig({
  chains: supportedChains,
  // Three single-account mock connectors (not one three-account connector)
  // so WalletConnectButton's `?e2eConnector=<index>` test hook can pick a
  // specific identity — a real EIP-1193 provider only exposes one "current"
  // account, and wagmi always treats accounts[0] as that account, so a
  // single mock with three accounts can't represent "connected as the
  // second member" vs "connected as Owner". `injected()` stays last so
  // production (NEXT_PUBLIC_E2E_TEST_MODE unset) is exactly `[injected()]`,
  // unchanged from before.
  connectors: isE2ETestMode
    ? [
        mock({ accounts: [E2E_OWNER_ADDRESS] }),
        mock({ accounts: [E2E_SECOND_MEMBER_ADDRESS] }),
        mock({ accounts: [E2E_STRANGER_ADDRESS] }),
        injected(),
      ]
    : [injected()],
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
    [foundry.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
