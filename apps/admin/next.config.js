/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  // Next 16 (picked up by the 2026-09-20 dependency upgrade) auto-generates
  // apps/admin/AGENTS.md + apps/admin/CLAUDE.md on every `next dev`/`build`.
  // Disabled: this repo's real CLAUDE.md lives at the root and covers the
  // whole monorepo — a second, auto-generated one inside apps/admin would
  // just be noise (and get silently regenerated/clobbered on every dev run
  // if left enabled).
  agentRules: false,
}

module.exports = nextConfig
