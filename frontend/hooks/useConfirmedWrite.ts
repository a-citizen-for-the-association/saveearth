"use client";

import { useEffect, useRef } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";

/**
 * `useWriteContract`'s own `onSuccess` fires on transaction *submission*,
 * not confirmation — refetching read data at that point almost always
 * still sees pre-transaction state, and re-enabling the submit button at
 * the same time invites a confused double-submit. This waits for the
 * receipt (`useWaitForTransactionReceipt`) before calling `onConfirmed`,
 * and stays "busy" for the whole submit-to-confirm span.
 */
export function useConfirmedWrite(onConfirmed: () => void) {
  const {
    writeContract,
    data: hash,
    isPending: isSubmitting,
    error: submitError,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  const handledHash = useRef<`0x${string}` | undefined>(undefined);

  useEffect(() => {
    if (isConfirmed && hash && handledHash.current !== hash) {
      handledHash.current = hash;
      onConfirmed();
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  return {
    writeContract,
    isBusy: isSubmitting || isConfirming,
    error: submitError ?? confirmError,
  };
}
