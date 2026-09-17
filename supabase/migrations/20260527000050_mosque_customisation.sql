-- Extend mosque_branding with contact info, welcome message, and custom app name.
alter table mosque_branding
  add column if not exists app_name         text,
  add column if not exists welcome_message  text,
  add column if not exists contact_address  text,
  add column if not exists contact_phone    text,
  add column if not exists contact_email    text,
  add column if not exists contact_website  text;

comment on column mosque_branding.app_name        is 'Replaces "Mekteb" in sidebar brand. Null → default name.';
comment on column mosque_branding.welcome_message is 'Shown on parent/student dashboards above the default greeting.';
comment on column mosque_branding.contact_address is 'Street address shown to parents and students.';
comment on column mosque_branding.contact_phone   is 'Phone number shown to parents and students.';
comment on column mosque_branding.contact_email   is 'Contact email shown to parents and students.';
comment on column mosque_branding.contact_website is 'Website URL shown to parents and students.';
