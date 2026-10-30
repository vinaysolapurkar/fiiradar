// lib/fii.ts
// Data layer for the FII Radar dashboard.
//
// Pulls from two publicly-accessible, no-auth-required sources:
//   1. Groww's internal API — daily aggregate FII/DII flows (cash market, by day)
//   2. NSE Archives — daily bulk and block deal CSVs (stock-level FII participation)
//
// NSE Archives always serves the most recent trading day's CSV. We tag each
// client-name row with `isFII` based on a curated list of known FPI / foreign
// institutional patterns. This is a best-effort approximation, not an official
// exchange feed: see README for caveats.

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const GROWW_FII_DII =
  "https://groww.in/v1/api/search/v3/query/fii_dii/st_fii_dii";

const NSE_LARGE_DEALS =
  "https://www.nseindia.com/api/snapshot-capital-market-largedeal";

// -------- Types --------

export type FiiDiiDay = {
  date: string;
  fii: { grossBuy: number; grossSell: number; net: number };
  dii: { grossBuy: number; grossSell: number; net: number };
};

export type Deal = {
  date: string;
  symbol: string;
  company: string;
  client: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  valueCr: number; // (qty * price) / 1e7
  isFII: boolean;
  fiiTag?: string; // which pattern matched
};

export type StockAggregate = {
  symbol: string;
  company: string;
  fiiBuyValueCr: number;
  fiiSellValueCr: number;
  fiiNetCr: number;
  fiiDeals: number;
  totalBuyValueCr: number;
  totalSellValueCr: number;
  totalDeals: number;
  largestDealCr: number; // biggest single deal in the stock today (any client)
};

export type DashboardData = {
  asOf: string;
  flows: FiiDiiDay[]; // last N trading days, oldest first
  todayFlow?: FiiDiiDay; // the latest day with non-zero data
  bulkDeals: Deal[];
  blockDeals: Deal[];
  aggregated: StockAggregate[]; // FII-tagged stocks, sorted by |net|
  bigMovers: StockAggregate[]; // top stocks by total deal value today (any client)
  fetchedAt: string;
  sources: { name: string; ok: boolean; note?: string }[];
};

// -------- FII detection patterns --------
//
// Curated heuristics: any of these substrings in the client name flags the deal
// as FII/FPI participation. We deliberately bias toward false positives (over-
// tagging) so the dashboard surfaces more signal than it hides; the "FII-only"
// filter is opt-in for the user.

const FII_PATTERNS: { tag: string; rx: RegExp }[] = [
  { tag: "Norwegian Sovereign", rx: /NORGES BANK|GOVERNMENT PENSION FUND GLOBAL/i },
  { tag: "GIC", rx: /GIC PVT|GIC PRIVATE/i },
  { tag: "Caisse", rx: /CAISSE DE DÉPÔT|CAISSE DES DEPOTS|CDPQ/i },
  { tag: "ADIA", rx: /\bADIA\b|ABU DHABI INVESTMENT/i },
  { tag: "Temasek", rx: /TEMASEK/i },
  { tag: "Mubadala", rx: /MUBADALA/i },
  { tag: "Kuwait Investment Authority", rx: /\bKIA\b|KUWAIT INVESTMENT AUTHORITY/i },
  { tag: "Qatar Investment Authority", rx: /QATAR INVESTMENT AUTHORITY|\bQIA\b/i },
  { tag: "Public Investment Fund", rx: /PUBLIC INVESTMENT FUND|\bPIF\b.*SAUDI/i },
  { tag: "Vanguard", rx: /VANGUARD/i },
  { tag: "BlackRock", rx: /BLACKROCK/i },
  { tag: "Fidelity", rx: /FIDELITY/i },
  { tag: "Capital Group", rx: /CAPITAL GROUP/i },
  { tag: "Schroders", rx: /SCHRODER/i },
  { tag: "Goldman", rx: /GOLDMAN SACHS|GS FUNDS|GOLDMAN/i },
  { tag: "Morgan Stanley", rx: /MORGAN STANLEY/i },
  { tag: "JP Morgan", rx: /J\.?\s?P\.?\s?MORGAN|JPMORGAN/i },
  { tag: "Citigroup", rx: /CITIGROUP|CITI\s+GLOBAL|CITIBANK/i },
  { tag: "BNP Paribas", rx: /BNP PARIBAS/i },
  { tag: "Societe Generale", rx: /SOCIETE GENERALE|SOCIÉTÉ GÉNÉRALE/i },
  { tag: "Credit Suisse", rx: /CREDIT SUISSE/i },
  { tag: "UBS", rx: /\bUBS\b/i },
  { tag: "Deutsche Bank", rx: /DEUTSCHE BANK/i },
  { tag: "HSBC", rx: /\bHSBC\b/i },
  { tag: "Standard Chartered", rx: /STANDARD CHARTERED/i },
  { tag: "Barclays", rx: /BARCLAYS/i },
  { tag: "Nomura", rx: /NOMURA/i },
  { tag: "Daiwa", rx: /DAIWA/i },
  { tag: "Mizuho", rx: /MIZUHO/i },
  { tag: "MUFG", rx: /MITSUBISHI|MUFG|MUFG BANK/i },
  { tag: "Sumitomo", rx: /SUMITOMO/i },
  { tag: "Bank of America", rx: /BANK OF AMERICA|MERRILL LYNCH/i },
  { tag: "Wellington", rx: /WELLINGTON/i },
  { tag: "PIMCO", rx: /\bPIMCO\b/i },
  { tag: "T Rowe Price", rx: /T\.?\s?ROWE PRICE|TRowe\s+Price/i },
  { tag: "Nippon India FII", rx: /NIPPON LIFE|NIPPON INDIA INSURANCE/i },
  { tag: "Government of Singapore", rx: /GOVERNMENT OF SINGAPORE|GIC.*SINGAPORE/i },
  { tag: "Foreign Portfolio", rx: /FOREIGN PORTFOLIO INVESTOR|FPI\b/i },
  { tag: "Foreign Bank Custodian", rx: /CITI\s+.*CUSTODY|HSSC.*CUSTODY|STANDARD\s+CHARTERED.*CUSTODY/i },
  { tag: "Mylan (US)", rx: /\bMYLAN\b|VIATRIS/i },
  { tag: "Franklin Templeton", rx: /FRANKLIN TEMPLETON/i },
  { tag: "Invesco", rx: /INVESCO/i },
  { tag: "Templeton", rx: /TEMPLETON/i },
  { tag: "Aberdeen", rx: /ABERDEEN|ABRDN/i },
  { tag: "Amundi", rx: /AMUNDI/i },
  { tag: "Baillie Gifford", rx: /BAILLIE GIFFORD/i },
  { tag: "Capital International", rx: /CAPITAL INTERNATIONAL/i },
  { tag: "Citadel", rx: /CITADEL/i },
  { tag: "DE Shaw", rx: /D\.?\s?E\.?\s?SHAW/i },
  { tag: "Dimensional", rx: /DIMENSIONAL FUND/i },
  { tag: "Ghisallo", rx: /GHISALLO/i },
  { tag: "GQG Partners", rx: /GQG PARTNERS/i },
  { tag: "Ishares / iShares", rx: /ISHARES/i },
  { tag: "Jump Trading", rx: /JUMP TRADING/i },
  { tag: "Lazard", rx: /LAZARD/i },
  { tag: "Macquarie", rx: /MACQUARIE/i },
  { tag: "Mirae Asset (Korea)", rx: /MIRAE ASSET(?!.*MUTUAL)/i },
  { tag: "Nippon Life (Japan)", rx: /NIPPON LIFE INDIA/i },
  { tag: "Nomura", rx: /NOMURA/i },
  { tag: "Orbis", rx: /ORBIS/i },
  { tag: "Pictet", rx: /PICTET/i },
  { tag: "Robeco", rx: /ROBECO/i },
  { tag: "SBI FM (Singapore)", rx: /SBI FUNDS MANAGEMENT.*SINGAPORE|SBI FM SINGAPORE/i },
  { tag: "Societe Generale", rx: /SG SECURITIES|NEWEDGE/i },
  { tag: "State Street", rx: /STATE STREET/i },
  { tag: "Two Sigma", rx: /TWO SIGMA/i },
  { tag: "Virtu Financial", rx: /VIRTU FINANCIAL/i },
  { tag: "Warburg Pincus", rx: /WARBURG PINCUS/i },
  { tag: "NYSE/NASDAQ listed foreign", rx: /\bINC\.?$/i }, // weak catch-all
];

export function detectFII(client: string): { isFII: boolean; tag?: string } {
  for (const p of FII_PATTERNS) {
    if (p.rx.test(client)) return { isFII: true, tag: p.tag };
  }
  return { isFII: false };
}

// -------- Loaders --------

async function fetchText(url: string): Promise<string> {
  // Use Node's native https module — Next 16's bundled undici fetch throws
  // "e.replace is not a function" on some external URLs in this environment.
  return new Promise<string>((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? require("https") : require("http");
    const req = mod.get(
      {
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        headers: {
          "User-Agent": UA,
          Accept: "*/*",
          "Accept-Encoding": "identity",
        },
      },
      (res: any) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // follow redirect
          fetchText(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`${url} -> ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("timeout"));
    });
  });
}

// Minimal CSV parser — handles quoted fields with commas (bulk.csv uses them).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0,
    cur: string[] = [],
    field = "",
    inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
    } else {
      if (c === '"') {
        inQ = true;
        i++;
        continue;
      }
      if (c === ",") {
        cur.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(field);
        field = "";
        rows.push(cur);
        cur = [];
        i++;
        continue;
      }
      field += c;
      i++;
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    rows.push(cur);
  }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0]));
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const s = typeof v === "string" ? v : String(v);
  const n = parseFloat(s.replace(/[, ]/g, ""));
  return isFinite(n) ? n : 0;
}

function toCr(qty: number, price: number): number {
  return (qty * price) / 1e7; // paise-aware if price is rupees; rupee * shares / 1e7
}

async function loadDealsFromApi(): Promise<{
  bulkDeals: Deal[];
  blockDeals: Deal[];
  sourceOk: boolean;
  note?: string;
}> {
  let text: string;
  try {
    text = await fetchText(NSE_LARGE_DEALS);
  } catch (err) {
    return { bulkDeals: [], blockDeals: [], sourceOk: false, note: String(err) };
  }
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return { bulkDeals: [], blockDeals: [], sourceOk: false, note: "JSON parse failed" };
  }

  function parseEntries(arr: any[]): Deal[] {
    const deals: Deal[] = [];
    for (const r of arr) {
      const symbol = (r.symbol || "").trim();
      if (!symbol) continue;
      const qty = num(r.qty);
      const price = num(r.watp);
      if (!qty || !price) continue;
      const sideNorm = /SELL/i.test(r.buySell) ? "SELL" as const : "BUY" as const;
      const det = detectFII(r.clientName || "");
      deals.push({
        date: r.date || "",
        symbol,
        company: (r.name || "").trim(),
        client: (r.clientName || "").trim(),
        side: sideNorm,
        qty,
        price,
        valueCr: toCr(qty, price),
        isFII: det.isFII,
        fiiTag: det.tag,
      });
    }
    return deals;
  }

  const bulkDeals = parseEntries(json.BULK_DEALS_DATA || []);
  const blockDeals = parseEntries(json.BLOCK_DEALS_DATA || []);
  return {
    bulkDeals,
    blockDeals,
    sourceOk: true,
    note: `bulk=${bulkDeals.length}, block=${blockDeals.length}`,
  };
}

async function loadFiiDiiFlows(
  days = 14,
): Promise<{ flows: FiiDiiDay[]; sourceOk: boolean; note?: string }> {
  try {
    const url = `${GROWW_FII_DII}?segment=Cash%20Market&period=daily&startDate=${startDate(days)}&endDate=${endDate()}`;
    const text = await fetchText(url);
    let json: any;
    try {
      json = JSON.parse(text);
    } catch (pe) {
      return {
        flows: [],
        sourceOk: false,
        note: `parse: ${String((pe as Error).message).slice(0, 80)} (${text.length}b)`,
      };
    }
    const arr: any[] = json?.data?.data ?? [];
    const flows: FiiDiiDay[] = arr
      .map((d) => ({
        date: d.date,
        fii: {
          grossBuy: num(d?.fii?.grossBuy),
          grossSell: num(d?.fii?.grossSell),
          net: num(d?.fii?.netBuySell),
        },
        dii: {
          grossBuy: num(d?.dii?.grossBuy),
          grossSell: num(d?.dii?.grossSell),
          net: num(d?.dii?.netBuySell),
        },
      }))
      .filter((d) => d.fii.grossBuy > 0 || d.fii.grossSell > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (flows.length === 0) {
      return { flows: [], sourceOk: false, note: `0 non-zero days (raw=${arr.length})` };
    }
    return { flows, sourceOk: true };
  } catch (err) {
        const msg = String((err as Error)?.message ?? err).slice(0, 120);
        const stack = String((err as Error)?.stack ?? "").slice(0, 400);
        return {
          flows: [],
          sourceOk: false,
          note: `throw: ${msg} | stack: ${stack.split("\n")[1] || ""}`,
        };
      }
}

function endDate(): string {
  return new Date().toISOString().slice(0, 10);
}
function startDate(daysBack: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysBack);
  return d.toISOString().slice(0, 10);
}

// -------- Aggregation --------

export function aggregateByStock(deals: Deal[]): StockAggregate[] {
  const map = new Map<string, StockAggregate>();
  for (const d of deals) {
    const k = d.symbol;
    let a = map.get(k);
    if (!a) {
      a = {
        symbol: d.symbol,
        company: d.company,
        fiiBuyValueCr: 0,
        fiiSellValueCr: 0,
        fiiNetCr: 0,
        fiiDeals: 0,
        totalBuyValueCr: 0,
        totalSellValueCr: 0,
        totalDeals: 0,
        largestDealCr: 0,
      };
      map.set(k, a);
    }
    a.totalDeals++;
    if (d.side === "BUY") a.totalBuyValueCr += d.valueCr;
    else a.totalSellValueCr += d.valueCr;
    a.largestDealCr = Math.max(a.largestDealCr, d.valueCr);
    if (d.isFII) {
      a.fiiDeals++;
      if (d.side === "BUY") a.fiiBuyValueCr += d.valueCr;
      else a.fiiSellValueCr += d.valueCr;
      a.fiiNetCr = a.fiiBuyValueCr - a.fiiSellValueCr;
    }
  }
  return Array.from(map.values());
}

export function sortFiiStocks(rows: StockAggregate[]): StockAggregate[] {
  return rows
    .filter((a) => a.fiiDeals > 0)
    .sort((x, y) => Math.abs(y.fiiNetCr) - Math.abs(x.fiiNetCr));
}

export function sortBigMovers(rows: StockAggregate[]): StockAggregate[] {
  return rows
    .slice()
    .sort(
      (x, y) =>
        y.totalBuyValueCr + y.totalSellValueCr - (x.totalBuyValueCr + x.totalSellValueCr),
    );
}

// -------- Main entrypoint --------

export async function loadDashboard(): Promise<DashboardData> {
  const [nseRes, flowRes] = await Promise.all([
    loadDealsFromApi(),
    loadFiiDiiFlows(21),
  ]);

  const allDeals = [...nseRes.bulkDeals, ...nseRes.blockDeals];
  // Dedupe identical rows (bulk and block sometimes overlap).
  const seen = new Set<string>();
  const dedup = allDeals.filter((d) => {
    const k = `${d.symbol}|${d.client}|${d.side}|${d.qty}|${d.price}|${d.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const aggregated = sortFiiStocks(aggregateByStock(dedup));
  const bigMovers = sortBigMovers(aggregateByStock(dedup)).slice(0, 30);
  const todayFlow = flowRes.flows[flowRes.flows.length - 1];
  const asOfDate = dedup[0]?.date || todayFlow?.date || endDate();

  return {
    asOf: asOfDate,
    flows: flowRes.flows,
    todayFlow,
    bulkDeals: nseRes.bulkDeals,
    blockDeals: nseRes.blockDeals,
    aggregated,
    bigMovers,
    fetchedAt: new Date().toISOString(),
    sources: [
      {
        name: "NSE API — bulk deals",
        ok: nseRes.sourceOk,
        note: `${nseRes.bulkDeals.length} rows${nseRes.note ? ` (${nseRes.note})` : ""}`,
      },
      {
        name: "NSE API — block deals",
        ok: nseRes.sourceOk,
        note: `${nseRes.blockDeals.length} rows${nseRes.note ? ` (${nseRes.note})` : ""}`,
      },
      {
        name: "Groww — FII/DII daily flows",
        ok: flowRes.sourceOk,
        note: `${flowRes.flows.length} days${flowRes.note ? ` (${flowRes.note})` : ""}`,
      },
    ],
  };
}