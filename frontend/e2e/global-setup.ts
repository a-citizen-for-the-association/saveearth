import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, parseAbi, type Address, type Hash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";

// Anvil's well-known default dev account #0. Public, not a secret — the
// same for every Anvil install using its default mnemonic. Must match
// E2E_OWNER_ADDRESS in lib/wagmi.ts.
const OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const SECOND_MEMBER_ADDRESS: Address = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const RPC_URL = "http://127.0.0.1:8545";
const APP_URL = "http://127.0.0.1:3000";
const CONTRACTS_DIR = path.resolve(__dirname, "../../contracts");
const FRONTEND_DIR = path.resolve(__dirname, "..");
const DEPLOYMENT_FILE = path.join(CONTRACTS_DIR, "deployments/31337.json");

async function waitFor(check: () => Promise<boolean>, label: string, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await check().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForHttp(url: string, label: string) {
  // A throw (connection refused) is treated as "not ready yet" by waitFor's
  // own .catch — we only need to confirm *something* is listening and
  // responding, not a particular status code (Next's first compile can
  // still return e.g. a redirect before the page itself is fully ready).
  await waitFor(async () => {
    await fetch(url);
    return true;
  }, label);
}

/**
 * A stray process left over from an unrelated earlier manual run (e.g. a
 * `pnpm dev` from before contracts existed) can squat on 3000/8545 across
 * this suite's own spawns: the fresh `anvil`/`pnpm dev` this file starts
 * then fails to bind with EADDRINUSE, exits, and every test silently talks
 * to the stale process instead — no error is thrown anywhere, the app just
 * renders its own empty/default state forever. Fail loudly up front instead
 * of burning an hour rediscovering that every time.
 */
async function assertPortFree(port: number) {
  const inUse = await fetch(`http://127.0.0.1:${port}`)
    .then(() => true)
    .catch(() => false);
  if (inUse) {
    throw new Error(
      `Port ${port} is already in use — a stray process from an earlier run is likely squatting on it. ` +
        `Find it with \`lsof -i :${port}\` and kill it before running the E2E suite.`,
    );
  }
}

export default async function globalSetup() {
  await assertPortFree(3000);
  await assertPortFree(8545);

  // --- 1. Anvil -----------------------------------------------------
  const anvil: ChildProcess = spawn("anvil", ["--port", "8545"], { stdio: "ignore" });
  await waitFor(async () => {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    });
    return res.ok;
  }, "anvil");

  // --- 2. Deploy Membership + GovernanceToken + CommunityBoard -------
  // Reuses the exact same script real deployments use (contracts/README.md),
  // so this is also a live smoke test of that script.
  execFileSync(
    "forge",
    [
      "script",
      "script/Deploy.s.sol:Deploy",
      "--rpc-url",
      RPC_URL,
      "--private-key",
      OWNER_PRIVATE_KEY,
      "--broadcast",
    ],
    {
      cwd: CONTRACTS_DIR,
      env: { ...process.env, OWNER_ADDRESS: privateKeyToAccount(OWNER_PRIVATE_KEY).address },
      stdio: "ignore",
    },
  );

  if (!existsSync(DEPLOYMENT_FILE)) {
    throw new Error(`Expected ${DEPLOYMENT_FILE} after deploy — check the forge script ran cleanly.`);
  }
  const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf-8")) as {
    membership: Address;
    communityBoard: Address;
  };

  // --- 3. Seed fixture data for the golden paths ----------------------
  const account = privateKeyToAccount(OWNER_PRIVATE_KEY);
  const walletClient = createWalletClient({ account, chain: foundry, transport: http(RPC_URL) });
  const publicClient = createPublicClient({ chain: foundry, transport: http(RPC_URL) });

  const membershipAbi = parseAbi(["function addMember(address newMember) external"]);
  const boardAbi = parseAbi([
    "function addChatRoom(string label, string url) external returns (uint256)",
    "function addMessage(string content) external returns (uint256)",
  ]);

  async function send(hash: Promise<Hash>) {
    await publicClient.waitForTransactionReceipt({ hash: await hash });
  }

  await send(
    walletClient.writeContract({
      address: deployment.membership,
      abi: membershipAbi,
      functionName: "addMember",
      args: [SECOND_MEMBER_ADDRESS],
    }),
  );
  await send(
    walletClient.writeContract({
      address: deployment.communityBoard,
      abi: boardAbi,
      functionName: "addChatRoom",
      args: ["General", "https://discord.gg/saveearth"],
    }),
  );
  await send(
    walletClient.writeContract({
      address: deployment.communityBoard,
      abi: boardAbi,
      functionName: "addMessage",
      args: ["Climate action starts with us."],
    }),
  );

  // --- 4. Build and start the app against this fixture -----------------
  // Deliberately `next build` + `next start`, not `next dev`: Turbopack's
  // dev server depends on an HMR WebSocket to finish its client bootstrap,
  // and that handshake fails in this sandboxed environment (`ERR_INVALID_
  // HTTP_RESPONSE`) — the page renders its SSR shell but React never calls
  // hydrateRoot, so every wallet-connect click and contract read silently
  // no-ops forever with no error anywhere. The production server has no
  // HMR channel and hydrates correctly. It's also a closer match to what
  // Vercel actually serves. NEXT_PUBLIC_* values must be present at build
  // time — Next.js inlines them into the compiled output, not read at
  // start time — so this run's fixture addresses go on the build step.
  const buildEnv = {
    ...process.env,
    NEXT_PUBLIC_E2E_TEST_MODE: "true",
    NEXT_PUBLIC_DEFAULT_CHAIN_ID: String(foundry.id),
    NEXT_PUBLIC_MEMBERSHIP_ADDRESS_31337: deployment.membership,
    NEXT_PUBLIC_COMMUNITY_BOARD_ADDRESS_31337: deployment.communityBoard,
  };
  rmSync(path.join(FRONTEND_DIR, ".next"), { recursive: true, force: true });
  execFileSync("pnpm", ["exec", "next", "build"], { cwd: FRONTEND_DIR, env: buildEnv });

  const nextServer: ChildProcess = spawn("pnpm", ["exec", "next", "start"], {
    cwd: FRONTEND_DIR,
    env: buildEnv,
    stdio: "ignore",
  });
  await waitForHttp(APP_URL, "next start");

  return async () => {
    nextServer.kill();
    anvil.kill();
  };
}
