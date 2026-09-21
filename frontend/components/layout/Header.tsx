"use client";

import { useAccount } from "wagmi";
import { useMembershipStatus } from "../../hooks/useMembershipStatus";
import sharedStyles from "../shared.module.css";
import styles from "./Header.module.css";
import { NetworkBadge } from "./NetworkBadge";
import { WalletConnectButton } from "./WalletConnectButton";

export function Header() {
  const { isConnected } = useAccount();
  const { isOwner, isMember } = useMembershipStatus();

  return (
    <div className={`${sharedStyles.panel} ${styles.top}`}>
      <div>
        <span className={styles.mark}>SAVEEARTH</span>
        <br />
        <NetworkBadge />
      </div>
      <div className={styles.player}>
        <WalletConnectButton />
        {isConnected && (
          <span className={styles.role}>{isOwner ? "★ HOST ★" : isMember ? "MEMBER" : "VISITOR"}</span>
        )}
      </div>
    </div>
  );
}
