"use client";

import { useSearchParams } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "../../lib/format";
import sharedStyles from "../shared.module.css";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  // Playwright-only hook: `?e2eConnector=1` connects as connectors[1]
  // instead of connectors[0], letting E2E tests pick a specific identity
  // (Owner / second member / stranger — see lib/wagmi.ts's three mock
  // connectors). Meaningless outside E2E test mode: production only ever
  // has connectors[0] (`injected()`), so an out-of-range index just falls
  // back to it.
  const requestedIndex = Number(useSearchParams().get("e2eConnector") ?? "0");
  const connectorToUse = connectors[Number.isInteger(requestedIndex) ? requestedIndex : 0] ?? connectors[0];

  if (isConnected && address) {
    return (
      <div>
        <span>{truncateAddress(address)}</span>{" "}
        <button type="button" className={sharedStyles.btn} onClick={() => disconnect()}>
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={sharedStyles.btn}
        disabled={!connectorToUse || isPending}
        onClick={() => connectorToUse && connect({ connector: connectorToUse })}
      >
        {isPending ? "CONNECTING…" : "CONNECT WALLET"}
      </button>
      {error && <p className={sharedStyles.errorText}>{error.message}</p>}
    </div>
  );
}
