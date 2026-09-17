"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";

type Profile = {
  full_name: string | null;
  display_name: string | null;
  phone: string | null;
};

export default function ProfileSection() {
  const t = useTranslations("Account");
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    display_name: "",
    phone: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, display_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setEmail(user.email ?? "");
      setProfile({
        full_name: data?.full_name ?? "",
        display_name: data?.display_name ?? "",
        phone: data?.phone ?? "",
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name?.trim() || null,
        display_name: profile.display_name?.trim() || null,
        phone: profile.phone?.trim() || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(t("profileSaveError"));
      return;
    }
    toast.success(t("profileSaved"));
  }

  return (
    <section className="rounded-xl border border-card-border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold">{t("profileTitle")}</h2>
        <p className="text-sm text-muted mt-1">{t("profileDesc")}</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-9 rounded-md bg-card-border animate-pulse" />
          <div className="h-9 rounded-md bg-card-border animate-pulse" />
          <div className="h-9 rounded-md bg-card-border animate-pulse" />
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("emailLabel")}</span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-card-border bg-surface px-3 py-2 text-sm text-muted"
            />
            <span className="text-xs text-muted">{t("emailReadOnly")}</span>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("fullNameLabel")}</span>
            <input
              type="text"
              value={profile.full_name ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("displayNameLabel")}</span>
            <input
              type="text"
              value={profile.display_name ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
              placeholder={t("displayNamePlaceholder")}
              className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">{t("phoneLabel")}</span>
            <input
              type="tel"
              value={profile.phone ?? ""}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-card-border bg-background px-3.5 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-3 focus:ring-accent/20"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className={buttonVariants({ size: "xl" })}
          >
            {saving ? t("profileSaving") : t("profileSave")}
          </button>
        </form>
      )}
    </section>
  );
}
