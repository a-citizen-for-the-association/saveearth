import { renderHook } from "@testing-library/react";
import { sepolia } from "viem/chains";
import { useAccount, useChainId } from "wagmi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { communityBoardAddress } from "../lib/contracts/communityBoard";
import { membershipAddress } from "../lib/contracts/membership";
import { DEFAULT_CHAIN_ID, useActiveChainId, useSaveEarthContracts } from "./useSaveEarthContracts";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useAccount: vi.fn(),
  useChainId: vi.fn(),
}));

vi.mock("../lib/contracts/membership", () => ({
  membershipAddress: vi.fn(),
}));

vi.mock("../lib/contracts/communityBoard", () => ({
  communityBoardAddress: vi.fn(),
}));

const MEMBERSHIP = "0x1111111111111111111111111111111111111111";
const COMMUNITY_BOARD = "0x2222222222222222222222222222222222222222";

describe("useActiveChainId", () => {
  beforeEach(() => {
    vi.mocked(useAccount).mockReset();
    vi.mocked(useChainId).mockReset();
  });

  it("falls back to DEFAULT_CHAIN_ID when no wallet is connected (golden path 1)", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: false } as ReturnType<typeof useAccount>);
    vi.mocked(useChainId).mockReturnValue(1 as ReturnType<typeof useChainId>);

    const { result } = renderHook(() => useActiveChainId());

    expect(result.current).toBe(DEFAULT_CHAIN_ID);
  });

  it("uses the wallet's raw connected chain id when connected, even if unsupported (golden path 8)", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
    vi.mocked(useChainId).mockReturnValue(999_999 as ReturnType<typeof useChainId>);

    const { result } = renderHook(() => useActiveChainId());

    // Deliberately NOT falling back or filtering here — see the hook's own
    // doc comment on why this must stay useChainId(), not useAccount().chain.
    expect(result.current).toBe(999_999);
  });
});

describe("useSaveEarthContracts", () => {
  beforeEach(() => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
    vi.mocked(useChainId).mockReturnValue(sepolia.id as ReturnType<typeof useChainId>);
    vi.mocked(membershipAddress).mockReset();
    vi.mocked(communityBoardAddress).mockReset();
  });

  it("is configured when both contract addresses are present", () => {
    vi.mocked(membershipAddress).mockReturnValue(MEMBERSHIP);
    vi.mocked(communityBoardAddress).mockReturnValue(COMMUNITY_BOARD);

    const { result } = renderHook(() => useSaveEarthContracts());

    expect(result.current).toEqual({
      chainId: sepolia.id,
      membership: MEMBERSHIP,
      communityBoard: COMMUNITY_BOARD,
      isConfigured: true,
    });
  });

  it("is not configured when either contract address is missing", () => {
    vi.mocked(membershipAddress).mockReturnValue(MEMBERSHIP);
    vi.mocked(communityBoardAddress).mockReturnValue(undefined);

    const { result } = renderHook(() => useSaveEarthContracts());

    expect(result.current.isConfigured).toBe(false);
  });
});
