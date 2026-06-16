import { AppShell } from "@/components/AppShell";
import { AdminMatchHistory } from "@/components/admin/AdminMatchHistory";

export default function AdminMatchHistoryPage() {
  return (
    <AppShell requireAdmin>
      <AdminMatchHistory />
    </AppShell>
  );
}
