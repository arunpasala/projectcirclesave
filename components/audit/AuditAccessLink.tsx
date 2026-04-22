"use client";

import Link from "next/link";

export default function AuditAccessLink({
  isAdmin,
  isOwner,
  circleId,
}: {
  isAdmin: boolean;
  isOwner: boolean;
  circleId: number;
}) {
  if (!isAdmin && !isOwner) return null;

  return (
    <Link
      href={`/dashboard/admin/audit?circle_id=${circleId}`}
      className="rounded-xl px-3 py-2 text-xs font-semibold text-white"
      style={{
        background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
      }}
    >
      Audit Logs
    </Link>
  );
}