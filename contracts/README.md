# SaveEarth Contracts

Foundry project for `Membership.sol` / `CommunityBoard.sol`. See
[`docs/design/001-contract-design.md`](../docs/design/001-contract-design.md) for the design and
[`docs/adr/`](../docs/adr/) for the technology decisions this project follows.

## Setup

```bash
forge install   # fetches lib/forge-std and lib/openzeppelin-contracts (git submodules)
cp .env.example .env  # fill in the values you need for the network you're targeting
```

## Build / test

```bash
forge build
forge test
forge coverage --report summary   # must stay at 100% line/statement/branch/function (see Definition of Done)
forge fmt --check
forge lint
```

## Deploy

`script/Deploy.s.sol` deploys `Membership` and `CommunityBoard` with the same Owner address, and
writes a small `deployments/<chainId>.json` record (committed to git — this is the source of truth
the frontend's chain-id-to-address map reads from). It requires `OWNER_ADDRESS` in the environment.

Key management: prefer Foundry's encrypted keystore over a plaintext private key.

```bash
cast wallet import deployer --interactive   # one-time; prompts for the private key + a password
```

### Testnets (safe to use both, per ADR-0002)

```bash
# Ethereum Sepolia
OWNER_ADDRESS=0x... forge script script/Deploy.s.sol:Deploy \
  --chain sepolia --rpc-url "$SEPOLIA_RPC_URL" --account deployer --broadcast --verify

# Polkadot Hub Testnet (REVM backend — ADR-0003). --rpc-url is optional;
# Foundry has a built-in default for this chain name.
OWNER_ADDRESS=0x... forge script script/Deploy.s.sol:Deploy \
  --chain polkadot-testnet --account deployer --broadcast
```

### Mainnet

Per [ADR-0002](../docs/adr/0002-single-chain-mainnet-strategy.md), only **one** Mainnet is ever live
at a time — decide which chain before running this.

```bash
# Ethereum Mainnet
OWNER_ADDRESS=0x... forge script script/Deploy.s.sol:Deploy \
  --chain mainnet --rpc-url "$MAINNET_RPC_URL" --account deployer --broadcast --verify

# — or — Polkadot Hub Mainnet
OWNER_ADDRESS=0x... forge script script/Deploy.s.sol:Deploy \
  --chain polkadot --account deployer --broadcast
```

## Open items

- Polkadot Hub contract verification (equivalent of `--verify` on Etherscan) is not yet set up —
  confirm the verifier Polkadot Hub expects before a real Mainnet/Testnet deploy.
- `deployments/31337.json` (Anvil's local chain id) should never be committed — it's a throwaway
  local dry-run artifact, not a real deployment record.
