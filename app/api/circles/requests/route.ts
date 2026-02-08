import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = requireUser(req);

  const { rows } = await pool.query(`
    SELECT cm.id, cm.circle_id, u.email, u.full_name
    FROM circle_members cm
    JOIN circles c ON c.id = cm.circle_id
    JOIN users u ON u.id = cm.user_id
    WHERE c.owner_id = $1 AND cm.status = 'PENDING'
  `, [user.id]);

  return NextResponse.json({ requests: rows });
}
