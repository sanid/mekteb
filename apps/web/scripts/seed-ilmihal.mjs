import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { ServerBlockNoteEditor } from '@blocknote/server-util';

async function main() {
  // Read env variables from environment or .env.local as a fallback
  const env = {};
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const envFile = await fs.readFile('.env.local', 'utf-8');
      envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
          env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
      });
    } catch (e) {
      console.warn('Warning: Could not read .env.local file. Proceeding with environment variables.');
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });

  // Define topics
  const topicDefinitions = [
    { id: "11111111-1111-1111-1111-111111111111", key: "basics", title: "Einleitung & Grundlagen", description: "Grundlegende Einführung in die Religion und das Wissen", sort_order: 1 },
    { id: "22222222-2222-2222-2222-222222222222", key: "creed", title: "Glaubenslehre (İman)", description: "Die Säulen und Grundsätze des Glaubens (Iman)", sort_order: 2 },
    { id: "33333333-3333-3333-3333-333333333333", key: "law", title: "Islamisches Recht & Quellen (Fiqh)", description: "Rechtsquellen, Rechtsschulen und Handlungen der Mükellef", sort_order: 3 },
    { id: "44444444-4444-4444-4444-444444444444", key: "purification", title: "Rituelle Reinheit (Tahārah)", description: "Die rituelle Reinheit, Abdest, Ghusl und Teyemmüm", sort_order: 4 },
    { id: "55555555-5555-5555-5555-555555555555", key: "prayer_basics", title: "Das Gebet (Salāh) - Grundlagen", description: "Gebetszeiten, Ezan, Säulen und Voraussetzungen des Gebets", sort_order: 5 },
    { id: "66666666-6666-6666-6666-666666666666", key: "prayer_practice", title: "Das Gebet (Salāh) - Praxis & Sondergebete", description: "Praktische Durchführung, Freitagsgebet, Festgebet und Nafile-Gebete", sort_order: 6 },
    { id: "77777777-7777-7777-7777-777777777777", key: "funerary", title: "Umgang mit Verstorbenen (Dschināzah)", description: "Bestattung, Beerdigung und das Totengebet", sort_order: 7 },
    { id: "88888888-8888-8888-8888-888888888888", key: "fasting", title: "Fasten & Gesegnete Zeiten (Sawm)", description: "Fasten, Terawih und gesegnete Nächte", sort_order: 8 },
    { id: "99999999-9999-9999-9999-999999999999", key: "charity", title: "Abgaben, Pilgerfahrt & Opfer", description: "Zekat, Fitra, Hadsch und Qurban", sort_order: 9 },
    { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", key: "ethics", title: "Charakter, Reue & Bittgebete (Achlāq & Duā)", description: "Islamische Ethik, Sünden, Reue und verschiedene Bittgebete", sort_order: 10 }
  ];

  const lessonTitles = {
    3: "Unsere Religion (Din) Der Islam",
    4: "Iman (Glaube) & Die Grundsätze des Iman",
    5: "Der Glaube an Allahü Teālā",
    6: "Der Glaube an die Engel",
    7: "Der Glaube an die Schriften",
    8: "Der Glaube an die Propheten",
    9: "Unser Prophet",
    10: "Ashab-i Kiram",
    11: "Der Glaube an den Achira-Tag",
    12: "Der Glaube an Qader und Qaza",
    13: "Bedingungen für den Fortbestand des Iman",
    14: "Die Schutzwälle des Iman",
    15: "Dinge, die Muslime unbedingt vermeiden sollten",
    16: "Edille-i Scher'iyye (Rechtsquellen)",
    17: "Erkenntnisgewinn und Wissenserwerb",
    18: "Mezheb (Rechtsschulen)",
    19: "Islam (Säulen des Islam)",
    20: "Kelime-i Schehadet",
    21: "Ef'al-i Mükellefin",
    22: "Namaz (Gebet) Intro",
    23: "Reinigung von Hades",
    24: "Wudhū / Abdest",
    25: "Wudhū Abbildungen",
    26: "Ghusl (Rituelle Ganzkörperwaschung)",
    27: "Teyemmüm & Abbildungen",
    28: "Das rituelle Benetzen von Mest-Schuhen (Mesh)",
    29: "Muslima betreffende Punkte (Hayz, Nifas, Istihaza)",
    30: "Reinigung von Nedschaset & Istindschā",
    31: "Setr-i Awret, Istiqbal-i Qibla, Waqit",
    32: "Verpönte Zeiten für Namaz",
    33: "Ezan und Iqama",
    34: "Niyet (Absichtsfassung)",
    35: "Säulen des Namaz",
    36: "Verschiedene Suren und Ayat",
    37: "Verschiedene Duas für das Namaz",
    38: "Rukū, Sedschde, Qa'de-i Achira",
    39: "Die Wadschib-Handlungen des Namaz",
    40: "Die Sunna-Handlungen des Namaz",
    41: "Verhaltensregeln und Mekruh im Namaz",
    42: "Handlungen, die das Namaz ungültig machen",
    43: "Wie wird das Namaz verrichtet?",
    44: "Gebets-Abbildungen",
    45: "Namaz zu fünf Zeiten am Tag & Sehw-Sedschde",
    46: "Das Freitagsgebet",
    47: "Festgebet & Nachholen verpasster Gebete",
    48: "Einige Nafile-Namaz",
    49: "Umgang mit Verstorbenen",
    50: "Das Bestattungsgebet",
    51: "Grabstätte, Beerdigung, Befragung im Grab",
    52: "Das Kapitel zur Reise (Sefer) & Heilige Nächte",
    53: "Qadr-Nacht",
    54: "Fasten (Sawm)",
    55: "Terawih-Namaz & I'tiqaf",
    56: "Sadaqa-i Fitr (Fitra)",
    57: "Zekat & Uschr & Zekatempfänger",
    58: "Hadsch",
    59: "Qurban & Aqiqa-Qurban",
    60: "Was ist Sünde? & Die größten Sünden",
    61: "Tewbe & Istighfar & Nefs (Nefs-i Emmare)",
    62: "Aufgaben der Muslime in der Gemeinschaft",
    63: "Einige Duas",
    64: "Salawat-i Scherife & Ahzab-Dua",
    65: "Die Dua nach einer Hatim",
    66: "Die Dua nach dem Essen",
    67: "Die 32 Pflichten (Farz)",
    68: "Die 54 Pflichten (Farz)",
    69: "Einige Fragen an muslimische Kinder"
  };

  function getTopicKeyForFile(num) {
    if (num === 3 || num === 17 || num === 62) return "basics";
    if ((num >= 4 && num <= 15) || num === 67 || num === 68 || num === 69) return "creed";
    if (num === 16 || num === 18 || num === 21) return "law";
    if (num === 19 || num === 20 || (num >= 23 && num <= 30)) return "purification";
    if (num === 22 || (num >= 31 && num <= 42)) return "prayer_basics";
    if (num >= 43 && num <= 48) return "prayer_practice";
    if (num >= 49 && num <= 51) return "funerary";
    if (num >= 52 && num <= 55) return "fasting";
    if (num >= 56 && num <= 59) return "charity";
    if (num >= 60 && num <= 66) return "ethics";
    return null;
  }

  // Fetch the first mosque
  const { data: mosques, error: mosquesError } = await supabase.from('mosques').select('id, name').limit(1);
  if (mosquesError || !mosques || mosques.length === 0) {
    console.error('Error fetching mosques:', mosquesError);
    process.exit(1);
  }
  const mosqueId = mosques[0].id;
  console.log(`Using mosque: ${mosques[0].name} (${mosqueId})`);

  // Insert topics
  console.log('Seeding topics...');
  const sqlLines = [];
  sqlLines.push('-- Topics seed');
  for (const t of topicDefinitions) {
    const { error } = await supabase.from('topics').upsert({
      id: t.id,
      mosque_id: mosqueId,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      is_published: true
    }, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding topic "${t.title}":`, error.message);
    } else {
      console.log(`Topic seeded: "${t.title}"`);
    }

    const escapedTitle = t.title.replace(/'/g, "''");
    const escapedDesc = t.description.replace(/'/g, "''");
    sqlLines.push(`INSERT INTO public.topics (id, mosque_id, title, description, sort_order, is_published) VALUES ('${t.id}', '${mosqueId}', '${escapedTitle}', '${escapedDesc}', ${t.sort_order}, true) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;`);
  }

  // Convert and insert lessons
  const groupedDir = path.join(import.meta.dirname, 'ilmihal-formatted');
  let files;
  try {
    files = await fs.readdir(groupedDir);
  } catch (e) {
    console.error(`Error reading directory "${groupedDir}":`, e.message);
    process.exit(1);
  }

  const editor = ServerBlockNoteEditor.create();

  console.log('Seeding lessons...');
  sqlLines.push('\n-- Lessons seed');
  let count = 0;

  for (const file of files.sort()) {
    const match = file.match(/^(\d+)_(.+)\.md$/);
    if (!match) continue;
    const num = parseInt(match[1], 10);
    if (num === 1 || num === 2) {
      console.log(`Skipping: "${file}" as requested`);
      continue; // Skip Vorwort and Wichtiger Hinweis
    }

    const topicKey = getTopicKeyForFile(num);
    const topicId = topicDefinitions.find(t => t.key === topicKey)?.id;
    if (!topicId) {
      console.warn(`No topic found for file: ${file}`);
      continue;
    }

    const title = lessonTitles[num] || file.replace('.md', '').replace(/^\d+_/, '').replace(/_/g, ' ');
    const filePath = path.join(groupedDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    // Parse markdown to BlockNote JSON
    const blocks = await editor.tryParseMarkdownToBlocks(content);
    const bodyJson = JSON.stringify(blocks);

    const lessonId = `00000000-0000-0000-0000-${String(num).padStart(12, '0')}`;

    const { error } = await supabase.from('lessons').upsert({
      id: lessonId,
      mosque_id: mosqueId,
      topic_id: topicId,
      title: title,
      body: blocks,
      sort_order: num,
      is_published: true
    }, { onConflict: 'id' });

    if (error) {
      console.error(`Error seeding lesson "${title}":`, error.message);
    } else {
      console.log(`Lesson seeded [${++count}/67]: "${title}"`);
    }

    const escapedTitle = title.replace(/'/g, "''");
    const escapedBody = bodyJson.replace(/'/g, "''");
    sqlLines.push(`INSERT INTO public.lessons (id, mosque_id, topic_id, title, body, sort_order, is_published) VALUES ('${lessonId}', '${mosqueId}', '${topicId}', '${escapedTitle}', '${escapedBody}'::jsonb, ${num}, true) ON CONFLICT (id) DO UPDATE SET topic_id = EXCLUDED.topic_id, title = EXCLUDED.title, body = EXCLUDED.body, sort_order = EXCLUDED.sort_order;`);
  }

  // Write the SQL seed file
  const sqlFilePath = 'supabase/seed_lessons.sql';
  try {
    await fs.writeFile(sqlFilePath, sqlLines.join('\n'), 'utf-8');
    console.log(`Generated SQL seed file at: ${sqlFilePath}`);
  } catch (e) {
    console.error('Error writing SQL seed file:', e.message);
  }
}

main().catch(console.error);
