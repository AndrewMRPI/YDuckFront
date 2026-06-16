"use client";

import { useRouter } from "next/navigation";
import { AdminMatchForm } from "@/components/admin/AdminMatchForm";
import { addMatch } from "@/services/yduckAdminApiClient";

export function AdminAddMatch() {
  const router = useRouter();

  return (
    <AdminMatchForm
      heading="Add Match"
      savingErrorFallback="Unable to add match."
      submitLabel={{ idle: "Add Match", saving: "Adding..." }}
      onSubmit={async (request) => {
        await addMatch(request);
        router.replace("/admin/match-history");
      }}
    />
  );
}
