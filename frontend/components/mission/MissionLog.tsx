"use client";

import { useActiveEntries } from "../../hooks/useActiveEntries";
import { useConfirmedWrite } from "../../hooks/useConfirmedWrite";
import { useMembershipStatus } from "../../hooks/useMembershipStatus";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { communityBoardAbi } from "../../lib/contracts/communityBoard";
import sharedStyles from "../shared.module.css";
import { MissionForm } from "./MissionForm";

type Message = { content: string; active: boolean };

export function MissionLog() {
  const { chainId, communityBoard, isConfigured } = useSaveEarthContracts();
  const { isOwner, canManageCommunityBoard } = useMembershipStatus();

  const { entries, refetch } = useActiveEntries<Message>(
    communityBoard,
    communityBoardAbi,
    "messageCount",
    "getMessage",
  );

  const { writeContract, isBusy } = useConfirmedWrite(refetch);

  if (!isConfigured || !communityBoard) {
    return (
      <div className={sharedStyles.panel}>
        <p className={sharedStyles.heading}>MISSION LOG</p>
        <p className={sharedStyles.mutedText}>This network has no SaveEarth deployment yet.</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.panel}>
      <p className={sharedStyles.heading}>MISSION LOG</p>
      {entries.length > 0 ? (
        entries.map(({ id, value }) => (
          <p key={id} style={{ display: "flex", gap: "0.5rem" }}>
            <span className={sharedStyles.mutedText}>&gt;</span>
            <span style={{ flex: 1 }}>{value.content}</span>
            {canManageCommunityBoard && (
              <button
                type="button"
                className={sharedStyles.btn}
                disabled={isBusy}
                onClick={() =>
                  writeContract({
                    address: communityBoard,
                    abi: communityBoardAbi,
                    functionName: "removeMessage",
                    args: [BigInt(id)],
                    chainId,
                  })
                }
              >
                DEL
              </button>
            )}
          </p>
        ))
      ) : (
        <p className={sharedStyles.mutedText}>No messages yet.</p>
      )}
      {canManageCommunityBoard && <MissionForm onSuccess={refetch} />}
      {isOwner && !canManageCommunityBoard && (
        <p className={sharedStyles.mutedText}>
          You are the Owner but not currently a member — rejoin to manage the mission log.
        </p>
      )}
    </div>
  );
}
