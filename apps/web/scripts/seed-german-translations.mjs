import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import { GERMAN_LESSONS } from '../../../scripts/generate-german-translations.mjs';

function toBlockNote(blocks) {
  return blocks.map(b => {
    if (b.type === 'h') {
      return {
        id: crypto.randomUUID(),
        type: 'heading',
        props: {
          level: b.level || 2,
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
          isToggleable: false,
        },
        content: [{ type: 'text', text: b.text, styles: {} }],
        children: [],
      };
    } else if (b.type === 'p') {
      return {
        id: crypto.randomUUID(),
        type: 'paragraph',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: b.text, styles: {} }],
        children: [],
      };
    } else if (b.type === 'b') {
      return {
        id: crypto.randomUUID(),
        type: 'bulletListItem',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: b.text, styles: {} }],
        children: [],
      };
    } else if (b.type === 'num') {
      return {
        id: crypto.randomUUID(),
        type: 'numberedListItem',
        props: {
          textColor: 'default',
          backgroundColor: 'default',
          textAlignment: 'left',
        },
        content: [{ type: 'text', text: b.text, styles: {} }],
        children: [],
      };
    }
  });
}

async function main() {
  const env = {};
  try {
    const envFile = await fs.readFile('.env.local', 'utf-8');
    envFile.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });
  } catch (e) {
    console.warn('Warning: Could not read .env.local file directly.');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  console.log(`Connecting to Supabase at ${supabaseUrl}...`);

  const { data: mosques, error: mosquesErr } = await supabase.from('mosques').select('id, name');
  if (mosquesErr || !mosques || mosques.length === 0) {
    console.error('Error fetching mosques:', mosquesErr?.message || 'No mosques found');
    process.exit(1);
  }

  for (const mosque of mosques) {
    console.log(`\nSeeding German translations for mosque: "${mosque.name}" (${mosque.id})...`);

    const { data: lessons, error: lessonsErr } = await supabase
      .from('lessons')
      .select('id, title, sort_order')
      .eq('mosque_id', mosque.id);

    if (lessonsErr || !lessons || lessons.length === 0) {
      console.warn(`No lessons found for mosque "${mosque.name}". Seed lessons first!`);
      continue;
    }

    const lessonByTitle = new Map(lessons.map(l => [l.title, l]));

    let seededCount = 0;
    for (const gLesson of GERMAN_LESSONS) {
      const matched = lessonByTitle.get(gLesson.bosnianTitle);
      if (!matched) {
        console.warn(`  ⚠ Could not find lesson with title "${gLesson.bosnianTitle}"`);
        continue;
      }

      const bodyBlocks = toBlockNote(gLesson.blocks);

      const { error: transErr } = await supabase.from('lesson_translations').upsert(
        {
          mosque_id: mosque.id,
          lesson_id: matched.id,
          locale: 'de',
          title: gLesson.germanTitle,
          body: bodyBlocks,
        },
        { onConflict: 'lesson_id,locale' }
      );

      if (transErr) {
        console.error(`  ✗ Error translating "${gLesson.germanTitle}":`, transErr.message);
      } else {
        seededCount++;
      }
    }

    console.log(`  ✓ Successfully seeded ${seededCount}/${GERMAN_LESSONS.length} German translations for "${mosque.name}"!`);
  }

  console.log('\nAll German translations have been successfully seeded!');
}

main().catch(console.error);
