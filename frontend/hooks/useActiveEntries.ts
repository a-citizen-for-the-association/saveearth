"use client";

import { useMemo } from "react";
import type { Abi } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { useSaveEarthContracts } from "./useSaveEarthContracts";

/**
 * `getActiveChatRooms`/`getActiveMessages` return only the filtered structs,
 * with no id attached — so a per-item delete button (which needs the
 * on-chain id) can't be built from them directly. Instead this fetches
 * `getEntry(i)` for every `i` in `[0, count)` via a single multicall and
 * keeps the id alongside each result, filtering to `active` client-side.
 * Counts are small and owner-curated (design doc 001 section 3.4).
 */
export function useActiveEntries<T extends { active: boolean }>(
  address: `0x${string}` | undefined,
  abi: Abi,
  countFunctionName: string,
  entryFunctionName: string,
) {
  const { chainId, isConfigured } = useSaveEarthContracts();

  const countQuery = useReadContract({
    address,
    abi,
    functionName: countFunctionName,
    chainId,
    query: { enabled: isConfigured },
  });

  const count = typeof countQuery.data === "bigint" ? Number(countQuery.data) : 0;

  const contracts = useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        address,
        abi,
        functionName: entryFunctionName,
        args: [BigInt(id)],
        chainId,
      })),
    [address, abi, entryFunctionName, chainId, count],
  );

  const entriesQuery = useReadContracts({
    contracts,
    query: { enabled: isConfigured && count > 0 },
  });

  const entries = useMemo(() => {
    if (!entriesQuery.data) return [];
    return entriesQuery.data
      .map((result, id) => ({ id, value: result.result as T | undefined }))
      .filter((entry): entry is { id: number; value: T } => Boolean(entry.value?.active));
  }, [entriesQuery.data]);

  const refetch = () => {
    countQuery.refetch();
    entriesQuery.refetch();
  };

  return { entries, isLoading: countQuery.isLoading || entriesQuery.isLoading, refetch };
}
