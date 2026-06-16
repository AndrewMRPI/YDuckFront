import { AppShell } from "@/components/AppShell";
import { AdminEditMatch } from "@/components/admin/AdminEditMatch";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditMatchPage({ params }: RouteProps) {
  const { id } = await params;

  return (
    <AppShell requireAdmin>
      <AdminEditMatch id={id} />
    </AppShell>
  );
}
