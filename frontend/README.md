# SaveEarth Frontend

Next.js (App Router) app for the SaveEarth home screen. See
[`docs/design/002-frontend-design.md`](../docs/design/002-frontend-design.md) for the design and
[`docs/design/003-software-versions.md`](../docs/design/003-software-versions.md) for the adopted
versions.

## Setup

```bash
nvm use 24   # or: install Node 24.x however you manage runtimes
pnpm install
cp .env.example .env.local   # fill in contract addresses per chain (see contracts/README.md)
```

## Develop

```bash
pnpm dev            # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm format:check   # pnpm format to fix
```

## Build (must succeed before this counts as done — see Definition of Done)

```bash
pnpm build
```

## Notes

- Wallet connection is the browser's injected provider only (MetaMask etc.) — no WalletConnect/UI
  kit, per [`docs/design/002-frontend-design.md`](../docs/design/002-frontend-design.md) section 2.
- A chain with no `NEXT_PUBLIC_*_ADDRESS_<chainId>` pair set renders a "not deployed" state instead
  of crashing — see `hooks/useSaveEarthContracts.ts`.
- Visual direction is the "8-Bit Assembly" concept (Game Boy 4-shade green palette) — a single
  committed visual world, no light/dark theme switching.
