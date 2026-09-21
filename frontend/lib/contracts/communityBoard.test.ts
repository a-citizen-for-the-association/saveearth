import { mainnet, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_ADDRESS = "0x4A1e00E5A6c6E7bC3F1D2C1B0aA9E8F7D6C5B4A3";

async function loadCommunityBoardAddress() {
  vi.resetModules();
  const mod = await import("./communityBoard");
  return mod.communityBoardAddress;
}

describe("communityBoardAddress", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured address for a chain with an env var set", async () => {
    vi.stubEnv("NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_11155111", TEST_ADDRESS);
    const communityBoardAddress = await loadCommunityBoardAddress();

    expect(communityBoardAddress(sepolia.id)).toBe(TEST_ADDRESS);
  });

  it("returns undefined for a chain with no env var set", async () => {
    const communityBoardAddress = await loadCommunityBoardAddress();

    expect(communityBoardAddress(mainnet.id)).toBeUndefined();
  });
});
