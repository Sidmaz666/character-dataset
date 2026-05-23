# Character Dataset

Comprehensive dataset of **2,264 characters** from **10 publishers**: Anime, Marvel, DC, Star Wars, Star Trek, Dark Horse, NBC Heroes, Image Comics, IDW Publishing, and The Boys.

## Dataset Files

| Format | File | Size |
|--------|------|------|
| JSON | `data/dataset_characters.json` | 18.61 MB |
| CSV | `data/dataset_characters.csv` | 6.19 MB (229 columns) |
| Parquet | `data/dataset_characters.parquet` | 6.28 MB |

## Character Count by Publisher

| Publisher | Characters |
|-----------|-----------|
| Anime | 1,525 |
| Marvel | 356 |
| DC | 232 |
| The Boys | 41 |
| Image Comics | 36 |
| Star Trek | 36 |
| Star Wars | 24 |
| Dark Horse | 5 |
| IDW Publishing | 5 |
| NBC Heroes | 4 |
| **Total** | **2,264** |

## Coverage Stats

| Field | Coverage |
|-------|----------|
| basic_info.species | 100.0% |
| basic_info.gender | 100.0% |
| basic_info.age | 100.0% |
| basic_info.bmi | 100.0% |
| occupation.primary | 100.0% |
| personality.traits | 100.0% |
| personality.strengths | 100.0% |
| powerstats (all 7) | 100.0% |
| power_attributes.combat_style | 100.0% |
| power_attributes.power_source | 100.0% |
| story.status | 100.0% |
| story.fate | 100.0% |
| voice_acting.japanese | 100.0% |
| voice_acting.english | 100.0% |
| personality.traits | 95.6% |
| achievements | 94.2% |
| personality.likes | 88.0% |
| story.status (substantial) | 80.2% |
| relationships.friends | 78.5% |
| titles | 76.8% |
| occupation.primary | 75.8% |
| origin.place_of_birth | 75.3% |
| origin.base_of_operations | 75.5% |
| personality.dislikes | 73.6% |
| abilities | 68.4% |
| power_attributes.weapon | 68.4% |
| personality.dream | 68.3% |
| ultimate_move | 68.6% |
| signature_moves | 68.5% |
| power_attributes.equipment | 64.2% |
| japanese_va (substantial) | 52.1% |
| english_va (substantial) | 55.4% |
| personality.fear | 51.8% |
| weaknesses.list | 40.2% |
| weaknesses.factors | 39.1% |
| relationships.enemy | 36.9% |
| basic_info.zodiac | 29.2% |
| basic_info.birthday | 28.5% |
| basic_info.blood_type | 28.2% |
| relationships.relatives | 14.4% |

## Schema (32 keys, 229 leaf fields)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | MD5 hash (unique per character) |
| `name` | string | Character name |
| `native_name` | string\|null | Name in native language |
| `full_name` | string\|null | Full legal/real name |
| `about` | string\|null | Character biography / description |
| `note` | string\|null | Editorial note |
| `source` | string\|null | Image source attribution |
| `basic_info` | object | `species`, `gender`, `age`, `height_cm`, `weight_kg`, `birthday`, `zodiac`, `blood_type`, `bmi`, `bloodline`, `race` |
| `appearance` | object | `eye_color`, `hair_color`, `skin_color`, `race`, `height`, `weight`, `notable_features` |
| `origin` | object | `place_of_birth`, `current_location`, `base_of_operations`, `nationality`, `region`, `dimensions` |
| `occupation` | object | `primary`, `secondary`, `rank`, `rank_title` |
| `affiliations` | object | `current`, `previous`, `group`, `organization`, `clan` |
| `first_appearance` | object | `manga`, `anime`, `comics`, `game`, `year` |
| `abilities` | array | Named abilities with `type`, `tier`, `power_level`, `description` |
| `signature_moves` | array | Signature techniques |
| `ultimate_move` | string\|null | Ultimate/trump ability |
| `trump_card` | string\|null | Decisive power |
| `power_attributes` | object | `power_type`, `power_source`, `combat_style`, `weapon`, `equipment`, `trump_card`, `ultimate_move` |
| `personality` | object | `traits`, `likes`, `dislikes`, `fears`, `weaknesses`, `strengths`, `dream`, `personality_type` |
| `character` | object | `arc`, `motivation`, `affinity`, `alignment` |
| `powerstats` | object | `intelligence`, `strength`, `speed`, `durability`, `power`, `combat`, `total` (0-100) |
| `weaknesses` | object | `list`, `factors` |
| `bounty` | object | `amount`, `currency`, `details` |
| `achievements` | array | Notable accomplishments |
| `titles` | array | Honorific titles |
| `relationships` | object | `friend`, `enemy`, `relatives`, `allies`, `partner`, `nemesis`, `rival`, `mentor`, `student`, `family`, `teammate` |
| `notable_battles` | array | Key conflicts |
| `quotes` | array | Famous quotes |
| `voice_acting` | object | `japanese`, `english`, `native_language`, `note` |
| `story` | object | `status`, `fate`, `role_in_story`, `awakening_potential` |
| `misc` | object | `headquarters`, `story_importance`, `transports`, `vehicles` |
| `publisher` | string | Source publisher |

## Directory Structure

```
character-dataset/
├── data/
│   ├── characters/              # Individual character JSON files
│   │   ├── anime/ (1525)
│   │   ├── marvel/ (356)
│   │   ├── dc/ (232)
│   │   ├── star_wars/ (24)
│   │   ├── star_trek/ (36)
│   │   ├── dark_horse/ (5)
│   │   ├── nbc_heroes/ (4)
│   │   ├── image_comics/ (36)
│   │   ├── idw_publishing/ (5)
│   │   └── the_boys/ (41)
│   ├── images/                  # Character images (192x288 PNG)
│   ├── dataset_characters.json  # Complete dataset
│   ├── dataset_characters.csv   # Flattened CSV
│   └── dataset_characters.parquet # Parquet format
├── scripts/
│   ├── compile.js               # Compile JSONs → JSON/CSV/Parquet
│   ├── normalize.js             # Unify schema across all character JSONs
│   ├── enrich.js                # 108 derivation rules to fill missing data
│   ├── parse_about.js           # Extract structured data from about fields
│   ├── getImage.js              # Download + optimize character images
│   ├── optimize_images.js       # Batch image optimizer
│   └── research_jikan.js        # MyAnimeList Jikan API research
└── package.json
```

## Pipeline

```bash
npm run normalize   # Unify schema (32 keys, 229 leaves)
npm run enrich      # 108 derivation rules
npm run compile     # normalize → enrich → output JSON/CSV/Parquet
```

### normalize
Unifies the schema across all `data/characters/*/*.json` files. Every character gets the same 32-field structure with `null`/`[]` fillers for missing fields.

### enrich
108 derivation rules that fill missing data from existing fields:
- **Zodiac** from birthday
- **Age** from birthday with year
- **Weapon** from combat style, ability names, occupation, about field
- **Equipment** from combat style, abilities, occupation, about text, signature moves
- **Power source** from ability types (magic/psychic/cosmic/elemental/tech/combat), publisher defaults
- **Fear** from traits, weaknesses, about text, story role
- **Weaknesses** from negative traits, low powerstats, ability descriptions, about text
- **Dream** from motivation, about field
- **Achievements** from about text accolades, voice actors, abilities
- **Relatives** from about text family mentions
- **Personality type** from trait keywords
- **BMI** from height/weight
- **Relationships** from reciprocal fields (allies→friend, nemesis→enemy, family→relatives)
- **Combat style** from occupation, abilities
- **Status/fate** from occupation, about text, story role
- **Weaknesses factors** from personality weaknesses sync
- **Enemy** from story arc, role in story, affiliations
- **Equipment** from combat style (magic→staff, stealth→throwing knives, etc.)
- **Friends** from affiliations/teammates
- **Dislikes** from about text phrases
- **Power type** from about text keywords
- **Personality traits** from about text descriptions
- **Achievements** from titles fallback
- **Occupation** from about text "is a X" patterns
- **Null safety**: converts all remaining null string fields to 'Unknown'

### compile
Reads all normalized + enriched JSON files and outputs:
- `data/dataset_characters.json` — full nested structure
- `data/dataset_characters.csv` — flattened (229 columns)
- `data/dataset_characters.parquet` — columnar binary format

## Data Sources

| Source | Data |
|--------|------|
| **Jikan API (MyAnimeList)** | Anime character VAs, birthdays, ages, images |
| **Wikipedia API** | Species, nationalities, occupations, VAs |
| **Akabab Superhero API** | Marvel/DC powerstats, basic info |
| **Fandom Wikis** | Star Wars, Star Trek, Image Comics characters |
| **parse_about.js** | Structured data embedded in about fields |

### Jikan API Research

The `research_jikan.js` script discovers Japanese and English voice actors for anime characters via the MyAnimeList API.
Additional enrichment rules (84-108) further improve coverage:
- **Equipment from occupation** (knight→Armor/Sword/Shield, police→Handcuffs/Gun/Badge, etc.)
- **Weapon from occupation** (swordsman→Sword, archer→Bow, ninja→Katana, etc.)
- **Weaknesses from low powerstats** (stats < 30 derive corresponding weakness)
- **Fear from about text** (scans for "fear of X", "afraid of X" patterns)
- **Equipment from about text** (extracts equipment mentions from descriptions)
- **Relatives from about text** (extracts family relations like "her sister NAME")
- **Achievements from about text** (accolades, feats, titles mentioned in descriptions)
- **Status from about text** (deceased/retired/imprisoned detection)
- **Weaknesses.factors from personality weaknesses** (sync)
- **Enemy from story arc/role** (antagonist→Heroes, hero→Villains, etc.)
- **Equipment from combat style** (magic→staff/artifacts, stealth→throwing knives, etc.)
- **Friends from affiliations** (teammates → friends)
- **Dislikes from about text** (hates X, despises Y patterns)
- **Power type from about text** (magic, technology, divine, etc.)
- **Personality traits from about text** (brave, kind, stubborn, etc.)
- **Achievements from titles fallback**
- **Occupation from about text** ("is a X" patterns)

The `research_jikan.js` script:
1. Searches for character by name (with multiple query strategies)
2. Fetches full character data including `voices[]` array
3. Extracts Japanese and English voice actors
4. Parses the about field for birthday, age, zodiac, height, weight, blood type, eye/hair color

## ID System

Each character has a unique MD5 hash as ID (32 hex characters). JSON files and image files share the same ID.

## Image Specifications

- **Resolution**: 192x288 pixels (portrait optimized)
- **Format**: PNG with max compression (`compressionLevel: 9`)
- **Color Depth**: 128-32 colors (quantized palette)
- **Total**: 2,264 images (100% coverage)

---
