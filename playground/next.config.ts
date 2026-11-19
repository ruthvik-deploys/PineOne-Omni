import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components is off on purpose: prototypes should not need Suspense boundaries
  // around every params/searchParams read. Turn it on per need, not by default.
  turbopack: {
    // This app sits inside a larger repo with other lockfiles; pin the root to this folder.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
