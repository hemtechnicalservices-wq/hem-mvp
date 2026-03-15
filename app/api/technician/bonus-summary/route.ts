import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveTechnicianUserId } from "@/lib/technician/server-auth";

function isSameMonth(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isToday(dateText: string | null | undefined) {
  if (!dateText) return false;
  const d = new Date(dateText);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export async function GET(req: NextRequest) {
  const technicianId = await resolveTechnicianUserId(req);
  if (!technicianId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("technician_bonus_ledger")
    .select("id,invoice_id,job_id,invoice_amount,bonus_percent,bonus_amount,bonus_date,created_at")
    .eq("technician_id", technicianId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    const m = (error.message ?? "").toLowerCase();
    const missing =
      m.includes("technician_bonus_ledger") &&
      (m.includes("does not exist") || m.includes("relation") || m.includes("schema cache"));
    if (missing) {
      return NextResponse.json({
        totals: { today: 0, month: 0, total: 0 },
        recent: [],
      });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = data ?? [];
  const today = rows.filter((row) => isToday(row.bonus_date ?? row.created_at)).reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0);
  const month = rows.filter((row) => isSameMonth(row.bonus_date ?? row.created_at)).reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0);
  const total = rows.reduce((sum, row) => sum + Number(row.bonus_amount ?? 0), 0);

  return NextResponse.json({
    totals: {
      today: Number(today.toFixed(2)),
      month: Number(month.toFixed(2)),
      total: Number(total.toFixed(2)),
    },
    recent: rows.slice(0, 10),
  });
}

