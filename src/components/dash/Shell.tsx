import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, PieChart, Users, FolderKanban, Wallet, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/dashboard";

const NAV = [
  { to: "/", label: "Command", icon: LayoutDashboard },
  { to: "/sectors", label: "Sectors", icon: PieChart },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/finance", label: "Finance", icon: Wallet },
] as const;

const field =
  "rounded-full border border-glass-border bg-muted/40 px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary";

function FiltersBar() {
  const { filters, setFilters, options } = useDashboard();
  const set = (k: keyof typeof filters, v: string) => setFilters({ ...filters, [k]: v });
  const active = Object.values(filters).some(Boolean);
  return (
    <div className="glass flex flex-wrap items-center gap-2 rounded-3xl px-4 py-3">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Filters</span>
      <input
        type="date"
        value={filters.from}
        onChange={(e) => set("from", e.target.value)}
        className={field}
        aria-label="From date"
      />
      <span className="text-xs text-muted-foreground">→</span>
      <input
        type="date"
        value={filters.to}
        onChange={(e) => set("to", e.target.value)}
        className={field}
        aria-label="To date"
      />
      <select
        value={filters.year}
        onChange={(e) => set("year", e.target.value)}
        className={field}
        aria-label="Year"
      >
        <option value="">All years</option>
        {options.years.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      <select
        value={filters.serviceLine}
        onChange={(e) => set("serviceLine", e.target.value)}
        className={field}
        aria-label="Service line"
      >
        <option value="">All service lines</option>
        {options.serviceLines.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      <select
        value={filters.industry}
        onChange={(e) => set("industry", e.target.value)}
        className={field}
        aria-label="Client industry"
      >
        <option value="">All industries</option>
        {options.industries.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>
      {active && (
        <button
          onClick={() => setFilters({ from: "", to: "", year: "", serviceLine: "", industry: "" })}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { refresh, isFetching, updatedAt } = useDashboard();
  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-28 pt-4 sm:px-6 md:pb-10">
      <nav className="glass fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-around rounded-full px-2 py-2 md:sticky md:top-4 md:inset-x-auto md:bottom-auto md:max-w-none md:justify-between md:px-3">
        <div className="hidden items-center gap-2 pl-2 md:flex">
          <img
            src="/Logo.png"
            alt="Rakib & Brothers IT Ltd. logo"
            className="h-12 w-12 shrink-0 object-contain"
          />
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold">Rakib & Brothers</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              IT Ltd. · Command
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] text-muted-foreground transition-all hover:text-foreground md:flex-row md:gap-2 md:px-4 md:py-2 md:text-sm"
              activeProps={{
                className: "bg-primary/20 !text-foreground shadow-[inset_0_0_0_1px_var(--violet)]",
              }}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <button
          onClick={refresh}
          className="hidden items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:brightness-110 md:inline-flex"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} /> Refresh
        </button>
      </nav>

      <header className="mb-4 mt-2 flex items-end justify-between gap-3 md:mt-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Executive analytics
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            <span className="text-gradient">Rakib & Brothers IT Ltd.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {updatedAt ? `Live · ${new Date(updatedAt).toLocaleTimeString()}` : "Waiting for data"}
          </span>
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              updatedAt ? "bg-lime shadow-[0_0_10px_var(--lime)]" : "bg-muted-foreground",
            )}
          />
          <button
            onClick={refresh}
            aria-label="Refresh"
            className="glass rounded-full p-2 md:hidden"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </header>
      <div className="mb-4">
        <FiltersBar />
      </div>
      {children}
    </div>
  );
}
