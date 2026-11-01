/**
 * Google Sheet data sources.
 * In Google Sheets: File → Share → Publish to web → pick each tab → "Comma-separated values (.csv)" → Publish,
 * then paste each link below.
 */
export const SHEET_URLS = {
  Daily_Revenue:
    "https://docs.google.com/spreadsheets/d/1qGMPRW_BESS0tHQMUBMF7VGKOUFMrhbXxmZfUKBfKqI/gviz/tq?tqx=out:csv&sheet=Daily_Revenue",
  Clients:
    "https://docs.google.com/spreadsheets/d/1qGMPRW_BESS0tHQMUBMF7VGKOUFMrhbXxmZfUKBfKqI/gviz/tq?tqx=out:csv&sheet=Clients",
  Projects:
    "https://docs.google.com/spreadsheets/d/1qGMPRW_BESS0tHQMUBMF7VGKOUFMrhbXxmZfUKBfKqI/gviz/tq?tqx=out:csv&sheet=Projects",
  Monthly_Expenses:
    "https://docs.google.com/spreadsheets/d/1qGMPRW_BESS0tHQMUBMF7VGKOUFMrhbXxmZfUKBfKqI/gviz/tq?tqx=out:csv&sheet=Monthly_Expenses",
  Targets:
    "https://docs.google.com/spreadsheets/d/1qGMPRW_BESS0tHQMUBMF7VGKOUFMrhbXxmZfUKBfKqI/gviz/tq?tqx=out:csv&sheet=Targets",
} as const;

export const REFRESH_INTERVAL_MS = 60_000;
