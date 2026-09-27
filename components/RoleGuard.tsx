"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LogoMark } from "@/components/Logo";

type RoleGuardProps = {
  allowedRole: "coach" | "athlete";
  children: ReactNode;
};

export default function RoleGuard({
  allowedRole,
  children,
}: RoleGuardProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        router.replace("/login");
        return;
      }

      if (profile.role !== allowedRole) {
        if (profile.role === "coach") {
          router.replace("/coach");
          return;
        }

        if (profile.role === "athlete") {
          router.replace("/athlete");
          return;
        }

        router.replace("/login");
        return;
      }

      setLoading(false);
    }

    checkAccess();
  }, [allowedRole, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-app-bg text-app-heading">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <p className="text-sm text-app-muted">
          Zugriff wird geprüft...
        </p>
      </main>
    );
  }

  return <>{children}</>;
}