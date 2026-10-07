import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Venue media is served from Cloudinary, so next/image needs to allow it.
  // The hostname is intentionally generic: the Cloudinary cloud name is not a secret,
  // but it is deployment-specific, so it is configured through next.config only.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
