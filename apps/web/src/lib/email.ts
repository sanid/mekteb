import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey && process.env.NODE_ENV === "production") {
  throw new Error("RESEND_API_KEY is not set");
}
export const resend = new Resend(apiKey ?? "re_dummy");

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Mekteb <onboarding@resend.dev>";

type SupportedLocale = "de" | "en" | "bs" | "tr";

const GDPR_TRANSLATIONS: Record<SupportedLocale, {
  subject: (name: string) => string;
  heading: string;
  intro: string;
  summaryTitle: string;
  labelName: string;
  labelSlug: string;
  labelDeletedAt: string;
  labelDatabase: string;
  labelDatabaseValue: string;
  labelStorage: (n: number) => string;
  labelPayment: (deleted: boolean) => string;
  labelAuth: string;
  labelAuthValue: string;
  whatDeleted: string;
  keepEmail: string;
  reference: string;
}> = {
  de: {
    subject: (n) => `Datenlöschung bestätigt — ${n}`,
    heading: "Ihre Daten wurden gelöscht",
    intro: "Diese E-Mail bestätigt, dass alle mit Ihrem Mekteb-Konto verbundenen Daten gemäß DSGVO Artikel 17 (Recht auf Löschung) dauerhaft gelöscht wurden.",
    summaryTitle: "Löschzusammenfassung",
    labelName: "Moschee",
    labelSlug: "Kürzel",
    labelDeletedAt: "Gelöscht am",
    labelDatabase: "Datenbankeinträge",
    labelDatabaseValue: "Alle Einträge dauerhaft gelöscht",
    labelStorage: (n) => `${n} Datei${n !== 1 ? "en" : ""} gelöscht`,
    labelPayment: (d) => d ? "Stripe-Kunde gelöscht" : "Keine aktiven Zahlungsdaten",
    labelAuth: "Benutzerkonten",
    labelAuthValue: "Alle Konten entfernt",
    whatDeleted: "Was gelöscht wurde: alle Schüler-, Lehrer- und Elternprofile; Gruppen; Lektionen und Anhänge; Hausaufgaben; Anwesenheitserfassungen; Prüfungen; Nachrichten; Ankündigungen und alle Audit-Protokolle.",
    keepEmail: "Bitte bewahren Sie diese E-Mail als Nachweis der Löschung auf. Bei Fragen antworten Sie auf diese E-Mail.",
    reference: "Referenz",
  },
  en: {
    subject: (n) => `Data deletion confirmed — ${n}`,
    heading: "Your data has been deleted",
    intro: "This email confirms that all data associated with your Mekteb account has been permanently deleted in accordance with GDPR Article 17 (Right to Erasure).",
    summaryTitle: "Deletion summary",
    labelName: "Mosque name",
    labelSlug: "Account slug",
    labelDeletedAt: "Deleted at",
    labelDatabase: "Database records",
    labelDatabaseValue: "All records permanently deleted",
    labelStorage: (n) => `${n} file${n !== 1 ? "s" : ""} deleted`,
    labelPayment: (d) => d ? "Stripe customer deleted" : "No active payment data",
    labelAuth: "Auth accounts",
    labelAuthValue: "All user accounts removed",
    whatDeleted: "What was deleted: all student, teacher, and parent profiles; groups; lessons and attachments; homework; attendance records; exam sessions; messages; announcements; and all associated audit logs.",
    keepEmail: "Please retain this email as your proof of erasure. If you have any questions, reply to this email.",
    reference: "Reference",
  },
  bs: {
    subject: (n) => `Brisanje podataka potvrđeno — ${n}`,
    heading: "Vaši podaci su obrisani",
    intro: "Ova e-pošta potvrđuje da su svi podaci povezani s vašim Mekteb nalogom trajno obrisani u skladu s GDPR članom 17 (Pravo na brisanje).",
    summaryTitle: "Sažetak brisanja",
    labelName: "Džamija",
    labelSlug: "Kratki naziv",
    labelDeletedAt: "Obrisano",
    labelDatabase: "Zapisi u bazi",
    labelDatabaseValue: "Svi zapisi trajno obrisani",
    labelStorage: (n) => `${n} datoteka obrisana`,
    labelPayment: (d) => d ? "Stripe klijent obrisan" : "Nema aktivnih podataka o plaćanju",
    labelAuth: "Korisnički nalozi",
    labelAuthValue: "Svi nalozi uklonjeni",
    whatDeleted: "Što je obrisano: svi profili učenika, nastavnika i roditelja; grupe; lekcije i prilozi; domaće zadaće; evidencije prisustva; ispitne sesije; poruke; obavještenja i svi audit zapisi.",
    keepEmail: "Molimo sačuvajte ovu e-poštu kao dokaz o brisanju. Za pitanja odgovorite na ovu e-poštu.",
    reference: "Referenca",
  },
  tr: {
    subject: (n) => `Veri silme onaylandı — ${n}`,
    heading: "Verileriniz silindi",
    intro: "Bu e-posta, Mekteb hesabınızla ilişkili tüm verilerin KVKK Madde 17 (Silinme Hakkı) uyarınca kalıcı olarak silindiğini onaylar.",
    summaryTitle: "Silme özeti",
    labelName: "Cami adı",
    labelSlug: "Hesap kimliği",
    labelDeletedAt: "Silinme tarihi",
    labelDatabase: "Veritabanı kayıtları",
    labelDatabaseValue: "Tüm kayıtlar kalıcı olarak silindi",
    labelStorage: (n) => `${n} dosya silindi`,
    labelPayment: (d) => d ? "Stripe müşterisi silindi" : "Aktif ödeme verisi yok",
    labelAuth: "Kullanıcı hesapları",
    labelAuthValue: "Tüm hesaplar kaldırıldı",
    whatDeleted: "Silinenler: tüm öğrenci, öğretmen ve veli profilleri; gruplar; dersler ve ekler; ödevler; yoklama kayıtları; sınav oturumları; mesajlar; duyurular ve tüm denetim günlükleri.",
    keepEmail: "Bu e-postayı silme kanıtı olarak saklayın. Sorularınız için bu e-postaya yanıt verin.",
    reference: "Referans",
  },
};

export async function sendGdprDeletionConfirmation({
  to,
  mosqueName,
  mosqueSlug,
  locale,
  deletedAt,
  storageFilesDeleted,
  stripeCustomerDeleted,
}: {
  to: string;
  mosqueName: string;
  mosqueSlug: string;
  locale: string;
  deletedAt: Date;
  storageFilesDeleted: number;
  stripeCustomerDeleted: boolean;
}) {
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "en") as SupportedLocale;
  const tx = GDPR_TRANSLATIONS[lang];
  const dateStr = deletedAt.toUTCString();

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: tx.subject(mosqueName),
    html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <tr><td style="background:#16a34a;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Mekteb</p>
        </td></tr>

        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 8px;font-size:22px;color:#111827;">${tx.heading}</h1>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${tx.intro}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.05em;">${tx.summaryTitle}</p>
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#374151;">
                <tr><td style="color:#6b7280;width:180px;">${tx.labelName}</td><td><strong>${mosqueName}</strong></td></tr>
                <tr><td style="color:#6b7280;">${tx.labelSlug}</td><td><code style="background:#e5e7eb;padding:1px 6px;border-radius:4px;font-size:13px;">${mosqueSlug}</code></td></tr>
                <tr><td style="color:#6b7280;">${tx.labelDeletedAt}</td><td>${dateStr}</td></tr>
                <tr><td style="color:#6b7280;">${tx.labelDatabase}</td><td>${tx.labelDatabaseValue}</td></tr>
                <tr><td style="color:#6b7280;">Storage</td><td>${tx.labelStorage(storageFilesDeleted)}</td></tr>
                <tr><td style="color:#6b7280;">${tx.labelPayment(false).split(" ")[0]}</td><td>${tx.labelPayment(stripeCustomerDeleted)}</td></tr>
                <tr><td style="color:#6b7280;">${tx.labelAuth}</td><td>${tx.labelAuthValue}</td></tr>
              </table>
            </td></tr>
          </table>

          <p style="margin:0 0 16px;color:#374151;font-size:14px;">${tx.whatDeleted}</p>
          <p style="margin:0 0 24px;color:#374151;font-size:14px;">${tx.keepEmail}</p>

          <p style="margin:0;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;padding-top:20px;">
            ${tx.reference}: ${mosqueSlug} · ${dateStr}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Onboarding welcome email ───────────────────────────────────────────────

const ONBOARDING_TRANSLATIONS: Record<SupportedLocale, {
  subject: (mosqueName: string) => string;
  heading: (mosqueName: string) => string;
  intro: string;
  loginLabel: string;
  loginCta: string;
  nextStepsTitle: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  helpText: string;
  helpCta: string;
  footer: string;
}> = {
  de: {
    subject: (n) => `Willkommen bei Mekteb — ${n} ist bereit 🕌`,
    heading: (n) => `${n} ist jetzt live`,
    intro: "Ihr Konto wurde erfolgreich eingerichtet. Sie können sich jetzt anmelden und Ihren Unterricht verwalten.",
    loginLabel: "Ihre Anmeldeadresse",
    loginCta: "Jetzt anmelden",
    nextStepsTitle: "Erste Schritte",
    step1: "Lehrer einladen und Gruppen anlegen",
    step2: "Schüler hinzufügen und Eltern verknüpfen",
    step3: "Lektionen und Hausaufgaben erstellen",
    step4: "Anwesenheit erfassen und Prüfungen durchführen",
    helpText: "Bei Fragen stehen wir Ihnen gerne zur Verfügung.",
    helpCta: "Support kontaktieren",
    footer: "Sie erhalten diese E-Mail, weil Sie ein Mekteb-Konto erstellt haben.",
  },
  en: {
    subject: (n) => `Welcome to Mekteb — ${n} is ready 🕌`,
    heading: (n) => `${n} is now live`,
    intro: "Your account has been set up successfully. You can now sign in and start managing your education programme.",
    loginLabel: "Your login address",
    loginCta: "Sign in now",
    nextStepsTitle: "Getting started",
    step1: "Invite teachers and create groups",
    step2: "Add students and link parents",
    step3: "Create lessons and assign homework",
    step4: "Take attendance and run exams",
    helpText: "If you have any questions, we're here to help.",
    helpCta: "Contact support",
    footer: "You're receiving this because you created a Mekteb account.",
  },
  bs: {
    subject: (n) => `Dobrodošli u Mekteb — ${n} je spreman 🕌`,
    heading: (n) => `${n} je sada aktivan`,
    intro: "Vaš nalog je uspješno postavljen. Možete se prijaviti i početi upravljati svojim obrazovnim programom.",
    loginLabel: "Vaša adresa za prijavu",
    loginCta: "Prijavite se odmah",
    nextStepsTitle: "Početak rada",
    step1: "Pozovite nastavnike i kreirajte grupe",
    step2: "Dodajte učenike i povežite roditelje",
    step3: "Kreirajte lekcije i dodijelite domaće zadatke",
    step4: "Vodite prisustvo i provodite ispite",
    helpText: "Ako imate pitanja, tu smo da pomognemo.",
    helpCta: "Kontaktirajte podršku",
    footer: "Ovu e-poštu primate jer ste kreirali Mekteb nalog.",
  },
  tr: {
    subject: (n) => `Mekteb'e hoş geldiniz — ${n} hazır 🕌`,
    heading: (n) => `${n} artık aktif`,
    intro: "Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilir ve eğitim programınızı yönetmeye başlayabilirsiniz.",
    loginLabel: "Giriş adresiniz",
    loginCta: "Şimdi giriş yapın",
    nextStepsTitle: "Başlarken",
    step1: "Öğretmen davet edin ve gruplar oluşturun",
    step2: "Öğrenci ekleyin ve veli bağlantısı kurun",
    step3: "Ders ve ödev oluşturun",
    step4: "Yoklama alın ve sınavlar yapın",
    helpText: "Sorularınız varsa yardımcı olmaktan memnuniyet duyarız.",
    helpCta: "Destek ile iletişime geçin",
    footer: "Bir Mekteb hesabı oluşturduğunuz için bu e-postayı alıyorsunuz.",
  },
};

export async function sendOnboardingEmail({
  to,
  mosqueName,
  mosqueSlug,
  locale,
}: {
  to: string;
  mosqueName: string;
  mosqueSlug: string;
  locale: string;
}) {
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "de") as SupportedLocale;
  const tx = ONBOARDING_TRANSLATIONS[lang];
  const rootDomain = process.env.ROOT_DOMAIN ?? "mekteb.de";
  const loginUrl = `https://${rootDomain}/${lang}/login`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: tx.subject(mosqueName),
    html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:560px;">

        <tr><td style="background:#16a34a;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🕌 Mekteb</p>
        </td></tr>

        <tr><td style="padding:36px 40px 24px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">${tx.heading(mosqueName)}</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">${tx.intro}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:.06em;">${tx.loginLabel}</p>
              <p style="margin:0 0 16px;font-size:15px;color:#111827;word-break:break-all;">${loginUrl}</p>
              <a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${tx.loginCta} →</a>
            </td></tr>
          </table>

          <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:.05em;">${tx.nextStepsTitle}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            ${[tx.step1, tx.step2, tx.step3, tx.step4].map((step, i) => `
            <tr>
              <td style="padding:8px 0;vertical-align:top;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:28px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-flex;width:20px;height:20px;border-radius:50%;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;text-align:center;line-height:20px;justify-content:center;align-items:center;">${i + 1}</span>
                    </td>
                    <td style="font-size:14px;color:#374151;line-height:1.5;">${step}</td>
                  </tr>
                </table>
              </td>
            </tr>`).join("")}
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;padding-top:24px;margin-top:4px;">
            <tr><td style="padding-top:24px;">
              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${tx.helpText}</p>
              <a href="mailto:support@mekteb.de" style="font-size:14px;color:#16a34a;font-weight:600;text-decoration:none;">${tx.helpCta}</a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${tx.footer}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Admin appointed notification ───────────────────────────────────────────

const ADMIN_APPOINTED_TRANSLATIONS: Record<SupportedLocale, {
  subject: (mosqueName: string) => string;
  heading: (mosqueName: string) => string;
  intro: (mosqueName: string) => string;
  loginLabel: string;
  loginCta: string;
  helpText: string;
  footer: string;
}> = {
  de: {
    subject: (n) => `Sie wurden als Administrator hinzugefügt — ${n}`,
    heading: (n) => `Sie sind jetzt Administrator von ${n}`,
    intro: (n) => `Sie wurden zu ${n} auf Mekteb als Administrator hinzugefügt. Sie können sich jetzt anmelden und die Moschee verwalten.`,
    loginLabel: "Ihre Anmeldeadresse",
    loginCta: "Jetzt anmelden",
    helpText: "Falls Sie diese Änderung nicht erwartet haben, kontaktieren Sie bitte den bestehenden Administrator Ihrer Moschee.",
    footer: "Sie erhalten diese E-Mail, weil Sie als Administrator zu einer Moschee auf Mekteb hinzugefügt wurden.",
  },
  en: {
    subject: (n) => `You've been added as an administrator — ${n}`,
    heading: (n) => `You're now an administrator of ${n}`,
    intro: (n) => `You've been added to ${n} on Mekteb as an administrator. You can now sign in and manage the mosque.`,
    loginLabel: "Your login address",
    loginCta: "Sign in now",
    helpText: "If you weren't expecting this change, please contact your mosque's existing administrator.",
    footer: "You're receiving this because you were added as an administrator to a mosque on Mekteb.",
  },
  bs: {
    subject: (n) => `Dodani ste kao administrator — ${n}`,
    heading: (n) => `Sada ste administrator za ${n}`,
    intro: (n) => `Dodani ste u ${n} na Mektebu kao administrator. Sada se možete prijaviti i upravljati džamijom.`,
    loginLabel: "Vaša adresa za prijavu",
    loginCta: "Prijavite se odmah",
    helpText: "Ako ovu promjenu niste očekivali, kontaktirajte postojećeg administratora vaše džamije.",
    footer: "Ovu e-poštu primate jer ste dodani kao administrator džamije na Mektebu.",
  },
  tr: {
    subject: (n) => `Yönetici olarak eklendiniz — ${n}`,
    heading: (n) => `Artık ${n} için bir yöneticisiniz`,
    intro: (n) => `Mekteb'de ${n} camisine yönetici olarak eklendiniz. Şimdi giriş yapabilir ve camiyi yönetebilirsiniz.`,
    loginLabel: "Giriş adresiniz",
    loginCta: "Şimdi giriş yapın",
    helpText: "Bu değişikliği beklemiyorsanız, lütfen caminizin mevcut yöneticisiyle iletişime geçin.",
    footer: "Mekteb'de bir camiye yönetici olarak eklendiğiniz için bu e-postayı alıyorsunuz.",
  },
};

export async function sendAdminAppointedEmail({
  to,
  mosqueName,
  locale,
}: {
  to: string;
  mosqueName: string;
  locale: string;
}) {
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "de") as SupportedLocale;
  const tx = ADMIN_APPOINTED_TRANSLATIONS[lang];
  const rootDomain = process.env.ROOT_DOMAIN ?? "mekteb.de";
  const loginUrl = `https://${rootDomain}/${lang}/login`;

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: tx.subject(mosqueName),
    html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:560px;">

        <tr><td style="background:#16a34a;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🕌 Mekteb</p>
        </td></tr>

        <tr><td style="padding:36px 40px 24px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">${tx.heading(mosqueName)}</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">${tx.intro(mosqueName)}</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-bottom:28px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#15803d;text-transform:uppercase;letter-spacing:.06em;">${tx.loginLabel}</p>
              <p style="margin:0 0 16px;font-size:15px;color:#111827;word-break:break-all;">${loginUrl}</p>
              <a href="${loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;">${tx.loginCta} →</a>
            </td></tr>
          </table>

          <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">${tx.helpText}</p>
        </td></tr>

        <tr><td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${tx.footer}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Report card email ──────────────────────────────────────────────────────

const REPORT_CARD_TRANSLATIONS: Record<SupportedLocale, {
  subject: (child: string) => string;
  heading: string;
  intro: (child: string, mosque: string) => string;
  attached: string;
  footer: string;
}> = {
  de: {
    subject: (c) => `Zeugnis für ${c}`,
    heading: "Zeugnis verfügbar",
    intro: (c, m) => `Anbei finden Sie das aktuelle Zeugnis für ${c} von ${m}.`,
    attached: "Das Zeugnis ist als PDF angehängt.",
    footer: "Sie erhalten diese E-Mail, weil Ihr Kind in einer Moschee auf Mekteb angemeldet ist.",
  },
  en: {
    subject: (c) => `Report card for ${c}`,
    heading: "Report card available",
    intro: (c, m) => `Please find attached the latest report card for ${c} from ${m}.`,
    attached: "The report card is attached as a PDF.",
    footer: "You're receiving this because your child is enrolled at a mosque on Mekteb.",
  },
  bs: {
    subject: (c) => `Svjedodžba za ${c}`,
    heading: "Svjedodžba dostupna",
    intro: (c, m) => `U prilogu se nalazi najnovija svjedodžba za ${c} iz ${m}.`,
    attached: "Svjedodžba je priložena kao PDF.",
    footer: "Ovu e-poštu primate jer je vaše dijete upisano u džamiju na Mektebu.",
  },
  tr: {
    subject: (c) => `${c} için karne`,
    heading: "Karne hazır",
    intro: (c, m) => `${m} tarafından ${c} için en son karne ektedir.`,
    attached: "Karne PDF olarak eklenmiştir.",
    footer: "Çocuğunuz Mekteb'deki bir camiye kayıtlı olduğu için bu e-postayı alıyorsunuz.",
  },
};

export async function sendReportCardEmail({
  to,
  childName,
  mosqueName,
  locale,
  pdf,
}: {
  to: string;
  childName: string;
  mosqueName: string;
  locale: string;
  pdf: Buffer;
}) {
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "de") as SupportedLocale;
  const tx = REPORT_CARD_TRANSLATIONS[lang];

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: tx.subject(childName),
    attachments: [{ filename: `report-card-${childName.replace(/\s+/g, "-")}.pdf`, content: pdf.toString("base64") }],
    html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:560px;">
        <tr><td style="background:#16a34a;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🕌 ${mosqueName}</p>
        </td></tr>
        <tr><td style="padding:36px 40px 28px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#111827;">${tx.heading}</h1>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${tx.intro(childName, mosqueName)}</p>
          <p style="margin:0;color:#6b7280;font-size:14px;">${tx.attached}</p>
        </td></tr>
        <tr><td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${tx.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ── Password reset email ───────────────────────────────────────────────────

const RESET_TRANSLATIONS: Record<SupportedLocale, {
  subject: string;
  heading: string;
  intro: string;
  ctaLabel: string;
  expiry: string;
  ignore: string;
  footer: string;
}> = {
  de: {
    subject: "Passwort zurücksetzen — Mekteb",
    heading: "Passwort zurücksetzen",
    intro: "Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts gestellt. Klicken Sie auf den Button, um ein neues Passwort zu erstellen.",
    ctaLabel: "Passwort zurücksetzen",
    expiry: "Dieser Link ist 1 Stunde gültig.",
    ignore: "Falls Sie kein neues Passwort angefordert haben, können Sie diese E-Mail ignorieren.",
    footer: "Sie erhalten diese E-Mail, weil eine Passwort-Zurücksetzen-Anfrage für Ihr Mekteb-Konto gestellt wurde.",
  },
  en: {
    subject: "Reset your password — Mekteb",
    heading: "Reset your password",
    intro: "You requested a password reset for your Mekteb account. Click the button below to set a new password.",
    ctaLabel: "Reset password",
    expiry: "This link expires in 1 hour.",
    ignore: "If you didn't request this, you can safely ignore this email.",
    footer: "You're receiving this because a password reset was requested for your Mekteb account.",
  },
  bs: {
    subject: "Resetovanje lozinke — Mekteb",
    heading: "Resetujte svoju lozinku",
    intro: "Zatražili ste resetovanje lozinke za vaš Mekteb nalog. Kliknite na dugme ispod da postavite novu lozinku.",
    ctaLabel: "Resetuj lozinku",
    expiry: "Ovaj link ističe za 1 sat.",
    ignore: "Ako niste tražili ovo, možete sigurno ignorisati ovu e-poštu.",
    footer: "Ovu e-poštu primate jer je zatraženo resetovanje lozinke za vaš Mekteb nalog.",
  },
  tr: {
    subject: "Şifrenizi sıfırlayın — Mekteb",
    heading: "Şifrenizi sıfırlayın",
    intro: "Mekteb hesabınız için şifre sıfırlama talebinde bulundunuz. Yeni bir şifre belirlemek için aşağıdaki düğmeye tıklayın.",
    ctaLabel: "Şifreyi sıfırla",
    expiry: "Bu bağlantı 1 saat içinde geçerliliğini yitirir.",
    ignore: "Eğer bu talebi siz yapmadıysanız, bu e-postayı güvenle görmezden gelebilirsiniz.",
    footer: "Mekteb hesabınız için şifre sıfırlama talebinde bulunulduğu için bu e-postayı alıyorsunuz.",
  },
};

export async function sendPasswordResetEmail({
  to,
  resetLink,
  locale,
}: {
  to: string;
  resetLink: string;
  locale: string;
}) {
  const lang = (["de", "en", "bs", "tr"].includes(locale) ? locale : "de") as SupportedLocale;
  const tx = RESET_TRANSLATIONS[lang];

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject: tx.subject,
    html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:560px;">

        <tr><td style="background:#16a34a;padding:28px 40px;">
          <p style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">🕌 Mekteb</p>
        </td></tr>

        <tr><td style="padding:36px 40px 32px;">
          <div style="margin-bottom:24px;width:48px;height:48px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">🔑</span>
          </div>

          <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#111827;">${tx.heading}</h1>
          <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">${tx.intro}</p>

          <a href="${resetLink}"
             style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;margin-bottom:24px;">
            ${tx.ctaLabel} →
          </a>

          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">${tx.expiry}</p>
          <p style="margin:0 0 28px;color:#9ca3af;font-size:13px;">${tx.ignore}</p>

          <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
            <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
              ${resetLink}
            </p>
          </div>
        </td></tr>

        <tr><td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${tx.footer}</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
