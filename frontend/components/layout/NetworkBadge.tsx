"use client";

import { useAccount } from "wagmi";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import styles from "./Header.module.css";

const CHAIN_NAMES: Record<number, string> = {
  1: "ETHEREUM",
  11155111: "SEPOLIA",
  420420419: "POLKADOT HUB",
  420420417: "POLKADOT HUB TESTNET",
  31337: "LOCAL (FOUNDRY)",
};

export function NetworkBadge() {
  const { isConnected } = useAccount();
  const { chainId, isConfigured } = useSaveEarthContracts();
  const label = CHAIN_NAMES[chainId];

  if (isConnected && !label) {
    return <span className={styles.tag}>UNSUPPORTED NETWORK</span>;
  }

  return (
    <span className={styles.tag}>
      {label ?? `CHAIN ${chainId}`}
      {!isConfigured ? " — NOT DEPLOYED" : ""}
    </span>
  );
}
