import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The project sits under the user's home directory, which also contains a
  // package-lock.json. Without this, Turbopack infers the workspace root as the
  // home directory and warns. Pin it to the project.
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
