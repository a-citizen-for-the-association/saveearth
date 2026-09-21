import { render, screen } from "@testing-library/react";
import { useAccount } from "wagmi";
import { describe, expect, it, vi } from "vitest";
import { useSaveEarthContracts } from "../../hooks/useSaveEarthContracts";
import { NetworkBadge } from "./NetworkBadge";

vi.mock("wagmi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("wagmi")>()),
  useAccount: vi.fn(),
}));

vi.mock("../../hooks/useSaveEarthContracts", () => ({
  useSaveEarthContracts: vi.fn(),
}));

/**
 * Golden path 8 (Definition of Done section 4): "connected to an
 * unsupported network shows an appropriate warning". This is a component
 * test rather than a Playwright E2E test because wagmi's `mock` connector
 * (used for the real E2E golden paths, e2e/golden-paths.spec.ts) always
 * reports a chain from `supportedChains` — there's no clean way to make a
 * real wallet provider claim a chain id outside that list without either
 * inventing a throwaway chain definition just for this test or scripting
 * around wagmi's own internals. Exercising NetworkBadge's branch directly
 * is more reliable than fighting the mock connector for a result no more
 * meaningful than what this already proves.
 */
describe("NetworkBadge — golden path 8: unsupported network", () => {
  it("shows an explicit warning when connected to a chain outside supportedChains", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 999_999,
      isConfigured: false,
    } as unknown as ReturnType<typeof useSaveEarthContracts>);

    render(<NetworkBadge />);

    expect(screen.getByText("UNSUPPORTED NETWORK")).toBeInTheDocument();
  });

  it("shows the chain name plus a deployment warning for a supported chain with no deployment", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 11_155_111,
      isConfigured: false,
    } as unknown as ReturnType<typeof useSaveEarthContracts>);

    render(<NetworkBadge />);

    expect(screen.getByText("SEPOLIA — NOT DEPLOYED")).toBeInTheDocument();
  });

  it("shows only the chain name once it is configured", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 11_155_111,
      isConfigured: true,
    } as unknown as ReturnType<typeof useSaveEarthContracts>);

    render(<NetworkBadge />);

    expect(screen.getByText("SEPOLIA")).toBeInTheDocument();
  });

  it("does not show the 'unsupported' warning before a wallet is connected (golden path 1)", () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: false } as ReturnType<typeof useAccount>);
    vi.mocked(useSaveEarthContracts).mockReturnValue({
      chainId: 999_999,
      isConfigured: false,
    } as unknown as ReturnType<typeof useSaveEarthContracts>);

    render(<NetworkBadge />);

    expect(screen.queryByText("UNSUPPORTED NETWORK")).not.toBeInTheDocument();
    expect(screen.getByText("CHAIN 999999 — NOT DEPLOYED")).toBeInTheDocument();
  });
});
