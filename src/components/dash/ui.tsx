import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, Search, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard";
import { SHEET_KEYS, missingUrls } from "@/lib/data";

export const COLORS = [
  "var(--violet)",
  "var(--cyan)",
  "var(--lime)",
  "var(--amber)",
  "var(--rose)",
  "oklch(0.75 0.15 330)",
  "oklch(0.72 0.12 170)",
  "oklch(0.65 0.15 250)",
];

export function Card({
  title,
  subtitle,
  children,
  className,
  action,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string | undefined;
  action?: ReactNode;
}) {
  return (
    <section className={cn("glass rise rounded-3xl p-5 flex flex-col min-w-0", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-wide text-foreground">{title}</h3>
            )}
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-3xl bg-muted/60", className)} />;
}

export function PageState({ children }: { children: ReactNode }) {
  const { isLoading, error, raw, refresh } = useDashboard();
  if (isLoading)
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
        <Skeleton className="col-span-2 h-80 md:col-span-3" />
        <Skeleton className="col-span-2 h-80 md:col-span-1" />
        <Skeleton className="col-span-2 h-64 md:col-span-4" />
      </div>
    );
  if (error && !raw) {
    const miss = missingUrls();
    return (
      <Card className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber" />
          <h2 className="text-xl font-semibold">
            {miss.length ? "Connect your Google Sheet" : "Couldn't load the sheet"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {miss.length
              ? "Publish each tab as CSV (File → Share → Publish to web) and add the links in the sheets config file."
              : error.message}
          </p>
          {miss.length > 0 && (
            <ul className="flex flex-wrap justify-center gap-2 text-xs">
              {SHEET_KEYS.map((k) => (
                <li
                  key={k}
                  className={cn(
                    "rounded-full px-3 py-1",
                    miss.includes(k)
                      ? "bg-destructive/20 text-destructive"
                      : "bg-lime/20 text-lime",
                  )}
                >
                  {k}
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={refresh}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      </Card>
    );
  }
  return <>{children}</>;
}

export function Empty({ text = "No data for current filters" }: { text?: string }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function ChartTooltip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-2xl px-3 py-2 text-xs">
      {label !== undefined && (
        <div className="mb-1 font-semibold text-foreground">{String(label)}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || p.payload?.fill }}
          />
          <span>{p.name}:</span>
          <span className="font-medium text-foreground">
            {fmt ? fmt(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export type Column<T> = {
  key: string;
  label: string;
  value: (r: T) => string | number;
  render?: (r: T) => ReactNode;
  align?: "right";
};

export function DataTable<T>({
  rows,
  columns,
  title,
}: {
  rows: T[];
  columns: Column<T>[];
  title: string;
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const view = useMemo(() => {
    const s = q.toLowerCase();
    let r = s
      ? rows.filter((row) => columns.some((c) => String(c.value(row)).toLowerCase().includes(s)))
      : rows;
    if (sort) {
      const col = columns.find((c) => c.key === sort.key)!;
      r = [...r].sort((a, b) => {
        const x = col.value(a),
          y = col.value(b);
        return (
          (typeof x === "number" && typeof y === "number"
            ? x - y
            : String(x).localeCompare(String(y))) * sort.dir
        );
      });
    }
    return r;
  }, [rows, columns, q, sort]);
  return (
    <Card
      title={title}
      subtitle={`${view.length} of ${rows.length} rows`}
      action={
        <label className="flex items-center gap-2 rounded-full border border-glass-border bg-muted/40 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-28 bg-transparent text-xs outline-none sm:w-44"
          />
        </label>
      }
    >
      <div className="max-h-[480px] overflow-auto rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-popover/95 backdrop-blur">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-2 font-medium text-muted-foreground",
                    c.align === "right" && "text-right",
                  )}
                >
                  <button
                    className="inline-flex items-center gap-1 hover:text-foreground"
                    onClick={() =>
                      setSort((s) => ({
                        key: c.key,
                        dir: s?.key === c.key && s.dir === 1 ? -1 : 1,
                      }))
                    }
                  >
                    {c.label} <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.slice(0, 500).map((r, i) => (
              <tr key={i} className="border-t border-border/50 transition-colors hover:bg-muted/40">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-3 py-2",
                      c.align === "right" && "text-right tabular-nums",
                    )}
                  >
                    {c.render ? c.render(r) : c.value(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!view.length && <Empty />}
      </div>
    </Card>
  );
}

export function StatusPill({ s }: { s: string }) {
  const l = s.toLowerCase();
  const cls = /complete|done|active|paid/.test(l)
    ? "bg-lime/15 text-lime"
    : /overdue|late|cancel|lost|inactive/.test(l)
      ? "bg-rose/15 text-rose"
      : /hold|pending|risk/.test(l)
        ? "bg-amber/15 text-amber"
        : "bg-cyan/15 text-cyan";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>{s || "—"}</span>
  );
}
