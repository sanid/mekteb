-- Migrate lesson body from plain text to JSONB for BlockNote rich editor.
-- Existing plain text values are wrapped into a single paragraph block
-- so they remain visible in the editor.

alter table public.lessons
  alter column body type jsonb
  using (
    case
      when body is null then null
      when body ~ '^\s*\[' then body::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'id',  gen_random_uuid()::text,
          'type','paragraph',
          'props', jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
          'content', jsonb_build_array(
            jsonb_build_object('type','text','text', body, 'styles', '{}'::jsonb)
          ),
          'children', '[]'::jsonb
        )
      )
    end
  );
