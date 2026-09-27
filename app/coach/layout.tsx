import RoleGuard from "@/components/RoleGuard";
import CoachNav from "@/components/CoachNav";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="coach">
      <div className="min-h-screen bg-app-bg text-app-text">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <CoachNav />

          <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
