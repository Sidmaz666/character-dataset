#!/usr/bin/env node
/* Jikan API (MyAnimeList) research for anime characters missing VA/birthday/age
 * Rate limit: 3 req/sec (free tier), we use ~400ms delays
 * Uses /characters/{id}/full endpoint which has voices[], about, etc.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'DatasetResearch/1.0' }, timeout: 15000 }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeName(name) {
  if (!name) return '';
  const cm = name.match(/^([^,]+),\s*(.+)$/);
  return cm ? cm[2] + ' ' + cm[1] : name;
}

// Convert "Last, First" name format
function fixNameFormat(name) {
  const cm = name.match(/^([^,]+),\s*(.+)$/);
  return cm ? cm[2] + ' ' + cm[1] : name;
}

function nameSimilarity(searchName, resultName) {
  const s = searchName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const r = resultName.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (r === s || r.startsWith(s + ' ') || r.endsWith(' ' + s)) return 1.0;
  if (r.includes(s) || s.includes(r)) return 0.8;
  const sWords = s.split(/\s+/).filter(Boolean);
  const rWords = r.split(/\s+/).filter(Boolean);
  const overlap = sWords.filter(w => w.length > 1 && rWords.some(rw => rw.includes(w) || w.includes(rw))).length;
  const maxWords = Math.max(sWords.length, rWords.length);
  if (maxWords === 0) return 0;
  const score = overlap / maxWords;
  const uniqueSWords = sWords.filter(w => w.length > 3);
  const uniqueRWords = rWords.filter(w => w.length > 3);
  if (uniqueSWords.length > 0) {
    const uniqueOverlap = uniqueSWords.filter(w => uniqueRWords.some(rw => rw.includes(w) || w.includes(rw))).length;
    if (uniqueOverlap === 0) return score * 0.2;
  }
  return score;
}

async function searchJikan(name) {
  const queries = [
    name,
    normalizeName(name),
    name.replace(/\s*\(.*?\)\s*/g, '').trim(),
    name.split(/[\s,]+/).slice(0, 2).join(' '),
  ];

  for (const q of [...new Set(queries.filter(Boolean))]) {
    if (q.length < 2) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=5&order_by=favorites&sort=desc`;
        const res = await fetchText(url);
        const data = JSON.parse(res);
        if (data.data && data.data.length > 0) {
          let best = null, bestScore = 0;
          for (const ch of data.data) {
            const score = Math.max(
              nameSimilarity(q, ch.name),
              ...(ch.nicknames || []).map(n => nameSimilarity(q, n))
            );
            if (score > bestScore) { bestScore = score; best = ch; }
          }
          if (best && bestScore >= 0.4) return { id: best.mal_id, name: best.name, score: bestScore };
        }
        break;
      } catch (e) {
        if (attempt < 2) await delay(1000);
      }
    }
  }
  return null;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_NUM = { january:1,jan:1,february:2,feb:2,march:3,mar:3,april:4,apr:4,may:5,june:6,jun:6,july:7,jul:7,august:8,aug:8,september:9,sep:9,october:10,oct:10,november:11,nov:11,december:12,dec:12 };

// Parse the Jikan about field for structured data like birthday, age, zodiac
function parseAboutField(about) {
  if (!about) return {};
  const result = {};

  // Birthday: "Birthdate: March 9" or "Birthday: June 10"
  const bdayMatch = about.match(/(?:birth(?:day|date)?)\s*:\s*([A-Za-z]+\s+\d{1,2})/i);
  if (bdayMatch) {
    result.birthday = bdayMatch[1].trim();
    // Try to clean it up
    const parts = bdayMatch[1].trim().split(/\s+/);
    if (parts.length >= 2) {
      const month = MONTH_NUM[parts[0].toLowerCase()];
      const day = parseInt(parts[1]);
      if (month && day >= 1 && day <= 31) {
        result.birthday = MONTH_NAMES[month - 1] + ' ' + day;
      }
    }
  }

  // Age: "Age: 34" or "Age: 34; 36" (some list multiple ages across timeskips)
  const ageMatch = about.match(/age\s*:\s*(\d{1,3})/i);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age > 0 && age < 200) result.age = String(age);
  }

  // Zodiac: "Zodiac Sign: Pisces"
  const zodiacMatch = about.match(/zodiac\s*(?:sign)?\s*:\s*([A-Za-z]+)/i);
  if (zodiacMatch) {
    result.zodiac = zodiacMatch[1];
  }

  // Height: "Height: 175 cm" or "Height: 175cm"
  const heightMatch = about.match(/height\s*:\s*(\d+(?:\.\d+)?)\s*(?:cm|m)?/i);
  if (heightMatch) {
    const h = parseFloat(heightMatch[1]);
    if (h > 30 && h < 300) result.height_cm = h;
  }

  // Weight: "Weight: 67 kg"
  const weightMatch = about.match(/weight\s*:\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?)?/i);
  if (weightMatch) {
    const w = parseFloat(weightMatch[1]);
    if (w > 10 && w < 500) result.weight_kg = w;
  }

  // Blood type: "Blood type: A" or similar
  const bloodMatch = about.match(/blood\s*(?:type)?\s*:\s*([ABOab]{1,2}[+-]?)/i);
  if (bloodMatch) {
    const bt = bloodMatch[1].toUpperCase();
    if (/^[ABO][+-]?$|^AB[+-]?$/.test(bt)) result.blood_type = bt;
  }

  // Eye color: from about
  const eyeMatch = about.match(/(?:eye[s]?\s*(?:color)?\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?))/i);
  if (eyeMatch) result.eye_color = eyeMatch[1].trim();

  // Hair color
  const hairMatch = about.match(/hair\s*(?:color)?\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (hairMatch) result.hair_color = hairMatch[1].trim();

  return result;
}

async function main() {
  console.log('=== Jikan API Research (v2) ===\n');

  const allChars = [];
  for (const pub of fs.readdirSync(CHARACTERS_DIR).filter(f => fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory())) {
    for (const file of fs.readdirSync(path.join(CHARACTERS_DIR, pub)).filter(f => f.endsWith('.json'))) {
      const c = JSON.parse(fs.readFileSync(path.join(CHARACTERS_DIR, pub, file), 'utf-8'));
      if (c.publisher === 'anime') allChars.push(c);
    }
  }

  const needResearch = allChars.filter(c => {
    const va = c.voice_acting || {};
    const bi = c.basic_info || {};
    return !va.japanese || va.japanese === 'Unknown';
  });

  console.log(`Total anime: ${allChars.length}, Need VA: ${needResearch.length}`);

  let foundCount = 0;
  let vaCount = 0;
  let bdayCount = 0;
  let ageCount = 0;
  let otherCount = 0;
  let errorCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < needResearch.length; i++) {
    const c = needResearch[i];
    const name = normalizeName(c.name);

    if ((i + 1) % 20 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  [${i+1}/${needResearch.length}] F:${foundCount} VA:${vaCount} BD:${bdayCount} Ag:${ageCount} Ot:${otherCount} Err:${errorCount} (${elapsed}s)`);
    }

    // Search Jikan
    const result = await searchJikan(name);
    if (!result || !result.id) { errorCount++; await delay(400); continue; }
    foundCount++;
    await delay(400);

    // Get full character data
    try {
      const url = `https://api.jikan.moe/v4/characters/${result.id}/full`;
      const res = await fetchText(url);
      const fullData = JSON.parse(res).data;
      if (!fullData) { await delay(400); continue; }

      let changed = false;

      // Voice actors from voices[]
      const voices = fullData.voices || [];
      if (voices.length > 0) {
        const vaObj = c.voice_acting || {};
        if (!vaObj.japanese || vaObj.japanese === 'Unknown') {
          // Find Japanese voice actor
          let jpVA = voices.find(v => v.language && v.language.toLowerCase() === 'japanese');
          // If no Japanese, try any
          if (!jpVA) jpVA = voices[0];
          if (jpVA && jpVA.person && jpVA.person.name) {
            const cleaned = fixNameFormat(jpVA.person.name.replace(/\s*\([^)]*\)\s*/g, '').trim());
            if (cleaned.length > 2 && !cleaned.toLowerCase().startsWith('see')) {
              if (!c.voice_acting) c.voice_acting = {};
              c.voice_acting.japanese = cleaned;
              vaCount++;
              changed = true;
            }
          }
        }
        if (!vaObj.english || vaObj.english === 'Unknown') {
          const enVA = voices.find(v => v.language && v.language.toLowerCase() === 'english');
          if (enVA && enVA.person && enVA.person.name) {
            const cleaned = fixNameFormat(enVA.person.name.replace(/\s*\([^)]*\)\s*/g, '').trim());
            if (!c.voice_acting) c.voice_acting = {};
            c.voice_acting.english = cleaned;
            changed = true;
          }
        }
      }

      // Parse about field for birthday, age, zodiac, etc.
      if (fullData.about) {
        const parsed = parseAboutField(fullData.about);
        if (!c.basic_info) c.basic_info = {};
        if (parsed.birthday && (!c.basic_info.birthday || c.basic_info.birthday === 'Unknown')) {
          c.basic_info.birthday = parsed.birthday;
          bdayCount++;
          changed = true;
        }
        if (parsed.age && (!c.basic_info.age || c.basic_info.age === 'Unknown' || c.basic_info.age === '')) {
          c.basic_info.age = parsed.age;
          ageCount++;
          changed = true;
        }
        if (parsed.zodiac && (!c.basic_info.zodiac || c.basic_info.zodiac === 'Unknown')) {
          c.basic_info.zodiac = parsed.zodiac;
          otherCount++;
          changed = true;
        }
        if (parsed.height_cm && (!c.basic_info.height_cm || c.basic_info.height_cm === null)) {
          c.basic_info.height_cm = parsed.height_cm;
          otherCount++;
          changed = true;
        }
        if (parsed.weight_kg && (!c.basic_info.weight_kg || c.basic_info.weight_kg === null)) {
          c.basic_info.weight_kg = parsed.weight_kg;
          otherCount++;
          changed = true;
        }
        if (parsed.blood_type && (!c.basic_info.blood_type || c.basic_info.blood_type === 'Unknown')) {
          c.basic_info.blood_type = parsed.blood_type;
          otherCount++;
          changed = true;
        }
        if (parsed.eye_color && (!c.appearance || !c.appearance.eye_color || c.appearance.eye_color === 'Unknown')) {
          if (!c.appearance) c.appearance = {};
          c.appearance.eye_color = parsed.eye_color;
          otherCount++;
          changed = true;
        }
        if (parsed.hair_color && (!c.appearance || !c.appearance.hair_color || c.appearance.hair_color === 'Unknown')) {
          if (!c.appearance) c.appearance = {};
          c.appearance.hair_color = parsed.hair_color;
          otherCount++;
          changed = true;
        }
      }

      if (changed) {
        const filePath = path.join(CHARACTERS_DIR, c.publisher, c.id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(c, null, 2) + '\n', 'utf-8');
      }
    } catch (e) {
      // Ignore individual errors
    }

    await delay(400);
  }

  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n=== Complete (${totalTime}min) ===`);
  console.log(`Found on MAL: ${foundCount}`);
  console.log(`VA extracted: ${vaCount}`);
  console.log(`Birthdays: ${bdayCount}`);
  console.log(`Ages: ${ageCount}`);
  console.log(`Other data (zodiac/height/weight/blood/eye/hair): ${otherCount}`);
  console.log(`Not found: ${errorCount}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
