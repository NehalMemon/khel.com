import path from "node:path"
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repository root holds a stray, empty `package-lock.json` one level
  // above this app, so Next.js infers the wrong workspace root and warns about
  // "multiple lockfiles". Pin Turbopack to this app directory instead.
  turbopack: {
    root: path.join(__dirname),
  },
  // Development-only allowlist. `next dev` also prints a LAN/Network URL
  // (http://172.28.192.1:3000) and HMR requests from that hostname are blocked
  // as cross-origin unless they are listed here. Only that single hostname is
  // allowed; nothing about production or authentication is relaxed.
  allowedDevOrigins: ["172.28.192.1"],
};

export default nextConfig;
