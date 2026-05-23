#!/usr/bin/env node
// Parse structured data embedded in the `about` field into proper schema fields.
// Many `about` texts contain lines like "Birthday: June 10", "Blood type: A", etc.
const path = require('path');
const fs = require('fs');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');

const MONTH_NAMES = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

function isFilled(val) {
  return val !== null && val !== undefined && val !== '' && val !== 'Unknown';
}

function extractFromAbout(c) {
  if (!c.about || c.about.length < 20) return {};
  const a = c.about;
  const changes = {};

  // --- Birthday ---
  // "Birthday: June 10, 1995" or "Birthday: June 10" or "Birth: June 10"
  if (!isFilled(c.basic_info?.birthday)) {
    const m = a.match(/(?:birth(?:day)?|born)(?:\s*:\s*|\s+)([A-Z][a-z]+(?:\s+\d{1,2}(?:,\s*\d{4})?)?)/);
    if (m) {
      const bday = m[1].trim();
      if (bday.length > 2 && bday.length < 30 && !bday.includes('Place') && !bday.includes('Origin')) {
        changes.birthday = bday;
      }
    }
  }

  // --- Blood type ---
  // "Blood type: A" or "Blood Type: AB" or "Blood: O"
  if (!isFilled(c.basic_info?.blood_type)) {
    const m = a.match(/blood\s*(?:type|group)?\s*:\s*([ABOaboli]+(?:\s*[+-])?)/i);
    if (m) {
      const bt = m[1].toUpperCase().trim();
      if (/^[ABO][+-]?$/.test(bt) || bt === 'AB' || bt === 'AB+' || bt === 'AB-') {
        changes.blood_type = bt;
      }
    }
  }

  // --- Height ---
  // "Height: 175 cm" or "Height: 5'8\"" or "Height: 175cm"
  if (!isFilled(c.basic_info?.height_cm)) {
    const m = a.match(/height\s*:\s*(\d+(?:\.\d+)?)\s*(?:cm|m)?/i);
    if (m) {
      const h = parseFloat(m[1]);
      if (h > 30 && h < 300) changes.height_cm = h;
    }
  }

  // --- Weight ---
  // "Weight: 67 kg" or "Weight: 67kg"
  if (!isFilled(c.basic_info?.weight_kg)) {
    const m = a.match(/weight\s*:\s*(\d+(?:\.\d+)?)\s*(?:kg|lbs?)?/i);
    if (m) {
      const w = parseFloat(m[1]);
      if (w > 10 && w < 500) changes.weight_kg = w;
    }
  }

  // --- Age ---
  // "Age: 16" or "Age: 27" or "Age: 34 (end)"
  if (!isFilled(c.basic_info?.age)) {
    const m = a.match(/age\s*:\s*(\d{1,3})/i);
    if (m) {
      const age = m[1];
      if (parseInt(age) > 0 && parseInt(age) < 200) changes.age = age;
    }
  }

  // --- Eye color ---
  // "Eye: Blue" or "Eyes: Brown" or "Eye color: Green"
  if (!isFilled(c.appearance?.eye_color)) {
    const m = a.match(/(?:eye[s]?\s*(?:color)?\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?))|(?:([A-Za-z]+)\s+eyes)/i);
    if (m) {
      const ec = (m[1] || m[2] || '').trim();
      if (ec.length > 1 && ec.length < 20) changes.eye_color = ec;
    }
  }

  // --- Hair color ---
  // "Hair: Black" or "Hair color: Brown"
  if (!isFilled(c.appearance?.hair_color)) {
    const m = a.match(/hair\s*(?:color)?\s*:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (m) {
      const hc = m[1].trim();
      if (hc.length > 1 && hc.length < 20) changes.hair_color = hc;
    }
  }

  // --- Skin color ---
  // "Skin: Fair" or "Skin color: Pale"
  if (!isFilled(c.appearance?.skin_color)) {
    const m = a.match(/skin\s*(?:color)?\s*:\s*([A-Za-z]+)/i);
    if (m) {
      const sc = m[1].trim();
      if (sc.length > 1 && sc.length < 20) changes.skin_color = sc;
    }
  }

  // --- Zodiac ---
  // "Zodiac: Leo" or "Sign: Aries"
  const zodiacSigns = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  if (!isFilled(c.basic_info?.zodiac)) {
    const m = a.match(/(?:zodiac|sign|zodiac sign)\s*:\s*(\w+)/i);
    if (m) {
      const z = m[1];
      if (zodiacSigns.some(s => s.toLowerCase() === z.toLowerCase())) {
        changes.zodiac = z.charAt(0).toUpperCase() + z.slice(1).toLowerCase();
      }
    }
  }

  // --- Japanese VA ---
  // "Japanese VA: Name" or "Voice actor: Name" or "Voiced by: Name"
  if (!isFilled(c.voice_acting?.japanese)) {
    const m = a.match(/(?:japanese\s+(?:va|voice|voice actor)\s*:\s*([A-Za-z\s]+?))|(?:voiced\s+by\s*:\s*([A-Za-z\s]+?))/i);
    if (m) {
      const va = (m[1] || m[2] || '').trim();
      if (va.length > 2 && va.length < 40 && !va.match(/^(?:Yes|No|Unknown|None|N\/A)$/i)) {
        changes.japanese_va = va;
      }
    }
  }

  // --- Place of birth ---
  // "Birthplace: Tokyo" or "Place of birth: New York"
  if (!isFilled(c.origin?.place_of_birth)) {
    const m = a.match(/(?:birthplace|place of birth)\s*:\s*(.+?)(?:\n|$)/i);
    if (m) {
      const pb = m[1].trim();
      if (pb.length > 2 && pb.length < 60) changes.place_of_birth = pb;
    }
  }

  return changes;
}

async function main() {
  console.log('Parsing structured data from about fields...\n');

  let totalBirthday = 0, totalBlood = 0, totalHeight = 0, totalWeight = 0;
  let totalAge = 0, totalEye = 0, totalHair = 0, totalSkin = 0;
  let totalZodiac = 0, totalVA = 0, totalPlace = 0;

  for (const pub of fs.readdirSync(CHARACTERS_DIR).filter(f => fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory())) {
    for (const file of fs.readdirSync(path.join(CHARACTERS_DIR, pub)).filter(f => f.endsWith('.json'))) {
      const filePath = path.join(CHARACTERS_DIR, pub, file);
      const c = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const changes = extractFromAbout(c);

      if (Object.keys(changes).length === 0) continue;

      if (!c.basic_info) c.basic_info = {};
      if (!c.appearance) c.appearance = {};
      if (!c.voice_acting) c.voice_acting = {};
      if (!c.origin) c.origin = {};

      if (changes.birthday) { c.basic_info.birthday = changes.birthday; totalBirthday++; }
      if (changes.blood_type) { c.basic_info.blood_type = changes.blood_type; totalBlood++; }
      if (changes.height_cm) { c.basic_info.height_cm = changes.height_cm; totalHeight++; }
      if (changes.weight_kg) { c.basic_info.weight_kg = changes.weight_kg; totalWeight++; }
      if (changes.age) { c.basic_info.age = changes.age; totalAge++; }
      if (changes.eye_color) { c.appearance.eye_color = changes.eye_color; totalEye++; }
      if (changes.hair_color) { c.appearance.hair_color = changes.hair_color; totalHair++; }
      if (changes.skin_color) { c.appearance.skin_color = changes.skin_color; totalSkin++; }
      if (changes.zodiac) { c.basic_info.zodiac = changes.zodiac; totalZodiac++; }
      if (changes.japanese_va) { c.voice_acting.japanese = changes.japanese_va; totalVA++; }
      if (changes.place_of_birth) { c.origin.place_of_birth = changes.place_of_birth; totalPlace++; }

      fs.writeFileSync(filePath, JSON.stringify(c, null, 2) + '\n', 'utf-8');
    }
  }

  console.log('Extracted from about fields:');
  console.log(`  birthday: ${totalBirthday}`);
  console.log(`  blood_type: ${totalBlood}`);
  console.log(`  height_cm: ${totalHeight}`);
  console.log(`  weight_kg: ${totalWeight}`);
  console.log(`  age: ${totalAge}`);
  console.log(`  eye_color: ${totalEye}`);
  console.log(`  hair_color: ${totalHair}`);
  console.log(`  skin_color: ${totalSkin}`);
  console.log(`  zodiac: ${totalZodiac}`);
  console.log(`  japanese_va: ${totalVA}`);
  console.log(`  place_of_birth: ${totalPlace}`);
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
