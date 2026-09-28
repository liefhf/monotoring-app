import type { Metadata } from "next";
import { Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

/* Schriften aus der Design-Uebergabe: UI und Zahlen/Kicker */
const appSans = Hanken_Grotesk({
  variable: "--font-app-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appMono = IBM_Plex_Mono({
  variable: "--font-app-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Monitoring App",
  description:
    "Trainingssteuerung, Athletenmonitoring und Wettkampforganisation.",
};

/*
 * Setzt das gespeicherte Design (hell/dunkel), bevor die
 * Seite gezeichnet wird - sonst blitzt kurz das falsche auf.
 * Ohne gespeicherte Wahl entscheidet die Geraeteeinstellung.
 */
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${appSans.variable} ${appMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-app-bg text-app-heading">
        {children}
        {/* beforeInteractive: laeuft vor dem ersten Zeichnen, landet im <head> */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </body>
    </html>
  );
}
