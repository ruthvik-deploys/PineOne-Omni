/** Absolute origin for metadata (OG tags need absolute URLs). */
export const SITE_URL = new URL(
  process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"
);
