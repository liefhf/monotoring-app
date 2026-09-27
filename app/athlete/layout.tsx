import RoleGuard from "@/components/RoleGuard";
import LogoutButton from "@/components/LogoutButton";
import AthleteNav from "@/components/AthleteNav";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="athlete">
      <div className="min-h-screen bg-app-bg text-app-text">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-app-border bg-app-surface px-4 py-2 sm:px-6">
          <span className="text-sm font-semibold text-app-heading">
            Monitoring App
          </span>

          <LogoutButton />
        </div>

        {/*
          Unten Platz lassen, damit die Navigationsleiste
          den Seiteninhalt nicht verdeckt.
        */}
        <div className="pb-24">
          {children}
        </div>

        <AthleteNav />
      </div>
    </RoleGuard>
  );
}
