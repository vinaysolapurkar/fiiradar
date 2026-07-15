// app/api/fii-today/route.ts
import { NextResponse } from "next/server";
import { loadDashboard } from "@/lib/fii";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await loadDashboard();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load dashboard", detail: String(err) },
      { status: 500 },
    );
  }
}