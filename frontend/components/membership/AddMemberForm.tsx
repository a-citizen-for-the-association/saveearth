"use client";

import { useState } from "react";
import type { Address } from "viem";
import { useWriteContract } from "wagmi";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { membershipAbi } from "../../lib/contracts/membership";
import sharedStyles from "../shared.module.css";

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function AddMemberForm({ onSuccess }: { onSuccess: () => void }) {
  const { chainId, membership } = useSaveEarthContracts();
  const [address, setAddress] = useState("");
  const { writeContract, isPending, error } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setAddress("");
        onSuccess();
      },
    },
  });

  const isValid = ADDRESS_PATTERN.test(address);

  return (
    <form
      className={sharedStyles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!membership || !isValid) return;
        writeContract({
          address: membership,
          abi: membershipAbi,
          functionName: "addMember",
          args: [address as Address],
          chainId,
        });
      }}
    >
      <input
        type="text"
        className={sharedStyles.textInput}
        placeholder="0x... ADDRESS"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
      />
      <button type="submit" className={sharedStyles.btn} disabled={isPending || !isValid}>
        {isPending ? "…" : "ADD"}
      </button>
      {error && <p className={sharedStyles.errorText}>{error.message}</p>}
    </form>
  );
}
