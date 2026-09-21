"use client";

import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import sharedStyles from "./shared.module.css";

export function CopyButton({ value }: { value: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button type="button" className={sharedStyles.btn} onClick={() => copy(value)}>
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}
