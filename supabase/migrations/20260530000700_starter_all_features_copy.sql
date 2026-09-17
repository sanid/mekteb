-- Align plan feature copy: Starter includes all features (only the 50-student cap differs).
-- Growth's bullet list drops the now-redundant "branding"/"exams & diplomas" claims in favor
-- of "everything in Starter" + "priority support".

update public.plans set
  features = '["Up to 50 students","All features included","Email support"]'
where id = 'starter';

update public.plans set
  features = '["Up to 200 students","Everything in Starter","Priority support"]'
where id = 'growth';
