"use client";

import { useParams } from "next/navigation";
import { GroupRoomPage } from "@/components/GroupRooms";

export default function AthleteGruppenraumPage() {
  const params = useParams();
  const teamId = typeof params.teamId === "string" ? params.teamId : "";

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <GroupRoomPage basePath="/athlete/gruppen" teamId={teamId} />
    </main>
  );
}
