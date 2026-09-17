import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ClipboardList, FileText, Shield, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getActivePlugins } from "@/lib/plugins";
import { ActionForm } from "@/components/ActionForm";
import { ColorPicker } from "../ColorPicker";
import { SubmitButton } from "@/components/SubmitButton";
import { saveBranding, saveMosqueInfo, saveCustomisation, uploadLogo, savePrayerSettings } from "../actions";
import { DeleteAccountSection } from "../DeleteAccountSection";
import { PRAYER_METHODS } from "@/lib/prayer-times";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
const LOCALES = ["de", "en", "bs", "tr"] as const;
const GERMAN_STATES = [
  "Baden-Württemberg","Bayern","Berlin","Brandenburg","Bremen","Hamburg","Hessen",
  "Mecklenburg-Vorpommern","Niedersachsen","Nordrhein-Westfalen","Rheinland-Pfalz",
  "Saarland","Sachsen","Sachsen-Anhalt","Schleswig-Holstein","Thüringen",
];
const TIMEZONES = [
  "Europe/Berlin","Europe/Vienna","Europe/Zurich","Europe/London","Europe/Istanbul",
  "Europe/Sarajevo","America/New_York","America/Chicago","America/Los_Angeles",
  "Asia/Dubai","Asia/Riyadh","Africa/Cairo",
] as const;

const field = "mt-1 block w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm transition-colors focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20";

export async function GeneralTab() {
  const ctx = await requireAdmin();
  const supabase = await createClient();
  const t = await getTranslations("Admin");

  const [{ data: mosque }, { data: branding }, activePlugins] = await Promise.all([
    supabase.from("mosques").select("*").eq("id", ctx.mosqueId).single(),
    supabase.from("mosque_branding").select("primary_color, secondary_color, logo_url, logo_width, show_text_logo, app_name, welcome_message, contact_address, contact_phone, contact_email, contact_website").eq("mosque_id", ctx.mosqueId).maybeSingle(),
    getActivePlugins(ctx.mosqueId),
  ]);

  const complianceLinks = [
    { href: "/admin/audit", icon: <ClipboardList className="h-4 w-4" />, label: t("auditLog") },
    ...(activePlugins.has("annual_report") ? [{ href: "/admin/report", icon: <FileText className="h-4 w-4" />, label: t("annualReport") }] : []),
    { href: "/admin/security", icon: <Shield className="h-4 w-4" />, label: t("security") },
  ];

  return (
    <div className="space-y-8 max-w-2xl pt-6">
      {/* Mosque info */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("mosqueInfo")}</h2>
        <ActionForm action={saveMosqueInfo} successMessage={t("settingsSaved")} resetOnSuccess={false} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
          <label className="block"><span className="text-sm font-medium">{t("mosqueName")}</span><input name="name" required defaultValue={mosque?.name ?? ""} className={field} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-sm font-medium">{t("locale")}</span>
              <select name="locale" defaultValue={mosque?.locale ?? "de"} className={field}>{LOCALES.map((l) => <option key={l} value={l}>{l}</option>)}</select>
            </label>
            <label className="block"><span className="text-sm font-medium">{t("timezone")}</span>
              <select name="timezone" defaultValue={mosque?.timezone ?? "Europe/Berlin"} className={field}>{TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}</select>
            </label>
          </div>
          <label className="block"><span className="text-sm font-medium">{t("schoolYearStart")}</span>
            <input type="date" name="school_year_start" defaultValue={mosque?.school_year_start ?? ""} className={field} />
            <span className="text-xs text-muted mt-1 block">{t("schoolYearStartHint")}</span>
          </label>
          <label className="block"><span className="text-sm font-medium">{t("bundesland")}</span>
            <select name="state" defaultValue={(mosque as { state?: string | null } | null)?.state ?? "Berlin"} className={field}>{GERMAN_STATES.map((st) => <option key={st} value={st}>{st}</option>)}</select>
            <span className="text-xs text-muted mt-1 block">{t("bundeslandHint")}</span>
          </label>
          <div className="text-xs text-muted font-mono">{t("slug")}: {mosque?.slug}</div>
          <SubmitButton className="self-start">{t("save")}</SubmitButton>
        </ActionForm>
      </section>

      {/* Prayer times */}
      {activePlugins.has("prayer_times") && (() => {
        const pm = mosque as { prayer_location?: string | null; prayer_method?: string | null } | null;
        return (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">{t("prayerTimes")}</h2>
            <ActionForm action={savePrayerSettings} successMessage={t("settingsSaved")} resetOnSuccess={false} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
              <p className="text-xs text-muted">{t("prayerTimesHint")}</p>
              <label className="block"><span className="text-sm font-medium">{t("prayerLocation")}</span>
                <input name="prayer_location" defaultValue={pm?.prayer_location ?? ""} placeholder="Berlin, Germany" className={field} />
                <span className="text-xs text-muted mt-1 block">{t("prayerLocationHint")}</span>
              </label>
              <label className="block"><span className="text-sm font-medium">{t("prayerMethod")}</span>
                <select name="prayer_method" defaultValue={pm?.prayer_method ?? "MWL"} className={field}>
                  {PRAYER_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </label>
              <SubmitButton className="self-start">{t("save")}</SubmitButton>
            </ActionForm>
            {pm?.prayer_location && (
              <a
                href="/admin/prayer-times/pdf"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: "outline" }), "self-start")}
              >
                {t("prayerCalendarPdf")}
              </a>
            )}
          </section>
        );
      })()}

      {/* Branding */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("branding")}</h2>
        <ActionForm action={uploadLogo} successMessage={t("logoUploaded")} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
          <span className="text-sm font-medium">{t("logo")}</span>
          {branding?.logo_url ? <Image src={branding.logo_url} alt="Mosque logo" width={120} height={60} className="rounded-lg object-contain bg-surface p-2" unoptimized /> : null}
          <input type="file" name="logo" accept="image/*" className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-accent-hover" />
          <p className="text-xs text-muted">{t("logoNote")}</p>
          <SubmitButton className="self-start">{t("uploadLogo")}</SubmitButton>
        </ActionForm>
        {branding?.logo_url && (
          <ActionForm action={saveBranding} successMessage={t("settingsSaved")} resetOnSuccess={false} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
            <span className="text-sm font-medium">{t("logoOptions")}</span>
            <label className="block"><span className="text-sm font-medium">{t("logoWidth")}</span>
              <select name="logo_width" defaultValue={branding?.logo_width ?? 6} className={field}>
                <option value="4">16px</option><option value="5">20px</option><option value="6">24px</option>
                <option value="8">32px</option><option value="10">40px</option><option value="12">48px</option>
              </select>
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" name="show_text_logo" defaultChecked={branding?.show_text_logo ?? true} value="1" className="rounded border-card-border" /><span className="text-sm">{t("showTextLogo")}</span></label>
            <input type="hidden" name="primary_color" value={branding?.primary_color ?? "#16a34a"} />
            <input type="hidden" name="secondary_color" value={branding?.secondary_color ?? "#064e3b"} />
            <SubmitButton className="self-start">{t("save")}</SubmitButton>
          </ActionForm>
        )}
        <ActionForm action={saveBranding} successMessage={t("settingsSaved")} resetOnSuccess={false} className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorPicker name="primary_color" label={t("primaryColor")} defaultValue={branding?.primary_color ?? "#16a34a"} resetValue="#16a34a" />
            <ColorPicker name="secondary_color" label={t("secondaryColor")} defaultValue={branding?.secondary_color ?? "#064e3b"} resetValue="#064e3b" />
          </div>
          <SubmitButton className="self-start">{t("save")}</SubmitButton>
        </ActionForm>
      </section>

      {/* Customisation */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">{t("customisation")}</h2>
        <ActionForm action={saveCustomisation} successMessage={t("settingsSaved")} resetOnSuccess={false} className="flex flex-col gap-4 rounded-xl border border-card-border bg-card p-5">
          <label className="block"><span className="text-sm font-medium">{t("appName")}</span>
            <input name="app_name" defaultValue={branding?.app_name ?? ""} placeholder="Mekteb" className={field} />
            <span className="text-xs text-muted mt-1 block">{t("appNameHint")}</span>
          </label>
          <label className="block"><span className="text-sm font-medium">{t("welcomeMessage")}</span>
            <textarea name="welcome_message" rows={3} defaultValue={branding?.welcome_message ?? ""} placeholder={t("welcomeMessagePlaceholder")} className={`${field} resize-none`} />
            <span className="text-xs text-muted mt-1 block">{t("welcomeMessageHint")}</span>
          </label>
          <div className="border-t border-card-border pt-4 space-y-3">
            <span className="text-sm font-medium">{t("contactInfo")}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block"><span className="text-xs text-muted">{t("contactAddress")}</span><input name="contact_address" defaultValue={branding?.contact_address ?? ""} placeholder="Musterstraße 1, 10115 Berlin" className={field} /></label>
              <label className="block"><span className="text-xs text-muted">{t("contactPhone")}</span><input name="contact_phone" type="tel" defaultValue={branding?.contact_phone ?? ""} placeholder="+49 30 12345678" className={field} /></label>
              <label className="block"><span className="text-xs text-muted">{t("contactEmail")}</span><input name="contact_email" type="email" defaultValue={branding?.contact_email ?? ""} placeholder="info@moschee.de" className={field} /></label>
              <label className="block"><span className="text-xs text-muted">{t("contactWebsite")}</span><input name="contact_website" type="url" defaultValue={branding?.contact_website ?? ""} placeholder="https://moschee.de" className={field} /></label>
            </div>
          </div>
          <SubmitButton className="self-start">{t("save")}</SubmitButton>
        </ActionForm>
      </section>

      {/* Data export */}
      <section className="space-y-3 border-t border-card-border pt-6">
        <h2 className="text-base font-semibold">{t("dataExport")}</h2>
        <div className="rounded-xl border border-card-border bg-card p-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("dataExportTitle")}</p>
            <p className="text-xs text-muted">{t("dataExportDesc")}</p>
          </div>
          <a
            href="/admin/export"
            download
            className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
          >
            {t("dataExportBtn")}
          </a>
        </div>
      </section>

      {/* Reports & compliance */}
      <section className="space-y-3 border-t border-card-border pt-6">
        <h2 className="text-base font-semibold">{t("reportsAndCompliance")}</h2>
        <div className="rounded-xl border border-card-border bg-card divide-y divide-card-border overflow-hidden">
          {complianceLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent-subtle hover:text-accent"
            >
              <span className="text-muted">{link.icon}</span>
              <span className="flex-1 font-medium">{link.label}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </Link>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 border-t border-card-border pt-6">
        <h2 className="text-base font-semibold text-danger-fg">{t("dangerZone")}</h2>
        <DeleteAccountSection mosqueName={mosque?.name ?? ""} />
      </section>
    </div>
  );
}
