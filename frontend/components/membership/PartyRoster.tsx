"use client";

import { useAccount } from "wagmi";
import { useMemberRoster } from "../../hooks/useMemberRoster";
import { useMembershipStatus } from "../../hooks/useMembershipStatus";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { truncateAddress } from "../../lib/format";
import { deriveHackChatNickname } from "../../lib/hackchatNickname";
import { CopyButton } from "../CopyButton";
import sharedStyles from "../shared.module.css";
import { AddMemberForm } from "./AddMemberForm";
import { LeaveButton } from "./LeaveButton";
import styles from "./PartyRoster.module.css";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function PartyRoster() {
  const { isConfigured } = useSaveEarthContracts();
  const { address: myAddress } = useAccount();
  const { roster, count, refetch } = useMemberRoster();
  const { isMember } = useMembershipStatus();

  if (!isConfigured) {
    return (
      <div className={sharedStyles.panel}>
        <p className={sharedStyles.heading}>PARTY ROSTER</p>
        <p className={sharedStyles.mutedText}>This network has no SaveEarth deployment yet.</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.panel}>
      <p className={sharedStyles.heading}>
        PARTY ROSTER — <span className={sharedStyles.mutedText}>{count}</span>
      </p>
      <div className={styles.roster}>
        {roster.map((entry) => {
          const isYou = myAddress?.toLowerCase() === entry.address.toLowerCase();
          const via =
            entry.addedBy.toLowerCase() === ZERO_ADDRESS
              ? "GENESIS"
              : `JOINED VIA ${truncateAddress(entry.addedBy)}`;
          return (
            <div key={entry.address} className={styles.member}>
              <div className={styles.identity}>
                <span className={`${styles.avatar} ${isYou ? styles.avatarYou : ""}`} />
                <span className={styles.address}>{truncateAddress(entry.address)}</span>
                <CopyButton value={entry.address} />
                <span className={styles.via}>{isYou ? `${via} / YOU` : via}</span>
                {isYou && <LeaveButton address={entry.address} onSuccess={refetch} />}
              </div>
              <div className={styles.nickname}>
                <span className={styles.nicknameLabel}>HACKCHAT:</span>
                <span className={styles.nicknameValue}>{deriveHackChatNickname(entry.address)}</span>
                <CopyButton value={deriveHackChatNickname(entry.address)} />
              </div>
            </div>
          );
        })}
      </div>
      {isMember && <AddMemberForm onSuccess={refetch} />}
    </div>
  );
}
