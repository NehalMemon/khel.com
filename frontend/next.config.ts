import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to frontend/ so a stray lockfile higher up can never be picked again.
  turbopack: { root: path.resolve(__dirname) },
  // Dev only: allow opening the dev server through the Windows/WSL network IP.
  allowedDevOrigins: ["172.28.192.1"],
};

export default nextConfig;
