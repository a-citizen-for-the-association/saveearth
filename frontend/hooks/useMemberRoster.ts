"use client";

import { useMemo } from "react";
import type { Address } from "viem";
import { useReadContract, useReadContracts } from "wagmi";
import { membershipAbi } from "../lib/contracts/membership";
import { useSaveEarthContracts } from "./useSaveEarthContracts";

export type RosterEntry = {
  address: Address;
  addedBy: Address;
  addedAt: bigint;
};

/** Enumerates every current member (`memberAt` for `i` in `[0, memberCount)`),
 *  then fetches each one's `getMember` details in a second batched call. */
export function useMemberRoster() {
  const { chainId, membership, isConfigured } = useSaveEarthContracts();

  const countQuery = useReadContract({
    address: membership,
    abi: membershipAbi,
    functionName: "memberCount",
    chainId,
    query: { enabled: isConfigured },
  });

  const count = typeof countQuery.data === "bigint" ? Number(countQuery.data) : 0;

  const addressContracts = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        address: membership,
        abi: membershipAbi,
        functionName: "memberAt" as const,
        args: [BigInt(index)] as const,
        chainId,
      })),
    [membership, chainId, count],
  );

  const addressesQuery = useReadContracts({
    contracts: addressContracts,
    query: { enabled: isConfigured && count > 0 },
  });

  const addresses = useMemo(
    () =>
      (addressesQuery.data?.map((r) => r.result as Address | undefined).filter(Boolean) as Address[]) ?? [],
    [addressesQuery.data],
  );

  const memberContracts = useMemo(
    () =>
      addresses.map((address) => ({
        address: membership,
        abi: membershipAbi,
        functionName: "getMember" as const,
        args: [address] as const,
        chainId,
      })),
    [addresses, membership, chainId],
  );

  const membersQuery = useReadContracts({
    contracts: memberContracts,
    query: { enabled: isConfigured && addresses.length > 0 },
  });

  const roster: RosterEntry[] = useMemo(() => {
    if (!membersQuery.data) return [];
    return membersQuery.data
      .map((result, index) => {
        const value = result.result as { isMember: boolean; addedBy: Address; addedAt: bigint } | undefined;
        if (!value) return undefined;
        return { address: addresses[index], addedBy: value.addedBy, addedAt: value.addedAt };
      })
      .filter((entry): entry is RosterEntry => Boolean(entry));
  }, [membersQuery.data, addresses]);

  const refetch = () => {
    countQuery.refetch();
    addressesQuery.refetch();
    membersQuery.refetch();
  };

  return {
    roster,
    count,
    isLoading: countQuery.isLoading || addressesQuery.isLoading || membersQuery.isLoading,
    refetch,
  };
}
