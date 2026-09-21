import { renderHook } from "@testing-library/react";
import { useReadContract, useReadContracts } from "wagmi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSaveEarthContracts } from "./useSaveEarthContracts";
import { useMemberRoster } from "./useMemberRoster";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useReadContract: vi.fn(),
  useReadContracts: vi.fn(),
}));

vi.mock("./useSaveEarthContracts", () => ({
  useSaveEarthContracts: vi.fn(),
}));

const OWNER = "0x1111111111111111111111111111111111111111";
const ALICE = "0x2222222222222222222222222222222222222222";
const ZERO = "0x0000000000000000000000000000000000000000";

const refetchCount = vi.fn();
const refetchAddresses = vi.fn();
const refetchMembers = vi.fn();

function mockCount(data: bigint | undefined, isLoading = false) {
  vi.mocked(useReadContract).mockReturnValue({
    data,
    isLoading,
    refetch: refetchCount,
  } as unknown as ReturnType<typeof useReadContract>);
}

/**
 * The hook calls `useReadContracts` exactly twice per render, in a fixed
 * order: addresses (`memberAt`) first, then member details (`getMember`).
 * `mockImplementationOnce` twice maps 1:1 onto those two calls, which is
 * more robust than introspecting `contracts[0]` (that array can be empty).
 */
function mockReadContracts(config: {
  memberAt?: { data?: Array<{ result?: string }>; isLoading?: boolean };
  getMember?: { data?: Array<{ result?: unknown }>; isLoading?: boolean };
}) {
  const addresses = config.memberAt ?? {};
  const members = config.getMember ?? {};
  vi.mocked(useReadContracts)
    .mockImplementationOnce(
      () =>
        ({
          data: addresses.data,
          isLoading: addresses.isLoading ?? false,
          refetch: refetchAddresses,
        }) as unknown as ReturnType<typeof useReadContracts>,
    )
    .mockImplementationOnce(
      () =>
        ({
          data: members.data,
          isLoading: members.isLoading ?? false,
          refetch: refetchMembers,
        }) as unknown as ReturnType<typeof useReadContracts>,
    );
}

describe("useMemberRoster", () => {
  beforeEach(() => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 11_155_111,
      membership: "0xMembership",
      communityBoard: "0xCommunityBoard",
      isConfigured: true,
    } as ReturnType<typeof useSaveEarthContracts>);
    refetchCount.mockClear();
    refetchAddresses.mockClear();
    refetchMembers.mockClear();
    vi.mocked(useReadContracts).mockReset();
  });

  it("returns an empty roster when there are no members yet", () => {
    mockCount(0n);
    mockReadContracts({});

    const { result } = renderHook(() => useMemberRoster());

    expect(result.current.roster).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("joins memberAt() addresses with getMember() details, marking the genesis member via the zero address", () => {
    mockCount(2n);
    mockReadContracts({
      memberAt: { data: [{ result: OWNER }, { result: ALICE }] },
      getMember: {
        data: [
          { result: { isMember: true, addedBy: ZERO, addedAt: 1_000n } },
          { result: { isMember: true, addedBy: OWNER, addedAt: 2_000n } },
        ],
      },
    });

    const { result } = renderHook(() => useMemberRoster());

    expect(result.current.roster).toEqual([
      { address: OWNER, addedBy: ZERO, addedAt: 1_000n },
      { address: ALICE, addedBy: OWNER, addedAt: 2_000n },
    ]);
  });

  it("drops an address whose memberAt() index has shifted mid-flight (a reverted/missing getMember result)", () => {
    mockCount(2n);
    mockReadContracts({
      memberAt: { data: [{ result: OWNER }, { result: ALICE }] },
      getMember: {
        data: [{ result: { isMember: true, addedBy: ZERO, addedAt: 1_000n } }, { result: undefined }],
      },
    });

    const { result } = renderHook(() => useMemberRoster());

    expect(result.current.roster).toEqual([{ address: OWNER, addedBy: ZERO, addedAt: 1_000n }]);
  });

  it("filters out a falsy memberAt() result before ever requesting getMember() for it", () => {
    mockCount(2n);
    mockReadContracts({
      memberAt: { data: [{ result: OWNER }, { result: undefined }] },
      getMember: { data: [{ result: { isMember: true, addedBy: ZERO, addedAt: 1_000n } }] },
    });

    const { result } = renderHook(() => useMemberRoster());

    expect(result.current.roster).toEqual([{ address: OWNER, addedBy: ZERO, addedAt: 1_000n }]);
  });

  it("is loading while any of the three underlying queries is loading", () => {
    mockCount(1n, false);
    mockReadContracts({ memberAt: { isLoading: true } });

    const { result } = renderHook(() => useMemberRoster());

    expect(result.current.isLoading).toBe(true);
  });

  it("refetch() refetches the count, the address list, and the member details", () => {
    mockCount(0n);
    mockReadContracts({});

    const { result } = renderHook(() => useMemberRoster());
    result.current.refetch();

    expect(refetchCount).toHaveBeenCalledTimes(1);
    expect(refetchAddresses).toHaveBeenCalledTimes(1);
    expect(refetchMembers).toHaveBeenCalledTimes(1);
  });
});
