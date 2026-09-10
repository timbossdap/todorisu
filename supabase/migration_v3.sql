-- Migration v3: Add completed_at timestamp for Todoist Reporting view
-- Run this in Supabase SQL Editor: Project -> SQL Editor -> New query -> paste -> Run

alter table tasks add column if not exists completed_at timestamptz;
