import RoleGuard from "@/components/RoleGuard";
import CoachNav, { CoachHeader } from "@/components/CoachNav";

/*
 * Rahmen des Coach-Bereichs wie in der Design-Uebergabe:
 * Seitenleiste links, Kopfzeile mit Pfad oben, Inhalt mit
 * 28/32/40 px Abstand.
 */
export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="coach">
      <div className="min-h-screen bg-app-bg text-app-heading">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <CoachNav />

          <div className="flex min-w-0 flex-1 flex-col">
            <CoachHeader />
            <div className="min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-7">
              {children}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
