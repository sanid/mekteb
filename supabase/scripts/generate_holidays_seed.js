const fs = require('fs');
const path = require('path');

const STATE_NAMES = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen'
};

const years = [2026, 2027, 2028, 2029];

async function run() {
  const allHolidays = [];

  for (const year of years) {
    console.log(`Fetching school holidays for year ${year}...`);
    const url = `https://deutsche-schulferien-api.vercel.app/api/v2/${year}`;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const bodyText = await res.text();
        console.warn(`[WARNING] Skipping year ${year}: API returned status ${res.status}. Body: ${bodyText}`);
        continue;
      }
      const data = await res.json();
      allHolidays.push(...data);
    } catch (err) {
      console.warn(`[WARNING] Skipping year ${year} due to network error:`, err);
    }
  }

  if (allHolidays.length === 0) {
    console.error("Error: No holiday data was fetched.");
    process.exit(1);
  }

  console.log(`Fetched ${allHolidays.length} holiday records in total.`);

  // Generate SQL values
  const values = allHolidays.map(item => {
    const stateName = STATE_NAMES[item.stateCode] || item.stateCode;
    const prettyName = `${item.name_cp} ${item.year}`.replace(/'/g, "''");
    const startDate = item.start.slice(0, 10);
    const endDate = item.end.slice(0, 10);

    return `  ('${stateName.replace(/'/g, "''")}', '${prettyName}', '${startDate}', '${endDate}')`;
  });

  const sql = `-- German School Holidays Seed (Years 2026-2029)
-- Generated automatically from deutsche-schulferien-api.vercel.app

insert into public.school_holidays (state, name, start_date, end_date)
values
${values.join(',\n')}
on conflict do nothing;
`;

  // 1. Save to supabase/seed_holidays.sql
  const outputPath = path.join(__dirname, '../seed_holidays.sql');
  fs.writeFileSync(outputPath, sql);
  console.log(`Successfully generated seed file at ${outputPath}`);

  // 2. Read and update seed.sql
  const seedPath = path.join(__dirname, '../seed.sql');
  if (fs.existsSync(seedPath)) {
    let seedContent = fs.readFileSync(seedPath, 'utf8');
    const beginMarker = '-- BEGIN German School Holidays Seed --';
    const endMarker = '-- END German School Holidays Seed --';

    const beginIdx = seedContent.indexOf(beginMarker);
    const endIdx = seedContent.indexOf(endMarker);

    if (beginIdx !== -1 && endIdx !== -1 && beginIdx < endIdx) {
      const before = seedContent.slice(0, beginIdx + beginMarker.length);
      const after = seedContent.slice(endIdx);
      const newSeedContent = `${before}\n\n${sql}\n${after}`;
      fs.writeFileSync(seedPath, newSeedContent);
      console.log(`Successfully updated seed.sql with holiday data.`);
    } else {
      console.warn(`[WARNING] Could not find markers in seed.sql to insert holidays.`);
    }
  }
}

run();
