"use client";

import { useParams } from "next/navigation";
import { GroupRoomPage } from "@/components/GroupRooms";

export default function CoachGruppenraumPage() {
  const params = useParams();
  const teamId = typeof params.teamId === "string" ? params.teamId : "";

  return (
    <main className="mx-auto max-w-4xl">
      <GroupRoomPage basePath="/coach/gruppen" teamId={teamId} />
    </main>
  );
}
