/** `0x1234…9abc` — the truncation convention used everywhere an address is displayed. */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
