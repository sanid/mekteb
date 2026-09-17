-- Add max_mosques column and update plan pricing/limits
-- Growth: €49→€29, 150→200 students
-- Community: €99→€89, unlimited mosques (new differentiator)

alter table public.plans add column if not exists max_mosques integer; -- null = unlimited

update public.plans set
  price_monthly_eur = 0,
  max_students      = 30,
  max_mosques       = 1,
  features          = '["Up to 30 students","Lessons, homework & attendance","Email support"]'
where id = 'starter';

update public.plans set
  price_monthly_eur = 2900,
  max_students      = 200,
  max_mosques       = 1,
  features          = '["Up to 200 students","Exams & diplomas","Custom branding","Priority support"]'
where id = 'growth';

update public.plans set
  price_monthly_eur = 8900,
  max_students      = null,
  max_mosques       = null,
  features          = '["Unlimited mosques","Unlimited students","Everything in Growth","Dedicated onboarding & SLA"]'
where id = 'community';
