import Link from "next/link";
import RoleGuard from "@/components/RoleGuard";
import LogoutButton from "@/components/LogoutButton";

const navigation = [
  {
    href: "/coach",
    label: "Dashboard",
  },
  {
    href: "/coach/teams",
    label: "Teams",
  },
  {
    href: "/coach/athletes",
    label: "Athleten",
  },
  {
    href: "/coach/training",
    label: "Training",
  },
  {
    href: "/coach/competitions",
    label: "Wettkämpfe",
  },
  {
    href: "/coach/swimmerabfrage",
    label: "Schwimmerabfrage",
  },
  {
    href: "/coach/analytics",
    label: "Analysen",
  },
  {
    href: "/coach/infoboard",
    label: "Infoboard",
  },
  {
    href: "/coach/settings",
    label: "Einstellungen",
  },
];

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="coach">
      <div className="min-h-screen bg-slate-950 text-white">
        <header className="border-b border-slate-800 bg-slate-900">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/coach"
                  className="text-xl font-bold text-white"
                >
                  Coach
                </Link>

                <LogoutButton />
              </div>

              <nav className="flex gap-2 overflow-x-auto pb-1">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}