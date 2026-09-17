// Metro in a pnpm workspace needs telling where the rest of the repo is.
// Without this, `@mekteb/i18n` resolves at type level but fails at runtime with
// "Unable to resolve module" — the bundler only walks the app directory by
// default, and pnpm's symlinked node_modules is not followed either.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so edits to packages/* trigger a rebuild.
config.watchFolders = [workspaceRoot];

// Resolve from the app first, then the workspace root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm stores real packages under .pnpm and symlinks to them; Metro must
// follow those links rather than treating them as opaque files.
config.resolver.unstable_enableSymlinks = true;
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
