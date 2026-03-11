// import { NextRequest, NextResponse } from "next/server";
// import pool from "@/lib/db";
// import { requireUserId } from "@/lib/auth";

// export const runtime = "nodejs";

// export async function GET(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const userId = requireUserId(req);
//     const circleId = Number(params.id);

//     // is user admin?
//     const adminCheck = await pool.query(
//       `SELECT 1 FROM circle_members
//        WHERE circle_id=$1 AND user_id=$2 AND role='ADMIN' AND status='APPROVED'`,
//       [circleId, userId]
//     );
//     const isAdmin = adminCheck.rowCount > 0;

//     const q = isAdmin
//       ? `SELECT cm.id, cm.user_id, cm.role, cm.status, u.email, u.full_name
//          FROM circle_members cm
//          JOIN users u ON u.id=cm.user_id
//          WHERE cm.circle_id=$1
//          ORDER BY cm.role DESC, cm.status ASC, u.full_name NULLS LAST`
//       : `SELECT cm.id, cm.user_id, cm.role, cm.status, u.full_name
//          FROM circle_members cm
//          JOIN users u ON u.id=cm.user_id
//          WHERE cm.circle_id=$1 AND cm.status='APPROVED'
//          ORDER BY u.full_name NULLS LAST`;

//     const res = await pool.query(q, [circleId]);
//     return NextResponse.json({ isAdmin, members: res.rows });
//   } catch (e: any) {
//     return NextResponse.json({ message: e.message || "Unauthorized" }, { status: 401 });
//   }
// }
