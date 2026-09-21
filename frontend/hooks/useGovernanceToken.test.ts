import { renderHook } from "@testing-library/react";
import { sepolia } from "viem/chains";
import { useReadContract } from "wagmi";
import { describe, expect, it, vi } from "vitest";
import { useSaveEarthContracts } from "./useSaveEarthContracts";
import { useGovernanceToken } from "./useGovernanceToken";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useReadContract: vi.fn(),
}));

vi.mock("./useSaveEarthContracts", () => ({
  useSaveEarthContracts: vi.fn(),
}));

const TOKEN_ADDRESS = "0x9999999999999999999999999999999999999999";

function mockReadContractByFunction(byFunctionName: Record<string, { data?: unknown; isLoading?: boolean }>) {
  vi.mocked(useReadContract).mockImplementation(((params: { functionName: string }) => {
    const result = byFunctionName[params.functionName] ?? {};
    return { data: result.data, isLoading: result.isLoading ?? false } as ReturnType<typeof useReadContract>;
  }) as typeof useReadContract);
}

describe("useGovernanceToken", () => {
  it("shows a 'not deployed' state when CommunityBoard isn't configured on this chain", () => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: sepolia.id,
      membership: undefined,
      communityBoard: undefined,
      isConfigured: false,
    } as ReturnType<typeof useSaveEarthContracts>);
    mockReadContractByFunction({});

    const { result } = renderHook(() => useGovernanceToken());

    expect(result.current.isConfigured).toBe(false);
    expect(result.current.address).toBeUndefined();
  });

  it("reads the token address from CommunityBoard, then its name/symbol", () => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: sepolia.id,
      membership: "0xMembership",
      communityBoard: "0xCommunityBoard",
      isConfigured: true,
    } as ReturnType<typeof useSaveEarthContracts>);
    mockReadContractByFunction({
      governanceToken: { data: TOKEN_ADDRESS },
      name: { data: "SaveEarth Governance Token" },
      symbol: { data: "SEG" },
    });

    const { result } = renderHook(() => useGovernanceToken());

    expect(result.current.address).toBe(TOKEN_ADDRESS);
    expect(result.current.name).toBe("SaveEarth Governance Token");
    expect(result.current.symbol).toBe("SEG");
    expect(result.current.explorerUrl).toBe(sepolia.blockExplorers?.default.url);
  });

  it("is loading while the address itself hasn't resolved yet, before name/symbol can even be requested", () => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: sepolia.id,
      membership: "0xMembership",
      communityBoard: "0xCommunityBoard",
      isConfigured: true,
    } as ReturnType<typeof useSaveEarthContracts>);
    mockReadContractByFunction({ governanceToken: { isLoading: true } });

    const { result } = renderHook(() => useGovernanceToken());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.address).toBeUndefined();
  });
});
