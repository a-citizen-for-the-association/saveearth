"use client";

import { useWriteContract } from "wagmi";
import { useActiveEntries } from "../../hooks/useActiveEntries";
import { useMembershipStatus } from "../../hooks/useMembershipStatus";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { communityBoardAbi } from "../../lib/contracts/communityBoard";
import sharedStyles from "../shared.module.css";
import { CommsChannelForm } from "./CommsChannelForm";
import styles from "./CommsChannelList.module.css";

type ChatRoom = { label: string; url: string; active: boolean };

export function CommsChannelList() {
  const { chainId, communityBoard, isConfigured } = useSaveEarthContracts();
  const { isOwner } = useMembershipStatus();

  const { entries, refetch } = useActiveEntries<ChatRoom>(
    communityBoard,
    communityBoardAbi,
    "chatRoomCount",
    "getChatRoom",
  );

  const { writeContract, isPending } = useWriteContract({
    mutation: { onSuccess: () => refetch() },
  });

  if (!isConfigured) {
    return (
      <div className={sharedStyles.panel}>
        <p className={sharedStyles.heading}>COMMS CHANNELS</p>
        <p className={sharedStyles.mutedText}>This network has no SaveEarth deployment yet.</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.panel}>
      <p className={sharedStyles.heading}>COMMS CHANNELS</p>
      {entries.length > 0 ? (
        entries.map(({ id, value }) => (
          <div key={id} className={styles.room}>
            <span>{value.label.toUpperCase()}</span>
            <a href={value.url} target="_blank" rel="noreferrer" className={styles.url}>
              {value.url}
            </a>
            {isOwner && (
              <button
                type="button"
                className={sharedStyles.btn}
                disabled={isPending}
                onClick={() =>
                  writeContract({
                    address: communityBoard!,
                    abi: communityBoardAbi,
                    functionName: "removeChatRoom",
                    args: [BigInt(id)],
                    chainId,
                  })
                }
              >
                DEL
              </button>
            )}
          </div>
        ))
      ) : (
        <p className={sharedStyles.mutedText}>No rooms yet.</p>
      )}
      {isOwner && <CommsChannelForm onSuccess={refetch} />}
    </div>
  );
}
