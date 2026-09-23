import { describe, expect, it } from "vitest";
import { deriveHackChatNickname } from "./hackchatNickname";

describe("deriveHackChatNickname", () => {
  it("prefixes with SE_ and takes the address's trailing hex digits", () => {
    expect(deriveHackChatNickname("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe(
      "SE_e6ab8827279cfffb92266",
    );
  });

  it("is exactly 24 characters — hackchat's nickname length cap", () => {
    expect(deriveHackChatNickname("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toHaveLength(24);
  });

  it("only contains letters, numbers, and underscores — hackchat's allowed charset", () => {
    expect(deriveHackChatNickname("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toMatch(/^[A-Za-z0-9_]+$/);
  });

  it("lowercases the address so checksum casing doesn't change the result", () => {
    const lower = deriveHackChatNickname("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const upper = deriveHackChatNickname("0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(lower).toBe(upper);
  });

  it("differs for addresses that only differ near the end", () => {
    const a = deriveHackChatNickname("0x0000000000000000000000000000000000aaaa");
    const b = deriveHackChatNickname("0x0000000000000000000000000000000000bbbb");
    expect(a).not.toBe(b);
  });
});
