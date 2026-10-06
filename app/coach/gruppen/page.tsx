"use client";

import { GroupRoomList } from "@/components/GroupRooms";

export default function CoachGruppenPage() {
  return (
    <main className="mx-auto max-w-6xl">
      <GroupRoomList basePath="/coach/gruppen" />
    </main>
  );
}
