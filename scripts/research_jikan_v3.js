#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const CHAR_FILE = path.join(__dirname, '..', 'data', 'dataset_characters.json');
const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');
const PROGRESS_FILE = path.join(__dirname, '..', '.jikan_v3_progress.json');

function normalizeName(name) {
  if (!name) return '';
  const cm = name.match(/^([^,]+),\s*(.+)$/);
  if (cm) return cm[2].trim() + ' ' + cm[1].trim();
  return name.trim();
}

function nameScore(searchName, resultName) {
  const sWords = searchName.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  const rWords = resultName.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (sWords.length === 0 || rWords.length === 0) return 0;
  const maxWords = Math.max(sWords.length, rWords.length);
  const overlap = sWords.filter(w => rWords.some(rw => rw === w || rw.includes(w) || w.includes(rw))).length;
  const score = overlap / maxWords;
  const uniqueOverlap = sWords.filter(w => rWords.some(rw => rw.includes(w))).length;
  return uniqueOverlap === 0 ? score * 0.2 : score;
}

function fixNameFormat(name) {
  const cm = name.match(/^([^,]+),\s*(.+)$/);
  if (cm) return cm[2].trim() + ' ' + cm[1].trim();
  return name;
}

async function searchJikan(name) {
  const searches = [normalizeName(name), name.replace(/,/g, '').trim()];
  for (const q of [...new Set(searches)]) {
    try {
      const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=5&order_by=favorites&sort=desc`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.data || data.data.length === 0) continue;
      let best = null, bestScore = 0;
      for (const ch of data.data) {
        const score = Math.max(nameScore(name, ch.name), nameScore(q, ch.name));
        if (score > bestScore) { bestScore = score; best = ch; }
      }
      if (best && bestScore >= 0.4) return { id: best.mal_id, name: best.name, score: bestScore };
    } catch {}
  }
  return null;
}

async function fetchText(url) {
  const res = await fetch(url);
  return res.text();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== Jikan API Research v3 (targeted) ===\n');

  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  const lookup = {};
  data.forEach(c => lookup[c.id] = c);

  // Find anime characters missing Japanese VA
  const missing = data.filter(c => c.publisher === 'anime' && (!c.voice_acting?.japanese || c.voice_acting.japanese === 'Unknown'));
  console.log(`Anime characters missing Japanese VA: ${missing.length}`);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch {}
    console.log(`Previously attempted: ${Object.keys(progress).length}`);
  }

  // Take top 100 most well-known characters
  const sorted = [...missing].sort((a, b) => {
    const aLen = a.about?.length || 0;
    const bLen = b.about?.length || 0;
    return bLen - aLen;
  });

  let processed = 0;
  let found = 0;
  let vaFound = 0;
  let bdayFound = 0;
  let errors = 0;

  for (const c of sorted) {
    if (processed >= 50) break;
    if (progress[c.id]) { processed++; continue; }

    const name = normalizeName(c.name);
    console.log(`  [${processed+1}/${Math.min(50, sorted.length)}] ${c.name}`);

    // Search Jikan
    const result = await searchJikan(name);
    if (!result) {
      progress[c.id] = { found: false };
      errors++;
      await delay(350);
      processed++;
      continue;
    }

    found++;

    // Get full character data
    try {
      const url = `https://api.jikan.moe/v4/characters/${result.id}/full`;
      const res = await fetchText(url);
      const fullData = JSON.parse(res).data;
      if (!fullData) {
        progress[c.id] = { found: false };
        await delay(350);
        processed++;
        continue;
      }

      let changes = {};

      // Voice actors
      const voices = fullData.voices || [];
      const jpVA = voices.find(v => v.language && v.language.toLowerCase() === 'japanese');
      const enVA = voices.find(v => v.language && v.language.toLowerCase() === 'english');
      if (jpVA && jpVA.person && jpVA.person.name) {
        const cleaned = fixNameFormat(jpVA.person.name.replace(/\s*\([^)]*\)\s*/g, '').trim());
        if (cleaned.length > 2 && !cleaned.toLowerCase().startsWith('see')) {
          changes.japanese_va = cleaned;
          vaFound++;
        }
      }
      if (enVA && enVA.person && enVA.person.name) {
        const cleaned = fixNameFormat(enVA.person.name.replace(/\s*\([^)]*\)\s*/g, '').trim());
        changes.english_va = cleaned;
      }

      // About field
      if (fullData.about) {
        const about = fullData.about;
        const bdayMatch = about.match(/(?:birth(?:day|date)?)\s*:\s*([A-Za-z]+\s+\d{1,2})/i);
        if (bdayMatch) { changes.birthday = bdayMatch[1].trim(); bdayFound++; }
        const ageMatch = about.match(/age\s*:\s*(\d{1,3})/i);
        if (ageMatch) changes.age = ageMatch[1];
      }

      progress[c.id] = { ...changes, found: true, mal_id: result.id };
      console.log(`    -> VA: ${changes.japanese_va || '-'} | Bday: ${changes.birthday || '-'}`);

    } catch (err) {
      progress[c.id] = { found: false, error: err.message };
      console.log(`    -> Error: ${err.message}`);
    }

    await delay(350);
    processed++;
    if (processed % 10 === 0) fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  }

  // Save progress
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

  console.log(`\n=== Jikan v3 Complete ===`);
  console.log(`Processed: ${processed}, Found: ${found}, VA: ${vaFound}, Bday: ${bdayFound}`);

  // Apply results
  let vaUpdated = 0, bdayUpdated = 0;

  for (const publisher of fs.readdirSync(CHARACTERS_DIR).filter(f => fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory())) {
    const pubDir = path.join(CHARACTERS_DIR, publisher);
    for (const file of fs.readdirSync(pubDir).filter(f => f.endsWith('.json'))) {
      const charId = file.replace('.json', '');
      const res = progress[charId];
      if (!res || !res.found) continue;

      const filePath = path.join(pubDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;

      if (res.japanese_va && (!content.voice_acting?.japanese || content.voice_acting.japanese === 'Unknown')) {
        if (!content.voice_acting) content.voice_acting = {};
        content.voice_acting.japanese = res.japanese_va;
        vaUpdated++;
        modified = true;
      }
      if (res.english_va && (!content.voice_acting?.english || content.voice_acting.english === 'Unknown')) {
        if (!content.voice_acting) content.voice_acting = {};
        content.voice_acting.english = res.english_va;
        modified = true;
      }
      if (res.birthday && (!content.basic_info?.birthday || content.basic_info.birthday === 'Unknown')) {
        if (!content.basic_info) content.basic_info = {};
        content.basic_info.birthday = res.birthday;
        bdayUpdated++;
        modified = true;
      }

      if (modified) fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
    }
  }

  console.log(`Applied: ${vaUpdated} VAs, ${bdayUpdated} birthdays`);
  console.log('Done.\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
