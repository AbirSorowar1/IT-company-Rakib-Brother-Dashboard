import { get, num, parseDate, monthKey, type Row } from "./data";

export type SectorStat = {
  sector: string;
  revenue: number;
  profit: number;
  margin: number;
  volume: number;
};

export function sectorStats(rev: Row[]): SectorStat[] {
  const m = new Map<string, SectorStat>();
  for (const r of rev) {
    const s = get(r, "Sector", "Service_Line") || "Unknown";
    const e = m.get(s) ?? { sector: s, revenue: 0, profit: 0, margin: 0, volume: 0 };
    e.revenue += num(r, "Revenue_BDT");
    e.profit += num(r, "Gross_Profit_BDT");
    e.volume += 1;
    m.set(s, e);
  }
  return [...m.values()]
    .map((e) => ({ ...e, margin: e.revenue ? (e.profit / e.revenue) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function monthlySeries(rev: Row[]) {
  const m = new Map<string, { month: string; revenue: number; profit: number }>();
  for (const r of rev) {
    const d = parseDate(get(r, "Date"));
    if (!d) continue;
    const k = monthKey(d);
    const e = m.get(k) ?? { month: k, revenue: 0, profit: 0 };
    e.revenue += num(r, "Revenue_BDT");
    e.profit += num(r, "Gross_Profit_BDT");
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function monthlyByKey(rows: Row[], dateCol: string, key: string, value: string) {
  const keys = new Set<string>();
  const m = new Map<string, Record<string, number | string>>();
  for (const r of rows) {
    const d = parseDate(get(r, dateCol));
    if (!d) continue;
    const mk = monthKey(d);
    const k = get(r, key) || "Other";
    keys.add(k);
    const e = m.get(mk) ?? { month: mk };
    e[k] = ((e[k] as number) ?? 0) + num(r, value);
    m.set(mk, e);
  }
  return {
    keys: [...keys],
    data: [...m.values()].sort((a, b) => String(a["month"]).localeCompare(String(b["month"]))),
  };
}

export function fastestGrowing(rev: Row[]) {
  const { keys, data } = monthlyByKey(rev, "Date", "Service_Line", "Revenue_BDT");
  if (data.length < 2) return null;
  const last = data[data.length - 1]!,
    prev = data[data.length - 2]!;
  let best: { sector: string; growth: number } | null = null;
  for (const k of keys) {
    const a = (prev[k] as number) ?? 0,
      b = (last[k] as number) ?? 0;
    if (!a) continue;
    const g = ((b - a) / a) * 100;
    if (!best || g > best.growth) best = { sector: k, growth: g };
  }
  return best;
}

export function dailyMap(rev: Row[]) {
  const m = new Map<string, number>();
  for (const r of rev) {
    const d = parseDate(get(r, "Date"));
    if (!d) continue;
    const k = d.toDateString();
    m.set(k, (m.get(k) ?? 0) + num(r, "Revenue_BDT"));
  }
  return m;
}
