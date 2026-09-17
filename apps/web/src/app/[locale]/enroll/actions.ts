"use server";

import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getMosqueForRequest } from "@/lib/mosque-from-slug";

function clean(v: FormDataEntryValue | null, max: number): string {
  return String(v ?? "").trim().slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public, unauthenticated enrollment request. Validated + rate-limited, then
 * written with the service-role client (no public RLS insert path). Never
 * creates an auth user — an admin provisions the account after approval.
 */
export async function submitEnrollmentRequest(formData: FormData): Promise<void> {
  const locale = await getLocale();
  const base = `/${locale}/enroll`;

  // Resolve the mosque from the subdomain; fall back to the submitted slug.
  const slugFromForm = clean(formData.get("mosque_slug"), 100);
  const admin = createAdminClient();

  let mosque = await getMosqueForRequest();
  if (!mosque && slugFromForm) {
    const { data } = await admin
      .from("mosques")
      .select("id, name, slug")
      .eq("slug", slugFromForm)
      .maybeSingle();
    if (data) mosque = { id: data.id, name: data.name, slug: data.slug };
  }
  if (!mosque) redirect(`${base}?status=error`);

  // Throttle: 3 per IP per hour to deter spam/abuse.
  const limit = await checkRateLimit({
    bucket: "enroll",
    windowMs: 60 * 60 * 1000,
    maxRequests: 3,
    perIpLimit: 10,
    key: slugFromForm,
  });
  if (!limit.allowed) redirect(`${base}?status=throttled`);

  const parentName = clean(formData.get("parent_name"), 120);
  const parentEmail = clean(formData.get("parent_email"), 200).toLowerCase();
  const parentPhone = clean(formData.get("parent_phone"), 40) || null;
  const childName = clean(formData.get("child_name"), 120);
  const message = clean(formData.get("message"), 1000) || null;

  const rawYear = clean(formData.get("child_birth_year"), 4);
  const birthYear = rawYear ? Number(rawYear) : null;

  if (parentName.length < 2 || childName.length < 2 || !EMAIL_RE.test(parentEmail)) {
    redirect(`${base}?status=invalid`);
  }
  if (birthYear !== null && (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > 2100)) {
    redirect(`${base}?status=invalid`);
  }

  const { error } = await admin.from("enrollment_requests").insert({
    mosque_id: mosque.id,
    parent_name: parentName,
    parent_email: parentEmail,
    parent_phone: parentPhone,
    child_name: childName,
    child_birth_year: birthYear,
    message,
  });

  if (error) redirect(`${base}?status=error`);
  redirect(`${base}?status=success`);
}
