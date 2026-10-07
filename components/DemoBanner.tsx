"use client";

import Link from "next/link";
import { DEMO } from "@/lib/demo/demoFetch";

/* Schmaler Hinweis in der Demo: Testdaten, Rolle wechseln */
export default function DemoBanner() {
  if (!DEMO) return null;
  return (
    <div className="flex items-center justify-center gap-3 bg-app-heading px-4 py-1 text-[12px] text-app-surface print:hidden">
      <span>Demo mit Testdaten</span>
      <Link href="/demo" className="font-semibold underline underline-offset-2">
        Rolle wechseln
      </Link>
    </div>
  );
}
