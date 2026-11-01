import Papa from "papaparse";
import { SHEET_URLS } from "@/config/sheets";

export type Row = Record<string, string>;
export type Sheets = Record<keyof typeof SHEET_URLS, Row[]>;
export const SHEET_KEYS = Object.keys(SHEET_URLS) as (keyof typeof SHEET_URLS)[];

export function missingUrls() {
  return SHEET_KEYS.filter((k) => !SHEET_URLS[k]);
}

async function fetchCsv(url: string): Promise<Row[]> {
  const sep = url.includes("?") ? "&" : "?";
  const res = await fetch(`${url}${sep}_=${Date.now()}`);
  if (!res.ok) throw new Error(`Sheet request failed (${res.status})`);
  const text = await res.text();
  const parsed = Papa.parse<Row>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return parsed.data;
}

export async function loadSheets(): Promise<Sheets> {
  const miss = missingUrls();
  if (miss.length) throw new Error(`Missing sheet links for: ${miss.join(", ")}`);
  const entries = await Promise.all(
    SHEET_KEYS.map(async (k) => [k, await fetchCsv(SHEET_URLS[k])] as const),
  );
  return Object.fromEntries(entries) as Sheets;
}

/** Case/spacing-insensitive column lookup. */
export function get(row: Row, ...names: string[]): string {
  for (const n of names) {
    const direct = row[n];
    if (direct !== undefined) return direct;
    const norm = n.toLowerCase().replace(/[\s_]/g, "");
    const key = Object.keys(row).find((k) => k.toLowerCase().replace(/[\s_]/g, "") === norm);
    if (key) return row[key] ?? "";
  }
  return "";
}

export function num(row: Row, ...names: string[]): number {
  const v = get(row, ...names).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseDate(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  const dmy = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return new Date(+dmy[3]!, +dmy[2]! - 1, +dmy[1]!);
  const ym = t.match(/^(\d{4})-(\d{1,2})$/);
  if (ym) return new Date(+ym[1]!, +ym[2]! - 1, 1);
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export const sum = (rows: Row[], ...cols: string[]) =>
  rows.reduce((a, r) => a + num(r, ...cols), 0);

/** Net Profit = sum(Gross_Profit_BDT) − sum(Amount_BDT of Monthly_Expenses) */
export function netProfit(revenueRows: Row[], expenseRows: Row[]) {
  return sum(revenueRows, "Gross_Profit_BDT") - sum(expenseRows, "Amount_BDT");
}

export function groupSum(rows: Row[], key: string, value: string) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = get(r, key) || "Unknown";
    m.set(k, (m.get(k) ?? 0) + num(r, value));
  }
  return m;
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatBDT(n: number, digits = 2): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (a >= 1e7) return `${sign}৳${(a / 1e7).toFixed(digits)} Cr`;
  if (a >= 1e5) return `${sign}৳${(a / 1e5).toFixed(digits)} L`;
  if (a >= 1e3) return `${sign}৳${(a / 1e3).toFixed(1)}K`;
  return `${sign}৳${a.toFixed(0)}`;
}

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;
