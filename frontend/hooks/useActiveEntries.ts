"use client";

import { useMemo } from "react";
import type { Abi, ContractFunctionName } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { useSaveEarthContracts } from "./useSaveEarthContracts";

/**
 * `getActiveChatRooms`/`getActiveMessages` return only the filtered structs,
 * with no id attached — so a per-item delete button (which needs the
 * on-chain id) can't be built from them directly. Instead this fetches
 * `getEntry(i)` for every `i` in `[0, count)` via a single multicall and
 * keeps the id alongside each result, filtering to `active` client-side.
 * Counts are small and owner-curated (design doc 001 section 3.4).
 *
 * `TAbi` is threaded through so `countFunctionName`/`entryFunctionName` are
 * checked against the actual ABI's view functions at compile time, instead
 * of accepting any string.
 */
export function useActiveEntries<T extends { active: boolean }, TAbi extends Abi = Abi>(
  address: `0x${string}` | undefined,
  abi: TAbi,
  countFunctionName: ContractFunctionName<TAbi, "pure" | "view">,
  entryFunctionName: ContractFunctionName<TAbi, "pure" | "view">,
) {
  const { chainId, isConfigured } = useSaveEarthContracts();

  // Widened back to the base `Abi` for these two calls: mixing a 0-arg
  // (count) and a 1-arg (entry-by-id) function under one generic `TAbi`
  // defeats wagmi/viem's per-function arg-shape inference. The public
  // signature above already checks `countFunctionName`/`entryFunctionName`
  // against the real ABI, which is what actually catches a typo'd name —
  // that guarantee doesn't depend on these internal calls staying generic.
  const genericAbi = abi as Abi;

  const countQuery = useReadContract({
    address,
    abi: genericAbi,
    functionName: countFunctionName,
    chainId,
    query: { enabled: isConfigured },
  });

  const count = typeof countQuery.data === "bigint" ? Number(countQuery.data) : 0;

  const contracts = useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        address,
        abi: genericAbi,
        functionName: entryFunctionName,
        args: [BigInt(id)],
        chainId,
      })),
    [address, genericAbi, entryFunctionName, chainId, count],
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
