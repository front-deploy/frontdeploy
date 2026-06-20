import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/verify-gate': ['./private/**/*'],
  },
};

export default nextConfig;
