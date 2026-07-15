# FII Radar

Where FIIs/FPI put money to work in India, today.

A small dashboard that combines the daily stock-level signals we *can* see
(NSE bulk & block deals, with FII-name tagging) with the aggregate flows we
*can* see (Groww's FII/DII daily series), to give the most honest
"best-effort approximation" of intraday FII activity available without paid
data terminals.

## What's actually built

- **Big movers tab** (default) — top 30 stocks by total disclosed deal value today, regardless of FII tag
- **FII-tagged stocks tab** — stocks where an FII/FPI-named counterparty appeared in today's bulk/block deals
- **All deals tab** — full raw bulk+block deal table with side badges and FII tags
- **Daily flows tab** — today's FII & DII cash net in big ₹Cr cards, plus 21-day flow history with bidirectional bars

## Stack

- Next.js 16 (App Router, TypeScript, Tailwind v4)
- Node `https` module for data fetching (Next 16's bundled `fetch` was choking on
  one of the upstream sources — see commit history)
- Zero auth, zero database, zero backend

## Data sources (all free, no auth)

- **NSE Archives** `https://archives.nseindia.com/content/equities/{bulk,block}.csv` — disclosed bulk and block deals (always serves the most recent trading day)
- **Groww** `https://groww.in/v1/api/search/v3/query/fii_dii/st_fii_dii` — daily cash-market FII/DII gross buy / gross sell / net (21 trading days)

## FII tagging

Heuristic, not authoritative. ~40 known patterns covering:
- Sovereign wealth funds (Norges Bank, GIC, ADIA, Temasek, Mubadala, KIA, QIA, PIF)
- Global asset managers (BlackRock, Vanguard, Fidelity, Capital Group, Schroders, PIMCO, Wellington)
- Foreign custodian banks (JPM, GS, Citi, BNP, UBS, Deutsche, HSBC, StanChart, Barclays, Nomura, Mizuho, MUFG, Sumitomo)
- US-listed foreign parents of Indian subsidiaries (Mylan/Viatris → Biocon, etc.)

This catches most large disclosed FII deals but is not a complete intraday
blotter — most FII volume trades via normal exchange orders and never appears
in bulk/block disclosures.

## Caveats

- NSE archives serve the latest trading day only — no historical via this endpoint
- Groww's endpoint returns 21 days; freshness depends on their cache
- "FII tagging" surfaces large disclosed deals with foreign counterparty names;
  it does not reflect actual position changes for those funds (custody-side)

## Local dev

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

## Deploy

Standard Next.js. Any host that supports Next.js 16 App Router:

- **Vercel** — `vercel deploy --prod`
- **Cloudflare Pages** — needs the `@cloudflare/next-on-pages` adapter
- **Any Node host** — `pnpm build && pnpm start`

API route at `/api/fii-today` returns the full dashboard JSON.