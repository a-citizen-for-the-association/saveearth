"use client";

import { useReadContract } from "wagmi";
import { communityBoardAbi } from "../lib/contracts/communityBoard";
import { governanceTokenAbi } from "../lib/contracts/governanceToken";
import { blockExplorerUrl } from "../lib/wagmi";
import { useSaveEarthContracts } from "./useSaveEarthContracts";

/**
 * The GovernanceToken address isn't a separate env var — it's read live
 * from CommunityBoard.governanceToken() (ADR-0006), so there's only ever
 * one place that can go stale.
 */
export function useGovernanceToken() {
  const { chainId, communityBoard, isConfigured } = useSaveEarthContracts();

  const addressQuery = useReadContract({
    address: communityBoard,
    abi: communityBoardAbi,
    functionName: "governanceToken",
    chainId,
    query: { enabled: isConfigured },
  });

  const address = addressQuery.data;

  const nameQuery = useReadContract({
    address,
    abi: governanceTokenAbi,
    functionName: "name",
    chainId,
    query: { enabled: Boolean(address) },
  });

  const symbolQuery = useReadContract({
    address,
    abi: governanceTokenAbi,
    functionName: "symbol",
    chainId,
    query: { enabled: Boolean(address) },
  });

  return {
    address,
    name: nameQuery.data,
    symbol: symbolQuery.data,
    explorerUrl: blockExplorerUrl(chainId),
    isConfigured,
    isLoading: addressQuery.isLoading || nameQuery.isLoading || symbolQuery.isLoading,
  };
}
