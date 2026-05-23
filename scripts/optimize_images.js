#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '..', 'data', 'images');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'images_backup');
const TARGET_WIDTH = 192;
const TARGET_HEIGHT = 288;
const MAX_FILE_SIZE = 100 * 1024;
const COLOR_LEVELS = [128, 96, 64, 48, 32];

async function getImageStats(filePath) {
  try {
    const metadata = await sharp(filePath).metadata();
    const stat = fs.statSync(filePath);
    return { metadata, size: stat.size };
  } catch {
    return null;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function optimizeImage(inputPath, outputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.tiff', '.bmp'].includes(ext)) {
    return { skipped: true, reason: `Unsupported format: ${ext}` };
  }

  try {
    let pipeline = sharp(inputPath)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'fill',
        withoutReduction: false,
      })
      .flatten({ background: { r: 0, g: 0, b: 0 } });

    let result = null;
    for (const colors of COLOR_LEVELS) {
      const tmpPath = path.join(
        os.tmpdir(),
        `opt_${path.basename(inputPath, ext)}_${colors}.png`
      );

      await pipeline
        .clone()
        .png({
          compressionLevel: 9,
          palette: true,
          colours: colors,
          dither: 0.8,
        })
        .toFile(tmpPath);

      const size = fs.statSync(tmpPath).size;
      if (size <= MAX_FILE_SIZE) {
        fs.renameSync(tmpPath, outputPath);
        return { colors, size, underLimit: true };
      }

      if (!result || size < result.size) {
        if (result && result.tmpPath) fs.unlinkSync(result.tmpPath);
        result = { colors, size, tmpPath, underLimit: false };
      } else {
        fs.unlinkSync(tmpPath);
      }
    }

    if (result && result.tmpPath) {
      fs.renameSync(result.tmpPath, outputPath);
      return { colors: result.colors, size: result.size, underLimit: false };
    }

    return { skipped: true, reason: 'Processing failed' };
  } catch (err) {
    return { skipped: true, reason: err.message };
  }
}

async function main() {
  console.log('Optimizing character images...\n');
  console.log(`  Resolution: ${TARGET_WIDTH}x${TARGET_HEIGHT}`);
  console.log(`  Format: PNG (max compression, palette)`);
  console.log(`  Max File Size: ${formatBytes(MAX_FILE_SIZE)}\n`);

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('Images directory not found:', IMAGES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGES_DIR).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'].includes(ext);
  });

  console.log(`Found ${files.length} images to process\n`);

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    let backedUp = 0;
    for (const file of files) {
      fs.copyFileSync(path.join(IMAGES_DIR, file), path.join(BACKUP_DIR, file));
      backedUp++;
    }
    console.log(`  Backup: ${backedUp} images saved to ${BACKUP_DIR}\n`);
  } else {
    console.log(`  Backup: already exists at ${BACKUP_DIR}, skipping\n`);
  }

  let processed = 0;
  let underLimit = 0;
  let overLimit = 0;
  let skipped = 0;
  let totalBytesBefore = 0;
  let totalBytesAfter = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const inputPath = path.join(IMAGES_DIR, file);
    const stats = await getImageStats(inputPath);
    const sizeBefore = stats ? stats.size : 0;
    totalBytesBefore += sizeBefore;

    const result = await optimizeImage(inputPath, inputPath);

    if (result.skipped) {
      skipped++;
      console.log(`  [${i + 1}/${files.length}] ${file} SKIPPED (${result.reason})`);
      continue;
    }

    processed++;
    totalBytesAfter += result.size;

    if (result.underLimit) {
      underLimit++;
    } else {
      overLimit++;
    }

    const status = result.underLimit ? '✓' : '⚠';
    console.log(
      `  [${i + 1}/${files.length}] ${file} ${status} ` +
      `${formatBytes(sizeBefore)} → ${formatBytes(result.size)} ` +
      `(${result.colors} colors)`
    );
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  Processed:    ${processed}`);
  console.log(`  Under 100KB:  ${underLimit}`);
  console.log(`  Over 100KB:   ${overLimit}`);
  console.log(`  Skipped:      ${skipped}`);
  console.log(`  Total:        ${formatBytes(totalBytesBefore)} → ${formatBytes(totalBytesAfter)}`);
  if (totalBytesBefore > 0) {
    const pct = ((1 - totalBytesAfter / totalBytesBefore) * 100).toFixed(1);
    console.log(`  Reduction:    ${pct}%`);
  }
  console.log(`${'─'.repeat(50)}\n`);
  console.log('Done.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
