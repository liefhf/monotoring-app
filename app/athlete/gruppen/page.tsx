"use client";

import { GroupRoomList } from "@/components/GroupRooms";

export default function AthleteGruppenPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <GroupRoomList basePath="/athlete/gruppen" />
    </main>
  );
}
