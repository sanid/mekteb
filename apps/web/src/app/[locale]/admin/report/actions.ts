"use server";

import { getLocale } from "next-intl/server";

import { requireAdmin } from "@/lib/auth";
import { getMosqueConfig } from "@/lib/mosque-config";
import { writeAuditLog } from "@/lib/audit";
import { sendReportCardsForMosque, type SendSummary } from "@/lib/report-card";

export async function emailReportCardsAction(
  force: boolean,
): Promise<{ error: string } | ({ ok: true } & SendSummary)> {
  const ctx = await requireAdmin();
  const locale = await getLocale();
  const { schoolYearStart: since } = await getMosqueConfig(ctx.mosqueId);

  const summary = await sendReportCardsForMosque(ctx.mosqueId, since, locale, { force });

  await writeAuditLog({
    mosqueId: ctx.mosqueId,
    actorUserId: ctx.userId,
    action: "report.cards_emailed",
    targetTable: "report_card_sends",
    targetId: null,
    metadata: { ...summary, force },
  });

  return { ok: true, ...summary };
}
