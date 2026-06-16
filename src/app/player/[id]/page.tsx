import PlayerPage from "@/components/pages/PlayerPage";

type RouteProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerRoute({ params }: RouteProps) {
  const { id } = await params;

  return <PlayerPage id={id} />;
}
