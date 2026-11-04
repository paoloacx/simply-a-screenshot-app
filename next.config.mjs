/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Next 16.3+ otherwise writes AGENTS.md / CLAUDE.md into every scaffolded
  // project on first `dev`, leaving a dirty tree before anything is edited.
  agentRules: false,
  // Electron sets this to electron/cache-handler.cjs before loading Next. It
  // keeps the server from writing route-cache files inside the signed bundle.
  cacheHandler: process.env.NEXT_CACHE_HANDLER || undefined,
};

export default nextConfig;
