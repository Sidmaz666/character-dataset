#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const CHAR_FILE = path.join(__dirname, '..', 'data', 'dataset_characters.json');
const PROGRESS_FILE = path.join(__dirname, '..', '.wiki_api_progress.json');

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

async function wikiApi(params) {
  const qs = new URLSearchParams({ ...params, format: 'json', origin: '*' });
  const res = await fetch(`${WIKI_API}?${qs}`, { headers: { 'User-Agent': 'CharacterDataset/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&#\d+;/g, c => String.fromCharCode(c.replace(/&#|;/g, ''))).trim();
}

function extractInfobox(html) {
  const match = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>.*?<\/table>/s);
  if (!match) return null;

  const rows = match[0].match(/<tr[^>]*>.*?<\/tr>/gs) || [];
  const data = {};
  const relationValues = [];

  for (const row of rows) {
    const th = row.match(/<th[^>]*>(.*?)<\/th>/s);
    const td = row.match(/<td[^>]*>(.*?)<\/td>/s);
    if (!th || !td) continue;

    let label = stripHtml(th[1]);
    let value = stripHtml(td[1]);
    if (!label || !value) continue;

    // Clean up multi-line values
    value = value.replace(/\s+/g, ' ').trim();
    label = label.replace(/[:\s]+$/, '').trim();

    // Birthday
    if (/birth(?:day)?|born|date of birth/i.test(label)) {
      const bdayMatch = value.match(/([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{1,2} [A-Z][a-z]+ \d{4}|[A-Z][a-z]+ \d{1,2})/);
      if (bdayMatch) {
        data.birthday = bdayMatch[1].replace(/,$/, '').trim();
      }
    }

    // Age
    if (/^age$/i.test(label)) {
      const ageMatch = value.match(/\d+/);
      if (ageMatch) data.age = parseInt(ageMatch[0]);
    }

    // Japanese VA
    if (/voiced by/i.test(label)) {
      const jpMatch = value.match(/Japanese[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (jpMatch && jpMatch[1] !== 'See' && jpMatch[1] !== 'See also') {
        data.japanese_va = jpMatch[1];
      }
      const enMatch = value.match(/English[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
      if (enMatch) {
        data.english_va = enMatch[1];
      }
    }

    // Relatives / Family
    if (/relatives|family|parents?|spouse|children/i.test(label)) {
      // Parse comma-separated names with relation context
      const names = value.split(/[,;]/).map(s => s.trim()).filter(s => s && s.length > 2);
      for (const name of names) {
        const cleanName = name.replace(/\(.*?\)/g, '').trim();
        if (cleanName && cleanName.length > 1) {
          relationValues.push(`${cleanName} (${label.toLowerCase()})`);
        }
      }
    }

    // Occupation
    if (/occupation/i.test(label)) {
      data.occupation = value;
    }

    // Height/Weight
    if (/height/i.test(label)) {
      const hMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:cm|m)/i);
      if (hMatch) data.height_cm = parseFloat(hMatch[1]);
    }
    if (/weight/i.test(label)) {
      const wMatch = value.match(/(\d+(?:\.\d+)?)\s*kg/i);
      if (wMatch) data.weight_kg = parseFloat(wMatch[1]);
    }
  }

  if (relationValues.length > 0) data.relatives = relationValues;
  return Object.keys(data).length > 0 ? data : null;
}

async function searchCharacter(name) {
  const searchName = name.replace(/,/g, '').trim();
  const searchNameClean = searchName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '');

  // Try direct page first
  try {
    const direct = await wikiApi({ action: 'parse', page: searchNameClean, prop: 'text', redirects: '1' });
    if (direct.parse) {
      const infobox = extractInfobox(direct.parse.text['*']);
      if (infobox) return infobox;
    }
  } catch {}

  // Try search
  try {
    const search = await wikiApi({ action: 'query', list: 'search', srsearch: searchNameClean, srlimit: 5, format: 'json' });
    const results = search.query?.search || [];
    for (const result of results) {
      const pageTitle = result.title;
      if (pageTitle.toLowerCase().includes('disambiguation') ||
          pageTitle.toLowerCase().includes('list of')) continue;

      try {
        const page = await wikiApi({ action: 'parse', page: pageTitle, prop: 'text', redirects: '1' });
        if (page.parse) {
          const infobox = extractInfobox(page.parse.text['*']);
          if (infobox) return infobox;
        }
      } catch {}
    }
  } catch {}

  return null;
}

async function main() {
  console.log('Wikipedia API Research Script\n');

  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const lookup = {};
  data.forEach(c => lookup[c.id] = c);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
  }
  console.log(`Previously researched: ${Object.keys(progress).length}`);

  // Priority candidates
  const candidates = [];

  // Characters missing birthday (prioritize ones with short/simple names likely to have Wikipedia pages)
  const missingBday = data.filter(c => !c.basic_info?.birthday || c.basic_info.birthday === 'Unknown' || c.basic_info.birthday === null);
  console.log(`Characters missing birthday: ${missingBday.length}`);

  // Take top 200 most researchable
  const researchable = missingBday
    .filter(c => c.name.length < 30 && c.name.split(',').length <= 2)
    .sort((a, b) => (b.about?.length || 0) - (a.about?.length || 0))
    .slice(0, 200);

  candidates.push(...researchable.map(c => ({ char: c, target: 'birthday' })));

  // Also characters missing VAs
  const missingVA = data.filter(c => c.publisher === 'anime' && (!c.voice_acting?.japanese || c.voice_acting.japanese === 'Unknown'));
  console.log(`Anime characters missing Japanese VA: ${missingVA.length}`);

  const vaResearchable = missingVA
    .filter(c => !researchable.some(r => r.id === c.id))
    .slice(0, 100);
  candidates.push(...vaResearchable.map(c => ({ char: c, target: 'va' })));

  console.log(`Total candidates: ${candidates.length}\n`);

  let researched = 0;
  let found = 0;
  let errors = 0;

  for (const { char, target } of candidates) {
    if (researched >= 100) break; // Limit per run

    if (progress[char.id]) {
      if (progress[char.id].found) found++;
      continue;
    }

    // Skip if char already has the data we want
    const hasBday = char.basic_info?.birthday && char.basic_info.birthday !== 'Unknown' && char.basic_info.birthday !== null;
    const hasVA = char.voice_acting?.japanese && char.voice_acting.japanese !== 'Unknown' && char.voice_acting.japanese !== null;
    if (hasBday && target === 'birthday') continue;
    if (hasVA && target === 'va') continue;

    const name = char.name.replace(/,/g, '').trim();
    console.log(`  [${researched + 1}] ${name} (${char.publisher})`);

    try {
      const result = await searchCharacter(name);
      if (result) {
        progress[char.id] = { ...result, found: true };
        found++;
        console.log(`    -> Birthday: ${result.birthday || '-'} | VA: ${result.japanese_va || '-'} | Relatives: ${result.relatives?.length || 0}`);
      } else {
        progress[char.id] = { found: false };
        console.log(`    -> No data found`);
      }
    } catch (err) {
      progress[char.id] = { found: false, error: err.message };
      errors++;
      console.log(`    -> Error: ${err.message}`);
    }

    researched++;
    if (researched % 10 === 0) fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }

  // Save progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  console.log(`\n=== Wikipedia API Research Complete ===`);
  console.log(`Researched: ${researched}, Found: ${found}, Errors: ${errors}`);

  // Apply results to character files
  let bdayUpdates = 0, vaUpdates = 0, relUpdates = 0, occUpdates = 0;

  const charactersDir = path.join(__dirname, '..', 'data', 'characters');
  const publishers = fs.readdirSync(charactersDir).filter(f =>
    fs.statSync(path.join(charactersDir, f)).isDirectory()
  );

  for (const publisher of publishers) {
    const pubDir = path.join(charactersDir, publisher);
    const files = fs.readdirSync(pubDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const charId = file.replace('.json', '');
      const res = progress[charId];
      if (!res || !res.found) continue;

      const filePath = path.join(pubDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;

      if (res.birthday && (!content.basic_info?.birthday || content.basic_info.birthday === 'Unknown')) {
        if (!content.basic_info) content.basic_info = {};
        content.basic_info.birthday = res.birthday;
        bdayUpdates++;
        modified = true;
      }

      if (res.japanese_va && (!content.voice_acting?.japanese || content.voice_acting.japanese === 'Unknown')) {
        if (!content.voice_acting) content.voice_acting = {};
        content.voice_acting.japanese = res.japanese_va;
        vaUpdates++;
        modified = true;
      }

      if (res.english_va && (!content.voice_acting?.english || content.voice_acting.english === 'Unknown')) {
        if (!content.voice_acting) content.voice_acting = {};
        content.voice_acting.english = res.english_va;
        vaUpdates++;
        modified = true;
      }

      if (res.relatives && res.relatives.length > 0 && (!content.relationships?.relatives || content.relationships.relatives.length === 0)) {
        if (!content.relationships) content.relationships = {};
        if (!content.relationships.relatives) content.relationships.relatives = [];
        for (const rel of res.relatives) {
          if (!content.relationships.relatives.includes(rel)) {
            content.relationships.relatives.push(rel);
          }
        }
        relUpdates++;
        modified = true;
      }

      if (res.height_cm && (!content.basic_info?.height_cm || content.basic_info.height_cm === 0)) {
        if (!content.basic_info) content.basic_info = {};
        content.basic_info.height_cm = res.height_cm;
        modified = true;
      }

      if (res.weight_kg && (!content.basic_info?.weight_kg || content.basic_info.weight_kg === 0)) {
        if (!content.basic_info) content.basic_info = {};
        content.basic_info.weight_kg = res.weight_kg;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log(`Applied: ${bdayUpdates} birthdays, ${vaUpdates} VAs, ${relUpdates} relative groups`);
  console.log('Done.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
