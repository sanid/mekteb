-- Data cleanup: Berlin had two `Sommerferien 2026` rows.
--
-- The migration `20260526000000_teaching_sessions.sql` seeded the correct
-- range (16.07–28.08, the official Berlin 2026 summer holidays); the seed
-- files (`seed.sql`, `seed_holidays.sql`) additionally inserted 09.07–22.08 —
-- Brandenburg's dates, copied into the wrong row. Databases that were reset
-- or re-seeded after the migration hold both rows, and while the calendar
-- deduplicates by name the wrong range still pollutes the data.
--
-- This deletes the wrong row. The seed files were fixed in the same change,
-- so fresh databases never get it in the first place.

delete from public.school_holidays
where state = 'Berlin'
  and name = 'Sommerferien 2026'
  and start_date = '2026-07-09'
  and end_date = '2026-08-22';
