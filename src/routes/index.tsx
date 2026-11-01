import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Treemap,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from "recharts";
import { TrendingUp, Trophy, TrendingDown, Rocket } from "lucide-react";
import { useDashboard } from "@/lib/dashboard";
import { formatBDT, get, netProfit, num, pct, sum } from "@/lib/data";
import { dailyMap, fastestGrowing, monthlyByKey, monthlySeries, sectorStats } from "@/lib/metrics";
import { Card, ChartTooltip, COLORS, Empty, PageState } from "@/components/dash/ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — Rakib & Brothers IT Ltd." },
      { name: "description", content: "Live revenue, profit, margin and targets at a glance." },
      { property: "og:title", content: "Command Center — Rakib & Brothers IT Ltd." },
      {
        property: "og:description",
        content: "Live revenue, profit, margin and targets at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <PageState>
      <CommandCenter />
    </PageState>
  ),
});

function useCountUp(target: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

function Kpi({
  label,
  value,
  fmt,
  spark,
  color,
  className,
}: {
  label: string;
  value: number;
  fmt: (n: number) => string;
  spark: number[];
  color: string;
  className?: string;
}) {
  const v = useCountUp(value);
  const id = label.replace(/\W/g, "");
  return (
    <Card className={className}>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums sm:text-3xl">{fmt(v)}</p>
      <div className="mt-2 h-12">
        <ResponsiveContainer>
          <AreaChart data={spark.map((y, i) => ({ i, y }))}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.6} />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="y"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${id})`}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function Heatmap({ rev }: { rev: ReturnType<typeof useDashboard>["data"]["revenue"] }) {
  const map = useMemo(() => dailyMap(rev), [rev]);
  if (!map.size) return <Empty />;
  const dates = [...map.keys()].map((k) => new Date(k).getTime());
  const end = new Date(Math.max(...dates));
  const start = new Date(end);
  start.setDate(start.getDate() - 7 * 52 - end.getDay());
  const max = Math.max(...map.values());
  const weeks: { d: Date; v: number }[][] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) weeks.push([]);
    if (!weeks.length) weeks.push([]);
    weeks[weeks.length - 1]!.push({ d: new Date(d), v: map.get(d.toDateString()) ?? 0 });
  }
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-[3px]">
        {weeks.map((w, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {w.map(({ d, v }) => (
              <div
                key={d.toDateString()}
                title={`${d.toDateString()} · ${formatBDT(v)}`}
                className="h-3 w-3 rounded-[3px] transition-transform hover:scale-150"
                style={{
                  background: v
                    ? `color-mix(in oklab, var(--lime) ${15 + (v / max) * 85}%, var(--violet))`
                    : "var(--muted)",
                  opacity: v ? 0.35 + (v / max) * 0.65 : 0.5,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        Less <span className="h-2.5 w-2.5 rounded-sm bg-muted" />
        <span className="h-2.5 w-2.5 rounded-sm bg-violet/60" />
        <span className="h-2.5 w-2.5 rounded-sm bg-lime" /> More
      </div>
    </div>
  );
}

function TreeCell(props: any) {
  const { x, y, width, height, name, value, index } = props;
  if (width <= 0 || height <= 0) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        fill={COLORS[index % COLORS.length]}
        fillOpacity={0.75}
        stroke="var(--background)"
        strokeWidth={3}
      />
      {width > 70 && height > 36 && (
        <>
          <text x={x + 10} y={y + 20} fill="var(--background)" fontSize={12} fontWeight={700}>
            {name}
          </text>
          <text x={x + 10} y={y + 36} fill="var(--background)" fontSize={11}>
            {formatBDT(value)}
          </text>
        </>
      )}
    </g>
  );
}

function CommandCenter() {
  const { data } = useDashboard();
  const { revenue, expenses, targets } = data;
  const m = useMemo(() => {
    const totalRev = sum(revenue, "Revenue_BDT");
    const gross = sum(revenue, "Gross_Profit_BDT");
    const net = netProfit(revenue, expenses);
    const overdue = revenue
      .filter((r) => /overdue/i.test(get(r, "Payment_Status")))
      .reduce((a, r) => a + num(r, "Revenue_BDT"), 0);
    const series = monthlySeries(revenue);
    const sectors = sectorStats(revenue);
    const stacked = monthlyByKey(revenue, "Date", "Service_Line", "Revenue_BDT");
    const tRev = sum(targets, "Target_Revenue_BDT", "Revenue_Target_BDT", "Target_BDT");
    const tProfit = sum(
      targets,
      "Target_Gross_Profit_BDT",
      "Target_Profit_BDT",
      "Profit_Target_BDT",
    );
    const bySectorTarget = new Map<string, number>();
    targets.forEach((t) => {
      const s = get(t, "Sector", "Service_Line");
      if (s)
        bySectorTarget.set(
          s,
          (bySectorTarget.get(s) ?? 0) +
            num(t, "Target_Revenue_BDT", "Revenue_Target_BDT", "Target_BDT"),
        );
    });
    const gauges = [
      tRev ? { name: "Revenue", actual: totalRev, target: tRev } : null,
      tProfit ? { name: "Gross Profit", actual: gross, target: tProfit } : null,
      ...sectors
        .filter((s) => bySectorTarget.get(s.sector))
        .slice(0, 4 - (tRev ? 1 : 0) - (tProfit ? 1 : 0))
        .map((s) => ({ name: s.sector, actual: s.revenue, target: bySectorTarget.get(s.sector)! })),
    ].filter(Boolean) as { name: string; actual: number; target: number }[];
    const byMargin = [...sectors].filter((s) => s.revenue > 0).sort((a, b) => a.margin - b.margin);
    return {
      totalRev,
      gross,
      net,
      overdue,
      series,
      sectors,
      stacked,
      gauges,
      margin: totalRev ? (gross / totalRev) * 100 : 0,
      topProfit: [...sectors].sort((a, b) => b.profit - a.profit)[0],
      lowMargin: byMargin[0],
      fastest: fastestGrowing(revenue),
    };
  }, [revenue, expenses, targets]);

  const spark = m.series.slice(-12);
  const insights = [
    {
      icon: Trophy,
      color: "text-lime",
      title: "Top profit sector",
      main: m.topProfit?.sector ?? "—",
      sub: m.topProfit ? `${formatBDT(m.topProfit.profit)} gross profit` : "",
    },
    {
      icon: TrendingDown,
      color: "text-rose",
      title: "Lowest margin sector",
      main: m.lowMargin?.sector ?? "—",
      sub: m.lowMargin ? `${pct(m.lowMargin.margin)} margin` : "",
    },
    {
      icon: Rocket,
      color: "text-cyan",
      title: "Fastest growing sector",
      main: m.fastest?.sector ?? "—",
      sub: m.fastest
        ? `${m.fastest.growth >= 0 ? "+" : ""}${pct(m.fastest.growth)} month over month`
        : "Need 2+ months",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-12">
      <Kpi
        className="col-span-2 md:col-span-2 xl:col-span-3"
        label="Revenue"
        value={m.totalRev}
        fmt={formatBDT}
        spark={spark.map((s) => s.revenue)}
        color="var(--violet)"
      />
      <Kpi
        className="col-span-1 md:col-span-2 xl:col-span-2"
        label="Gross Profit"
        value={m.gross}
        fmt={formatBDT}
        spark={spark.map((s) => s.profit)}
        color="var(--cyan)"
      />
      <Kpi
        className="col-span-1 md:col-span-2 xl:col-span-3"
        label="Net Profit"
        value={m.net}
        fmt={formatBDT}
        spark={spark.map((s) => s.profit)}
        color="var(--lime)"
      />
      <Kpi
        className="col-span-1 md:col-span-3 xl:col-span-2"
        label="Margin %"
        value={m.margin}
        fmt={pct}
        spark={spark.map((s) => (s.revenue ? (s.profit / s.revenue) * 100 : 0))}
        color="var(--amber)"
      />
      <Kpi
        className="col-span-1 md:col-span-3 xl:col-span-2"
        label="Overdue"
        value={m.overdue}
        fmt={formatBDT}
        spark={spark.map((s) => s.revenue)}
        color="var(--rose)"
      />

      <Card
        className="col-span-2 md:col-span-6 xl:col-span-8"
        title="Monthly revenue by service line"
        subtitle="Stacked area"
      >
        <div className="h-72">
          {m.stacked.data.length ? (
            <ResponsiveContainer>
              <AreaChart data={m.stacked.data}>
                <defs>
                  {m.stacked.keys.map((k, i) => (
                    <linearGradient key={k} id={`sl${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.7} />
                      <stop offset="1" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => formatBDT(v, 0)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<ChartTooltip fmt={formatBDT} />} />
                {m.stacked.keys.map((k, i) => (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stackId="1"
                    stroke={COLORS[i % COLORS.length]}
                    fill={`url(#sl${i})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>

      <div className="col-span-2 grid gap-4 md:col-span-6 md:grid-cols-3 xl:col-span-4 xl:grid-cols-1">
        {insights.map(({ icon: Icon, color, title, main, sub }) => (
          <Card key={title}>
            <div className="flex items-center gap-3">
              <div className={`rounded-2xl bg-muted/60 p-2.5 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  {title}
                </p>
                <p className="truncate font-display text-lg font-semibold">{main}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card
        className="col-span-2 md:col-span-6 xl:col-span-7"
        title="Daily revenue heatmap"
        subtitle="Last 52 weeks in range"
      >
        <Heatmap rev={revenue} />
      </Card>

      <Card
        className="col-span-2 md:col-span-6 xl:col-span-5"
        title="Target vs actual"
        subtitle="From Targets tab"
      >
        {m.gauges.length ? (
          <div className="grid grid-cols-2 gap-2">
            {m.gauges.map((g, i) => {
              const p = g.target ? (g.actual / g.target) * 100 : 0;
              return (
                <div key={g.name} className="relative h-32">
                  <ResponsiveContainer>
                    <RadialBarChart
                      innerRadius="72%"
                      outerRadius="100%"
                      data={[{ v: Math.min(p, 100) }]}
                      startAngle={210}
                      endAngle={-30}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar
                        dataKey="v"
                        cornerRadius={12}
                        fill={COLORS[i % COLORS.length]}
                        background={{ fill: "var(--muted)" }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl font-bold">{pct(p)}</span>
                    <span className="max-w-[90%] truncate text-[10px] text-muted-foreground">
                      {g.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty text="No matching targets" />
        )}
      </Card>

      <Card
        className="col-span-2 md:col-span-6 xl:col-span-12"
        title="Revenue by sector"
        subtitle="Treemap"
        action={<TrendingUp className="h-4 w-4 text-lime" />}
      >
        <div className="h-72">
          {m.sectors.length ? (
            <ResponsiveContainer>
              <Treemap
                data={m.sectors.map((s) => ({ name: s.sector, value: s.revenue }))}
                dataKey="value"
                content={<TreeCell />}
                isAnimationActive
              >
                <Tooltip content={<ChartTooltip fmt={formatBDT} />} />
              </Treemap>
            </ResponsiveContainer>
          ) : (
            <Empty />
          )}
        </div>
      </Card>
    </div>
  );
}
