import { mainnet, sepolia } from "viem/chains";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_ADDRESS = "0x71C7656EC7ab88b098defB751B7401B5f6d8976";

// The address map is computed once at module load from `process.env`, so
// each scenario needs a fresh module instance after stubbing env vars.
async function loadMembershipAddress() {
  vi.resetModules();
  const mod = await import("./membership");
  return mod.membershipAddress;
}

describe("membershipAddress", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the configured address for a chain with an env var set", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEMBERSHIP_ADDRESS_11155111", TEST_ADDRESS);
    const membershipAddress = await loadMembershipAddress();

    expect(membershipAddress(sepolia.id)).toBe(TEST_ADDRESS);
  });

  it("returns undefined for a chain with no env var set", async () => {
    const membershipAddress = await loadMembershipAddress();

    expect(membershipAddress(mainnet.id)).toBeUndefined();
  });

  it("returns undefined for a chain id it doesn't know about at all", async () => {
    const membershipAddress = await loadMembershipAddress();

    expect(membershipAddress(123_456)).toBeUndefined();
  });
});
