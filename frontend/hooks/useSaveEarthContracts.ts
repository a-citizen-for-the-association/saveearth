"use client";

import { sepolia } from "viem/chains";
import { useAccount, useChainId } from "wagmi";
import { communityBoardAddress } from "../lib/contracts/communityBoard";
import { membershipAddress } from "../lib/contracts/membership";
import type { SupportedChainId } from "../lib/wagmi";

/**
 * Chain used for read-only data when no wallet is connected (golden path 1:
 * an unconnected visitor can still browse). Sepolia is our first real
 * testnet deployment target — revisit once ADR-0002's Mainnet choice is made.
 *
 * Overridable via NEXT_PUBLIC_DEFAULT_CHAIN_ID so Playwright E2E runs (see
 * e2e/global-setup.ts) can point the pre-connection view at the local Anvil
 * chain, where the seeded fixture data actually lives. Trusted to be one of
 * `supportedChains` when set — same trust boundary as any other env-provided
 * config here (see the NEXT_PUBLIC_* address maps in lib/contracts/*.ts).
 */
export const DEFAULT_CHAIN_ID = (
  process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID) : sepolia.id
) as SupportedChainId;

/**
 * The wallet's raw connected chain id if connected — deliberately from
 * `useChainId()`, not `useAccount().chain`, because the latter is undefined
 * for a chain outside our configured list and would hide an unsupported
 * network instead of letting callers detect it (golden path 8). Falls back
 * to DEFAULT_CHAIN_ID when no wallet is connected.
 */
export function useActiveChainId() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  return isConnected ? chainId : DEFAULT_CHAIN_ID;
}

export function useSaveEarthContracts() {
  const chainId = useActiveChainId();
  const membership = membershipAddress(chainId);
  const communityBoard = communityBoardAddress(chainId);

  return {
    chainId,
    membership,
    communityBoard,
    isConfigured: Boolean(membership && communityBoard),
  };
}
