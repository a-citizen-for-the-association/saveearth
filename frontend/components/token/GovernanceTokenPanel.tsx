"use client";

import { useGovernanceToken } from "../../hooks/useGovernanceToken";
import { truncateAddress } from "../../lib/format";
import { CopyButton } from "../CopyButton";
import sharedStyles from "../shared.module.css";
import styles from "./GovernanceTokenPanel.module.css";

export function GovernanceTokenPanel() {
  const { address, name, symbol, explorerUrl, isConfigured } = useGovernanceToken();

  if (!isConfigured) {
    return (
      <div className={sharedStyles.panel}>
        <p className={sharedStyles.heading}>GOVERNANCE TOKEN</p>
        <p className={sharedStyles.mutedText}>This network has no SaveEarth deployment yet.</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className={sharedStyles.panel}>
        <p className={sharedStyles.heading}>GOVERNANCE TOKEN</p>
        <p className={sharedStyles.mutedText}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={sharedStyles.panel}>
      <p className={sharedStyles.heading}>GOVERNANCE TOKEN</p>
      <div className={styles.row}>
        <span>{name ?? "…"}</span>
        {symbol && <span className={styles.symbol}>{symbol}</span>}
      </div>
      <div className={styles.addressRow}>
        <span className={styles.address}>{truncateAddress(address)}</span>
        <CopyButton value={address} />
      </div>
      {explorerUrl && (
        <p className={styles.explorer}>
          &gt;{" "}
          <a href={`${explorerUrl}address/${address}`} target="_blank" rel="noreferrer">
            VIEW ON EXPLORER
          </a>
        </p>
      )}
    </div>
  );
}
