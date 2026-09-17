import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      TZ: "UTC",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
    },
  },
});
