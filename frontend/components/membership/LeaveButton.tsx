"use client";

import type { Address } from "viem";
import { useWriteContract } from "wagmi";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { membershipAbi } from "../../lib/contracts/membership";
import sharedStyles from "../shared.module.css";

export function LeaveButton({ address, onSuccess }: { address: Address; onSuccess: () => void }) {
  const { chainId, membership } = useSaveEarthContracts();
  const { writeContract, isPending } = useWriteContract({
    mutation: { onSuccess },
  });

  return (
    <button
      type="button"
      className={sharedStyles.btn}
      disabled={isPending}
      onClick={() =>
        writeContract({
          address: membership!,
          abi: membershipAbi,
          functionName: "removeMember",
          args: [address],
          chainId,
        })
      }
    >
      LEAVE
    </button>
  );
}
