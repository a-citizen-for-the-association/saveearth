import { expect, test } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

/**
 * Definition of Done section 4's golden paths, against a real local Anvil
 * chain + the real deployed contracts (see global-setup.ts) — driven
 * through wagmi's `mock` connector (three fixed identities: Owner, a
 * second member, and a stranger — see lib/wagmi.ts) via the `?e2eConnector`
 * query-param test hook on WalletConnectButton.
 *
 * Tests run in this exact order (playwright.config.ts pins workers to 1):
 * later tests depend on state left behind by earlier ones (e.g. test 3
 * adds a member that test 4 then removes).
 *
 * Golden path 8 (unsupported-network warning) is NOT here — see
 * components/layout/NetworkBadge.test.tsx for why and where it's covered.
 */

const OWNER = "?e2eConnector=0";
const SECOND_MEMBER = "?e2eConnector=1";
const STRANGER = "?e2eConnector=2";

test("golden path 1: an unconnected visitor can browse the home screen read-only", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("SAVEEARTH")).toBeVisible();
  await expect(page.getByText("MISSION LOG")).toBeVisible();
  await expect(page.getByText("Climate action starts with us.")).toBeVisible();
  await expect(page.getByText("COMMS CHANNELS")).toBeVisible();
  await expect(page.getByText("GENERAL")).toBeVisible();
  await expect(page.getByText(/PARTY ROSTER/)).toBeVisible();

  // Read-only: no admin/member controls anywhere without a connected wallet.
  await expect(page.getByRole("button", { name: "ADD" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "DEL" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LEAVE" })).toHaveCount(0);
});

test("golden path 2: connecting shows the account address and the network", async ({ page }) => {
  await page.goto(`/${OWNER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();

  // `.first()`: the header shows the connected address (this is what the
  // test verifies); the same address also reappears in the Party Roster
  // (as its own entry) and in other members' "JOINED VIA" attribution —
  // the header renders first in DOM order.
  await expect(page.getByText("0xf39F…2266").first()).toBeVisible();
  await expect(page.getByText("LOCAL (FOUNDRY)")).toBeVisible();
  await expect(page.getByText("★ HOST ★")).toBeVisible();
});

test("golden path 3: an existing member adds a new member unilaterally", async ({ page }) => {
  const newMember = privateKeyToAccount(generatePrivateKey()).address;

  await page.goto(`/${SECOND_MEMBER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();
  await expect(page.getByText("MEMBER")).toBeVisible();

  await page.getByPlaceholder("0x... ADDRESS").fill(newMember);
  await page.getByRole("button", { name: "ADD" }).click();

  const truncated = `${newMember.slice(0, 6)}…${newMember.slice(-4)}`;
  await expect(page.getByText(truncated)).toBeVisible();
  await expect(page.getByText(/PARTY ROSTER — 3/)).toBeVisible();
});

test("golden path 4: a member can remove themself (self-removal)", async ({ page }) => {
  await page.goto(`/${SECOND_MEMBER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();

  await page.getByRole("button", { name: "LEAVE" }).click();

  // Self-removal drops the member from the roster, but the wallet itself
  // stays connected (its address still shows in the header) and other
  // members' "JOINED VIA <address>" attribution is untouched — so the
  // right check is "no longer a roster row", not "address gone from the
  // page entirely".
  await expect(page.getByText(/PARTY ROSTER — 2/)).toBeVisible();
  await expect(page.getByText("GENESIS")).toBeVisible();
});

test("golden path 5: a non-member/non-owner sees no add/edit/delete controls", async ({ page }) => {
  await page.goto(`/${STRANGER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();

  await expect(page.getByText("VISITOR")).toBeVisible();
  await expect(page.getByPlaceholder("0x... ADDRESS")).toHaveCount(0);
  await expect(page.getByPlaceholder("New mission message")).toHaveCount(0);
  await expect(page.getByPlaceholder("Room name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "DEL" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "LEAVE" })).toHaveCount(0);
});

test("golden path 6: the Owner can add and then remove a chat room", async ({ page }) => {
  await page.goto(`/${OWNER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();

  // Scoped to the chat-room form specifically: as Owner, MissionLog also
  // renders its own (still-disabled, empty-message) ADD button earlier in
  // the DOM, so a bare `.first()` would hit that one instead.
  const commsForm = page.locator("form", { has: page.getByPlaceholder("Room name") });
  await commsForm.getByPlaceholder("Room name").fill("Governance");
  await commsForm.getByPlaceholder("https://…").fill("https://t.me/saveearth_gov");
  await commsForm.getByRole("button", { name: "ADD" }).click();
  // Exact match: "GOVERNANCE TOKEN" (the panel heading) would otherwise
  // also match a substring search for "GOVERNANCE".
  await expect(page.getByText("GOVERNANCE", { exact: true })).toBeVisible();

  await page
    .locator("div", { hasText: "GOVERNANCE" })
    .filter({ has: page.getByRole("button", { name: "DEL" }) })
    .last()
    .getByRole("button", { name: "DEL" })
    .click();
  await expect(page.getByText("GOVERNANCE", { exact: true })).toHaveCount(0);
});

test("golden path 7: the Owner can add and then remove a mission message", async ({ page }) => {
  await page.goto(`/${OWNER}`);
  await page.getByRole("button", { name: "CONNECT WALLET" }).click();

  await page.getByPlaceholder("New mission message").fill("Current goal: 100 members across 30 countries.");
  await page.getByRole("button", { name: "ADD" }).first().click();
  await expect(page.getByText("Current goal: 100 members across 30 countries.")).toBeVisible();

  await page
    .locator("p", { hasText: "Current goal: 100 members across 30 countries." })
    .getByRole("button", { name: "DEL" })
    .click();
  await expect(page.getByText("Current goal: 100 members across 30 countries.")).toHaveCount(0);
});
