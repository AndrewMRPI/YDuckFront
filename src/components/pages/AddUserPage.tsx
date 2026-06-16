import { AppShell } from "@/components/AppShell";
import { AddUserForm } from "@/components/DataViews";

export default function AddUserPage() {
  return (
    <AppShell requireAdmin>
      <AddUserForm />
    </AppShell>
  );
}
