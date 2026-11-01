import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "@/lib/dashboard";
import { formatBDT, get, monthKey, netProfit, num, parseDate, sum } from "@/lib/data";
import { monthlySeries } from "@/lib/metrics";
import { Card, ChartTooltip, COLORS, DataTable, Empty, PageState } from "@/components/dash/ui";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Finance — Rakib & Brothers IT Ltd." },
      { name: "description", content: "Revenue, expenses and net profit trends." },
      { property: "og:title", content: "Finance — Rakib & Brothers IT Ltd." },
      { property: "og:description", content: "Revenue, expenses and net profit trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageState>
      <Finance />
    </PageState>
  ),
});

const axis = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;

function Finance() {
  const { data } = useDashboard();
  const { revenue, expenses } = data;
  const trend = useMemo(() => {
    const exp = new Map<string, number>();
    expenses.forEach((e) => {
      const d = parseDate(get(e, "Month", "Date"));
      if (d) exp.set(monthKey(d), (exp.get(monthKey(d)) ?? 0) + num(e, "Amount_BDT"));
    });
    const s = monthlySeries(revenue);
    const months = [...new Set([...s.map((x) => x.month), ...exp.keys()])].sort();
    return months.map((m) => {
      const r = s.find((x) => x.month === m);
      const e = exp.get(m) ?? 0;
      return {
        month: m,
        revenue: r?.revenue ?? 0,
        gross: r?.profit ?? 0,
        expenses: e,
        net: (r?.profit ?? 0) - e,
      };
    });
  }, [revenue, expenses]);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    expenses.forEach((e) => {
      const k = get(e, "Category", "Expense_Category", "Type") || "Other";
      m.set(k, (m.get(k) ?? 0) + num(e, "Amount_BDT"));
    });
    return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);
  const tiles = [
    { l: "Gross profit", v: sum(revenue, "Gross_Profit_BDT"), c: "text-cyan" },
    { l: "Expenses", v: sum(expenses, "Amount_BDT"), c: "text-rose" },
    { l: "Net profit", v: netProfit(revenue, expenses), c: "text-lime" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-12">
      {tiles.map((t) => (
        <Card key={t.l} className="xl:col-span-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{t.l}</p>
          <p className={`mt-1 font-display text-3xl font-bold ${t.c}`}>{formatBDT(t.v)}</p>
        </Card>
      ))}
      <Card
        className="md:col-span-3 xl:col-span-8"
        title="Monthly P&L"
        subtitle="Net = gross profit − expenses"
      >
        <div className="h-80">
          {trend.length ? (
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" {...axis} />
                <YAxis tickFormatter={(v) => formatBDT(v, 0)} {...axis} width={60} />
                <Tooltip content={<ChartTooltip fmt={formatBDT} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="var(--violet)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="gross"
                  name="Gross profit"
                  stroke="var(--cyan)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Expenses"
                  stroke="var(--rose)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net profit"
                  stroke="var(--lime)"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <Card className="md:col-span-3 xl:col-span-4" title="Expenses by category" subtitle="Donut">
        <div className="h-80">
          {byCat.length ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCat}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  cornerRadius={8}
                  stroke="none"
                >
                  {byCat.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip fmt={formatBDT} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
      <div className="md:col-span-3 xl:col-span-12">
        <DataTable
          title="Monthly P&L table"
          rows={trend}
          columns={[
            { key: "m", label: "Month", value: (r) => r.month },
            {
              key: "r",
              label: "Revenue",
              value: (r) => r.revenue,
              render: (r) => formatBDT(r.revenue),
              align: "right",
            },
            {
              key: "g",
              label: "Gross profit",
              value: (r) => r.gross,
              render: (r) => formatBDT(r.gross),
              align: "right",
            },
            {
              key: "e",
              label: "Expenses",
              value: (r) => r.expenses,
              render: (r) => formatBDT(r.expenses),
              align: "right",
            },
            {
              key: "n",
              label: "Net profit",
              value: (r) => r.net,
              render: (r) => (
                <span className={r.net < 0 ? "text-rose" : "text-lime"}>{formatBDT(r.net)}</span>
              ),
              align: "right",
            },
          ]}
        />
      </div>
    </div>
  );
}
