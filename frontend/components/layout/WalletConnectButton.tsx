"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { truncateAddress } from "../../lib/format";
import sharedStyles from "../shared.module.css";

export function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();

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

  const injectedConnector = connectors[0];

  return (
    <div>
      <button
        type="button"
        className={sharedStyles.btn}
        disabled={!injectedConnector || isPending}
        onClick={() => injectedConnector && connect({ connector: injectedConnector })}
      >
        {isPending ? "CONNECTING…" : "CONNECT WALLET"}
      </button>
      {error && <p className={sharedStyles.errorText}>{error.message}</p>}
    </div>
  );
}
