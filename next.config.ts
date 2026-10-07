import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Demo-Fassung baut in einen eigenen Ordner (scripts/demo.mjs)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Zugriff vom Handy im lokalen WLAN während der Entwicklung
  allowedDevOrigins: ["192.168.178.64"],
  // kein Entwicklungs-Symbol in Screenshots/Produktbildern
  devIndicators: false,
  /*
   * Alte Adressen nach der Zusammenlegung von Seiten (Lesezeichen,
   * Links in Hinweisen). Es gehen keine Daten verloren - nur die Seiten
   * wurden zusammengefuehrt. Siehe docs/informationsarchitektur.md.
   */
  async redirects() {
    return [
      { source: "/coach/wochenplan", destination: "/coach/training", permanent: false },
      { source: "/coach/training/week/:id", destination: "/coach/training", permanent: false },
      { source: "/coach/training/meso/:id", destination: "/coach/training/season", permanent: false },
      { source: "/coach/training/cycle", destination: "/coach/training/season", permanent: false },
      { source: "/coach/swimmerabfrage/:path*", destination: "/coach/schwimmer", permanent: false },
      { source: "/athlete/analytics", destination: "/athlete/fortschritt", permanent: false },
    ];
  },
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
  ],
};

export default nextConfig;