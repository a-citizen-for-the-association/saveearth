import { describe, expect, it } from "vitest";
import { truncateAddress } from "./format";

describe("truncateAddress", () => {
  it("keeps the 0x + first 4 hex chars and the last 4 hex chars", () => {
    expect(truncateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976")).toBe("0x71C7…8976");
  });

  it("does not assume checksum casing", () => {
    expect(truncateAddress("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBe("0xaaaa…aaaa");
  });
});
