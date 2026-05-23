#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');

const ZODIAC_SIGNS = [
  { name: 'Capricorn', start: [12, 22], end: [1, 19] },
  { name: 'Aquarius', start: [1, 20], end: [2, 18] },
  { name: 'Pisces', start: [2, 19], end: [3, 20] },
  { name: 'Aries', start: [3, 21], end: [4, 19] },
  { name: 'Taurus', start: [4, 20], end: [5, 20] },
  { name: 'Gemini', start: [5, 21], end: [6, 20] },
  { name: 'Cancer', start: [6, 21], end: [7, 22] },
  { name: 'Leo', start: [7, 23], end: [8, 22] },
  { name: 'Virgo', start: [8, 23], end: [9, 22] },
  { name: 'Libra', start: [9, 23], end: [10, 22] },
  { name: 'Scorpio', start: [10, 23], end: [11, 21] },
  { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
];

const MONTH_NUM = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

function parseBirthday(str) {
  if (!str || typeof str !== 'string') return null;
  let m = null, d = null;
  const lower = str.toLowerCase().trim();

  // "Month DD, YYYY" or "Month DD"
  let match = lower.match(/^([a-z]+)\s+(\d{1,2})(?:,\s*\d{4})?$/);
  if (match) {
    m = MONTH_NUM[match[1]];
    d = parseInt(match[2]);
    if (m && d >= 1 && d <= 31) return [m, d];
  }

  // "Month DD-DD"
  match = lower.match(/^([a-z]+)\s+(\d{1,2})/);
  if (match) {
    m = MONTH_NUM[match[1]];
    d = parseInt(match[2]);
    if (m && d >= 1 && d <= 31) return [m, d];
  }

  return null;
}

function getZodiac(month, day) {
  for (const sign of ZODIAC_SIGNS) {
    const s = sign.start, e = sign.end;
    if ((month === s[0] && day >= s[1]) || (month === e[0] && day <= e[1])) {
      return sign.name;
    }
    if (s[0] > e[0] && (month >= s[0] || month <= e[0])) {
      if (month === s[0] && day >= s[1]) return sign.name;
      if (month === e[0] && day <= e[1]) return sign.name;
      if (month > s[0] || month < e[0]) return sign.name;
    }
  }
  return null;
}

const WEAPON_KEYWORDS = [
  'sword', 'blade', 'gun', 'spear', 'axe', 'bow', 'hammer', 'staff',
  'whip', 'shield', 'dagger', 'arrow', 'rifle', 'cannon', 'katana',
  'scythe', 'lance', 'mace', 'saber', 'pistol', 'shotgun', 'sniper',
  'bomb', 'knife', 'claw', 'slash', 'strike', 'fencing', 'rapier',
  'halberd', 'crossbow', 'club', 'javelin', 'trident', 'shuriken',
  'kunai', 'boomerang', 'flail', 'baton', 'tonfa', 'nunchaku',
  'lightsaber', 'blaster', 'photon', 'disruptor',
];

const TRAIT_TYPE_MAP = [
  { keywords: ['analytical', 'strategic', 'logical', 'intelligent', 'calculating', 'perfectionist', 'genius', 'inventive', 'curious', 'methodical'], type: 'INTJ' },
  { keywords: ['creative', 'visionary', 'insightful', 'mysterious', 'idealistic', 'complex', 'deep', 'philosophical', 'enigmatic', 'private'], type: 'INFJ' },
  { keywords: ['charismatic', 'energetic', 'persuasive', 'adventurous', 'daring', 'bold', 'confident', 'ambitious', 'competitive', 'impulsive'], type: 'ENTP' },
  { keywords: ['organized', 'practical', 'responsible', 'reliable', 'dedicated', 'hardworking', 'loyal', 'patient', 'traditional', 'disciplined'], type: 'ISTJ' },
  { keywords: ['caring', 'compassionate', 'empathetic', 'warm', 'nurturing', 'selfless', 'gentle', 'kind', 'supportive', 'sensitive'], type: 'ISFJ' },
  { keywords: ['brave', 'courageous', 'determined', 'strong-willed', 'fearless', 'heroic', 'protective', 'righteous', 'valiant', 'righteous'], type: 'ENFJ' },
  { keywords: ['adaptable', 'spontaneous', 'playful', 'enthusiastic', 'optimistic', 'cheerful', 'fun-loving', 'social', 'outgoing', 'friendly'], type: 'ESFP' },
  { keywords: ['calm', 'observant', 'independent', 'resourceful', 'pragmatic', 'realistic', 'steady', 'stoic', 'reserved', 'self-reliant'], type: 'ISTP' },
  { keywords: ['passionate', 'intense', 'driven', 'focused', 'ambitious', 'dominant', 'assertive', 'forceful', 'confident', 'determined'], type: 'ENTJ' },
  { keywords: ['loyal', 'protective', 'fierce', 'territorial', 'direct', 'blunt', 'honest', 'straightforward', 'stubborn', 'proud'], type: 'ESTP' },
  { keywords: ['wise', 'patient', 'humble', 'spiritual', 'balanced', 'serene', 'peaceful', 'reflective', 'introspective', 'contemplative'], type: 'INFP' },
  { keywords: ['artistic', 'expressive', 'emotional', 'passionate', 'dramatic', 'sensitive', 'intuitive', 'imaginative', 'dreamy', 'romantic'], type: 'ENFP' },
  { keywords: ['efficient', 'results-oriented', 'practical', 'organized', 'decisive', 'assertive', 'structured', 'dependable', 'proactive', 'effective'], type: 'ESTJ' },
  { keywords: ['curious', 'questioning', 'analytical', 'skeptical', 'objective', 'rational', 'logical', 'precise', 'systematic', 'scientific'], type: 'INTP' },
  { keywords: ['charming', 'diplomatic', 'sociable', 'harmonious', 'persuasive', 'tactful', 'graceful', 'polite', 'refined', 'elegant'], type: 'ESFJ' },
];

function detectPersonalityType(traits) {
  if (!traits || !Array.isArray(traits) || traits.length === 0) return null;
  const lower = traits.map(t => t.toLowerCase());
  const scores = {};
  for (const entry of TRAIT_TYPE_MAP) {
    scores[entry.type] = entry.keywords.filter(kw => lower.some(t => t.includes(kw))).length;
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? best[0] : null;
}

const PUBLISHER_POWER_SOURCE = {
  anime: 'Unknown',
  dark_horse: 'Psychic',
  dc: 'Various',
  idw_publishing: 'Spark/Energon',
  image_comics: 'Viltrumite Genetics',
  marvel: 'Various',
  nbc_heroes: 'Genetic mutation',
  star_trek: 'Training',
  star_wars: 'The Force',
  the_boys: 'Compound V',
};

function getAbilityByPowerLevel(abilities) {
  if (!abilities || !Array.isArray(abilities) || abilities.length === 0) return null;
  const sorted = [...abilities].sort((a, b) => {
    const pa = parseInt(a.power_level) || 0;
    const pb = parseInt(b.power_level) || 0;
    return pb - pa;
  });
  return sorted[0].name || null;
}

function findWeaponInAbilities(abilities) {
  if (!abilities || !Array.isArray(abilities)) return null;
  for (const a of abilities) {
    if (a && a.name) {
      const lower = a.name.toLowerCase();
      for (const kw of WEAPON_KEYWORDS) {
        if (lower.includes(kw)) return a.name;
      }
    }
  }
  return null;
}

async function main() {
  console.log('Enriching character data with derived values...\n');

  if (!fs.existsSync(CHARACTERS_DIR)) {
    console.error('Characters directory not found:', CHARACTERS_DIR);
    process.exit(1);
  }

  const publishers = fs.readdirSync(CHARACTERS_DIR).filter(f =>
    fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory()
  );

  // Load all characters
  const allChars = {};
  for (const publisher of publishers) {
    const pubDir = path.join(CHARACTERS_DIR, publisher);
    for (const file of fs.readdirSync(pubDir).filter(f => f.endsWith('.json'))) {
      const raw = JSON.parse(fs.readFileSync(path.join(pubDir, file), 'utf-8'));
      allChars[raw.id] = raw;
    }
  }

  let stats = {};

  function track(field) {
    stats[field] = (stats[field] || 0) + 1;
  }

  for (const c of Object.values(allChars)) {
    // 1. Zodiac from birthday
    const bi = c.basic_info;
    if (bi && (!bi.zodiac || bi.zodiac === null || bi.zodiac === 'Unknown') && bi.birthday) {
      const parsed = parseBirthday(bi.birthday);
      if (parsed) {
        const zodiac = getZodiac(parsed[0], parsed[1]);
        if (zodiac) { bi.zodiac = zodiac; track('zodiac'); }
      }
    }

    // 2. Origin.base_of_operations from current_location or place_of_birth
    const og = c.origin;
    if (og && (!og.base_of_operations || og.base_of_operations === null)) {
      if (og.current_location && og.current_location !== 'Unknown') {
        og.base_of_operations = og.current_location;
        track('base_of_operations');
      } else if (og.place_of_birth && og.place_of_birth !== 'Unknown') {
        og.base_of_operations = og.place_of_birth;
        track('base_of_operations');
      }
    }

    // 3. Misc.headquarters from origin fields
    const mc = c.misc;
    if (mc && (!mc.headquarters || mc.headquarters === null)) {
      if (og && og.base_of_operations && og.base_of_operations !== 'Unknown') {
        mc.headquarters = og.base_of_operations;
        track('headquarters');
      } else if (og && og.current_location && og.current_location !== 'Unknown') {
        mc.headquarters = og.current_location;
        track('headquarters');
      }
    }

    // 4. Story.fate from story.status
    const st = c.story;
    if (st && (!st.fate || st.fate === null || st.fate === 'Unknown') && st.status && st.status !== 'Unknown') {
      const status = st.status.toLowerCase();
      if (status.startsWith('deceased') || status.startsWith('deleted') || status.startsWith('destroyed') || status.startsWith('erased')) {
        st.fate = 'Deceased';
        track('fate');
      } else if (status.startsWith('alive') || status.startsWith('active') || status.startsWith('immortal') || status.startsWith('undead') || status.startsWith('reformed')) {
        st.fate = 'Alive';
        track('fate');
      } else if (status.startsWith('imprisoned') || status.startsWith('defeated') || status.startsWith('retired') || status.startsWith('disbanded')) {
        st.fate = status.charAt(0).toUpperCase() + status.slice(1);
        track('fate');
      }
    }

    // 5. Personality.dream from character.motivation
    const pe = c.personality;
    const ch = c.character;
    if (pe && (!pe.dream || pe.dream === null || pe.dream === 'Unknown') && ch && ch.motivation && ch.motivation !== null) {
      pe.dream = ch.motivation;
      track('dream');
    }

    // 6. Personality.fear from weaknesses
    if (pe && (!pe.fear || pe.fear === null || pe.fear === 'Unknown')) {
      const wk = c.weaknesses;
      if (wk && wk.list && Array.isArray(wk.list) && wk.list.length > 0) {
        const first = wk.list[0];
        if (first && first !== 'Unknown') {
          pe.fear = first;
          track('fear');
        }
      }
    }

    // 7. Ultimate_move from abilities
    if (!c.ultimate_move || c.ultimate_move === null || c.ultimate_move === 'Unknown') {
      const top = getAbilityByPowerLevel(c.abilities);
      if (top) { c.ultimate_move = top; track('ultimate_move'); }
    }

    // 8. Trump_card from abilities (if no ultimate_move was derived, try here)
    if (!c.trump_card || c.trump_card === null || c.trump_card === 'Unknown') {
      const top = getAbilityByPowerLevel(c.abilities);
      if (top && (!c.ultimate_move || c.ultimate_move === top)) {
        // If abilities has a second-highest, use that
        if (c.abilities && Array.isArray(c.abilities) && c.abilities.length > 1) {
          const sorted = [...c.abilities].sort((a, b) => {
            const pa = parseInt(a.power_level) || 0;
            const pb = parseInt(b.power_level) || 0;
            return pb - pa;
          });
          const second = sorted[1] && sorted[1].name !== top ? sorted[1].name : top;
          c.trump_card = second;
          track('trump_card');
        } else {
          c.trump_card = top;
          track('trump_card');
        }
      } else if (top && c.ultimate_move !== top) {
        c.trump_card = top;
        track('trump_card');
      }
    }

    // 9. Power_attributes.weapon from abilities
    const pa = c.power_attributes;
    if (pa && (!pa.weapon || pa.weapon === null)) {
      const weapon = findWeaponInAbilities(c.abilities);
      if (weapon) { pa.weapon = weapon; track('weapon'); }
    }

    // 10. Power_attributes.power_source from publisher default
    if (pa && (!pa.power_source || pa.power_source === null || pa.power_source === 'Unknown')) {
      const def = PUBLISHER_POWER_SOURCE[c.publisher];
      if (def) { pa.power_source = def; track('power_source'); }
    }

    // 11. Power_attributes.power_type from publisher default
    if (pa && (!pa.power_type || pa.power_type === null || pa.power_type === 'Unknown') && c.publisher !== 'anime') {
      if (c.publisher === 'marvel' || c.publisher === 'dc') {
        pa.power_type = 'Superhuman';
        track('power_type');
      } else if (c.publisher === 'star_wars') {
        pa.power_type = 'Force';
        track('power_type');
      } else if (c.publisher === 'the_boys') {
        pa.power_type = 'Compound V';
        track('power_type');
      }
    }

    // 12. Character.affinity from alignment (simple mapping)
    if (ch && (!ch.affinity || ch.affinity === null || ch.affinity === 'Unknown') && ch.alignment && ch.alignment !== null) {
      const align = ch.alignment.toLowerCase();
      if (align.includes('good')) {
        ch.affinity = 'Good';
        track('affinity');
      } else if (align.includes('evil')) {
        ch.affinity = 'Evil';
        track('affinity');
      } else if (align.includes('neutral')) {
        ch.affinity = 'Neutral';
        track('affinity');
      }
    }

    // 13. Personality.personality_type from traits
    if (pe && (!pe.personality_type || pe.personality_type === null || pe.personality_type === 'Unknown')) {
      const detected = detectPersonalityType(pe.traits);
      if (detected) { pe.personality_type = detected; track('personality_type'); }
    }

    // 14. Voice_acting.english
    const va = c.voice_acting;
    if (va && (!va.english || va.english === null || va.english === 'Unknown')) {
      va.english = 'Unknown';
      track('va_english');
    }

    // 15. Occupation.rank_title from rank / rank-title
    const oc = c.occupation;
    if (oc && (!oc.rank_title || oc.rank_title === null || oc.rank_title === 'Unknown')) {
      if (oc['rank-title'] && oc['rank-title'] !== 'Unknown') {
        oc.rank_title = oc['rank-title'];
        track('rank_title');
      } else if (oc.rank && oc.rank !== 'Unknown') {
        oc.rank_title = oc.rank;
        track('rank_title');
      }
    }

    // 16. First_appearance.comics for Marvel/DC
    const fa = c.first_appearance;
    if (fa && (!fa.comics || fa.comics === null || fa.comics === '') && (c.publisher === 'marvel' || c.publisher === 'dc')) {
      fa.comics = 'Unknown';
      track('comics_debut');
    }

    // 17. Bounty.details and currency defaults
    const bo = c.bounty;
    if (bo) {
      if (bo.amount !== null && bo.amount !== undefined && (!bo.details || bo.details === null)) {
        bo.details = 'None';
        track('bounty_details');
      }
      if (bo.amount !== null && bo.amount !== undefined && (!bo.currency || bo.currency === null)) {
        bo.currency = c.publisher === 'anime' ? 'Berry' : 'USD';
        track('bounty_currency');
      }
    }

    // 18. Misc.story_importance from story.role_in_story
    if (mc && (!mc.story_importance || mc.story_importance === null) && st && st.role_in_story && st.role_in_story !== 'Unknown') {
      mc.story_importance = st.role_in_story;
      track('story_importance');
    }

    // 19. Story.awakening_potential from powerstats
    const ps = c.powerstats;
    if (st && (!st.awakening_potential || st.awakening_potential === null || st.awakening_potential === 'Unknown') && ps) {
      const total = ps.total || (ps.intelligence + ps.strength + ps.speed + ps.durability + ps.power + ps.combat);
      if (total >= 400) {
        st.awakening_potential = 'Awakened';
        track('awakening_potential');
      } else if (total >= 250) {
        st.awakening_potential = 'Potential exists';
        track('awakening_potential');
      }
    }

    // 20. First_appearance.manga from anime for anime chars
    if (c.publisher === 'anime' && fa && (!fa.manga || fa.manga === null || fa.manga === 'Unknown') && fa.anime && fa.anime !== null && fa.anime !== 'Unknown') {
      fa.manga = fa.anime;
      track('manga_from_anime');
    }

    // 21. First_appearance.anime for non-anime chars (use fa from above)
    if (c.publisher !== 'anime' && fa && (!fa.anime || fa.anime === null || fa.anime === '' || fa.anime === 'null')) {
      fa.anime = 'N/A';
      track('anime_na');
    }

    // 22. Personality.likes from traits
    if (pe && (!pe.likes || pe.likes.length === 0) && pe.traits && Array.isArray(pe.traits) && pe.traits.length > 0) {
      const tSet = new Set(pe.traits.map(t => t.toLowerCase()));
      const likes = [];
      if (tSet.has('adventurous') || tSet.has('daring')) likes.push('Adventure');
      if (tSet.has('social') || tSet.has('friendly') || tSet.has('outgoing')) likes.push('Socializing');
      if (tSet.has('intelligent') || tSet.has('curious') || tSet.has('analytical')) likes.push('Learning');
      if (tSet.has('competitive') || tSet.has('ambitious')) likes.push('Competition');
      if (tSet.has('creative') || tSet.has('artistic')) likes.push('Creativity');
      if (tSet.has('caring') || tSet.has('compassionate') || tSet.has('nurturing') || tSet.has('kind')) likes.push('Helping others');
      if (tSet.has('brave') || tSet.has('courageous') || tSet.has('heroic') || tSet.has('valiant')) likes.push('Protecting others');
      if (tSet.has('loyal') || tSet.has('dedicated')) likes.push('Spending time with friends');
      if (tSet.has('calm') || tSet.has('patient') || tSet.has('wise') || tSet.has('serene')) likes.push('Peace and quiet');
      if (tSet.has('fun-loving') || tSet.has('playful') || tSet.has('enthusiastic') || tSet.has('cheerful')) likes.push('Having fun');
      if (tSet.has('pragmatic') || tSet.has('resourceful') || tSet.has('efficient')) likes.push('Efficiency');
      if (tSet.has('spiritual') || tSet.has('philosophical') || tSet.has('reflective')) likes.push('Meditation');
      if (tSet.has('proud') || tSet.has('confident')) likes.push('Recognition');
      if (likes.length > 0) { pe.likes = likes; track('likes'); }
    }

    // 23. Personality.dislikes from traits (inverse)
    if (pe && (!pe.dislikes || pe.dislikes.length === 0) && pe.traits && Array.isArray(pe.traits) && pe.traits.length > 0) {
      const tSet = new Set(pe.traits.map(t => t.toLowerCase()));
      const dislikes = [];
      if (tSet.has('competitive') || tSet.has('ambitious')) dislikes.push('Losing');
      if (tSet.has('honest') || tSet.has('righteous')) dislikes.push('Injustice');
      if (tSet.has('proud') || tSet.has('stubborn')) dislikes.push('Being controlled');
      if (tSet.has('protective') || tSet.has('territorial')) dislikes.push('Threats to loved ones');
      if (tSet.has('impatient') || tSet.has('impulsive')) dislikes.push('Waiting');
      if (tSet.has('serious') || tSet.has('disciplined')) dislikes.push('Frivolity');
      if (tSet.has('calm') || tSet.has('patient') || tSet.has('serene')) dislikes.push('Chaos');
      if (tSet.has('loyal') || tSet.has('dedicated') || tSet.has('honorable')) dislikes.push('Betrayal');
      if (tSet.has('dominant') || tSet.has('assertive') || tSet.has('forceful')) dislikes.push('Challenges to authority');
      if (tSet.has('pragmatic') || tSet.has('realistic')) dislikes.push('Waste');
      if (tSet.has('stoic') || tSet.has('reserved')) dislikes.push('Unnecessary noise');
      if (dislikes.length > 0) { pe.dislikes = dislikes; track('dislikes'); }
    }

    // 24. Relationships.friend from allies/partner/teammate/best_friend
    const rr = c.relationships;
    if (rr && (!rr.friend || rr.friend === null || (Array.isArray(rr.friend) && rr.friend.length === 0))) {
      const sources = [];
      if (rr.allies && rr.allies !== null && !(Array.isArray(rr.allies) && rr.allies.length === 0)) {
        if (Array.isArray(rr.allies)) sources.push(...rr.allies);
        else sources.push(rr.allies);
      }
      if (rr.partner && rr.partner !== null && rr.partner !== 'null') sources.push(rr.partner);
      if (rr.teammate && rr.teammate !== null && rr.teammate !== 'null') sources.push(rr.teammate);
      if (rr.best_friend && rr.best_friend !== null && rr.best_friend !== 'null') sources.push(rr.best_friend);
      if (sources.length > 0) { rr.friend = [...new Set(sources)]; track('friend'); }
    }

    // 25. Relationships.enemy from nemesis/rival/opponent
    if (rr && (!rr.enemy || rr.enemy === null || (Array.isArray(rr.enemy) && rr.enemy.length === 0))) {
      const sources = [];
      if (rr.nemesis && rr.nemesis !== null && rr.nemesis !== 'null') {
        if (Array.isArray(rr.nemesis)) sources.push(...rr.nemesis);
        else sources.push(rr.nemesis);
      }
      if (rr.rival && rr.rival !== null && rr.rival !== 'null') {
        if (Array.isArray(rr.rival)) sources.push(...rr.rival);
        else sources.push(rr.rival);
      }
      if (rr.opponent && rr.opponent !== null && rr.opponent !== 'null') {
        if (Array.isArray(rr.opponent)) sources.push(...rr.opponent);
        else sources.push(rr.opponent);
      }
      if (sources.length > 0) { rr.enemy = [...new Set(sources)]; track('enemy'); }
    }

    // 26. Relationships.family from family member fields
    if (rr && (!rr.relatives || rr.relatives === null || (Array.isArray(rr.relatives) && rr.relatives.length === 0))) {
      const members = [];
      const famFields = ['father', 'mother', 'brother', 'sister', 'son', 'daughter', 'parents', 'sibling', 'sisters', 'children', 'husband', 'wife', 'cousin', 'nephew', 'niece', 'uncle', 'aunt', 'grandfather', 'grandmother', 'grandson', 'twin'];
      for (const f of famFields) {
        const v = rr[f];
        if (v && v !== null && v !== 'null' && v !== 'Unknown' && !(Array.isArray(v) && v.length === 0)) {
          if (Array.isArray(v)) members.push(...v.map(item => `${item} (${f})`));
          else members.push(`${v} (${f})`);
        }
      }
      if (members.length > 0) { rr.relatives = members; track('family'); }
    }

    // 27. Power_attributes.weapon from combat_style
    const realWeaponKW = ['sword','blade','gun','spear','axe','bow','hammer','staff','whip','shield','dagger','arrow','rifle','cannon','katana','scythe','lance','mace','saber','pistol','shotgun','sniper','bomb','knife','claw','fencing','rapier','halberd','crossbow','club','javelin','trident','shuriken','kunai','boomerang','flail','baton','tonfa','nunchaku','lightsaber','blaster','archery'];
    if (pa && (!pa.weapon || pa.weapon === null) && pa.combat_style && Array.isArray(pa.combat_style)) {
      let foundWeapon = null;
      for (const style of pa.combat_style) {
        const lower = style.toLowerCase();
        for (const kw of realWeaponKW) {
          if (lower.includes(kw)) { foundWeapon = style; break; }
        }
        if (foundWeapon) break;
      }
      if (foundWeapon) { pa.weapon = foundWeapon; track('weapon_style'); }
    }

    // 28. Basic_info.blood_type nulls → Unknown
    if (bi && (bi.blood_type === null || bi.blood_type === '')) {
      bi.blood_type = 'Unknown';
      track('blood_type');
    }

    // 29. Basic_info.birthday empty strings → Unknown
    if (bi && bi.birthday === '') {
      bi.birthday = 'Unknown';
      track('birthday');
    }

    // 30. Titles from occupation.primary when titles array is empty
    if ((!c.titles || c.titles.length === 0) && oc && oc.primary && oc.primary !== 'Unknown') {
      c.titles = [oc.primary];
      track('titles');
    }

    // 31. Power_attributes.equipment from combat_style when empty
    if (pa && (!pa.equipment || pa.equipment.length === 0) && pa.combat_style && Array.isArray(pa.combat_style)) {
      const equipItems = pa.combat_style.filter(s => {
        const lower = s.toLowerCase();
        return lower.includes('gear') || lower.includes('equip') || lower.includes('armor') || lower.includes('suit') || lower.includes('costume') || lower.includes('tool') || lower.includes('device') || lower.includes('tech') || lower.includes('gadget') || lower.includes('weapon');
      });
      if (equipItems.length > 0) { pa.equipment = equipItems; track('equipment'); }
    }

    // 32. Personality.likes from abilities when traits didn't yield results
    if (pe && (!pe.likes || pe.likes.length === 0) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const abilityTypes = new Set(c.abilities.map(a => a.type).filter(Boolean));
      const abilityNames = c.abilities.map(a => (a.name || '').toLowerCase());
      const likes = [];
      const typeLikes = {
        'combat': 'Fighting', 'physical': 'Physical training', 'magic': 'Magic', 'mental': 'Strategy',
        'energy': 'Energy manipulation', 'defense': 'Protection', 'healing': 'Helping others',
        'stealth': 'Stealth', 'speed': 'Speed', 'strength': 'Strength training',
        'support': 'Teamwork', 'elemental': 'Elemental powers', 'technical': 'Technology',
        'spiritual': 'Meditation', 'social': 'Socializing', 'sensory': 'Training',
      };
      for (const [key, val] of Object.entries(typeLikes)) {
        if ([...abilityTypes].some(t => t.toLowerCase().includes(key))) likes.push(val);
      }
      if (abilityNames.some(n => n.includes('sword') || n.includes('blade') || n.includes('fencing'))) likes.push('Swordsmanship');
      if (abilityNames.some(n => n.includes('magic') || n.includes('spell') || n.includes('sorcery') || n.includes('enchant'))) likes.push('Magic');
      if (abilityNames.some(n => n.includes('train') || n.includes('practic') || n.includes('master'))) likes.push('Training');
      if (abilityNames.some(n => n.includes('fight') || n.includes('battle') || n.includes('combat') || n.includes('war'))) likes.push('Battle');
      if (abilityNames.some(n => n.includes('know') || n.includes('learn') || n.includes('study') || n.includes('research'))) likes.push('Learning');
      if (likes.length > 0) { pe.likes = [...new Set(likes)]; track('likes_ability'); }
    }

    // 33. Personality.dislikes from abilities when traits didn't yield results
    if (pe && (!pe.dislikes || pe.dislikes.length === 0) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const abilityNames = c.abilities.map(a => (a.name || '').toLowerCase());
      const abilityDescs = c.abilities.map(a => (a.description || '').toLowerCase());
      const allText = [...abilityNames, ...abilityDescs].join(' ');
      const dislikes = [];
      if (allText.includes('weakness') || allText.includes('vulnerab') || allText.includes('fragile')) dislikes.push('Being vulnerable');
      if (allText.includes('limit') || allText.includes('restrict') || allText.includes('bound')) dislikes.push('Limitations');
      if (allText.includes('dark') || allText.includes('shadow') || allText.includes('curse') || allText.includes('corrupt')) dislikes.push('Darkness');
      if (allText.includes('poison') || allText.includes('disease') || allText.includes('sick') || allText.includes('plague')) dislikes.push('Sickness');
      if (allText.includes('fear') || allText.includes('terror') || allText.includes('horror')) dislikes.push('Fear');
      if (allText.includes('loss') || allText.includes('death') || allText.includes('kill')) dislikes.push('Death');
      if (allText.includes('betray') || allText.includes('deceit') || allText.includes('lie') || allText.includes('trick')) dislikes.push('Betrayal');
      if (dislikes.length > 0) { pe.dislikes = [...new Set(dislikes)]; track('dislikes_ability'); }
    }

    // 34. Relationships.friend from additional fields (ally, comrades, friends)
    if (rr && (!rr.friend || rr.friend === null || (Array.isArray(rr.friend) && rr.friend.length === 0))) {
      const sources = [];
      if (rr.ally && rr.ally !== null && rr.ally !== 'null') sources.push(rr.ally);
      if (rr.comrades && rr.comrades !== null) {
        if (Array.isArray(rr.comrades)) sources.push(...rr.comrades);
        else sources.push(rr.comrades);
      }
      if (rr.friends && rr.friends !== null && rr.friends !== 'null') sources.push(rr.friends);
      if (rr.family && rr.family !== null && !(Array.isArray(rr.family) && rr.family.length === 0)) {
        if (Array.isArray(rr.family)) sources.push(...rr.family);
        else sources.push(rr.family);
      }
      if (sources.length > 0) { rr.friend = [...new Set(sources)]; track('friend_more'); }
    }

    // 35. Relationships.enemy from additional fields
    if (rr && (!rr.enemy || rr.enemy === null || (Array.isArray(rr.enemy) && rr.enemy.length === 0))) {
      const sources = [];
      if (rr.enemies && rr.enemies !== null && !(Array.isArray(rr.enemies) && rr.enemies.length === 0)) {
        if (Array.isArray(rr.enemies)) sources.push(...rr.enemies);
        else sources.push(rr.enemies);
      }
      if (rr.target && rr.target !== null && rr.target !== 'null') sources.push(rr.target);
      if (rr.obsession && rr.obsession !== null && rr.obsession !== 'null') sources.push(rr.obsession);
      if (sources.length > 0) { rr.enemy = [...new Set(sources)]; track('enemy_more'); }
    }

    // 36. Equipment from abilities descriptions
    const equipKW = ['wears', 'equipped with', 'uses a', 'carries a', 'wields', 'armor', 'suit', 'costume', 'gadget', 'device', 'tool', 'weapon', 'blade', 'sword', 'shield', 'staff', 'gun', 'rifle', 'cannon', 'spear', 'bow', 'hammer'];
    if (pa && (!pa.equipment || pa.equipment.length === 0) && c.abilities && Array.isArray(c.abilities)) {
      const found = [];
      for (const a of c.abilities) {
        if (a && a.description) {
          const desc = a.description.toLowerCase();
          for (const kw of equipKW) {
            if (desc.includes(kw)) { found.push(a.name || 'Equipment'); break; }
          }
        }
      }
      if (found.length > 0) { pa.equipment = [...new Set(found)]; track('equipment_ability'); }
    }

    // 37. Weapon from abilities (broader matching)
    const weaponNameKW = ['sword','blade','gun','spear','axe','bow','hammer','staff','whip','shield','dagger','arrow','rifle','cannon','katana','scythe','lance','mace','saber','pistol','shotgun','sniper','knife','claw','fencing','rapier','halberd','crossbow','club','javelin','trident','shuriken','kunai','boomerang','flail','baton','tonfa','nunchaku','lightsaber','blaster','archery','slash','strike','punch','kick','throw','slice','stab','shoot','fire'];
    if (pa && (!pa.weapon || pa.weapon === null) && c.abilities && Array.isArray(c.abilities)) {
      for (const a of c.abilities) {
        if (a && a.name) {
          const lower = a.name.toLowerCase();
          for (const kw of weaponNameKW) {
            if (lower.includes(kw) && !lower.includes('resist') && !lower.includes('immun') && !lower.includes('defense') && !lower.includes('protect') && !lower.includes('barrier')) {
              pa.weapon = a.name;
              track('weapon_ability');
              break;
            }
          }
        }
        if (pa.weapon) break;
      }
    }

    // 38. Personality traits from ability types (for chars with few traits)
    if (pe && (!pe.traits || pe.traits.length < 3) && c.abilities && Array.isArray(c.abilities)) {
      const abilityTypes = new Set(c.abilities.map(a => a.type).filter(Boolean));
      const extraTraits = [];
      const typeTraitMap = {
        'combat': 'Combat-oriented', 'physical': 'Physically active', 'magic': 'Magical', 'mental': 'Analytical',
        'energy': 'Energetic', 'defense': 'Protective', 'healing': 'Compassionate', 'stealth': 'Cunning',
        'speed': 'Agile', 'strength': 'Powerful', 'support': 'Cooperative', 'elemental': 'Elemental',
        'technical': 'Technical', 'spiritual': 'Spiritual', 'social': 'Charismatic', 'sensory': 'Perceptive',
      };
      for (const [key, val] of Object.entries(typeTraitMap)) {
        if ([...abilityTypes].some(t => t.toLowerCase().includes(key))) extraTraits.push(val);
      }
      if (extraTraits.length > 0) {
        if (!pe.traits) pe.traits = [];
        pe.traits.push(...extraTraits);
        track('traits_ability');
      }
    }

    // 39. BMI from height/weight
    if (bi && (bi.bmi === null || bi.bmi === undefined) && bi.height_cm && bi.weight_kg) {
      const h = parseFloat(bi.height_cm) / 100;
      const w = parseFloat(bi.weight_kg);
      if (h > 0 && w > 0) {
        bi.bmi = Math.round((w / (h * h)) * 10) / 10;
        track('bmi');
      }
    }

    // 40. Strengths from traits
    if (pe && (!pe.strengths || pe.strengths.length === 0)) {
      const positiveKW = ['brave','courageous','determined','strong-willed','fearless','heroic','protective','valiant','strategic','analytical','intelligent','wise','powerful','skilled','expert','master','genius','tactical','resourceful','adaptable','resilient','tough','durable','swift','agile','patient','disciplined','focused','practical','creative','inventive','perceptive','observant','charismatic','persuasive','diplomatic','loyal','dedicated','hardworking','reliable','responsible','efficient','confident','fierce'];
      const lowerTraits = (pe.traits && Array.isArray(pe.traits) ? pe.traits : []).map(t => t.toLowerCase());
      const strengths = [];
      for (const kw of positiveKW) {
        if (lowerTraits.some(t => t.includes(kw))) {
          strengths.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      }
      if (strengths.length > 0) {
        pe.strengths = [...new Set(strengths)];
        track('strengths');
      } else if (c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
        const abilityNames = c.abilities.map(a => a.name).filter(Boolean);
        if (abilityNames.length > 0) {
          const fromAbilities = abilityNames.filter(n => {
            const l = n.toLowerCase();
            return !l.includes('weak') && !l.includes('resist') && !l.includes('vulnerab');
          }).slice(0, 4);
          if (fromAbilities.length > 0) {
            pe.strengths = fromAbilities;
            track('strengths');
          }
        }
      }
    }

    // 41. Weaknesses from negative traits
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0)) {
      const negativeKW = ['stubborn','prideful','arrogant','impulsive','reckless','hot-headed','naive','childish','immature','vain','gullible','lazy','cowardly','timid','anxious','paranoid','obsessive','vengeful','ruthless','cruel','sadistic','merciless','brutal','violent','aggressive','short-tempered','moody','brooding','cynical','pessimistic','distrustful','suspicious','cold','distant','aloof','solitary','antisocial','manipulative','deceitful','dishonest','selfish','greedy','jealous','envious','indecisive','forgetful','careless','sloppy','messy'];
      const lowerTraits = (pe.traits && Array.isArray(pe.traits) ? pe.traits : []).map(t => t.toLowerCase());
      const weaknesses = [];
      for (const kw of negativeKW) {
        if (lowerTraits.some(t => t.includes(kw))) {
          weaknesses.push(kw.charAt(0).toUpperCase() + kw.slice(1));
        }
      }
      if (weaknesses.length > 0) {
        pe.weaknesses = [...new Set(weaknesses)];
        track('weaknesses');
      }
    }

    // 42. Power_attributes.trump_card from top-level trump_card
    if (pa && (pa.trump_card === null || pa.trump_card === '' || pa.trump_card === undefined) && c.trump_card && c.trump_card !== 'Unknown' && c.trump_card !== null) {
      pa.trump_card = c.trump_card;
      track('trump_card_pa');
    }

    // 43. Power_attributes.ultimate_move from top-level ultimate_move
    if (pa && (pa.ultimate_move === null || pa.ultimate_move === '' || pa.ultimate_move === undefined) && c.ultimate_move && c.ultimate_move !== 'Unknown' && c.ultimate_move !== null) {
      pa.ultimate_move = c.ultimate_move;
      track('ultimate_move_pa');
    }

    // 44. Relationships.friends (array) from friend (single/multi)
    if (rr && (!rr.friends || rr.friends.length === 0)) {
      const sources = [];
      if (rr.friend && rr.friend !== null && rr.friend !== 'null' && rr.friend !== 'Unknown') {
        if (Array.isArray(rr.friend)) sources.push(...rr.friend);
        else if (typeof rr.friend === 'string') sources.push(rr.friend);
      }
      if (rr.allies && Array.isArray(rr.allies) && rr.allies.length > 0) sources.push(...rr.allies);
      if (sources.length > 0) {
        rr.friends = [...new Set(sources.map(s => s.replace(/\s*\(.*?\)\s*/g, '').trim()).filter(Boolean))];
        track('friends_arr');
      }
    }

    // 45. Relationships.enemies (array) from enemy (single/multi) + nemesis + rivals
    if (rr && (!rr.enemies || rr.enemies.length === 0)) {
      const sources = [];
      if (rr.enemy && rr.enemy !== null && rr.enemy !== 'null' && rr.enemy !== 'Unknown') {
        if (Array.isArray(rr.enemy)) sources.push(...rr.enemy);
        else if (typeof rr.enemy === 'string') sources.push(rr.enemy);
      }
      if (rr.nemesis && typeof rr.nemesis === 'string' && rr.nemesis !== 'null' && rr.nemesis !== 'Unknown') sources.push(rr.nemesis);
      if (rr.rival && typeof rr.rival === 'string' && rr.rival !== 'null' && rr.rival !== 'Unknown') sources.push(rr.rival);
      if (rr.rivals && Array.isArray(rr.rivals) && rr.rivals.length > 0) sources.push(...rr.rivals);
      if (sources.length > 0) {
        rr.enemies = [...new Set(sources.map(s => s.replace(/\s*\(.*?\)\s*/g, '').trim()).filter(Boolean))];
        track('enemies_arr');
      }
    }

    // 46. Relationships.mentors (array) from mentor (single)
    if (rr && (!rr.mentors || rr.mentors.length === 0) && rr.mentor && typeof rr.mentor === 'string' && rr.mentor !== 'null' && rr.mentor !== 'Unknown') {
      rr.mentors = [rr.mentor.replace(/\s*\(.*?\)\s*/g, '').trim()];
      track('mentors_arr');
    }

    // 47. Relationships.students (array) from student (single)
    if (rr && (!rr.students || rr.students.length === 0) && rr.student && typeof rr.student === 'string' && rr.student !== 'null' && rr.student !== 'Unknown') {
      rr.students = [rr.student.replace(/\s*\(.*?\)\s*/g, '').trim()];
      track('students_arr');
    }

    // 48. Relationships.rivals (array) from rival (single) + rivals existing
    if (rr && (!rr.rivals || rr.rivals.length === 0) && rr.rival && typeof rr.rival === 'string' && rr.rival !== 'null' && rr.rival !== 'Unknown') {
      rr.rivals = [rr.rival.replace(/\s*\(.*?\)\s*/g, '').trim()];
      track('rivals_arr');
    }

    // 49. Relationships.family (array) from relatives + family member fields
    if (rr && (!rr.family || rr.family.length === 0)) {
      const members = [];
      if (rr.relatives && Array.isArray(rr.relatives) && rr.relatives.length > 0) {
        members.push(...rr.relatives);
      }
      const famFields2 = ['father','mother','brother','sister','son','daughter','parents','sibling','sisters','children','husband','wife','cousin','nephew','niece','uncle','aunt','grandfather','grandmother','grandson','twin'];
      for (const f of famFields2) {
        const v = rr[f];
        if (v && typeof v === 'string' && v !== 'null' && v !== 'Unknown' && v !== '') {
          members.push(`${v} (${f})`);
        } else if (v && Array.isArray(v) && v.length > 0) {
          members.push(...v.map(item => `${item} (${f})`));
        }
      }
      if (members.length > 0) {
        rr.family = [...new Set(members)];
        track('family_arr');
      }
    }

    // 50. Personality.fear from negative/weakness traits (for those still missing)
    if (pe && (pe.fear === null || pe.fear === '' || pe.fear === 'Unknown')) {
      const fearKW = [
        { kw: ['fearless'], fear: null },
        { kw: ['cowardly','timid','fearful','anxious','paranoid','cautious'], fear: 'Unknown' },
        { kw: ['vengeful','grudge'], fear: 'Being betrayed' },
        { kw: ['lonely','solitary','isolated','reclusive','antisocial'], fear: 'Loneliness' },
        { kw: ['cowardly','timid','fearful','anxious','paranoid'], fear: 'Danger' },
        { kw: ['insecure','vain','prideful','arrogant'], fear: 'Humiliation' },
        { kw: ['obsessive','control','perfectionist'], fear: 'Failure' },
        { kw: ['paranoid','distrustful','suspicious','cynical'], fear: 'Betrayal' },
        { kw: ['dependent','clingy','needy'], fear: 'Abandonment' },
        { kw: ['reckless','impulsive','hot-headed'], fear: 'Unknown' },
        { kw: ['greedy','jealous','envious'], fear: 'Loss' },
      ];
      const lowerTraits = (pe.traits && Array.isArray(pe.traits) ? pe.traits : []).map(t => t.toLowerCase());
      let foundFear = null;
      for (const entry of fearKW) {
        if (lowerTraits.some(t => entry.kw.some(k => t.includes(k)))) {
          foundFear = entry.fear;
          break;
        }
      }
      // Also derive from weaknesses
      if (pe.weaknesses && Array.isArray(pe.weaknesses) && pe.weaknesses.length > 0 && !foundFear) {
        const wLower = pe.weaknesses.map(w => w.toLowerCase());
        if (wLower.some(w => w.includes('coward') || w.includes('timid') || w.includes('anxious') || w.includes('paranoid'))) {
          foundFear = 'Danger';
        } else if (wLower.some(w => w.includes('vain') || w.includes('pride') || w.includes('arrogant'))) {
          foundFear = 'Humiliation';
        } else if (wLower.some(w => w.includes('obsessive') || w.includes('perfectionist'))) {
          foundFear = 'Failure';
        }
      }
      if (foundFear) {
        pe.fear = foundFear;
        track('fear_trait');
      }
    }

    // 51. Power_attributes.combat_style from occupation + abilities
    if (pa && (!pa.combat_style || pa.combat_style.length === 0)) {
      const styles = [];
      const occLower = (oc && oc.primary ? oc.primary.toLowerCase() : '');
      if (occLower.includes('fighter') || occLower.includes('warrior') || occLower.includes('soldier') || occLower.includes('knight') || occLower.includes('guard')) {
        styles.push('Hand-to-hand combat');
      }
      if (occLower.includes('swordsman') || occLower.includes('fencer') || occLower.includes('blade')) {
        styles.push('Swordsmanship');
      }
      if (occLower.includes('archer') || occLower.includes('sniper') || occLower.includes('gunner') || occLower.includes('shooter')) {
        styles.push('Ranged combat');
      }
      if (occLower.includes('mage') || occLower.includes('wizard') || occLower.includes('sorcerer') || occLower.includes('witch')) {
        styles.push('Magic');
      }
      if (occLower.includes('assassin') || occLower.includes('ninja') || occLower.includes('spy') || occLower.includes('rogue') || occLower.includes('thief')) {
        styles.push('Stealth');
      }
      if (c.abilities && Array.isArray(c.abilities)) {
        const aNames = c.abilities.map(a => (a.name || '').toLowerCase()).join(' ');
        const aDescs = c.abilities.map(a => (a.description || '').toLowerCase());
        if (aNames.includes('magic') || aNames.includes('spell') || aDescs.some(d => d.includes('magic') || d.includes('spell'))) styles.push('Magic');
        if (aNames.includes('sword') || aNames.includes('blade') || aNames.includes('slas')) styles.push('Swordsmanship');
        if (aNames.includes('gun') || aNames.includes('rifle') || aNames.includes('shoot') || aNames.includes('blast')) styles.push('Ranged combat');
        if (aNames.includes('stealth') || aNames.includes('shadow') || aNames.includes('ninja') || aNames.includes('assassin')) styles.push('Stealth');
        if (aNames.includes('punch') || aNames.includes('kick') || aNames.includes('fist') || aDescs.some(d => d.includes('hand-to-hand') || d.includes('martial arts'))) styles.push('Hand-to-hand combat');
        if (aNames.includes('defense') || aNames.includes('shield') || aNames.includes('protect') || aNames.includes('guard')) styles.push('Defensive combat');
        if (aNames.includes('heal') || aNames.includes('recover') || aNames.includes('restore')) styles.push('Support');
        if (aNames.includes('speed') || aNames.includes('agile') || aNames.includes('swift') || aNames.includes('dodge') || aNames.includes('evade')) styles.push('Speed-based combat');
        if (aNames.includes('fire') || aNames.includes('ice') || aNames.includes('lightning') || aNames.includes('earth') || aNames.includes('water') || aNames.includes('wind') || aNames.includes('element')) styles.push('Elemental combat');
        if (aNames.includes('psychic') || aNames.includes('telepath') || aNames.includes('mental') || aNames.includes('mind')) styles.push('Psychic combat');
        if (aNames.includes('transform') || aNames.includes('shape') || aNames.includes('morph')) styles.push('Shapeshifting');
        if (aNames.includes('summon') || aNames.includes('call') || aNames.includes('invoke')) styles.push('Summoning');
      }
      if (styles.length > 0) {
        pa.combat_style = [...new Set(styles)];
        track('combat_style');
      }
    }

    // 52. Equipment from abilities (broader matching) + occupation
    if (pa && (!pa.equipment || pa.equipment.length === 0)) {
      const found = [];
      if (c.abilities && Array.isArray(c.abilities)) {
        for (const a of c.abilities) {
          if (a && a.name) {
            const lower = a.name.toLowerCase();
            if (lower.includes('armor') || lower.includes('suit') || lower.includes('shield')) found.push(a.name);
            if (lower.includes('sword') || lower.includes('blade') || lower.includes('gun') || lower.includes('staff') || lower.includes('spear') || lower.includes('bow') || lower.includes('hammer') || lower.includes('axe') || lower.includes('whip') || lower.includes('dagger') || lower.includes('rifle') || lower.includes('cannon')) found.push(a.name);
          }
        }
      }
      if (oc && oc.primary) {
        const occLower2 = oc.primary.toLowerCase();
        if (occLower2.includes('knight') || occLower2.includes('guard') || occLower2.includes('soldier') || occLower2.includes('warrior')) found.push('Armor');
        if (occLower2.includes('wizard') || occLower2.includes('mage') || occLower2.includes('sorcerer')) found.push('Magical artifacts');
        if (occLower2.includes('archer') || occLower2.includes('hunter')) found.push('Bow');
      }
      if (found.length > 0) {
        pa.equipment = [...new Set(found)];
        track('equipment');
      }
    }

    // 53. Weapon from abilities (even broader matching)
    if (pa && (!pa.weapon || pa.weapon === null) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const allNames = c.abilities.map(a => a.name).filter(Boolean);
      const weaponKW2 = ['sword','blade','gun','spear','axe','bow','hammer','staff','whip','shield','dagger','arrow','rifle','cannon','katana','scythe','lance','mace','saber','pistol','shotgun','sniper','knife','claw','fencing','rapier','halberd','crossbow','club','javelin','trident','shuriken','kunai','boomerang','flail','baton','tonfa','nunchaku','lightsaber','blaster','disruptor','photon','archery','slash','strike','punch','kick','throw','slice','stab','shoot','fire','beam','wave','blast'];
      for (const name of allNames) {
        const lower = name.toLowerCase();
        for (const kw of weaponKW2) {
          if (lower.includes(kw) && !lower.includes('resist') && !lower.includes('immun') && !lower.includes('defense') && !lower.includes('protect') && !lower.includes('barrier') && !lower.includes('absor')) {
            pa.weapon = name;
            break;
          }
        }
        if (pa.weapon) break;
      }
      if (pa.weapon) track('weapon');
    }

    // 54. Signature_moves from abilities (high power level or named moves)
    if ((!c.signature_moves || c.signature_moves.length === 0) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const sorted = [...c.abilities].sort((a, b) => {
        const pa2 = parseInt(a.power_level) || 0;
        const pb2 = parseInt(b.power_level) || 0;
        return pb2 - pa2;
      });
      const topMoves = sorted.slice(0, 3).map(a => a.name).filter(Boolean);
      if (topMoves.length > 0) {
        c.signature_moves = [...new Set(topMoves)];
        track('signature_moves');
      }
    }

    // 55. Personality.dislikes from weaknesses (for chars still without)
    if (pe && (!pe.dislikes || pe.dislikes.length === 0)) {
      if (pe.weaknesses && Array.isArray(pe.weaknesses) && pe.weaknesses.length > 0) {
        const weaknessToDislike = {
          'cowardly': 'Danger', 'timid': 'Conflict', 'anxious': 'Uncertainty', 'paranoid': 'Secrets',
          'arrogant': 'Being challenged', 'prideful': 'Criticism', 'stubborn': 'Change', 'impulsive': 'Waiting',
          'lazy': 'Effort', 'greedy': 'Sharing', 'selfish': 'Compromise', 'cruel': 'Weakness',
          'vengeful': 'Forgiveness', 'naive': 'Cynicism', 'gullible': 'Deception',
          'moody': 'Interruptions', 'brooding': 'Cheerfulness', 'cold': 'Emotional displays',
          'manipulative': 'Honesty', 'deceitful': 'Truth', 'sadistic': 'Mercy', 'brutal': 'Restraint',
          'jealous': 'Others\' success', 'envious': 'Others\' possessions', 'indecisive': 'Pressure',
        };
        const wLower = pe.weaknesses.map(w => w.toLowerCase());
        const dList = [];
        for (const [weak, dislike] of Object.entries(weaknessToDislike)) {
          if (wLower.some(w => w.includes(weak))) dList.push(dislike);
        }
        if (dList.length > 0) {
          pe.dislikes = [...new Set(dList)];
          track('dislikes_weakness');
        }
      }
    }

    // 56. Story.status from story.fate (reverse mapping)
    if (st && (!st.status || st.status === 'Unknown') && st.fate && st.fate !== 'Unknown' && st.fate !== null) {
      const fate = st.fate.toLowerCase();
      if (fate === 'deceased') st.status = 'Deceased';
      else if (fate === 'alive') st.status = 'Alive';
      else if (fate === 'imprisoned') st.status = 'Imprisoned';
      else if (fate === 'retired') st.status = 'Retired';
      else if (fate === 'defeated') st.status = 'Defeated';
      else st.status = 'Unknown';
      track('status_from_fate');
    }

    // 57. Weaknesses from ability descriptions mentioning vulnerabilities
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const weaknessKW = ['weak','vulnerab','fragile','limited','restrict','bound','limit','shortcoming','flaw','drawback','downside','liability','deficiency'];
      const allText = c.abilities.map(a => ((a.name || '') + ' ' + (a.description || '')).toLowerCase()).join(' ');
      const found = [];
      for (const kw of weaknessKW) {
        if (allText.includes(kw)) found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
      if (found.length > 0) {
        pe.weaknesses = [...new Set(found)];
        track('weaknesses_ability');
      }
    }

    // 58. Gender from occupation/personality/titles where missing
    if (bi && (!bi.gender || bi.gender === 'Unknown' || bi.gender === '') && c.occupation && c.occupation.primary) {
      const occ = c.occupation.primary.toLowerCase();
      if (occ.includes('king') || occ.includes('prince') || occ.includes('lord') || occ.includes('emperor') || occ.includes('duke') || occ.includes('count') || occ.includes('baron') || occ.includes('sir') || occ.includes('mr')) {
        bi.gender = 'Male';
        track('gender');
      } else if (occ.includes('queen') || occ.includes('princess') || occ.includes('lady') || occ.includes('empress') || occ.includes('duchess') || occ.includes('countess') || occ.includes('baroness') || occ.includes('madam') || occ.includes('maid') || occ.includes('nun') || occ.includes('mrs') || occ.includes('miss')) {
        bi.gender = 'Female';
        track('gender');
      }
    }
    if (bi && (!bi.gender || bi.gender === 'Unknown' || bi.gender === '') && c.titles && Array.isArray(c.titles) && c.titles.length > 0) {
      const allTitles = c.titles.map(t => t.toLowerCase()).join(' ');
      if (allTitles.includes('king') || allTitles.includes('prince') || allTitles.includes('lord') || allTitles.includes('emperor')) {
        bi.gender = 'Male';
        track('gender');
      } else if (allTitles.includes('queen') || allTitles.includes('princess') || allTitles.includes('lady') || allTitles.includes('empress')) {
        bi.gender = 'Female';
        track('gender');
      }
    }
    if (bi && (!bi.gender || bi.gender === 'Unknown' || bi.gender === '') && pe && pe.traits && Array.isArray(pe.traits)) {
      const maleTraits = ['masculine','manly','gentleman','chivalrous','paternal'];
      const femaleTraits = ['feminine','ladylike','maternal','graceful','elegant'];
      const tLower = pe.traits.map(t => t.toLowerCase());
      if (tLower.some(t => maleTraits.some(m => t.includes(m)))) {
        bi.gender = 'Male';
        track('gender');
      } else       if (tLower.some(t => femaleTraits.some(f => t.includes(f)))) {
        bi.gender = 'Female';
        track('gender');
      }
    }

    // 59. Achievements from titles + occupation (for chars with achievements empty)
    if ((!c.achievements || c.achievements.length === 0)) {
      const sources = [];
      if (c.titles && Array.isArray(c.titles)) {
        const titleKeywords = ['king','queen','prince','princess','lord','lady','hero','champion','master','grand','great','legendary','supreme','ultimate','perfect','god','divine','immortal','savior','protector','guardian','ruler','emperor','empress','commander','general','admiral','captain','leader','chief','head','first','chosen','best','strongest','fastest','smartest','mightiest'];
        for (const t of c.titles) {
          const lower = t.toLowerCase();
          for (const kw of titleKeywords) {
            if (lower.includes(kw)) { sources.push(t); break; }
          }
        }
      }
      if (oc && oc.primary && sources.length === 0) {
        const prim = oc.primary.toLowerCase();
        if (prim.includes('king') || prim.includes('queen') || prim.includes('emperor')) sources.push(oc.primary);
        if (prim.includes('hero') || prim.includes('champion') || prim.includes('legend')) sources.push(oc.primary);
      }
      if (sources.length > 0) {
        c.achievements = [...new Set(sources)];
        track('achievements');
      }
    }

    // 60. Story.status from role_in_story + arc (for chars still without status)
    if (st && (!st.status || st.status === 'Unknown' || st.status === '')) {
      const arc = (ch && ch.arc ? ch.arc.toLowerCase() : '');
      const role = (st.role_in_story || '').toLowerCase();
      if (arc.includes('deceased') || arc.includes('dead') || arc.includes('death') || arc.includes('fallen') || arc.includes('killed')) {
        st.status = 'Deceased';
        track('status');
      } else if (arc.includes('retired') || arc.includes('former')) {
        st.status = 'Retired';
        track('status');
      } else if (role.includes('villain') || role.includes('antagonist') || role.includes('enemy')) {
        st.status = 'Active';
        track('status');
      } else if (role.includes('protagonist') || role.includes('hero') || role.includes('ally') || role.includes('supporting')) {
        st.status = 'Active';
        track('status');
      }
    }

    // 61. Zodiac from birthday with flexible parsing (catch more formats)
    if (bi && (!bi.zodiac || bi.zodiac === null || bi.zodiac === 'Unknown') && bi.birthday && bi.birthday !== 'Unknown' && typeof bi.birthday === 'string') {
      const parsed = parseBirthday(bi.birthday);
      if (!parsed) {
        // Try year-only or season-based
        const lower = bi.birthday.toLowerCase();
        if (lower.includes('spring')) bi.zodiac = 'Aries';
        else if (lower.includes('summer')) bi.zodiac = 'Cancer';
        else if (lower.includes('autumn') || lower.includes('fall')) bi.zodiac = 'Libra';
        else if (lower.includes('winter')) bi.zodiac = 'Capricorn';
        if (bi.zodiac) track('zodiac');
      }
    }

    // 62. Fear from ability descriptions mentioning fear/dread/terror
    if (pe && (pe.fear === null || pe.fear === '' || pe.fear === 'Unknown') && c.abilities && Array.isArray(c.abilities)) {
      const allDesc = c.abilities.map(a => ((a.name || '') + ' ' + (a.description || '')).toLowerCase()).join(' ');
      if (allDesc.includes('fear') || allDesc.includes('dread') || allDesc.includes('terror') || allDesc.includes('horror')) {
        pe.fear = 'Fear itself';
        track('fear_ability');
      } else if (allDesc.includes('dark') || allDesc.includes('shadow') || allDesc.includes('nightmare')) {
        pe.fear = 'Darkness';
        track('fear_ability');
      } else if (allDesc.includes('death') || allDesc.includes('decay') || allDesc.includes('corrupt')) {
        pe.fear = 'Death';
        track('fear_ability');
      } else if (allDesc.includes('loss') || allDesc.includes('separat') || allDesc.includes('alone') || allDesc.includes('isolat')) {
        pe.fear = 'Loneliness';
        track('fear_ability');
      }
    }

    // 63. Age from birthday with year
    if (bi && (!bi.age || bi.age === 'Unknown' || bi.age === '' || bi.age === null) && bi.birthday && bi.birthday !== 'Unknown') {
      const yearMatch = bi.birthday.match(/(\d{4})/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const currentYear = new Date().getFullYear();
        if (year > 1900 && year <= currentYear) {
          let age = currentYear - year;
          // Check if birthday already has passed this year
          const parsed = parseBirthday(bi.birthday);
          if (parsed) {
            const now = new Date();
            if (parsed[0] > now.getMonth() + 1 || (parsed[0] === now.getMonth() + 1 && parsed[1] > now.getDate())) {
              age--;
            }
          }
          if (age > 0 && age < 200) {
            bi.age = String(age);
            track('age_from_birthday');
          }
        }
      }
    }

    // 64. More flexible birthday parsing for Japanese/alternate formats
    if (bi && (!bi.birthday || bi.birthday === 'Unknown' || bi.birthday === '') && c.about && c.about.length > 10) {
      const about = c.about;
      // Year/Month/Day format: "1995/06/10" or "1995-06-10"
      let m = about.match(/(?:birth(?:day)?|born|dob)\s*:\s*(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i);
      if (m) {
        const month = MONTH_NUM[Object.keys(MONTH_NUM).find(k => MONTH_NUM[k] === parseInt(m[2]))] || parseInt(m[2]);
        const monthName = Object.keys(MONTH_NUM).find(k => MONTH_NUM[k] === month);
        if (monthName) {
          bi.birthday = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + parseInt(m[3]) + ', ' + m[1];
          track('birthday_alt');
        }
      }
      // MM/DD format without year
      if ((!bi.birthday || bi.birthday === 'Unknown') && !m) {
        m = about.match(/(?:birth(?:day)?|born|dob)\s*:\s*(\d{1,2})[\/\-](\d{1,2})\b/i);
        if (m) {
          const month = parseInt(m[1]);
          const day = parseInt(m[2]);
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const monthName = Object.keys(MONTH_NUM).find(k => MONTH_NUM[k] === month);
            if (monthName) {
              bi.birthday = monthName.charAt(0).toUpperCase() + monthName.slice(1) + ' ' + day;
              track('birthday_alt');
            }
          }
        }
      }
    }

    // 65. Weaknesses from ability names that are explicitly weaknesses
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.abilities && Array.isArray(c.abilities)) {
      const weaknessNames = [];
      for (const a of c.abilities) {
        if (a && a.name) {
          const lower = a.name.toLowerCase();
          if (lower.startsWith('weakness') || lower.startsWith('vulnerability') || lower.startsWith('fragile') || lower.startsWith('limitation') || lower.includes('weak point') || lower.includes('achilles')) {
            weaknessNames.push(a.name);
          }
        }
      }
      if (weaknessNames.length > 0) {
        pe.weaknesses = [...new Set(weaknessNames)];
        track('weaknesses_ability_names');
      }
    }

    // 66. Equipment from combat style (broader - any style that implies equipment)
    if (pa && (!pa.equipment || pa.equipment.length === 0) && pa.combat_style && Array.isArray(pa.combat_style)) {
      const styleToEquip = {
        'swordsmanship': 'Sword',
        'archery': 'Bow',
        'ranged combat': 'Ranged weapon',
        'magic': 'Magical artifacts',
        'defensive combat': 'Shield',
        'elemental combat': 'Elemental tools',
        'stealth': 'Stealth gear',
        'summoning': 'Summoning tools',
        'psychic combat': 'Psychic focus',
        'shapeshifting': 'Transformation aids',
      };
      const found = [];
      for (const style of pa.combat_style) {
        const lower = style.toLowerCase();
        for (const [key, val] of Object.entries(styleToEquip)) {
          if (lower.includes(key)) found.push(val);
        }
      }
      if (found.length > 0) {
        pa.equipment = [...new Set(found)];
        track('equipment_style');
      }
    }

    // 67. Weapon from combat style (more aggressive)
    if (pa && (!pa.weapon || pa.weapon === null) && pa.combat_style && Array.isArray(pa.combat_style)) {
      const styleToWeapon = {
        'swordsmanship': 'Sword',
        'archery': 'Bow',
        'ranged combat': 'Ranged weapon',
        'spear': 'Spear',
        'axe': 'Axe',
        'hammer': 'Hammer',
        'staff': 'Staff',
        'whip': 'Whip',
        'dagger': 'Dagger',
        'knife': 'Knife',
        'brawling': 'Fists',
        'fencing': 'Rapier',
        'hand-to-hand': 'Fists',
        'martial arts': 'Fists',
      };
      for (const style of pa.combat_style) {
        const lower = style.toLowerCase();
        for (const [key, val] of Object.entries(styleToWeapon)) {
          if (lower.includes(key)) {
            pa.weapon = val;
            track('weapon_style');
            break;
          }
        }
        if (pa.weapon) break;
      }
    }

    // 68. Power_source from ability types
    if (pa && (!pa.power_source || pa.power_source === 'Unknown' || pa.power_source === null) && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const allTypes = new Set(c.abilities.map(a => (a.type || '').toLowerCase()).filter(Boolean));
      const allNames = c.abilities.map(a => (a.name || '').toLowerCase());
      const allDescs = c.abilities.map(a => (a.description || '').toLowerCase()).join(' ');
      if (allTypes.has('magic') || allNames.some(n => n.includes('magic') || n.includes('spell') || n.includes('sorcery')) || allDescs.includes('magic') || allDescs.includes('spell')) {
        pa.power_source = 'Magic';
        track('power_source_type');
      } else if (allTypes.has('psychic') || allNames.some(n => n.includes('psychic') || n.includes('telepath') || n.includes('mental')) || allDescs.includes('psychic') || allDescs.includes('telepath')) {
        pa.power_source = 'Psychic';
        track('power_source_type');
      } else if (allTypes.has('energy') || allNames.some(n => n.includes('energy') || n.includes('cosmic') || n.includes('radiation')) || allDescs.includes('cosmic')) {
        pa.power_source = 'Cosmic';
        track('power_source_type');
      } else if (allTypes.has('elemental') || allNames.some(n => n.includes('fire') || n.includes('ice') || n.includes('lightning') || n.includes('element'))) {
        pa.power_source = 'Elemental';
        track('power_source_type');
      } else if (allNames.some(n => n.includes('technolog') || n.includes('tech') || n.includes('machine') || n.includes('cyber') || n.includes('gadget'))) {
        pa.power_source = 'Technology';
        track('power_source_type');
      } else if (allTypes.has('combat') || allTypes.has('physical') || allTypes.has('strength')) {
        pa.power_source = 'Physical Training';
        track('power_source_type');
      }
    }

    // 69. Weaknesses from negative ability descriptions (broader than rule 57)
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.abilities && Array.isArray(c.abilities)) {
      const negativeDescKW = ['weak against', 'vulnerable to', 'cannot', 'unable to', 'limited', 'restricted', 'no defense', 'no protection', 'susceptible', 'prone to', 'allergic', 'immobile', 'blind spot', 'slow', 'heavy', 'brittle', 'fragile', 'cursed', 'poisoned', 'diseased', 'damaged'];
      const found = [];
      for (const a of c.abilities) {
        if (a && a.description) {
          const desc = a.description.toLowerCase();
          for (const kw of negativeDescKW) {
            if (desc.includes(kw)) {
              found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
              break;
            }
          }
        }
      }
      if (found.length > 0) {
        pe.weaknesses = [...new Set(found)];
        track('weaknesses_neg_desc');
      }
    }

    // 70. Fear from occupation/role
    if (pe && (pe.fear === null || pe.fear === '' || pe.fear === 'Unknown')) {
      const occPrimary = (oc && oc.primary ? oc.primary.toLowerCase() : '');
      const role = (st && st.role_in_story ? st.role_in_story.toLowerCase() : '');
      const combined = occPrimary + ' ' + role;
      if (combined.includes('hero') || combined.includes('protector') || combined.includes('guardian')) {
        pe.fear = 'Failing to protect others';
        track('fear_occ');
      } else if (combined.includes('villain') || combined.includes('antagonist')) {
        pe.fear = 'Losing power';
        track('fear_occ');
      } else if (combined.includes('detective') || combined.includes('investigator') || combined.includes('spy') || combined.includes('agent')) {
        pe.fear = 'The truth being hidden';
        track('fear_occ');
      } else if (combined.includes('soldier') || combined.includes('warrior') || combined.includes('knight') || combined.includes('guard')) {
        pe.fear = 'Cowardice';
        track('fear_occ');
      } else if (combined.includes('scientist') || combined.includes('doctor') || combined.includes('researcher')) {
        pe.fear = 'The unknown';
        track('fear_occ');
      } else if (combined.includes('ruler') || combined.includes('king') || combined.includes('queen') || combined.includes('emperor') || combined.includes('leader')) {
        pe.fear = 'Betrayal';
        track('fear_occ');
      } else if (combined.includes('assassin') || combined.includes('ninja') || combined.includes('hunter')) {
        pe.fear = 'Failure';
        track('fear_occ');
      }
    }

    // 71. Equipment from about field mentions
    if (pa && (!pa.equipment || pa.equipment.length === 0) && c.about && c.about.length > 10) {
      const about = c.about.toLowerCase();
      const equipMentions = [];
      const equipmentPatterns = [
        ['armor', 'Armor'], ['suit', 'Suit'], ['costume', 'Costume'], ['shield', 'Shield'],
        ['helmet', 'Helmet'], ['mask', 'Mask'], ['cape', 'Cape'], ['cloak', 'Cloak'],
        ['staff', 'Staff'], ['sword', 'Sword'], ['blade', 'Blade'], ['gun', 'Gun'],
        ['spear', 'Spear'], ['bow', 'Bow'], ['hammer', 'Hammer'], ['axe', 'Axe'],
        ['dagger', 'Dagger'], ['whip', 'Whip'], ['gauntlet', 'Gauntlet'], ['ring', 'Ring'],
        ['amulet', 'Amulet'], ['orb', 'Orb'], ['crystal', 'Crystal'], ['scroll', 'Scroll'],
        ['potion', 'Potion'], ['tool', 'Tool'], ['device', 'Device'], ['gadget', 'Gadget'],
        ['robot', 'Robot'], ['mecha', 'Mecha'], ['vehicle', 'Vehicle'],
      ];
      for (const [kw, val] of equipmentPatterns) {
        const regex = new RegExp('\\b' + kw + '\\b', 'i');
        if (regex.test(about)) equipMentions.push(val);
      }
      if (equipMentions.length > 0) {
        pa.equipment = [...new Set(equipMentions)];
        track('equipment_about');
      }
    }

    // 72. Weapon from about field mentions
    if (pa && (!pa.weapon || pa.weapon === null) && c.about && c.about.length > 10) {
      const about = c.about.toLowerCase();
      const weaponMentions = [
        ['sword', 'Sword'], ['blade', 'Blade'], ['gun', 'Gun'], ['spear', 'Spear'],
        ['axe', 'Axe'], ['bow', 'Bow'], ['hammer', 'Hammer'], ['staff', 'Staff'],
        ['whip', 'Whip'], ['shield', 'Shield'], ['dagger', 'Dagger'], ['rifle', 'Rifle'],
        ['katana', 'Katana'], ['scythe', 'Scythe'], ['lance', 'Lance'], ['mace', 'Mace'],
        ['saber', 'Saber'], ['pistol', 'Pistol'], ['shotgun', 'Shotgun'], ['sniper', 'Sniper'],
        ['knife', 'Knife'], ['rapier', 'Rapier'], ['halberd', 'Halberd'], ['crossbow', 'Crossbow'],
        ['trident', 'Trident'], ['shuriken', 'Shuriken'], ['kunai', 'Kunai'],
        ['boomerang', 'Boomerang'], ['flail', 'Flail'], ['nunchaku', 'Nunchaku'],
        ['lightsaber', 'Lightsaber'], ['blaster', 'Blaster'],
      ];
      for (const [kw, val] of weaponMentions) {
        const regex = new RegExp('\\b' + kw + '\\b', 'i');
        if (regex.test(about)) {
          pa.weapon = val;
          track('weapon_about');
          break;
        }
      }
    }

    // 73. Relatives from existing data (broader matching)
    if (rr && (rr.relatives === null || rr.relatives === undefined || (Array.isArray(rr.relatives) && rr.relatives.length === 0))) {
      const members = [];
      const allRelFields = ['father','mother','brother','sister','son','daughter','parents','sibling','sisters','children','husband','wife','cousin','nephew','niece','uncle','aunt','grandfather','grandmother','grandson','twin','siblings','brothers','daughters','sons'];
      for (const f of allRelFields) {
        const v = rr[f];
        if (v && v !== null && v !== 'null' && v !== 'Unknown' && v !== '') {
          if (Array.isArray(v) && v.length > 0) {
            members.push(...v.map(item => `${item} (${f})`));
          } else if (typeof v === 'string' && v !== 'null' && v !== 'Unknown') {
            members.push(`${v} (${f})`);
          }
        }
      }
      if (members.length > 0) {
        rr.relatives = [...new Set(members)];
        track('relatives_broad');
      }
    }

    // 74. Ultimate_move from about field mentioning "signature" moves
    if ((!c.ultimate_move || c.ultimate_move === 'Unknown' || c.ultimate_move === null) && c.about && c.about.length > 20) {
      const about = c.about;
      // Look for "Signature move:" or "Trademark move:" or "Special move:"
      const m = about.match(/(?:signature|trademark|trademark technique|special|ultimate)\s*(?:move|technique|attack|ability|jutsu)\s*:\s*([A-Za-z][A-Za-z\s'-]+?)(?:\n|\.|,|;|$)/i);
      if (m) {
        const move = m[1].trim();
        if (move.length > 1 && move.length < 60 && !move.match(/^(?:Yes|No|Unknown|None|N\/A)$/i)) {
          c.ultimate_move = move;
          track('ultimate_move_about');
        }
      }
    }

    // 75. Blood type from publisher defaults (anime characters often have blood types)
    if (bi && (bi.blood_type === null || bi.blood_type === '' || bi.blood_type === 'Unknown')) {
      if (c.publisher === 'anime') {
        // Don't set a default, but note many anime chars have blood types
        bi.blood_type = 'Unknown';
        track('blood_type_default');
      }
    }

    // 76. Gender from appearance clues (hair color, eye color)
    if (bi && (!bi.gender || bi.gender === 'Unknown' || bi.gender === '') && c.appearance) {
      const hair = (c.appearance.hair_color || '').toLowerCase();
      const eye = (c.appearance.eye_color || '').toLowerCase();
      const skin = (c.appearance.skin_color || '').toLowerCase();
      // Certain hair colors are strongly associated with gender in anime
      if (c.publisher === 'anime') {
        if (hair.includes('pink') || hair.includes('lavender') || hair.includes('magenta') || hair.includes('rose')) {
          bi.gender = 'Female';
          track('gender_hair');
        } else if (hair.includes('spiky') || hair.includes('buzz')) {
          bi.gender = 'Male';
          track('gender_hair');
        }
      }
    }

    // 77. Dream from about field mentions of "goal" or "dream"
    if (pe && (!pe.dream || pe.dream === 'Unknown' || pe.dream === null || pe.dream === '') && c.about && c.about.length > 20) {
      const about = c.about;
      const m = about.match(/(?:dream|goal|ambition|aspiration)\s*(?:is|:|—)\s*([A-Za-z][A-Za-z\s'-]+?)(?:\n|\.|,|;|$)/i);
      if (m) {
        const dream = m[1].trim();
        if (dream.length > 2 && dream.length < 100 && !dream.match(/^(?:Yes|No|Unknown|None|N\/A)$/i)) {
          pe.dream = dream;
          track('dream_about');
        }
      }
    }

    // 78. Story.status from occupation (police/hero/villain → Active, etc.)
    if (st && (!st.status || st.status === 'Unknown' || st.status === '') && oc && oc.primary) {
      const occ = oc.primary.toLowerCase();
      if (occ.includes('hero') || occ.includes('villain') || occ.includes('fighter') || occ.includes('warrior') || occ.includes('soldier') || occ.includes('agent') || occ.includes('assassin') || occ.includes('ninja') || occ.includes('pirate') || occ.includes('hunter') || occ.includes('guard') || occ.includes('knight') || occ.includes('captain') || occ.includes('commander') || occ.includes('general') || occ.includes('admiral')) {
        st.status = 'Active';
        track('status_occ');
      }
    }

    // 79. Achievements from voice_acting + abilities (notable VAs are achievements)
    if ((!c.achievements || c.achievements.length === 0)) {
      const sources = [];
      if (c.voice_acting && c.voice_acting.japanese && c.voice_acting.japanese !== 'Unknown') {
        sources.push('Voiced by ' + c.voice_acting.japanese + ' (Japanese)');
      }
      if (c.voice_acting && c.voice_acting.english && c.voice_acting.english !== 'Unknown') {
        sources.push('Voiced by ' + c.voice_acting.english + ' (English)');
      }
      if (c.abilities && Array.isArray(c.abilities) && c.abilities.length >= 5) {
        sources.push('Mastered ' + c.abilities.length + ' abilities');
      }
      if (c.abilities && Array.isArray(c.abilities)) {
        const topAbilities = c.abilities.filter(a => a && a.power_level && parseInt(a.power_level) >= 90);
        if (topAbilities.length > 0) {
          sources.push(topAbilities.slice(0, 2).map(a => a.name).join(', '));
        }
      }
      if (sources.length > 0) {
        c.achievements = [...new Set(sources)];
        track('achievements_va');
      }
    }

    // 80. Equipment from abilities that are clearly equipment
    if (pa && (!pa.equipment || pa.equipment.length === 0) && c.abilities && Array.isArray(c.abilities)) {
      const equipAbilities = c.abilities.filter(a => a && a.name && (
        a.name.toLowerCase().includes('armor') || a.name.toLowerCase().includes('suit') ||
        a.name.toLowerCase().includes('costume') || a.name.toLowerCase().includes('shield') ||
        a.name.toLowerCase().includes('weapon') || a.name.toLowerCase().includes('tool') ||
        a.name.toLowerCase().includes('device') || a.name.toLowerCase().includes('gadget') ||
        a.name.toLowerCase().includes('sword') || a.name.toLowerCase().includes('blade') ||
        a.name.toLowerCase().includes('gun') || a.name.toLowerCase().includes('staff') ||
        a.name.toLowerCase().includes('spear') || a.name.toLowerCase().includes('bow') ||
        a.name.toLowerCase().includes('hammer') || a.name.toLowerCase().includes('axe') ||
        a.name.toLowerCase().includes('whip') || a.name.toLowerCase().includes('dagger')
      ));
      if (equipAbilities.length > 0) {
        pa.equipment = [...new Set(equipAbilities.map(a => a.name))];
        track('equipment_ability_names');
      }
    }

    // 81. Fear from story.arc or story.role_in_story
    if (pe && (pe.fear === null || pe.fear === '' || pe.fear === 'Unknown')) {
      const role = (st && st.role_in_story ? st.role_in_story.toLowerCase() : '');
      const arc = (ch && ch.arc ? ch.arc.toLowerCase() : '');
      const comb = role + ' ' + arc;
      if (comb.includes('tragic') || comb.includes('death') || comb.includes('fallen')) {
        pe.fear = 'Death';
        track('fear_story');
      } else if (comb.includes('loss') || comb.includes('grief') || comb.includes('mourning')) {
        pe.fear = 'Loss';
        track('fear_story');
      } else if (comb.includes('betray') || comb.includes('traitor') || comb.includes('backstab')) {
        pe.fear = 'Betrayal';
        track('fear_story');
      } else if (comb.includes('redemption') || comb.includes('forgive')) {
        pe.fear = 'Failing redemption';
        track('fear_story');
      }
    }

    // 82. Weaknesses from about field mentioning weaknesses/vulnerabilities
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      const weaknessKW = ['weakness', 'vulnerability', 'fragile', 'limitation', 'achilles', 'weak point', 'susceptible', 'prone to', 'allergic'];
      const found = [];
      for (const kw of weaknessKW) {
        if (about.includes(kw)) found.push(kw.charAt(0).toUpperCase() + kw.slice(1));
      }
      if (found.length > 0) {
        pe.weaknesses = [...new Set(found)];
        track('weaknesses_about');
      }
    }

    // 83. Convert remaining nulls to Unknown for string fields
    if (bi) {
      if (bi.zodiac === null || bi.zodiac === undefined) bi.zodiac = 'Unknown';
      if (bi.blood_type === null || bi.blood_type === undefined) bi.blood_type = 'Unknown';
      if (bi.birthday === null || bi.birthday === undefined) bi.birthday = 'Unknown';
    }
    if (pe) {
      if (pe.fear === null || pe.fear === undefined) pe.fear = 'Unknown';
      if (pe.dream === null || pe.dream === undefined) pe.dream = 'Unknown';
    }
    if (c.origin) {
      if (c.origin.place_of_birth === null || c.origin.place_of_birth === undefined) c.origin.place_of_birth = 'Unknown';
    }
    if (c.voice_acting) {
      if (c.voice_acting.japanese === null || c.voice_acting.japanese === undefined) c.voice_acting.japanese = 'Unknown';
    }
    if (pa) {
      if (pa.weapon === null || pa.weapon === undefined) pa.weapon = 'Unknown';
    }
    if (st) {
      if (st.status === null || st.status === undefined) st.status = 'Unknown';
    }
    if (c.appearance) {
      if (c.appearance.eye_color === null || c.appearance.eye_color === undefined) c.appearance.eye_color = 'Unknown';
      if (c.appearance.hair_color === null || c.appearance.hair_color === undefined) c.appearance.hair_color = 'Unknown';
      if (c.appearance.skin_color === null || c.appearance.skin_color === undefined) c.appearance.skin_color = 'Unknown';
    }

    // 84. Equipment from occupation (comprehensive mapping)
    if (pa && (!pa.equipment || pa.equipment.length === 0) && oc && oc.primary) {
      const occ = oc.primary.toLowerCase();
      const equipMap = {
        'knight': ['Armor', 'Sword', 'Shield'],
        'police': ['Handcuffs', 'Gun', 'Badge'],
        'detective': ['Badge', 'Gun'],
        'soldier': ['Armor', 'Gun', 'Combat gear'],
        'warrior': ['Armor', 'Sword', 'Shield'],
        'swordsman': ['Sword'],
        'fencer': ['Rapier'],
        'archer': ['Bow', 'Arrow'],
        'hunter': ['Bow', 'Weapon', 'Traps'],
        'mage': ['Magical staff', 'Magical artifacts'],
        'wizard': ['Magical staff', 'Magical artifacts'],
        'sorcerer': ['Magical artifacts'],
        'ninja': ['Shuriken', 'Katana', 'Ninja gear'],
        'assassin': ['Dagger', 'Poison'],
        'pirate': ['Cutlass', 'Ship'],
        'viking': ['Axe', 'Shield', 'Armor'],
        'gladiator': ['Sword', 'Shield', 'Armor'],
        'samurai': ['Katana', 'Armor'],
        'spy': ['Gadgets', 'Disguise kit'],
        'king': ['Crown', 'Scepter'],
        'queen': ['Crown', 'Scepter'],
        'prince': ['Crown'],
        'princess': ['Crown'],
        'doctor': ['Medical equipment'],
        'scientist': ['Lab equipment'],
        'engineer': ['Tools', 'Gadgets'],
        'mechanic': ['Tools'],
        'thief': ['Lockpicks', 'Dagger'],
        'barbarian': ['Axe', 'Armor'],
        'paladin': ['Sword', 'Shield', 'Holy armor'],
        'ranger': ['Bow', 'Arrow', 'Survival gear'],
        'guard': ['Spear', 'Armor', 'Shield'],
      };
      for (const [key, items] of Object.entries(equipMap)) {
        if (occ.includes(key)) {
          pa.equipment = items;
          track('equipment_occupation');
          break;
        }
      }
    }

    // 85. Weapon from occupation
    if (pa && (!pa.weapon || pa.weapon === null) && oc && oc.primary) {
      const occ = oc.primary.toLowerCase();
      const weaponMap = [
        ['swordsman', 'Sword'], ['fencer', 'Rapier'], ['archer', 'Bow'], ['hunter', 'Bow'],
        ['ninja', 'Katana'], ['assassin', 'Dagger'], ['samurai', 'Katana'],
        ['viking', 'Axe'], ['gladiator', 'Sword'], ['barbarian', 'Axe'],
        ['paladin', 'Sword'], ['ranger', 'Bow'], ['pirate', 'Cutlass'],
        ['knight', 'Sword'], ['guard', 'Spear'], ['soldier', 'Gun'],
        ['police', 'Gun'], ['detective', 'Gun'], ['spy', 'Gun'],
        ['gunner', 'Gun'], ['sniper', 'Sniper rifle'], ['shooter', 'Gun'],
        ['mage', 'Staff'], ['wizard', 'Staff'], ['sorcerer', 'Staff'],
        ['brawler', 'Fists'], ['boxer', 'Fists'], ['martial artist', 'Fists'],
      ];
      for (const [key, weapon] of weaponMap) {
        if (occ.includes(key)) {
          pa.weapon = weapon;
          track('weapon_occupation');
          break;
        }
      }
    }

    // 86. Weaknesses from low powerstats
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.powerstats) {
      const ps = c.powerstats;
      const weaknessMap = [
        { stat: 'intelligence', threshold: 30, weakness: 'Low intelligence' },
        { stat: 'strength', threshold: 30, weakness: 'Physically weak' },
        { stat: 'speed', threshold: 30, weakness: 'Slow speed' },
        { stat: 'durability', threshold: 30, weakness: 'Low durability' },
        { stat: 'power', threshold: 30, weakness: 'Limited power' },
        { stat: 'combat', threshold: 30, weakness: 'Poor combat skills' },
      ];
      const found = [];
      for (const entry of weaknessMap) {
        const val = parseInt(ps[entry.stat]);
        if (!isNaN(val) && val < entry.threshold) {
          found.push(entry.weakness);
        }
      }
      if (found.length > 0) {
        pe.weaknesses = found;
        track('weaknesses_powerstats');
      }
    }

    // 87. Fear from about text
    if (pe && (pe.fear === null || pe.fear === '' || pe.fear === 'Unknown') && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      const fearPhrases = [
        { phrase: 'fear of', fear: null },
        { phrase: 'afraid of', fear: null },
        { phrase: 'terrified of', fear: null },
        { phrase: 'scared of', fear: null },
      ];
      let foundFear = null;
      for (const fp of fearPhrases) {
        const idx = about.indexOf(fp.phrase);
        if (idx !== -1) {
          const after = about.substring(idx + fp.phrase.length).trim();
          const end = after.search(/[.,;!?\n]/);
          const fearObj = end !== -1 ? after.substring(0, end).trim() : after.split(/\s+/).slice(0, 6).join(' ');
          if (fearObj && fearObj.length > 1 && fearObj.length < 80) {
            foundFear = fearObj.charAt(0).toUpperCase() + fearObj.slice(1);
            break;
          }
        }
      }
      if (!foundFear) {
        const fearKW = ['phobia', 'fears ', 'dread', 'phobic'];
        for (const kw of fearKW) {
          const idx = about.indexOf(kw);
          if (idx !== -1) {
            const after = about.substring(idx + kw.length).trim();
            const end = after.search(/[.,;!?\n]/);
            const fearObj = end !== -1 ? after.substring(0, end).trim() : after.split(/\s+/).slice(0, 6).join(' ');
            if (fearObj && fearObj.length > 1 && fearObj.length < 80) {
              foundFear = fearObj.charAt(0).toUpperCase() + fearObj.slice(1);
              break;
            }
          }
        }
      }
      if (foundFear) {
        pe.fear = foundFear;
        track('fear_about');
      }
    }

    // 88. Equipment/weapon from about text
    if (pa && (!pa.equipment || pa.equipment.length === 0) && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      const equipKW = ['wears', 'equipped with', 'carries', 'wields', 'uses a ', 'uses an ', 'armor', 'suit', 'costume', 'gadget', 'device', 'tool', 'shield', 'staff', 'spear', 'hammer', 'bow', 'arrow'];
      const found = [];
      for (const kw of equipKW) {
        const idx = about.indexOf(kw);
        if (idx !== -1) {
          const start = idx + kw.length;
          const after = about.substring(start, start + 80);
          const end = after.search(/[.,;!?\n]/);
          const item = end !== -1 ? after.substring(0, end).trim() : after.trim();
          const words = item.split(/\s+/).filter(w => w.length > 2).slice(0, 3);
          if (words.length > 0) {
            found.push(words.join(' ').replace(/^[a]\s+/, ''));
          }
        }
      }
      if (found.length > 0) {
        pa.equipment = [...new Set(found.filter(f => f.length > 1))];
        track('equipment_about');
      }
    }

    // 89. Relatives from about text (family mentions)
    if (rr && (!rr.relatives || rr.relatives.length === 0) && c.about && c.about.length > 20) {
      const aboutLower = c.about.toLowerCase();
      const familyPatterns = [
        { regex: /(?:his|her|their)\s+(\w+)\s+(?:is|was|were|named|called)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, idx: 2 },
        { regex: /(?:his|her|their)\s+(older|younger|twin|adoptive)?\s*(brother|sister|mother|father|sibling|daughter|son|cousin|aunt|uncle|grandfather|grandmother|grandson|granddaughter|nephew|niece|wife|husband|parent)s?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, idx: 3 },
        { regex: /(?:brother|sister|mother|father|son|daughter|cousin|aunt|uncle)\s+of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g, idx: 1 },
      ];
      const found = [];
      for (const pattern of familyPatterns) {
        let m;
        while ((m = pattern.regex.exec(c.about)) !== null) {
          const name = m[pattern.idx];
          const relation = m[2] || '';
          if (name && name !== c.name && name.length > 1) {
            found.push(relation ? `${name} (${relation})` : name);
          }
        }
      }
      // Simpler pattern: "her sister NAME", "his brother NAME", etc.
      const relationKW = ['brother', 'sister', 'mother', 'father', 'son', 'daughter', 'cousin', 'aunt', 'uncle', 'grandfather', 'grandmother', 'grandson', 'granddaughter', 'nephew', 'niece', 'wife', 'husband', 'sibling', 'twin'];
      for (const kw of relationKW) {
        const idx = aboutLower.indexOf(kw);
        if (idx !== -1) {
          const afterIdx = idx + kw.length;
          // skip possessive 's and space
          let after = aboutLower.substring(afterIdx);
          after = after.replace(/^['\u2019]s\s+/, ' ').replace(/^\s+of\s+/, ' ');
          const nameMatch = after.match(/^\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
          if (nameMatch) {
            const name = nameMatch[1];
            if (name && name !== c.name && name.length > 1) {
              // Determine the relationship type
              let relLabel = kw;
              const before = aboutLower.substring(Math.max(0, idx - 20), idx).trim();
              if (before.match(/older|elder|big|oldest/)) relLabel = 'older ' + kw;
              else if (before.match(/younger|little|littlest|baby/)) relLabel = 'younger ' + kw;
              else if (before.match(/twin/)) relLabel = 'twin ' + kw;
              else if (before.match(/adoptive|foster|step|half/)) relLabel = before.match(/(adoptive|foster|step|half)/)[1] + ' ' + kw;
              found.push(`${name} (${relLabel})`);
            }
          }
        }
      }
      if (found.length > 0) {
        rr.relatives = [...new Set(found)];
        track('relatives_about');
      }
    }

    // 90. Achievements from about text (accolades, titles, feats)
    if ((!c.achievements || c.achievements.length === 0) && c.about && c.about.length > 20) {
      const about = c.about;
      const found = [];
      // Look for "known as", "also known as", "regarded as", "considered", "famous for", "renowned"
      const accoladePatterns = [
        /(?:known as|also known as|regarded as|considered|famous for|renowned for|notable for|recognized as|celebrated for|praised for)\s+([A-Z][^.,;!?\n]+)/gi,
        /(?:is\s+(?:a|an|the)\s+[A-Z][a-z]+\s+(?:and\s+)?)+(?:of|in|from)\s+[A-Z]/g,
        /(?:defeated|conquered|destroyed|saved|rescued|created|invented|discovered|won|earned|achieved)\s+[A-Z][^.,;!?\n]{5,60}/gi,
      ];
      for (const pattern of accoladePatterns) {
        let m;
        while ((m = pattern.exec(about)) !== null) {
          const text = m[0].trim();
          if (text.length > 5 && text.length < 100) {
            found.push(text.charAt(0).toUpperCase() + text.slice(1));
          }
        }
      }
      if (found.length > 0) {
        c.achievements = [...new Set(found)].slice(0, 8);
        track('achievements_about');
      }
    }

    // 91. Enemy from relationships.opponent + rival + nemesis (top-level fields)
    if (rr && (!rr.enemy || rr.enemy === null || rr.enemy === 'Unknown' || (Array.isArray(rr.enemy) && rr.enemy.length === 0))) {
      const sources = [];
      const enemyFields = ['opponent', 'rival', 'nemesis', 'archnemesis', 'arch_enemy', 'archenemy', 'greatest_foe', 'enemy'];
      for (const f of enemyFields) {
        const v = rr[f];
        if (v && typeof v === 'string' && v !== 'null' && v !== 'Unknown' && v !== '') {
          sources.push(v);
        }
      }
      if (sources.length > 0) {
        rr.enemy = [...new Set(sources)];
        // Also sync enemies array
        if (!rr.enemies || rr.enemies.length === 0) {
          rr.enemies = [...rr.enemy];
        }
        track('enemy_fields');
      }
    }

    // 92. Weaknesses from about text: specific weakness keywords in context
    if (pe && (!pe.weaknesses || pe.weaknesses.length === 0) && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      const specificKW = ['cannot swim', 'cannot use', 'allergic to', 'susceptible to', 'vulnerable to', 'weak against', 'limited by', 'restricted by', 'prone to', 'weakness is', 'achilles heel', 'fatal flaw', 'fear of water', 'fear of heights'];
      const found = [];
      for (const kw of specificKW) {
        const idx = about.indexOf(kw);
        if (idx !== -1) {
          const start = idx + kw.length;
          const after = about.substring(start, Math.min(start + 60, about.length));
          const end = after.search(/[.,;!?\n]/);
          const weakness = end !== -1 ? after.substring(0, end).trim() : after.trim();
          const phrase = kw.charAt(0).toUpperCase() + kw.slice(1) + (weakness ? ': ' + weakness : '');
          found.push(phrase.length > 80 ? phrase.substring(0, 80) + '...' : phrase);
        }
      }
      if (found.length > 0) {
        pe.weaknesses = found;
        track('weaknesses_about_specific');
      }
    }

    // 93. Story.status from about text (if missing)
    if (st && (!st.status || st.status === 'Unknown') && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      if (about.includes('deceased') || about.includes('died') || about.includes('killed') || about.includes('dead') || about.includes('murdered') || about.includes('passed away')) {
        st.status = 'Deceased';
        track('status_about');
      } else if (about.includes('retired') || about.includes('retirement')) {
        st.status = 'Retired';
        track('status_about');
      } else if (about.includes('imprisoned') || about.includes('incarcerated') || about.includes('captured') || about.includes('arrested')) {
        st.status = 'Imprisoned';
        track('status_about');
      }
    }

    // 94. Equipment from signature_moves/titles
    if (pa && (!pa.equipment || pa.equipment.length === 0)) {
      const source = [];
      if (c.signature_moves && Array.isArray(c.signature_moves)) {
        const eqKW = ['armor', 'sword', 'shield', 'staff', 'blade', 'gun', 'spear', 'axe', 'bow', 'hammer', 'whip', 'dagger', 'cannon', 'rifle', 'bomb', 'grenade', 'mine', 'trap', 'net', 'rope', 'chain', 'shackle', 'cape', 'cloak', 'mask', 'helmet', 'gauntlet', 'boot', 'belt', 'ring', 'amulet', 'crystal', 'orb', 'tome', 'book', 'scroll', 'potion', 'flask', 'lantern', 'torch', 'key', 'lock', 'pick', 'drill', 'saw', 'knife', 'needle', 'pin', 'card', 'coin', 'dice', 'ball', 'doll', 'puppet'];
        for (const move of c.signature_moves) {
          const lower = move.toLowerCase();
          for (const kw of eqKW) {
            if (lower.includes(kw)) {
              source.push(move);
              break;
            }
          }
        }
      }
      if (c.titles && Array.isArray(c.titles)) {
        for (const title of c.titles) {
          const lower = title.toLowerCase();
          if (lower.includes('armor') || lower.includes('sword') || lower.includes('shield') || lower.includes('staff') || lower.includes('blade') || lower.includes('crown') || lower.includes('scepter') || lower.includes('throne')) {
            // Don't add title as equipment, but extract the keyword
            break;
          }
        }
      }
      if (source.length > 0) {
        pa.equipment = [...new Set(source)];
        track('equipment_moves');
      }
    }

    // 95. Place_of_birth from origin fields
    if (c.origin && (!c.origin.place_of_birth || c.origin.place_of_birth === null || c.origin.place_of_birth === 'Unknown')) {
      if (c.origin.place && c.origin.place !== 'Unknown' && c.origin.place !== null) {
        c.origin.place_of_birth = c.origin.place;
        track('pob_origin');
      } else if (c.origin.current_location && c.origin.current_location !== 'Unknown' && c.origin.current_location !== null && typeof c.origin.current_location === 'string') {
        c.origin.place_of_birth = c.origin.current_location;
        track('pob_current');
      }
    }

    // 96. Power_source from ability types (for those still missing)
    if (pa && (!pa.power_source || pa.power_source === null || pa.power_source === 'Unknown') && c.abilities && Array.isArray(c.abilities) && c.abilities.length > 0) {
      const types = new Set(c.abilities.map(a => a.type).filter(Boolean));
      const typePowerMap = [
        ['magic', 'Magic'], ['magical', 'Magic'], ['spell', 'Magic'], ['curse', 'Magic'],
        ['psychic', 'Psychic'], ['telepathy', 'Psychic'], ['mental', 'Psychic'],
        ['cosmic', 'Cosmic'], ['divine', 'Divine'], ['godly', 'Divine'],
        ['elemental', 'Elemental'], ['element', 'Elemental'], ['fire', 'Elemental'], ['ice', 'Elemental'], ['water', 'Elemental'], ['earth', 'Elemental'], ['wind', 'Elemental'], ['lightning', 'Elemental'],
        ['tech', 'Technology'], ['technolog', 'Technology'], ['mecha', 'Technology'], ['cyber', 'Technology'], ['machine', 'Technology'],
        ['combat', 'Combat'], ['physical', 'Physical'], ['strength', 'Physical'], ['speed', 'Physical'],
        ['supernatural', 'Supernatural'], ['spiritual', 'Spiritual'], ['ghost', 'Spiritual'],
        ['dark', 'Dark'], ['shadow', 'Dark'],
        ['light', 'Light'], ['holy', 'Light'], ['divine', 'Divine'],
      ];
      for (const t of types) {
        const tl = t.toLowerCase();
        for (const [key, source] of typePowerMap) {
          if (tl.includes(key)) {
            pa.power_source = source;
            track('power_source_types');
            break;
          }
        }
        if (pa.power_source && pa.power_source !== 'Unknown') break;
      }
    }

    // 97. Eye/hair/skin color from appearance fields with fallback
    if (c.appearance) {
      const ap = c.appearance;
      if ((!ap.eye_color || ap.eye_color === 'Unknown') && ap.eye && ap.eye !== 'Unknown' && ap.eye !== null) {
        ap.eye_color = ap.eye;
        track('eye_color_fallback');
      }
      if ((!ap.hair_color || ap.hair_color === 'Unknown') && ap.hair && ap.hair !== 'Unknown' && ap.hair !== null) {
        ap.hair_color = ap.hair;
        track('hair_color_fallback');
      }
      if ((!ap.skin_color || ap.skin_color === 'Unknown') && ap.skin && ap.skin !== 'Unknown' && ap.skin !== null) {
        ap.skin_color = ap.skin;
        track('skin_color_fallback');
      }
    }

    // 98. BMI for characters with height/weight (already covered, but ensure for all)
    if (bi && (bi.bmi === null || bi.bmi === undefined) && bi.height_cm && bi.weight_kg) {
      const h = parseFloat(bi.height_cm) / 100;
      const w = parseFloat(bi.weight_kg);
      if (h > 0 && w > 0) {
        bi.bmi = Math.round((w / (h * h)) * 10) / 10;
        track('bmi_fallback');
      }
    }

    // 99. Sync personality.weaknesses to weaknesses.list
    if ((!c.weaknesses || !c.weaknesses.list || c.weaknesses.list.length === 0) && pe && pe.weaknesses && Array.isArray(pe.weaknesses) && pe.weaknesses.length > 0) {
      if (!c.weaknesses) c.weaknesses = {};
      c.weaknesses.list = [...pe.weaknesses];
      track('weaknesses_sync');
    }

    // 100. Sync weaknesses.factors from personality.weaknesses
    if (c.weaknesses && (!c.weaknesses.factors || c.weaknesses.factors.length === 0) && pe && pe.weaknesses && Array.isArray(pe.weaknesses) && pe.weaknesses.length > 0) {
      c.weaknesses.factors = [...pe.weaknesses.map(w => w.toLowerCase()).filter(w => w.length > 3)];
      track('weaknesses_factors_sync');
    }

    // 101. Enemy from story.arc or character arc
    if (rr && (!rr.enemy || rr.enemy === null || rr.enemy === 'Unknown' || (Array.isArray(rr.enemy) && rr.enemy.length === 0))) {
      const arcText = ((ch && ch.arc) || '') + ' ' + ((st && st.role_in_story) || '');
      const lower = arcText.toLowerCase();
      const enemyMap = [
        { kw: ['antagonist', 'villain', 'evil', 'dark', 'fallen'], enemy: 'Heroes/Protagonists' },
        { kw: ['hero', 'protagonist', 'good', 'light', 'righteous'], enemy: 'Villains/Antagonists' },
        { kw: ['rival', 'rivalry', 'competitor', 'opposing', 'conflict'], enemy: 'Rival' },
        { kw: ['nemesis', 'arch', 'mortal enemy', 'sworn'], enemy: 'Arch-nemesis' },
        { kw: ['war', 'battle', 'combat', 'fight', 'conflict'], enemy: 'Opposing faction' },
        { kw: ['hunter', 'hunted', 'chase', 'pursuit', 'manhunt'], enemy: 'Target/Hunted' },
      ];
      for (const entry of enemyMap) {
        if (entry.kw.some(k => lower.includes(k))) {
          rr.enemy = [entry.enemy];
          if (!rr.enemies || rr.enemies.length === 0) rr.enemies = [entry.enemy];
          track('enemy_story');
          break;
        }
      }
    }

    // 102. Equipment from combat_style (more mappings)
    if (pa && (!pa.equipment || pa.equipment.length === 0) && pa.combat_style && Array.isArray(pa.combat_style)) {
      const styleEquip = {
        'magic': ['Magical artifacts', 'Staff'],
        'swordsmanship': ['Sword'],
        'ranged': ['Ranged weapon'],
        'stealth': ['Throwing knives', 'Smoke bombs'],
        'defensive': ['Shield', 'Armor'],
        'hand-to-hand': ['Fighting gear'],
        'speed': ['Lightweight gear'],
        'elemental': ['Elemental weapon'],
        'psychic': ['Focus crystal'],
        'support': ['Support items'],
        'summoning': ['Summoning materials'],
      };
      const found = [];
      for (const style of pa.combat_style) {
        const lower = style.toLowerCase();
        for (const [key, items] of Object.entries(styleEquip)) {
          if (lower.includes(key)) {
            found.push(...items);
          }
        }
      }
      if (found.length > 0) {
        pa.equipment = [...new Set(found)];
        track('equipment_combat_style');
      }
    }

    // 103. Friends from affiliations/teammates
    if (rr && (!rr.friends || rr.friends.length === 0) && c.affiliations && c.affiliations.current && Array.isArray(c.affiliations.current) && c.affiliations.current.length > 0) {
      rr.friends = c.affiliations.current.slice(0, 5);
      track('friends_affiliations');
    }

    // 104. Personality.dislikes from about text (specific dislike phrases)
    if (pe && (!pe.dislikes || pe.dislikes.length === 0) && c.about && c.about.length > 50) {
      const about = c.about.toLowerCase();
      const dislikePhrases = [
        { kw: ['hates', 'dislikes', 'despises', 'loathes', 'detests', 'abhors', 'cannot stand'], label: 'Unknown' },
        { kw: ['injustice', 'unfair', 'cruelty', 'oppression'], label: 'Injustice' },
        { kw: ['liar', 'lie', 'deceit', 'dishonest', 'betrayal'], label: 'Dishonesty' },
        { kw: ['coward', 'cowardice', 'cowardly'], label: 'Cowardice' },
        { kw: ['lazy', 'laziness', 'lazily', 'idle'], label: 'Laziness' },
      ];
      const found = [];
      for (const entry of dislikePhrases) {
        if (entry.kw.some(k => about.includes(k))) {
          found.push(entry.label);
        }
      }
      if (about.includes('can\'t stand') || about.includes('cannot stand')) {
        const idx = about.indexOf('stand');
        const after = about.substring(idx + 6, idx + 50);
        const end = after.search(/[.,;!?\n]/);
        const target = end !== -1 ? after.substring(0, end).trim() : after.trim();
        if (target && target.length > 2 && target.length < 40) {
          found.push('Being around ' + target);
        }
      }
      if (found.length > 0) {
        pe.dislikes = [...new Set(found)];
        track('dislikes_about');
      }
    }

    // 105. power_attributes.power_type from about text or ability types
    if (pa && (!pa.power_type || pa.power_type === 'Unknown' || pa.power_type === null) && c.about && c.about.length > 20) {
      const about = c.about.toLowerCase();
      const powerTypes = [
        { kw: ['magic', 'sorcery', 'witch', 'wizard', 'spell', 'curse', 'enchant'], type: 'Magic' },
        { kw: ['superhuman', 'super strength', 'super speed', 'flight', 'invulnerable'], type: 'Superhuman' },
        { kw: ['psychic', 'telepathy', 'telekinetic', 'mind', 'mental', 'psionic'], type: 'Psychic' },
        { kw: ['technology', 'cyborg', 'cybernetic', 'mecha', 'gadget', 'tech'], type: 'Technology' },
        { kw: ['divine', 'godly', 'blessed', 'holy', 'angelic', 'demonic'], type: 'Divine' },
        { kw: ['elemental', 'fire', 'ice', 'lightning', 'earth', 'wind', 'water'], type: 'Elemental' },
        { kw: ['chi', 'ki', 'spirit energy', 'chakra', 'nen', 'haki', 'reiatsu'], type: 'Spiritual Energy' },
        { kw: ['devil fruit', 'devil\'s fruit', 'akuma no mi'], type: 'Devil Fruit' },
        { kw: ['mutant', 'genetic', 'x-gene', 'mutation'], type: 'Mutant' },
        { kw: ['curse', 'cursed', 'cursed energy', 'jujutsu'], type: 'Cursed Energy' },
        { kw: ['scientific', 'experiment', 'serum', 'super-soldier'], type: 'Scientific Enhancement' },
        { kw: ['alien', 'extraterrestrial', 'cosmic', 'space'], type: 'Cosmic' },
      ];
      for (const entry of powerTypes) {
        if (entry.kw.some(k => about.includes(k))) {
          pa.power_type = entry.type;
          track('power_type_about');
          break;
        }
      }
    }

    // 106. Personality.traits from about text (character descriptions)
    if (pe && (!pe.traits || pe.traits.length < 3) && c.about && c.about.length > 50) {
      const about = c.about.toLowerCase();
      const traitMap = [
        { kw: ['brave', 'courageous', 'fearless', 'valiant', 'heroic'], trait: 'Brave' },
        { kw: ['kind', 'caring', 'gentle', 'compassionate', 'warm'], trait: 'Kind' },
        { kw: ['intelligent', 'smart', 'brilliant', 'genius', 'wise'], trait: 'Intelligent' },
        { kw: ['stubborn', 'determined', 'persistent', 'tenacious', 'unyielding'], trait: 'Determined' },
        { kw: ['lazy', 'laid-back', 'carefree', 'easygoing', 'relaxed'], trait: 'Easygoing' },
        { kw: ['loyal', 'faithful', 'devoted', 'dedicated', 'trustworthy'], trait: 'Loyal' },
        { kw: ['proud', 'arrogant', 'haughty', 'conceited', 'vain'], trait: 'Proud' },
        { kw: ['mysterious', 'enigmatic', 'secretive', 'withdrawn', 'reserved'], trait: 'Mysterious' },
        { kw: ['cheerful', 'optimistic', 'happy', 'joyful', 'upbeat'], trait: 'Cheerful' },
        { kw: ['calm', 'composed', 'collected', 'stoic', 'serene'], trait: 'Calm' },
        { kw: ['aggressive', 'violent', 'fierce', 'savage', 'brutal'], trait: 'Aggressive' },
        { kw: ['cunning', 'sly', 'deceptive', 'manipulative', 'scheming'], trait: 'Cunning' },
        { kw: ['naive', 'innocent', 'childish', 'gullible', 'trusting'], trait: 'Naive' },
        { kw: ['ambitious', 'driven', 'aspiring', 'motivated', 'goal-oriented'], trait: 'Ambitious' },
        { kw: ['cold', 'distant', 'aloof', 'detached', 'unemotional'], trait: 'Cold' },
        { kw: ['hot-headed', 'impulsive', 'reckless', 'rash', 'short-tempered'], trait: 'Hot-headed' },
      ];
      const found = [];
      for (const entry of traitMap) {
        if (entry.kw.some(k => about.includes(k))) {
          found.push(entry.trait);
        }
      }
      if (found.length > 0) {
        if (!pe.traits) pe.traits = [];
        pe.traits = [...new Set([...pe.traits, ...found])];
        track('traits_about');
      }
    }

    // 107. Achievements from titles
    if ((!c.achievements || c.achievements.length === 0) && c.titles && Array.isArray(c.titles) && c.titles.length > 0) {
      c.achievements = c.titles.slice(0, 5);
      track('achievements_titles');
    }

    // 108. Occupation from about text (first sentence profession clues)
    if (oc && (!oc.primary || oc.primary === 'Unknown') && c.about && c.about.length > 30) {
      const about = c.about.toLowerCase();
      const occPatterns = [
        { kw: ['is a pirate', 'is a ninja', 'is a samurai', 'is a knight'], occ: null },
        { kw: ['is a student', 'is a teacher', 'is a professor'], occ: null },
        { kw: ['is a doctor', 'is a surgeon', 'is a physician'], occ: 'Doctor' },
        { kw: ['is a detective', 'is an investigator', 'is a police'], occ: 'Detective' },
        { kw: ['is a scientist', 'is a researcher'], occ: 'Scientist' },
        { kw: ['is a soldier', 'is a warrior', 'is a fighter'], occ: 'Soldier' },
        { kw: ['is a king', 'is a queen', 'is a prince', 'is a princess', 'is a ruler'], occ: 'Royalty' },
        { kw: ['is an assassin', 'is a hitman'], occ: 'Assassin' },
        { kw: ['is a criminal', 'is a thief', 'is a robber'], occ: 'Criminal' },
        { kw: ['is a hero', 'is a superhero', 'is a vigilante'], occ: 'Superhero' },
        { kw: ['is a villain', 'is a supervillain'], occ: 'Supervillain' },
        { kw: ['is a chef', 'is a cook', 'is a baker'], occ: 'Chef' },
        { kw: ['is an engineer', 'is a mechanic'], occ: 'Engineer' },
        { kw: ['is a pilot', 'is a captain', 'is a commander'], occ: 'Military' },
        { kw: ['is a mercenary', 'is a bounty hunter'], occ: 'Mercenary' },
        { kw: ['is a priest', 'is a monk', 'is a nun'], occ: 'Religious figure' },
        { kw: ['is a hunter', 'is a monster hunter'], occ: 'Hunter' },
        { kw: ['is a spy', 'is a secret agent'], occ: 'Spy' },
        { kw: ['is a bartender', 'is a waiter', 'is a waitress'], occ: 'Service industry' },
        { kw: ['is a mage', 'is a wizard', 'is a sorcerer', 'is a witch'], occ: 'Mage' },
      ];
      for (const entry of occPatterns) {
        if (entry.kw.some(k => about.includes(k))) {
          oc.primary = entry.occ || about.match(new RegExp(entry.kw[0].replace('is a ', ''), 'i'))?.[0] || 'Unknown';
          if (oc.primary !== 'Unknown') {
            track('occupation_about');
            break;
          }
        }
      }
    }

  } // end main for loop

  let written = 0;
  for (const c of Object.values(allChars)) {
    const filePath = path.join(CHARACTERS_DIR, c.publisher, c.id + '.json');
    fs.writeFileSync(filePath, JSON.stringify(c, null, 2) + '\n', 'utf-8');
    written++;
  }

  console.log('Enrichment results:');
  for (const [field, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${field}: ${count}`);
  }
  console.log(`\nTotal files written: ${written}`);
  console.log('Done.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
