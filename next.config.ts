import type { NextConfig } from "next";

const isTauri = process.env.TAURI_ENV === "true";

const nextConfig: NextConfig = {
  /* config options here */
  ...(isTauri && {
    output: "export",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
