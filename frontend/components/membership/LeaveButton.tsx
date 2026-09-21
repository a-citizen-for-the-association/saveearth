"use client";

import type { Address } from "viem";
import { useConfirmedWrite } from "../../hooks/useConfirmedWrite";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { membershipAbi } from "../../lib/contracts/membership";
import sharedStyles from "../shared.module.css";

export function LeaveButton({ address, onSuccess }: { address: Address; onSuccess: () => void }) {
  const { chainId, membership } = useSaveEarthContracts();
  const { writeContract, isBusy } = useConfirmedWrite(onSuccess);

  // Defensive: PartyRoster only renders LeaveButton once a deployment is
  // configured, but that invariant lives in a different file — don't rely
  // on a non-null assertion to carry it here.
  if (!membership) return null;

  return (
    <button
      type="button"
      className={sharedStyles.btn}
      disabled={isBusy}
      onClick={() =>
        writeContract({
          address: membership,
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
