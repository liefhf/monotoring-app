import RoleGuard from "@/components/RoleGuard";
import AthleteNav from "@/components/AthleteNav";
import ThemeToggle from "@/components/ThemeToggle";
import ContrastToggle from "@/components/ContrastToggle";
import NotificationBell from "@/components/NotificationBell";
import Logo from "@/components/Logo";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="athlete">
      <div className="min-h-screen bg-app-bg text-app-text">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-app-border/60 bg-app-sidebar/90 px-4 py-2.5 backdrop-blur sm:px-6 print:hidden">
          <Logo />

          <div className="flex items-center gap-2">
            <NotificationBell />
            <ContrastToggle />
            <ThemeToggle />
          </div>
        </div>

        {/*
          Unten Platz lassen, damit die Navigationsleiste
          den Seiteninhalt nicht verdeckt.
        */}
        <div className="mx-auto max-w-5xl pb-28">
          {children}
        </div>

        <AthleteNav />
      </div>
    </RoleGuard>
  );
}
