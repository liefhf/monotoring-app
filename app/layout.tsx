import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import PageLoadingBar from "@/components/PageLoadingBar";

const appSans = Plus_Jakarta_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;if(localStorage.getItem("contrast")==="sonne")document.documentElement.dataset.contrast="sonne"}catch(e){}`;

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      suppressHydrationWarning
      className={`${appSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-app-bg text-app-text">
        <PageLoadingBar />
        {children}
        {/* beforeInteractive: laeuft vor dem ersten Zeichnen, landet im <head> */}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </body>
    </html>
  );
}
