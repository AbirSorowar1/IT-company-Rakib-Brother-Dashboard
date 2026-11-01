import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/lib/dashboard";
import { formatBDT, get, num } from "@/lib/data";
import {
  Card,
  ChartTooltip,
  COLORS,
  DataTable,
  Empty,
  PageState,
  StatusPill,
} from "@/components/dash/ui";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Rakib & Brothers IT Ltd." },
      { name: "description", content: "Project status, budgets, billing and overdue amounts." },
      { property: "og:title", content: "Projects — Rakib & Brothers IT Ltd." },
      {
        property: "og:description",
        content: "Project status, budgets, billing and overdue amounts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageState>
      <Projects />
    </PageState>
  ),
});

const axis = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

function Projects() {
  const { data } = useDashboard();
  const rows = useMemo(() => {
    const agg = new Map<string, { r: number; o: number; c: string }>();
    data.revenue.forEach((r) => {
      const id = get(r, "Project_ID");
      const e = agg.get(id) ?? { r: 0, o: 0, c: get(r, "Client_Name") };
      e.r += num(r, "Revenue_BDT");
      if (/overdue/i.test(get(r, "Payment_Status"))) e.o += num(r, "Revenue_BDT");
      agg.set(id, e);
    });
    return data.projects.map((p) => ({
      id: get(p, "Project_ID"),
      name: get(p, "Project_Name", "Name") || get(p, "Project_ID"),
      client: agg.get(get(p, "Project_ID"))?.c || get(p, "Client_Name", "Client_ID"),
      line: get(p, "Service_Line"),
      status: get(p, "Status", "Project_Status"),
      start: get(p, "Start_Date"),
      budget: num(p, "Team_Size"),
      invoiced: agg.get(get(p, "Project_ID"))?.r ?? 0,
      overdue: agg.get(get(p, "Project_ID"))?.o ?? 0,
    }));
  }, [data.projects, data.revenue]);
  const byStatus = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.status || "Unknown", (m.get(r.status || "Unknown") ?? 0) + 1));
    return [...m].map(([name, value]) => ({ name, value }));
  }, [rows]);
  const byLine = useMemo(() => {
    const m = new Map<
      string,
      { line: string; budget: number; invoiced: number; overdue: number }
    >();
    rows.forEach((r) => {
      const k = r.line || "Other";
      const e = m.get(k) ?? { line: k, budget: 0, invoiced: 0, overdue: 0 };
      e.budget += r.budget;
      e.invoiced += r.invoiced;
      e.overdue += r.overdue;
      m.set(k, e);
    });
    return [...m.values()];
  }, [rows]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
      <Card
        className="xl:col-span-4"
        title="Projects by status"
        subtitle={`${rows.length} projects`}
      >
        <div className="h-72">
          {byStatus.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="88%"
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                >
                  {byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <Card className="xl:col-span-8" title="Revenue & overdue" subtitle="By service line">
        <div className="h-72">
          {byLine.length ? (
            <ResponsiveContainer>
              <BarChart data={byLine}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="line" {...axis} />
                <YAxis tickFormatter={(v) => formatBDT(v, 0)} {...axis} width={60} />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={<ChartTooltip fmt={formatBDT} />}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="invoiced" name="Revenue" fill="var(--cyan)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="overdue" name="Overdue" fill="var(--rose)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <div className="md:col-span-2 xl:col-span-12">
        <DataTable
          title="All projects"
          rows={rows}
          columns={[
            { key: "id", label: "ID", value: (r) => r.id },
            { key: "n", label: "Project", value: (r) => r.name },
            { key: "c", label: "Client", value: (r) => r.client },
            { key: "l", label: "Service line", value: (r) => r.line },
            {
              key: "s",
              label: "Status",
              value: (r) => r.status,
              render: (r) => <StatusPill s={r.status} />,
            },
            { key: "d", label: "Start", value: (r) => r.start },
            { key: "b", label: "Team", value: (r) => r.budget, align: "right" },
            {
              key: "i",
              label: "Revenue",
              value: (r) => r.invoiced,
              render: (r) => formatBDT(r.invoiced),
              align: "right",
            },
            {
              key: "o",
              label: "Overdue",
              value: (r) => r.overdue,
              render: (r) => (
                <span className={r.overdue ? "text-rose" : ""}>{formatBDT(r.overdue)}</span>
              ),
              align: "right",
            },
          ]}
        />
      </div>
    </div>
  );
}
