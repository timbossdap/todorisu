-- Run this in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  notes text default '',
  project text default 'Inbox',
  priority int default 4,              -- 1 = highest (red) ... 4 = lowest (no flag)
  due_at timestamptz,                  -- null = no due date
  reminder_minutes_before int default 0,
  has_time boolean default false,      -- whether due_at carries a meaningful time or is just a date
  tags text[] default '{}',
  recurrence_rule text,                -- e.g. 'daily' | 'weekday' | 'weekly' | 'monthly' | 'every:3:days'
  completed boolean default false,
  completed_at timestamptz,
  position int default 0,
  created_at timestamptz default now()
);

-- Row Level Security: every user can only ever see/edit their own rows
alter table tasks enable row level security;

create policy "select own tasks" on tasks
  for select using (auth.uid() = user_id);

create policy "insert own tasks" on tasks
  for insert with check (auth.uid() = user_id);

create policy "update own tasks" on tasks
  for update using (auth.uid() = user_id);

create policy "delete own tasks" on tasks
  for delete using (auth.uid() = user_id);

-- Helpful index for the sync worker's "what's due soon" query
create index if not exists tasks_due_at_idx on tasks (user_id, due_at) where completed = false;
