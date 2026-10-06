import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zugriff vom Handy im lokalen WLAN während der Entwicklung
  allowedDevOrigins: ["192.168.178.64"],
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
  ],
};

export default nextConfig;