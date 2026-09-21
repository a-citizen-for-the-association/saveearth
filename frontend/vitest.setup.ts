import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// `globals: true` isn't set in vitest.config.mts, so Testing Library's own
// auto-cleanup (which detects a global `afterEach`) never registers —
// without this, each render() in a component test would pile up in the
// same jsdom document instead of a fresh one per test.
afterEach(() => {
  cleanup();
});
