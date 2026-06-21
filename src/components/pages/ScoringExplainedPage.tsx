import { AppShell } from "@/components/AppShell";
import { leaderboardStartingScore } from "@/scoring/gamePoints";

const fourPlayerRows = [
  { base: "+11", eastFinal: "+66", normalFinal: "+26", place: "1st", score: "36,000", southFinal: "+106", uma: "+15" },
  { base: "+5", eastFinal: "+30", normalFinal: "+10", place: "2nd", score: "30,000", southFinal: "+50", uma: "+5" },
  { base: "-4", eastFinal: "-9", normalFinal: "-9", place: "3rd", score: "21,000", southFinal: "-9", uma: "-5" },
  { base: "-12", eastFinal: "-87", normalFinal: "-27", place: "4th", score: "13,000", southFinal: "-147", uma: "-15" },
];

const rankPointRows = [
  { east: "+40", place: "1st", south: "+80" },
  { east: "+20", place: "2nd", south: "+40" },
  { east: "0", place: "3rd", south: "0" },
  { east: "-60", place: "4th", south: "-120" },
];

function RuleCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-[#ddce8c] bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-[#25291f]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-[#4d5549]">{children}</div>
    </section>
  );
}

function ExampleTable({
  rows,
}: {
  rows: {
    base: string;
    eastFinal: string;
    normalFinal: string;
    place: string;
    score: string;
    southFinal: string;
    uma: string;
  }[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-[#ddce8c]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#fff8d4] text-[#5f4c00]">
          <tr>
            <th className="px-4 py-3 font-bold">Place</th>
            <th className="px-4 py-3 font-bold">Raw score</th>
            <th className="px-4 py-3 font-bold">Base points</th>
            <th className="px-4 py-3 font-bold">Uma</th>
            <th className="px-4 py-3 font-bold">Normal</th>
            <th className="px-4 py-3 font-bold">Mahjong Soul East</th>
            <th className="px-4 py-3 font-bold">Mahjong Soul South</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#eee2aa] bg-white">
          {rows.map((row) => (
            <tr key={row.place}>
              <td className="px-4 py-3 font-semibold text-[#25291f]">{row.place}</td>
              <td className="px-4 py-3">{row.score}</td>
              <td className="px-4 py-3">{row.base}</td>
              <td className="px-4 py-3">{row.uma}</td>
              <td className="px-4 py-3 font-bold text-[#25291f]">{row.normalFinal}</td>
              <td className="px-4 py-3 font-bold text-[#25291f]">{row.eastFinal}</td>
              <td className="px-4 py-3 font-bold text-[#25291f]">{row.southFinal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ScoringExplainedPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="border-b border-[#ddce8c] pb-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#6b5900]">Scoring guide</p>
          <h1 className="mt-1 text-3xl font-bold text-[#1f2720]">Scoring Explained</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#4d5549]">
            Each match turns the final table score into game points. The leaderboard can use normal scoring or Mahjong
            Soul scoring. Normal scoring starts from 0, while Mahjong Soul leaderboard scores start from{" "}
            {leaderboardStartingScore}.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-md border border-[#ddce8c] bg-[#fff8d4] p-4">
            <p className="text-sm font-semibold text-[#5f4c00]">Starting score</p>
            <p className="mt-1 text-2xl font-bold text-[#25291f]">25,000</p>
            <p className="mt-2 text-sm text-[#697061]">Uma: +15 / +5 / -5 / -15</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <RuleCard title="How a score becomes game points">
            <ol className="list-decimal space-y-2 pl-5">
              <li>Rank players by raw score from highest to lowest.</li>
              <li>Subtract the starting score: 25,000.</li>
              <li>Divide that difference by 1,000 and round to the nearest whole point. Half points round down.</li>
              <li>Add uma based on final placement.</li>
              <li>For Mahjong Soul scoring, add the rank points for the match length and placement.</li>
              <li>If rounding makes the table total miss zero, adjust the winner by the difference.</li>
            </ol>
          </RuleCard>

          <RuleCard title="Tie handling">
            <p>
              Tied raw scores are ordered by the original seat order for the match. The earlier seat wins the tie and
              receives the higher effective place.
            </p>
            <p>
              Uma is not split between tied players; after the tie order is resolved, each player receives the uma for
              their effective place.
            </p>
          </RuleCard>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#25291f]">Mahjong Soul rank points</h2>
            <p className="mt-1 text-sm text-[#697061]">Mahjong Soul scoring adds rank points after base points and uma.</p>
          </div>
          <div className="overflow-x-auto rounded-md border border-[#ddce8c]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fff8d4] text-[#5f4c00]">
                <tr>
                  <th className="px-4 py-3 font-bold">Place</th>
                  <th className="px-4 py-3 font-bold">East game</th>
                  <th className="px-4 py-3 font-bold">South game</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee2aa] bg-white">
                {rankPointRows.map((row) => (
                  <tr key={row.place}>
                    <td className="px-4 py-3 font-semibold text-[#25291f]">{row.place}</td>
                    <td className="px-4 py-3">{row.east}</td>
                    <td className="px-4 py-3">{row.south}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#25291f]">Example</h2>
            <p className="mt-1 text-sm text-[#697061]">
              Starting score is 25,000. The uma spread is +15, +5, -5, -15. Mahjong Soul adds East or South rank
              points on top of the normal result.
            </p>
          </div>
          <ExampleTable rows={fourPlayerRows} />
        </section>

        <RuleCard title="Formulas">
          <p className="font-mono text-sm text-[#25291f]">
            normal = roundHalfDown((raw score - starting score) / 1000) + uma + table adjustment
          </p>
          <p className="font-mono text-sm text-[#25291f]">
            mahjong soul = roundHalfDown((raw score - starting score) / 1000) + uma + rank points + table adjustment
          </p>
        </RuleCard>
      </div>
    </AppShell>
  );
}
