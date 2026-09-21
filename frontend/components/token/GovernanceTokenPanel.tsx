"use client";

import { useState } from "react";
import { useGovernanceToken } from "../../hooks/useGovernanceToken";
import sharedStyles from "../shared.module.css";
import styles from "./GovernanceTokenPanel.module.css";

function truncate(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function GovernanceTokenPanel() {
  const { address, name, symbol, explorerUrl, isConfigured } = useGovernanceToken();
  const [copied, setCopied] = useState(false);

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
        <span className={styles.address}>{truncate(address)}</span>
        <button
          type="button"
          className={sharedStyles.btn}
          onClick={async () => {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "COPIED" : "COPY"}
        </button>
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
