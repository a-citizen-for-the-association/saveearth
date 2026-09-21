"use client";

import { useState } from "react";
import { useWriteContract } from "wagmi";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { communityBoardAbi } from "../../lib/contracts/communityBoard";
import sharedStyles from "../shared.module.css";

export function CommsChannelForm({ onSuccess }: { onSuccess: () => void }) {
  const { chainId, communityBoard } = useSaveEarthContracts();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const { writeContract, isPending, error } = useWriteContract({
    mutation: {
      onSuccess: () => {
        setLabel("");
        setUrl("");
        onSuccess();
      },
    },
  });

  return (
    <form
      className={sharedStyles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!communityBoard || !label.trim() || !url.trim()) return;
        writeContract({
          address: communityBoard,
          abi: communityBoardAbi,
          functionName: "addChatRoom",
          args: [label.trim(), url.trim()],
          chainId,
        });
      }}
    >
      <input
        type="text"
        className={sharedStyles.textInput}
        placeholder="Room name"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <input
        type="text"
        className={sharedStyles.textInput}
        placeholder="https://…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <button type="submit" className={sharedStyles.btn} disabled={isPending || !label.trim() || !url.trim()}>
        {isPending ? "…" : "ADD"}
      </button>
      {error && <p className={sharedStyles.errorText}>{error.message}</p>}
    </form>
  );
}
