#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const parquet = require('parquetjs');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');
const OUTPUT_DIR = path.join(__dirname, '..', 'data');

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value, newKey));
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

function collectAllFields(rows) {
  const allKeys = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      allKeys.add(key);
    }
  }
  return [...allKeys].sort();
}

function toCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows, fields) {
  const header = fields.map(toCsvValue).join(',');
  const lines = rows.map(row => {
    return fields.map(f => toCsvValue(row[f])).join(',');
  });
  return [header, ...lines].join('\n');
}

async function getParquetType(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'INT64' : 'DOUBLE';
  }
  if (typeof value === 'boolean') return 'BOOLEAN';
  return 'UTF8';
}

async function buildParquetSchema(flatRows) {
  const fields = collectAllFields(flatRows);
  const schemaFields = {};
  for (const field of fields) {
    const types = new Set();
    for (const row of flatRows) {
      const val = row[field];
      if (val === undefined || val === null || val === '') continue;
      types.add(await getParquetType(val));
    }
    let type = 'UTF8';
    if (types.size === 1) {
      type = types.values().next().value;
    } else if (types.size === 2 && types.has('INT64') && types.has('DOUBLE')) {
      type = 'DOUBLE';
    }
    schemaFields[field] = { type, optional: true };
  }
  return new parquet.ParquetSchema(schemaFields);
}

function parseValueForParquet(value, type) {
  if (value === null || value === undefined || value === 'null' || value === '') return null;
  if (type === 'INT64') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (type === 'DOUBLE') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  if (type === 'BOOLEAN') {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return null;
  }
  return String(value);
}

async function main() {
  console.log('Compiling character dataset...\n');

  if (!fs.existsSync(CHARACTERS_DIR)) {
    console.error('Characters directory not found:', CHARACTERS_DIR);
    process.exit(1);
  }

  const publishers = fs.readdirSync(CHARACTERS_DIR).filter(f =>
    fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory()
  );

  const allCharacters = [];
  const allFlatRows = [];

  for (const publisher of publishers) {
    const pubDir = path.join(CHARACTERS_DIR, publisher);
    const files = fs.readdirSync(pubDir).filter(f => f.endsWith('.json'));
    console.log(`  ${publisher}: ${files.length} characters`);

    for (const file of files) {
      const filePath = path.join(pubDir, file);
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      raw.publisher = publisher;
      allCharacters.push(raw);
      allFlatRows.push(flatten(raw));
    }
  }

  console.log(`\nTotal: ${allCharacters.length} characters`);

  // Write JSON
  const jsonPath = path.join(OUTPUT_DIR, 'dataset_characters.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allCharacters, null, 2), 'utf-8');
  const jsonSize = fs.statSync(jsonPath).size;
  console.log(`  JSON: ${jsonPath} (${(jsonSize / 1024 / 1024).toFixed(2)} MB)`);

  // Write CSV
  const fields = collectAllFields(allFlatRows);
  const csvContent = rowsToCsv(allFlatRows, fields);
  const csvPath = path.join(OUTPUT_DIR, 'dataset_characters.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf-8');
  const csvSize = fs.statSync(csvPath).size;
  console.log(`  CSV: ${csvPath} (${(csvSize / 1024 / 1024).toFixed(2)} MB, ${fields.length} columns)`);

  // Write Parquet
  try {
    const schema = await buildParquetSchema(allFlatRows);
    const parquetPath = path.join(OUTPUT_DIR, 'dataset_characters.parquet');
    const writer = await parquet.ParquetWriter.openFile(schema, parquetPath);
    writer.setRowGroupSize(65536);

    for (const row of allFlatRows) {
      const parquetRow = {};
      for (const [key, value] of Object.entries(schema.fields)) {
        parquetRow[key] = parseValueForParquet(row[key], schema.fields[key].type);
      }
      await writer.appendRow(parquetRow);
    }

    await writer.close();
    const parquetSize = fs.statSync(parquetPath).size;
    console.log(`  Parquet: ${parquetPath} (${(parquetSize / 1024 / 1024).toFixed(2)} MB)`);
  } catch (err) {
    console.error(`  Parquet: FAILED - ${err.message}`);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
