import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native SQLite driver must stay a runtime require, not bundled.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  // The game lives at /walk.
  redirects: async () => [{ source: "/", destination: "/walk", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
