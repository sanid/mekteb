-- Add system_key column to diploma_templates to track built-in designs
alter table public.diploma_templates add column system_key text;
