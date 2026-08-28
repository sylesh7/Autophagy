import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  images: {
    // Storyblok assets are downloaded into /public; keep remote allowance for any hotlink fallback.
    remotePatterns: [
      { protocol: "https", hostname: "a.storyblok.com" },
    ],
  },
};

export default nextConfig;
