import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows HMR/dev requests when the app is opened via 127.0.0.2 instead of localhost.
  allowedDevOrigins: ["127.0.0.2", "localhost", "127.0.0.1"],
};

export default nextConfig;
