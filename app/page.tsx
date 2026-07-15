// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { DashboardData } from "@/lib/fii";

type Tab = "big-movers" | "fii-stocks" | "all-deals" | "flows";

function fmtCr(n: number): string {
  if (!isFinite(n) || n === 0) return "0.00";
  const abs = Math.abs(n);
  if (abs >= 1000) return (n / 1000).toFixed(2) + "k";
  return n.toFixed(2);
}

function fmtNum(n: number): string {
  return n.toLocaleString("en-IN");
}

function sign(n: number): string {
  return n > 0 ? "+" : n < 0 ? "-" : "";
}

function FiiStocks({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const rows = data.aggregated.filter((r) =>
    filter === "all" ? true : filter === "buy" ? r.fiiNetCr > 0 : r.fiiNetCr < 0,
  );
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3 text-sm">
        <strong className="font-semibold">Honest read on the data:</strong> NSE
        discloses bulk and block deals only — most FII/FPI activity goes through
        normal exchange orders and never appears here. Today there are{" "}
        <span className="font-bold">{data.aggregated.length} stock{data.aggregated.length === 1 ? "" : "s"}</span>{" "}
        with an FII/FPI-named counterparty in disclosed deals. See the &quot;Big
        movers&quot; tab for the full list of stocks with large disclosed
        activity today.
      </div>
      <div className="flex gap-2 text-sm">
        {(["all", "buy", "sell"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`px-3 py-1 rounded-full border ${
              filter === k
                ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900"
                : "bg-transparent text-zinc-700 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {k === "all" ? "All FII activity" : k === "buy" ? "Net FII buying" : "Net FII selling"}
            {" "}({data.aggregated.filter((r) =>
              k === "all" ? true : k === "buy" ? r.fiiNetCr > 0 : r.fiiNetCr < 0,
            ).length})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Symbol</th>
              <th className="text-left px-3 py-2 font-medium">Company</th>
              <th className="text-right px-3 py-2 font-medium">FII buy ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">FII sell ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">Net ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">FII deals</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-zinc-500">
                  No FII-tagged deals found in today&apos;s bulk/block deals.
                  That&apos;s normal — most FII activity doesn&apos;t show up in
                  disclosed deals. Check the &quot;Daily flows&quot; tab for the
                  aggregate FII cash figure today.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.symbol} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-2 font-mono font-semibold">{r.symbol}</td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                  {r.company}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmtCr(r.fiiBuyValueCr)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-400">
                  {fmtCr(r.fiiSellValueCr)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums font-semibold ${
                    r.fiiNetCr > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : r.fiiNetCr < 0
                      ? "text-rose-700 dark:text-rose-400"
                      : ""
                  }`}
                >
                  {sign(r.fiiNetCr)}
                  {fmtCr(Math.abs(r.fiiNetCr))}
                </td>
                <td className="px-3 py-2 text-right text-zinc-500">{r.fiiDeals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BigMovers({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">
        Top {data.bigMovers.length} stocks by total disclosed deal value today
        (all counterparties, not just FII). Useful to see where the large
        disclosed flow happened — sometimes a domestic block is &quot;FII
        proxy&quot; trading via a local desk.
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Symbol</th>
              <th className="text-left px-3 py-2 font-medium">Company</th>
              <th className="text-right px-3 py-2 font-medium">Buy ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">Sell ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">Net ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">Deals</th>
              <th className="text-right px-3 py-2 font-medium">Biggest deal ₹Cr</th>
            </tr>
          </thead>
          <tbody>
            {data.bigMovers.map((r) => {
              const net = r.totalBuyValueCr - r.totalSellValueCr;
              return (
                <tr key={r.symbol} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-1.5 font-mono font-semibold">{r.symbol}</td>
                  <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                    {r.company}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                    {fmtCr(r.totalBuyValueCr)}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-rose-700 dark:text-rose-400">
                    {fmtCr(r.totalSellValueCr)}
                  </td>
                  <td
                    className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                      net > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : net < 0
                        ? "text-rose-700 dark:text-rose-400"
                        : ""
                    }`}
                  >
                    {sign(net)}
                    {fmtCr(Math.abs(net))}
                  </td>
                  <td className="px-3 py-1.5 text-right text-zinc-500">{r.totalDeals}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                    {fmtCr(r.largestDealCr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllDeals({ data }: { data: DashboardData }) {
  const [showAll, setShowAll] = useState(false);
  const deals = data.bulkDeals.length >= data.blockDeals.length
    ? data.bulkDeals
    : [...data.blockDeals, ...data.bulkDeals];
  const rows = showAll ? deals : deals.slice(0, 100);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          {deals.length} deal{deals.length === 1 ? "" : "s"} from NSE archives
        </span>
        <button
          onClick={() => setShowAll(!showAll)}
          className="px-3 py-1 rounded-full border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {showAll ? "Show top 100" : "Show all"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800 max-h-[70vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-left px-3 py-2 font-medium">Symbol</th>
              <th className="text-left px-3 py-2 font-medium">Client</th>
              <th className="text-left px-3 py-2 font-medium">Side</th>
              <th className="text-right px-3 py-2 font-medium">Qty</th>
              <th className="text-right px-3 py-2 font-medium">Price ₹</th>
              <th className="text-right px-3 py-2 font-medium">Value ₹Cr</th>
              <th className="text-left px-3 py-2 font-medium">FII?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-1.5 text-zinc-500">{d.date}</td>
                <td className="px-3 py-1.5 font-mono font-semibold">{d.symbol}</td>
                <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 max-w-sm truncate">
                  {d.client}
                </td>
                <td className="px-3 py-1.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      d.side === "BUY"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                  >
                    {d.side}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(d.qty)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums">{d.price.toFixed(2)}</td>
                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">
                  {fmtCr(d.valueCr)}
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {d.isFII ? (
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {d.fiiTag}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Flows({ data }: { data: DashboardData }) {
  const max = Math.max(
    ...data.flows.flatMap((d) => [Math.abs(d.fii.net), Math.abs(d.dii.net)]),
    1,
  );
  return (
    <div className="space-y-4">
      {data.todayFlow && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              FII cash flow — {data.todayFlow.date}
            </div>
            <div
              className={`text-3xl font-bold mt-1 tabular-nums ${
                data.todayFlow.fii.net > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : data.todayFlow.fii.net < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : ""
              }`}
            >
              {sign(data.todayFlow.fii.net)}₹{fmtCr(Math.abs(data.todayFlow.fii.net))} Cr
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              Buy ₹{fmtCr(data.todayFlow.fii.grossBuy)} Cr · Sell ₹
              {fmtCr(data.todayFlow.fii.grossSell)} Cr
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-500">
              DII cash flow — {data.todayFlow.date}
            </div>
            <div
              className={`text-3xl font-bold mt-1 tabular-nums ${
                data.todayFlow.dii.net > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : data.todayFlow.dii.net < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : ""
              }`}
            >
              {sign(data.todayFlow.dii.net)}₹{fmtCr(Math.abs(data.todayFlow.dii.net))} Cr
            </div>
            <div className="text-xs text-zinc-500 mt-2">
              Buy ₹{fmtCr(data.todayFlow.dii.grossBuy)} Cr · Sell ₹
              {fmtCr(data.todayFlow.dii.grossSell)} Cr
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Date</th>
              <th className="text-right px-3 py-2 font-medium">FII net ₹Cr</th>
              <th className="text-right px-3 py-2 font-medium">DII net ₹Cr</th>
              <th className="px-3 py-2 font-medium">FII flow</th>
              <th className="px-3 py-2 font-medium">DII flow</th>
            </tr>
          </thead>
          <tbody>
            {data.flows.map((d) => (
              <tr key={d.date} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-3 py-1.5 font-mono">{d.date}</td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                    d.fii.net > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : d.fii.net < 0
                      ? "text-rose-700 dark:text-rose-400"
                      : ""
                  }`}
                >
                  {sign(d.fii.net)}
                  {fmtCr(Math.abs(d.fii.net))}
                </td>
                <td
                  className={`px-3 py-1.5 text-right tabular-nums font-semibold ${
                    d.dii.net > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : d.dii.net < 0
                      ? "text-rose-700 dark:text-rose-400"
                      : ""
                  }`}
                >
                  {sign(d.dii.net)}
                  {fmtCr(Math.abs(d.dii.net))}
                </td>
                <td className="px-3 py-1.5">
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${
                        d.fii.net >= 0 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{
                        width: `${(Math.abs(d.fii.net) / max) * 50}%`,
                        left: d.fii.net >= 0 ? "50%" : `${50 - (Math.abs(d.fii.net) / max) * 50}%`,
                      }}
                    />
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded relative overflow-hidden">
                    <div
                      className={`absolute top-0 h-full ${
                        d.dii.net >= 0 ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                      style={{
                        width: `${(Math.abs(d.dii.net) / max) * 50}%`,
                        left: d.dii.net >= 0 ? "50%" : `${50 - (Math.abs(d.dii.net) / max) * 50}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("big-movers");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/fii-today", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setData(d);
      setLastFetch(new Date());
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">FII Radar</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Daily FII/FPI activity in India — aggregate flows plus stock-level
                signals from NSE bulk & block deals.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {data && (
                <span className="text-xs text-zinc-500">
                  Trading day: <span className="font-mono">{data.asOf}</span>
                  {lastFetch && (
                    <>
                      {" · "}updated {lastFetch.toLocaleTimeString()}
                    </>
                  )}
                </span>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded-md bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>
        </header>

        {err && (
          <div className="mb-4 p-3 rounded-md bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-200 text-sm">
            {err}
          </div>
        )}

        {data && data.sources.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            {data.sources.map((s) => (
              <span
                key={s.name}
                className={`px-2 py-1 rounded-full border ${
                  s.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                    : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-200"
                }`}
              >
                {s.ok ? "✓" : "✗"} {s.name} {s.note && `· ${s.note}`}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-1 mb-4 border-b border-zinc-200 dark:border-zinc-800">
          {([
            { k: "big-movers", label: "Big movers" },
            { k: "fii-stocks", label: "FII-tagged stocks" },
            { k: "all-deals", label: "All deals" },
            { k: "flows", label: "Daily flows" },
          ] as const).map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px ${
                tab === t.k
                  ? "border-zinc-900 dark:border-white font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!data && loading && (
          <div className="text-zinc-500 text-sm">Loading…</div>
        )}
        {data && tab === "big-movers" && <BigMovers data={data} />}
        {data && tab === "fii-stocks" && <FiiStocks data={data} />}
        {data && tab === "all-deals" && <AllDeals data={data} />}
        {data && tab === "flows" && <Flows data={data} />}

        <footer className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 space-y-2">
          <p>
            Data sources: NSE Archives (bulk.csv / block.csv) for disclosed
            bulk and block deals, and Groww&apos;s API for aggregate daily FII/DII
            cash flows. NSE Archives always serves the most recent trading day.
          </p>
          <p>
            FII tagging is heuristic — based on a curated list of ~40 known
            foreign institutional patterns (sovereign wealth funds, global asset
            managers, foreign custodian banks). It&apos;s an approximation, not an
            official T+0 blotter. Use as a starting point, not as a trading
            signal on its own.
          </p>
        </footer>
      </div>
    </div>
  );
}