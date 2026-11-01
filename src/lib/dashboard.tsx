import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { REFRESH_INTERVAL_MS } from "@/config/sheets";
import { get, loadSheets, missingUrls, parseDate, type Row, type Sheets } from "./data";

export type Filters = {
  from: string;
  to: string;
  year: string;
  serviceLine: string;
  industry: string;
};
const empty: Filters = { from: "", to: "", year: "", serviceLine: "", industry: "" };

type Ctx = {
  raw: Sheets | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refresh: () => void;
  updatedAt: number;
  filters: Filters;
  setFilters: (f: Filters) => void;
  options: { years: string[]; serviceLines: string[]; industries: string[] };
  data: { revenue: Row[]; clients: Row[]; projects: Row[]; expenses: Row[]; targets: Row[] };
};

const DashCtx = createContext<Ctx | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const q = useQuery({
    queryKey: ["sheets"],
    queryFn: loadSheets,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (n) => missingUrls().length === 0 && n < 1,
  });
  const [filters, setFilters] = useState<Filters>(empty);
  const raw = q.data;

  const value = useMemo<Ctx>(() => {
    const clients = raw?.Clients ?? [];
    const industryByClient = new Map(
      clients.map((c) => [get(c, "Client_ID"), get(c, "Client_Industry", "Industry")]),
    );
    const industryOf = (r: Row) =>
      get(r, "Client_Industry") || industryByClient.get(get(r, "Client_ID")) || "";
    const from = filters.from ? new Date(filters.from) : null;
    const to = filters.to ? new Date(filters.to + "T23:59:59") : null;
    const dateOk = (d: Date | null) => {
      if (!d) return !from && !to && !filters.year;
      if (filters.year && String(d.getFullYear()) !== filters.year) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    };
    const slOk = (r: Row) => !filters.serviceLine || get(r, "Service_Line") === filters.serviceLine;
    const indOk = (r: Row) => !filters.industry || industryOf(r) === filters.industry;

    const allRev = raw?.Daily_Revenue ?? [];
    const revenue = allRev.filter((r) => dateOk(parseDate(get(r, "Date"))) && slOk(r) && indOk(r));
    const projects = (raw?.Projects ?? []).filter(
      (r) =>
        slOk(r) &&
        indOk(r) &&
        (filters.year || from || to ? dateOk(parseDate(get(r, "Start_Date", "Date"))) : true),
    );
    const expenses = (raw?.Monthly_Expenses ?? []).filter((r) =>
      dateOk(parseDate(get(r, "Month", "Date"))),
    );
    const targets = (raw?.Targets ?? []).filter(
      (r) => !filters.year || !get(r, "Year") || get(r, "Year") === filters.year,
    );
    const fClients = clients.filter(
      (c) => !filters.industry || get(c, "Client_Industry", "Industry") === filters.industry,
    );

    const uniq = (a: string[]) => [...new Set(a.filter(Boolean))].sort();
    return {
      raw,
      isLoading: q.isLoading,
      isFetching: q.isFetching,
      error: q.error as Error | null,
      refresh: () => void q.refetch(),
      updatedAt: q.dataUpdatedAt,
      filters,
      setFilters,
      options: {
        years: uniq(
          allRev.map((r) => String(parseDate(get(r, "Date"))?.getFullYear() ?? "")),
        ).reverse(),
        serviceLines: uniq(allRev.map((r) => get(r, "Service_Line"))),
        industries: uniq([
          ...clients.map((c) => get(c, "Client_Industry", "Industry")),
          ...allRev.map(industryOf),
        ]),
      },
      data: { revenue, clients: fClients, projects, expenses, targets },
    };
  }, [raw, q.isLoading, q.isFetching, q.error, q.dataUpdatedAt, filters]);

  return <DashCtx.Provider value={value}>{children}</DashCtx.Provider>;
}

export function useDashboard() {
  const c = useContext(DashCtx);
  if (!c) throw new Error("useDashboard outside provider");
  return c;
}
