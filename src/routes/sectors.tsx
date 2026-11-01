import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { useDashboard } from "@/lib/dashboard";
import { formatBDT, pct } from "@/lib/data";
import { sectorStats, type SectorStat } from "@/lib/metrics";
import { Card, ChartTooltip, COLORS, DataTable, Empty, PageState } from "@/components/dash/ui";

export const Route = createFileRoute("/sectors")({
  head: () => ({
    meta: [
      { title: "Sectors — Rakib & Brothers IT Ltd." },
      { name: "description", content: "Profit, margin and volume ranked by sector." },
      { property: "og:title", content: "Sectors — Rakib & Brothers IT Ltd." },
      { property: "og:description", content: "Profit, margin and volume ranked by sector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageState>
      <Sectors />
    </PageState>
  ),
});

const axis = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

function Ranked({
  data,
  k,
  fmt,
}: {
  data: SectorStat[];
  k: "profit" | "margin";
  fmt: (n: number) => string;
}) {
  const sorted = [...data].sort((a, b) => b[k] - a[k]);
  if (!sorted.length) return <Empty />;
  return (
    <div style={{ height: Math.max(220, sorted.length * 36) }}>
      <ResponsiveContainer>
        <BarChart data={sorted} layout="vertical" margin={{ left: 10 }}>
          <XAxis type="number" tickFormatter={(v) => fmt(v)} {...axis} />
          <YAxis type="category" dataKey="sector" width={110} {...axis} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
            content={<ChartTooltip fmt={fmt} />}
          />
          <Bar
            dataKey={k}
            name={k === "profit" ? "Gross profit" : "Margin"}
            radius={[0, 10, 10, 0]}
          >
            {sorted.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Sectors() {
  const { data } = useDashboard();
  const stats = useMemo(() => sectorStats(data.revenue), [data.revenue]);
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <Card className="xl:col-span-6" title="Gross profit by sector" subtitle="Ranked">
        <Ranked data={stats} k="profit" fmt={(v) => formatBDT(v, 1)} />
      </Card>
      <Card className="xl:col-span-6" title="Margin % by sector" subtitle="Ranked">
        <Ranked data={stats} k="margin" fmt={pct} />
      </Card>
      <Card
        className="md:col-span-2 xl:col-span-12"
        title="Revenue vs margin"
        subtitle="Bubble size = transaction volume"
      >
        <div className="h-96">
          {stats.length ? (
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 10, right: 20 }}>
                <CartesianGrid stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="revenue"
                  name="Revenue"
                  tickFormatter={(v) => formatBDT(v, 0)}
                  {...axis}
                />
                <YAxis
                  type="number"
                  dataKey="margin"
                  name="Margin"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  {...axis}
                />
                <ZAxis type="number" dataKey="volume" range={[80, 1800]} name="Volume" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="glass rounded-2xl px-3 py-2 text-xs">
                        <div className="font-semibold">{payload[0]!.payload.sector}</div>
                        <div className="text-muted-foreground">
                          Revenue {formatBDT(payload[0]!.payload.revenue)}
                        </div>
                        <div className="text-muted-foreground">
                          Margin {pct(payload[0]!.payload.margin)}
                        </div>
                        <div className="text-muted-foreground">
                          Volume {payload[0]!.payload.volume}
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Scatter data={stats}>
                  {stats.map((_, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.65}
                      stroke={COLORS[i % COLORS.length]}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <div className="md:col-span-2 xl:col-span-12">
        <DataTable
          title="Sector (service line) scoreboard"
          rows={stats}
          columns={[
            { key: "s", label: "Sector", value: (r) => r.sector },
            {
              key: "r",
              label: "Revenue",
              value: (r) => r.revenue,
              render: (r) => formatBDT(r.revenue),
              align: "right",
            },
            {
              key: "p",
              label: "Gross profit",
              value: (r) => r.profit,
              render: (r) => formatBDT(r.profit),
              align: "right",
            },
            {
              key: "m",
              label: "Margin",
              value: (r) => r.margin,
              render: (r) => pct(r.margin),
              align: "right",
            },
            { key: "v", label: "Volume", value: (r) => r.volume, align: "right" },
          ]}
        />
      </div>
    </div>
  );
}
