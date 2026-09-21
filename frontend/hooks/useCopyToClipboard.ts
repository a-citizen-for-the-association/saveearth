"use client";

import { useState } from "react";

const RESET_DELAY_MS = 1500;

/** Copies `text` to the clipboard and reports it back as `copied` for a
 *  short window, so a caller can flip a button's label to "COPIED". */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), RESET_DELAY_MS);
  }

  return { copied, copy };
}
