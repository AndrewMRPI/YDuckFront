import { AppShell } from "@/components/AppShell";
import { AdminPlayers } from "@/components/admin/AdminPlayers";

export default function AdminPlayersPage() {
  return (
    <AppShell requireAdmin>
      <AdminPlayers />
    </AppShell>
  );
}
