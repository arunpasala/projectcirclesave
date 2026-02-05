import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const result = await pool.query("SELECT NOW() as now");
  return NextResponse.json({ ok: true, now: result.rows[0].now });
}
