"use client";

import { useState } from "react";
import { useConfirmedWrite } from "../../hooks/useConfirmedWrite";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { communityBoardAbi } from "../../lib/contracts/communityBoard";
import sharedStyles from "../shared.module.css";

export function MissionForm({ onSuccess }: { onSuccess: () => void }) {
  const { chainId, communityBoard } = useSaveEarthContracts();
  const [content, setContent] = useState("");
  const { writeContract, isBusy, error } = useConfirmedWrite(() => {
    setContent("");
    onSuccess();
  });

  return (
    <form
      className={sharedStyles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (!communityBoard || !content.trim()) return;
        writeContract({
          address: communityBoard,
          abi: communityBoardAbi,
          functionName: "addMessage",
          args: [content.trim()],
          chainId,
        });
      }}
    >
      <input
        type="text"
        className={sharedStyles.textInput}
        placeholder="New mission message"
        value={content}
        onChange={(event) => setContent(event.target.value)}
      />
      <button type="submit" className={sharedStyles.btn} disabled={isBusy || !content.trim()}>
        {isBusy ? "…" : "ADD"}
      </button>
      {error && <p className={sharedStyles.errorText}>{error.message}</p>}
    </form>
  );
}
