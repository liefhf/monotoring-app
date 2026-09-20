import RoleGuard from "@/components/RoleGuard";
import LogoutButton from "@/components/LogoutButton";

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="athlete">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2 sm:px-6">
        <span className="text-sm font-semibold text-white">
          Monitoring App
        </span>

        <LogoutButton />
      </div>

      {children}
    </RoleGuard>
  );
}