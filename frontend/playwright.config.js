import { defineConfig } from "@playwright/test";

export default defineConfig({
  testMatch: ["**/e2e.spec.js", "**/*.e2e.spec.js"],
  workers: 1,
});
