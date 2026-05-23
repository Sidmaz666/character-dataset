#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');

function collectLeaves(obj, prefix = '') {
  const leaves = {};
  for (const [key, value] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(leaves, collectLeaves(value, p));
    } else {
      leaves[p] = Array.isArray(value) ? 'array' : typeof value;
    }
  }
  return leaves;
}

function buildTemplate(unionLeaves, alwaysArrayFields) {
  const template = {};
  for (const leafPath of Object.keys(unionLeaves)) {
    const parts = leafPath.split('.');
    let current = template;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (i === parts.length - 1) {
        if (current[part] === undefined) {
          current[part] = alwaysArrayFields.has(leafPath) ? [] : null;
        }
      } else {
        if (!current[part] || typeof current[part] !== 'object' || Array.isArray(current[part])) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }
  return template;
}

function fillMissing(target, template) {
  for (const [key, value] of Object.entries(template)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if (!(key in target) || target[key] === null || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      fillMissing(target[key], value);
    } else {
      if (!(key in target) || target[key] === undefined) {
        target[key] = value;
      }
    }
  }
  return target;
}

function normalizeNullStrings(obj) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === 'null') {
      obj[key] = null;
    } else if (value !== null && typeof value === 'object') {
      normalizeNullStrings(value);
    }
  }
}

function findCharsByName(name, allChars) {
  if (!name || typeof name !== 'string') return [];
  const lower = name.toLowerCase();
  return Object.values(allChars).filter(c =>
    c.name && c.name.toLowerCase() === lower ||
    c.full_name && c.full_name.toLowerCase() === lower
  );
}

async function main() {
  console.log('Normalizing character JSON files to unified schema...\n');

  if (!fs.existsSync(CHARACTERS_DIR)) {
    console.error('Characters directory not found:', CHARACTERS_DIR);
    process.exit(1);
  }

  const publishers = fs.readdirSync(CHARACTERS_DIR).filter(f =>
    fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory()
  );

  // First pass: collect union leaves and detect which fields are exclusively arrays
  const unionLeaves = {};
  const maybeArrayFields = new Set();
  const nonArrayFields = new Set();
  let totalFiles = 0;

  for (const publisher of publishers) {
    const pubDir = path.join(CHARACTERS_DIR, publisher);
    const files = fs.readdirSync(pubDir).filter(f => f.endsWith('.json'));
    totalFiles += files.length;

    for (const file of files) {
      const filePath = path.join(pubDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const leaves = collectLeaves(raw);
      for (const [k, v] of Object.entries(leaves)) {
        if (!unionLeaves[k]) unionLeaves[k] = v;
        if (v === 'array') {
          maybeArrayFields.add(k);
        } else {
          nonArrayFields.add(k);
        }
      }
    }
  }

  // A field gets [] default only if it's exclusively arrays in all files
  const alwaysArrayFields = new Set(
    [...maybeArrayFields].filter(k => !nonArrayFields.has(k))
  );

  console.log(`Union schema: ${Object.keys(unionLeaves).length} leaf fields across ${totalFiles} files`);
  console.log(`Fields with [] default: ${alwaysArrayFields.size}`);

  // Build the canonical template with proper array defaults
  const template = buildTemplate(unionLeaves, alwaysArrayFields);

  // Second pass: fill missing fields and enrich
  let filesUpdated = 0;
  let nullArrsFixed = 0;
  let skinMerges = 0;
  let vaLangFilled = 0;
  let sourceFilled = 0;

  const allChars = {};

  for (const publisher of publishers) {
    const pubDir = path.join(CHARACTERS_DIR, publisher);
    const files = fs.readdirSync(pubDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(pubDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      allChars[raw.id] = raw;

      const before = JSON.stringify(raw);

      // Fill missing schema fields
      fillMissing(raw, template);

      // Normalize string 'null' values to proper null
      normalizeNullStrings(raw);

      // Enrichment: merge appearance.skin / appearance.skin_color
      const s = raw.appearance;
      if (s) {
        if (s.skin && !s.skin_color) { s.skin_color = s.skin; skinMerges++; }
        else if (s.skin_color && !s.skin) { s.skin = s.skin_color; skinMerges++; }
      }

      // Enrichment: voice acting native_language by publisher
      const va = raw.voice_acting;
      if (va && (!va.native_language || va.native_language === null)) {
        va.native_language = raw.publisher === 'anime' ? 'Japanese' : 'English';
        vaLangFilled++;
      }

      // Enrichment: source by publisher
      if (!raw.source || raw.source === null) {
        raw.source = raw.publisher;
        sourceFilled++;
      }

      // Enrichment: fix null → [] for fields that are always arrays
      for (const [key, value] of Object.entries(raw)) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          for (const [k2, v2] of Object.entries(value)) {
            const leafPath = `${key}.${k2}`;
            if (v2 === null && alwaysArrayFields.has(leafPath)) {
              value[k2] = [];
              nullArrsFixed++;
            }
          }
        }
      }

      const after = JSON.stringify(raw);
      if (before !== after) {
        fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf-8');
        filesUpdated++;
      }
    }
  }

  // Enrichment: reciprocal relationships (requires full char map)
  const reciprocalMap = {
    mentor: { reverse: 'student' },
    student: { reverse: 'mentor' },
    rival: { reverse: 'rival' },
    best_friend: { reverse: 'best_friend' },
    nemesis: { reverse: 'nemesis' },
    partner: { reverse: 'partner' },
    love_interest: { reverse: 'love_interest' },
    ally: { reverse: 'ally' },
    enemy: { reverse: 'enemy' },
    leader: { reverse: 'subordinate' },
    subordinate: { reverse: 'leader' },
  };

  let reciprocalFilled = 0;

  for (const c of Object.values(allChars)) {
    const rel = c.relationships;
    if (!rel) continue;

    for (const [field, config] of Object.entries(reciprocalMap)) {
      const val = rel[field];
      if (!val || val === null || (Array.isArray(val) && val.length === 0)) continue;

      const names = Array.isArray(val) ? val : [val];
      for (const name of names) {
        const matches = findCharsByName(name, allChars);
        for (const match of matches) {
          const mRel = match.relationships;
          if (!mRel) continue;
          const revField = config.reverse;
          if (!mRel[revField] || mRel[revField] === null || (Array.isArray(mRel[revField]) && mRel[revField].length === 0)) {
            mRel[revField] = c.name;
            reciprocalFilled++;
          }
        }
      }
    }
  }

  // Write updated reciprocal relationships
  let relFilesUpdated = 0;
  for (const c of Object.values(allChars)) {
    const filePath = path.join(CHARACTERS_DIR, c.publisher, c.id + '.json');
    fs.writeFileSync(filePath, JSON.stringify(c, null, 2) + '\n', 'utf-8');
    relFilesUpdated++;
  }

  console.log(`Null arrays fixed: ${nullArrsFixed}`);
  console.log(`Skin/skin_color merged: ${skinMerges}`);
  console.log(`Voice language filled: ${vaLangFilled}`);
  console.log(`Source filled: ${sourceFilled}`);
  console.log(`Reciprocal relationships filled: ${reciprocalFilled}`);
  console.log(`Files updated: ${filesUpdated}`);
  console.log('Done.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
