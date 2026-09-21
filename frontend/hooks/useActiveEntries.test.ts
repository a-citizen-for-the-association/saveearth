import { renderHook } from "@testing-library/react";
import { useReadContract, useReadContracts } from "wagmi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { communityBoardAbi } from "../lib/contracts/communityBoard";
import { useSaveEarthContracts } from "./useSaveEarthContracts";
import { useActiveEntries } from "./useActiveEntries";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useReadContract: vi.fn(),
  useReadContracts: vi.fn(),
}));

vi.mock("./useSaveEarthContracts", () => ({
  useSaveEarthContracts: vi.fn(),
}));

type Message = { content: string; active: boolean };

const refetchCount = vi.fn();
const refetchEntries = vi.fn();

function mockCount(data: bigint | undefined, isLoading = false) {
  vi.mocked(useReadContract).mockReturnValue({
    data,
    isLoading,
    refetch: refetchCount,
  } as unknown as ReturnType<typeof useReadContract>);
}

function mockEntries(data: Array<{ result?: Message }> | undefined, isLoading = false) {
  vi.mocked(useReadContracts).mockReturnValue({
    data,
    isLoading,
    refetch: refetchEntries,
  } as unknown as ReturnType<typeof useReadContracts>);
}

describe("useActiveEntries", () => {
  beforeEach(() => {
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 11_155_111,
      membership: "0xMembership",
      communityBoard: "0xCommunityBoard",
      isConfigured: true,
    } as ReturnType<typeof useSaveEarthContracts>);
    refetchCount.mockClear();
    refetchEntries.mockClear();
  });

  it("returns no entries when the count is zero", () => {
    mockCount(0n);
    mockEntries(undefined);

    const { result } = renderHook(() =>
      useActiveEntries<Message>("0xCommunityBoard", communityBoardAbi, "messageCount", "getMessage"),
    );

    expect(result.current.entries).toEqual([]);
  });

  it("keeps the real on-chain id alongside each active entry, dropping inactive ones", () => {
    mockCount(3n);
    mockEntries([
      { result: { content: "first", active: true } },
      { result: { content: "removed", active: false } },
      { result: { content: "third", active: true } },
    ]);

    const { result } = renderHook(() =>
      useActiveEntries<Message>("0xCommunityBoard", communityBoardAbi, "messageCount", "getMessage"),
    );

    expect(result.current.entries).toEqual([
      { id: 0, value: { content: "first", active: true } },
      { id: 2, value: { content: "third", active: true } },
    ]);
  });

  it("treats a failed per-id call (no result) as absent, same as inactive", () => {
    mockCount(2n);
    mockEntries([{ result: { content: "ok", active: true } }, { result: undefined }]);

    const { result } = renderHook(() =>
      useActiveEntries<Message>("0xCommunityBoard", communityBoardAbi, "messageCount", "getMessage"),
    );

    expect(result.current.entries).toEqual([{ id: 0, value: { content: "ok", active: true } }]);
  });

  it("is loading while either the count or the entries query is loading", () => {
    mockCount(1n, true);
    mockEntries(undefined, false);

    const { result } = renderHook(() =>
      useActiveEntries<Message>("0xCommunityBoard", communityBoardAbi, "messageCount", "getMessage"),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("refetch() refetches both the count and the entries", () => {
    mockCount(0n);
    mockEntries(undefined);

    const { result } = renderHook(() =>
      useActiveEntries<Message>("0xCommunityBoard", communityBoardAbi, "messageCount", "getMessage"),
    );
    result.current.refetch();

    expect(refetchCount).toHaveBeenCalledTimes(1);
    expect(refetchEntries).toHaveBeenCalledTimes(1);
  });
});
