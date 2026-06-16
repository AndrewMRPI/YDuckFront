import { AppShell } from "@/components/AppShell";
import { AdminAddMatch } from "@/components/admin/AdminAddMatch";

export default function AdminAddMatchPage() {
  return (
    <AppShell requireAdmin>
      <AdminAddMatch />
    </AppShell>
  );
}
