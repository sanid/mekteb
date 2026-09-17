-- Raise the Starter plan's student cap from 30 to 50.

update public.plans set
  max_students = 50,
  features     = '["Up to 50 students","Lessons, homework & attendance","Email support"]'
where id = 'starter';
