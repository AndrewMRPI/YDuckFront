import { AppShell } from "../../../components/AppShell";
import { AddMatchForm } from "../../../components/DataViews";

export default function AddMatchPage() {
  return (
    <AppShell requireAdmin>
      <AddMatchForm />
    </AppShell>
  );
}
