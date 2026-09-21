import { renderHook } from "@testing-library/react";
import { useAccount, useReadContract } from "wagmi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveEarthContracts } from "./useSaveEarthContracts";
import { useMembershipStatus } from "./useMembershipStatus";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useAccount: vi.fn(),
  useReadContract: vi.fn(),
}));

vi.mock("./useSaveEarthContracts", () => ({
  useSaveEarthContracts: vi.fn(),
}));

const OWNER = "0x1111111111111111111111111111111111111111";
const MEMBER = "0x2222222222222222222222222222222222222222";
const OUTSIDER = "0x3333333333333333333333333333333333333333";

function mockReadContractByFunction(byFunctionName: Record<string, { data?: unknown; isLoading?: boolean }>) {
  vi.mocked(useReadContract).mockImplementation(((params: { functionName: string }) => {
    const result = byFunctionName[params.functionName] ?? {};
    return { data: result.data, isLoading: result.isLoading ?? false } as ReturnType<typeof useReadContract>;
  }) as typeof useReadContract);
}

describe("useMembershipStatus", () => {
  beforeEach(() => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 11_155_111,
      membership: "0xMembership",
      communityBoard: "0xCommunityBoard",
      isConfigured: true,
    } as ReturnType<typeof useSaveEarthContracts>);
  });

  it("is owner and member when the connected address matches owner() and isMember() is true", () => {
    vi.mocked(useAccount).mockReturnValue({ address: OWNER } as unknown as ReturnType<typeof useAccount>);
    mockReadContractByFunction({ owner: { data: OWNER }, isMember: { data: true } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current).toMatchObject({ isOwner: true, isMember: true, canManageCommunityBoard: true });
  });

  it("is a plain member (not owner) when isMember() is true but owner() differs", () => {
    vi.mocked(useAccount).mockReturnValue({ address: MEMBER } as unknown as ReturnType<typeof useAccount>);
    mockReadContractByFunction({ owner: { data: OWNER }, isMember: { data: true } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current).toMatchObject({ isOwner: false, isMember: true, canManageCommunityBoard: false });
  });

  it("cannot manage the board when Owner but no longer a member (ADR-0005)", () => {
    vi.mocked(useAccount).mockReturnValue({ address: OWNER } as unknown as ReturnType<typeof useAccount>);
    mockReadContractByFunction({ owner: { data: OWNER }, isMember: { data: false } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current).toMatchObject({ isOwner: true, isMember: false, canManageCommunityBoard: false });
  });

  it("compares owner() case-insensitively", () => {
    vi.mocked(useAccount).mockReturnValue({ address: OWNER.toUpperCase() } as unknown as ReturnType<
      typeof useAccount
    >);
    mockReadContractByFunction({ owner: { data: OWNER.toLowerCase() }, isMember: { data: true } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current.isOwner).toBe(true);
  });

  it("is neither owner nor member for an unrelated visitor", () => {
    vi.mocked(useAccount).mockReturnValue({ address: OUTSIDER } as unknown as ReturnType<typeof useAccount>);
    mockReadContractByFunction({ owner: { data: OWNER }, isMember: { data: false } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current).toMatchObject({ isOwner: false, isMember: false, canManageCommunityBoard: false });
  });

  it("has no wallet connected (golden path 1): address is undefined, nothing is owner/member", () => {
    vi.mocked(useAccount).mockReturnValue({ address: undefined } as unknown as ReturnType<typeof useAccount>);
    mockReadContractByFunction({ owner: { data: OWNER }, isMember: { data: undefined } });

    const { result } = renderHook(() => useMembershipStatus());

    expect(result.current).toMatchObject({ isOwner: false, isMember: false, canManageCommunityBoard: false });
  });
});
