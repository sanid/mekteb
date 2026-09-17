-- Lower the Community plan's price from €89 to €79/mo and add a feature
-- bullet clarifying who the plan is for (organizations running multiple mosques).

update public.plans set
  price_monthly_eur = 7900,
  features = '["Unlimited mosques","Unlimited students","Everything in Growth","Dedicated onboarding & SLA","Built for communities managing multiple mosques"]'
where id = 'community';
