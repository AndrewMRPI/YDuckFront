import MatchPage from "@/components/pages/MatchPage";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MatchRoute({ params }: RouteProps) {
  const { id } = await params;

  return <MatchPage id={id} />;
}
