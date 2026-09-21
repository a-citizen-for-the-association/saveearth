"use client";

import { useAccount, useReadContract } from "wagmi";
import { membershipAbi } from "../lib/contracts/membership";
import { useSaveEarthContracts } from "./useSaveEarthContracts";

export function useMembershipStatus() {
  const { address } = useAccount();
  const { chainId, membership, isConfigured } = useSaveEarthContracts();

  const ownerQuery = useReadContract({
    address: membership,
    abi: membershipAbi,
    functionName: "owner",
    chainId,
    query: { enabled: isConfigured },
  });

  const isMemberQuery = useReadContract({
    address: membership,
    abi: membershipAbi,
    functionName: "isMember",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: isConfigured && Boolean(address) },
  });

  const isOwner = Boolean(
    address && ownerQuery.data && address.toLowerCase() === ownerQuery.data.toLowerCase(),
  );
  const isMember = Boolean(isMemberQuery.data);

  return {
    isOwner,
    isMember,
    isLoading: ownerQuery.isLoading || isMemberQuery.isLoading,
  };
}
