#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const CAMOFOX = 'http://localhost:9377';
const USER_ID = 'research';
const CHAR_FILE = path.join(__dirname, '..', 'data', 'dataset_characters.json');
const PROGRESS_FILE = path.join(__dirname, '..', '.research_progress.json');

async function camofox(method, endpoint, body) {
  const url = `${CAMOFOX}${endpoint}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Camoufox ${method} ${endpoint}: ${res.status} ${text}`);
  }
  return res.json();
}

function extractBirthdayFromText(text) {
  const patterns = [
    /Born[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/,
    /Born[:\s]+(\d{1,2} [A-Z][a-z]+ \d{4})/,
    /Birth date[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/,
    /(?:Birth|Born)[:\s]+(\w+ \d{1,2}),?\s*(\d{4})/,
    /Born[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/,
    /date of birth[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const bday = m[1] + (m[2] ? ', ' + m[2] : '');
      if (!bday.includes('Unknown') && !bday.includes('unknown')) return bday;
    }
  }
  return null;
}

function extractVAFromText(text) {
  const vaPatterns = [
    /Voiced by[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
    /Japanese[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
    /(?:voiced by|voice actor)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
  ];
  for (const pat of vaPatterns) {
    const m = text.match(pat);
    if (m && m[1] !== 'Unknown') return m[1];
  }
  return null;
}

function extractRelativesFromText(text) {
  const relatives = [];
  const patterns = [
    /(?:Spouse|spouse|Partner|partner)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
    /(?:Children|children)[:\s]+([A-Z].+?)(?:\n|$)/,
    /(?:Parents?|parents?)[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/,
    /(?:Sibling|sibling)[:\s]+([A-Z].+?)(?:\n|$)/,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const name = m[1].trim();
      if (name && !name.includes('Unknown') && name.length > 2) {
        const label = pat.source.includes('Spouse') ? 'spouse' :
                      pat.source.includes('Children') ? 'child' :
                      pat.source.includes('Parent') ? 'parent' : 'sibling';
        relatives.push(name + ' (' + label + ')');
      }
    }
  }
  return relatives;
}

async function researchCharacter(char, charData) {
  const name = charData.name;
  const searchName = name.replace(/,/g, '').trim();

  try {
    // Create tab and search Wikipedia
    const tab = await camofox('POST', '/tabs', {
      userId: USER_ID,
      sessionKey: 'wiki',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(searchName)}`,
    });
    const tabId = tab.tabId;
    await new Promise(r => setTimeout(r, 2000));

    // Get snapshot
    const snap = await camofox('GET', `/tabs/${tabId}/snapshot?userId=${USER_ID}`);
    const pageText = snap.snapshot || '';
    const pageTitle = snap.title || '';

    let birthday = null;
    let va = null;
    let relatives = [];

    // Check if we got a valid page (not a disambiguation/search page)
    const isDisambig = pageText.toLowerCase().includes('disambiguation') ||
                       pageText.toLowerCase().includes('may refer to') ||
                       pageText.toLowerCase().includes('search results');

    if (!isDisambig && !pageTitle.toLowerCase().includes('not found') && !pageTitle.toLowerCase().includes('wikipedia does not have')) {
      birthday = extractBirthdayFromText(pageText);
      va = extractVAFromText(pageText);
      relatives = extractRelativesFromText(pageText);
    } else if (isDisambig) {
      // Try clicking first link
      const firstLinkMatch = pageText.match(/\[link\s+(e\d+)\]/);
      if (firstLinkMatch) {
        await camofox('POST', `/tabs/${tabId}/click`, { userId: USER_ID, ref: firstLinkMatch[1] });
        await new Promise(r => setTimeout(r, 2000));
        const snap2 = await camofox('GET', `/tabs/${tabId}/snapshot?userId=${USER_ID}`);
        const text2 = snap2.snapshot || '';
        birthday = extractBirthdayFromText(text2);
        va = extractVAFromText(text2);
        relatives = extractRelativesFromText(text2);
      }
    }

    // Close tab
    await camofox('DELETE', `/tabs/${tabId}?userId=${USER_ID}`);

    return { name: charData.name, birthday, va, relatives, success: !!(birthday || va || relatives.length > 0) };
  } catch (err) {
    return { name: charData.name, birthday: null, va: null, relatives: [], success: false, error: err.message };
  }
}

async function main() {
  console.log('Camoufox Wikipedia Research Script\n');

  const data = JSON.parse(fs.readFileSync(CHAR_FILE, 'utf8'));
  console.log(`Loaded ${data.length} characters from dataset\n`);

  // Pick top-priority research candidates
  const candidates = [];

  // Priority 1: Major DC/Marvel characters missing birthday
  const majorMissingBday = data.filter(c => {
    const hasBday = c.basic_info?.birthday && c.basic_info.birthday !== 'Unknown';
    return !hasBday && (c.publisher === 'dc' || c.publisher === 'marvel') && c.name.split(' ').filter(w => w.length > 2).length <= 3;
  });
  candidates.push(...majorMissingBday.map(c => ({ char: c, priority: 1 })));

  // Priority 2: Anime characters missing VA (from well-known series)
  const animeMissingVA = data.filter(c => {
    if (c.publisher !== 'anime') return false;
    const hasVA = c.voice_acting?.japanese && c.voice_acting.japanese !== 'Unknown';
    return !hasVA && c.about && c.about.length > 100;
  });
  candidates.push(...animeMissingVA.map(c => ({ char: c, priority: 2 })));

  // Priority 3: Other missing birthdays (short names, likely have pages)
  const otherMissingBday = data.filter(c => {
    const hasBday = c.basic_info?.birthday && c.basic_info.birthday !== 'Unknown';
    return !hasBday && !majorMissingBday.includes(c) && c.about && c.about.length > 200 && c.name.length < 25;
  });
  candidates.push(...otherMissingBday.slice(0, 50).map(c => ({ char: c, priority: 3 })));

  console.log(`Total research candidates: ${candidates.length}`);

  // Load progress
  let progress = {};
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
    catch {}
  }
  console.log(`Previously researched: ${Object.keys(progress).length}`);

  // Process in batches
  const results = [];
  let researched = 0;
  let found = 0;

  for (const { char: rawChar, priority } of candidates) {
    if (researched >= 30) break; // Limit per run

    // Find by name (compiled JSON has BOTH name formats)
    let charData = data.find(c => c.id === rawChar.id);
    if (!charData) charData = rawChar;

    if (progress[charData.id]) {
      console.log(`  [SKIP] ${charData.name} - already researched`);
      continue;
    }

    // Check if already has the data we want
    const hasBday = charData.basic_info?.birthday && charData.basic_info.birthday !== 'Unknown';
    const hasVA = charData.voice_acting?.japanese && charData.voice_acting.japanese !== 'Unknown';
    if (hasBday && hasVA) {
      console.log(`  [SKIP] ${charData.name} - already has birthday and VA`);
      progress[charData.id] = { skipped: true };
      continue;
    }

    console.log(`\n  [${researched + 1}] Researching ${charData.name} (${charData.publisher}, p${priority})...`);
    const result = await researchCharacter(charData.name, charData);
    console.log(`    -> Birthday: ${result.birthday || 'NOT FOUND'}, VA: ${result.va || 'NOT FOUND'}, Relatives: ${result.relatives.length}`);

    progress[charData.id] = result;
    results.push(result);
    researched++;
    if (result.success) found++;

    // Save progress after each
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));

    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n=== Research Complete ===`);
  console.log(`Researched: ${researched}`);
  console.log(`Found data: ${found}`);

  // Apply results
  let bdayUpdates = 0, vaUpdates = 0, relUpdates = 0;

  // Reload data from files to apply changes
  const charactersDir = path.join(__dirname, '..', 'data', 'characters');
  const publishers = fs.readdirSync(charactersDir).filter(f =>
    fs.statSync(path.join(charactersDir, f)).isDirectory()
  );

  for (const publisher of publishers) {
    const pubDir = path.join(charactersDir, publisher);
    const files = fs.readdirSync(pubDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(pubDir, file);
      const charId = file.replace('.json', '');
      const res = progress[charId];
      if (!res || res.skipped || !res.success) continue;

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let modified = false;

      // Apply birthday
      if (res.birthday && (!content.basic_info?.birthday || content.basic_info.birthday === 'Unknown')) {
        if (!content.basic_info) content.basic_info = {};
        content.basic_info.birthday = res.birthday;
        bdayUpdates++;
        modified = true;
      }

      // Apply VA
      if (res.va && (!content.voice_acting?.japanese || content.voice_acting.japanese === 'Unknown')) {
        if (!content.voice_acting) content.voice_acting = {};
        content.voice_acting.japanese = res.va;
        vaUpdates++;
        modified = true;
      }

      // Apply relatives
      if (res.relatives && res.relatives.length > 0 && (!content.relationships?.relatives || content.relationships.relatives.length === 0)) {
        if (!content.relationships) content.relationships = {};
        if (!content.relationships.relatives) content.relationships.relatives = [];
        content.relationships.relatives.push(...res.relatives);
        relUpdates++;
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
      }
    }
  }

  console.log(`\nUpdates applied: ${bdayUpdates} birthdays, ${vaUpdates} VAs, ${relUpdates} relatives`);
  console.log('Done.\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
