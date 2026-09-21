import { sepolia } from "viem/chains";
import { describe, expect, it } from "vitest";
import { blockExplorerUrl, polkadotHub, polkadotHubTestnet } from "./wagmi";

describe("blockExplorerUrl", () => {
  it("returns the built-in explorer for a viem-provided chain", () => {
    expect(blockExplorerUrl(sepolia.id)).toBe(sepolia.blockExplorers?.default.url);
  });

  it("returns the configured explorer for the custom Polkadot Hub chains", () => {
    expect(blockExplorerUrl(polkadotHub.id)).toBe("https://blockscout.polkadot.io/");
    expect(blockExplorerUrl(polkadotHubTestnet.id)).toBe("https://blockscout-testnet.polkadot.io/");
  });

  it("returns undefined for a chain id outside the supported list", () => {
    expect(blockExplorerUrl(999_999)).toBeUndefined();
  });
});
