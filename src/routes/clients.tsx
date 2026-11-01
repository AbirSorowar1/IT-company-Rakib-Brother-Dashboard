import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/lib/dashboard";
import { formatBDT, get, num, pct } from "@/lib/data";
import {
  Card,
  ChartTooltip,
  COLORS,
  DataTable,
  Empty,
  PageState,
  StatusPill,
} from "@/components/dash/ui";

export const Route = createFileRoute("/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Rakib & Brothers IT Ltd." },
      { name: "description", content: "Client revenue, industries and profitability." },
      { property: "og:title", content: "Clients — Rakib & Brothers IT Ltd." },
      { property: "og:description", content: "Client revenue, industries and profitability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageState>
      <Clients />
    </PageState>
  ),
});

type C = {
  id: string;
  name: string;
  industry: string;
  status: string;
  city: string;
  revenue: number;
  profit: number;
};
const axis = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

function Clients() {
  const { data } = useDashboard();
  const rows = useMemo<C[]>(() => {
    const agg = new Map<string, { r: number; p: number }>();
    data.revenue.forEach((r) => {
      const id = get(r, "Client_ID");
      const e = agg.get(id) ?? { r: 0, p: 0 };
      e.r += num(r, "Revenue_BDT");
      e.p += num(r, "Gross_Profit_BDT");
      agg.set(id, e);
    });
    return data.clients.map((c) => {
      const id = get(c, "Client_ID");
      return {
        id,
        name: get(c, "Client_Name", "Name") || id,
        industry: get(c, "Client_Industry", "Industry"),
        status: get(c, "Status"),
        city: get(c, "City", "Location", "Country"),
        revenue: agg.get(id)?.r ?? 0,
        profit: agg.get(id)?.p ?? 0,
      };
    });
  }, [data]);
  const byIndustry = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) =>
      m.set(r.industry || "Other", (m.get(r.industry || "Other") ?? 0) + r.revenue),
    );
    return [...m]
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rows]);
  const top = [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <Card className="xl:col-span-4" title="Revenue by industry" subtitle="Donut">
        <div className="h-72">
          {byIndustry.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byIndustry}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                >
                  {byIndustry.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip fmt={formatBDT} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {byIndustry.slice(0, 6).map((x, i) => (
            <span key={x.name} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {x.name}
            </span>
          ))}
        </div>
      </Card>
      <Card className="xl:col-span-8" title="Top 10 clients" subtitle="By revenue">
        <div className="h-80">
          {top.some((t) => t.revenue) ? (
            <ResponsiveContainer>
              <BarChart data={top}>
                <XAxis
                  dataKey="name"
                  {...axis}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tickFormatter={(v) => formatBDT(v, 0)} {...axis} width={60} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<ChartTooltip fmt={formatBDT} />}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--violet)"
                  radius={[10, 10, 0, 0]}
                />
                <Bar
                  dataKey="profit"
                  name="Gross profit"
                  fill="var(--cyan)"
                  radius={[10, 10, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <div className="md:col-span-2 xl:col-span-12">
        <DataTable
          title="All clients"
          rows={rows}
          columns={[
            { key: "id", label: "ID", value: (r) => r.id },
            { key: "n", label: "Client", value: (r) => r.name },
            { key: "i", label: "Industry", value: (r) => r.industry },
            { key: "c", label: "Location", value: (r) => r.city },
            {
              key: "s",
              label: "Status",
              value: (r) => r.status,
              render: (r) => <StatusPill s={r.status} />,
            },
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
              value: (r) => (r.revenue ? (r.profit / r.revenue) * 100 : 0),
              render: (r) => pct(r.revenue ? (r.profit / r.revenue) * 100 : 0),
              align: "right",
            },
          ]}
        />
      </div>
    </div>
  );
}
