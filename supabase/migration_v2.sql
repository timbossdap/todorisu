-- Run this in Supabase SQL Editor if you already ran the original schema.sql.
-- (If you're setting up fresh, just use the updated schema.sql instead — it already includes these.)

alter table tasks add column if not exists tags text[] default '{}';
alter table tasks add column if not exists recurrence_rule text;       -- e.g. 'daily','weekday','weekly','monthly','every:3:days'
alter table tasks add column if not exists has_time boolean default false;
