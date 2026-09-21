import { renderHook } from "@testing-library/react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConfirmedWrite } from "./useConfirmedWrite";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useWriteContract: vi.fn(),
  useWaitForTransactionReceipt: vi.fn(),
}));

const HASH = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;
const reset = vi.fn();

// `error` is deliberately typed as `unknown` here rather than wagmi's real
// branded error unions (`WriteContractErrorType` etc.) — constructing one of
// those for a test is needlessly heavy when all `useConfirmedWrite` does is
// pass the value through untouched.
function mockWriteState(overrides: Record<string, unknown>) {
  vi.mocked(useWriteContract).mockReturnValue({
    writeContract: vi.fn(),
    data: undefined,
    isPending: false,
    error: null,
    reset,
    ...overrides,
  } as unknown as ReturnType<typeof useWriteContract>);
}

function mockReceiptState(overrides: Record<string, unknown>) {
  vi.mocked(useWaitForTransactionReceipt).mockReturnValue({
    isLoading: false,
    isSuccess: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useWaitForTransactionReceipt>);
}

describe("useConfirmedWrite", () => {
  beforeEach(() => {
    reset.mockClear();
  });

  it("is not busy and calls nothing before a transaction is submitted", () => {
    mockWriteState({});
    mockReceiptState({});
    const onConfirmed = vi.fn();

    const { result } = renderHook(() => useConfirmedWrite(onConfirmed));

    expect(result.current.isBusy).toBe(false);
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it("is busy while the transaction is submitting", () => {
    mockWriteState({ isPending: true });
    mockReceiptState({});

    const { result } = renderHook(() => useConfirmedWrite(vi.fn()));

    expect(result.current.isBusy).toBe(true);
  });

  it("is busy while waiting for confirmation after submission", () => {
    mockWriteState({ data: HASH });
    mockReceiptState({ isLoading: true });

    const { result } = renderHook(() => useConfirmedWrite(vi.fn()));

    expect(result.current.isBusy).toBe(true);
  });

  it("calls onConfirmed exactly once when the receipt confirms, not before", () => {
    const onConfirmed = vi.fn();
    mockWriteState({ data: HASH });
    mockReceiptState({ isLoading: true, isSuccess: false });

    const { rerender } = renderHook(() => useConfirmedWrite(onConfirmed));
    expect(onConfirmed).not.toHaveBeenCalled();

    mockReceiptState({ isLoading: false, isSuccess: true });
    rerender();

    expect(onConfirmed).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not call onConfirmed again on a further re-render for the same hash", () => {
    const onConfirmed = vi.fn();
    mockWriteState({ data: HASH });
    mockReceiptState({ isSuccess: true });

    const { rerender } = renderHook(() => useConfirmedWrite(onConfirmed));
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it("prefers the submit error over a confirmation error", () => {
    const submitError = new Error("submit failed");
    mockWriteState({ error: submitError });
    mockReceiptState({ error: new Error("confirm failed") });

    const { result } = renderHook(() => useConfirmedWrite(vi.fn()));

    expect(result.current.error).toBe(submitError);
  });

  it("falls back to the confirmation error when there is no submit error", () => {
    const confirmError = new Error("confirm failed");
    mockWriteState({ data: HASH, error: null });
    mockReceiptState({ error: confirmError });

    const { result } = renderHook(() => useConfirmedWrite(vi.fn()));

    expect(result.current.error).toBe(confirmError);
  });
});
