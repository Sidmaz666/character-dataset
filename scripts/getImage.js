#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const os = require('os');
const fetchFn = require('node-fetch').default;

console.log('getImage.js v4 — Strict Jikan + Integrated Optimization');

const CHARACTERS_DIR = path.join(__dirname, '..', 'data', 'characters');
const OUTPUT_DIR = process.env.IMAGE_OUTPUT_DIR || path.join(__dirname, '..', 'data', 'images');

const CAMOFOX_BASE_URL = process.env.CAMOFOX_BASE_URL || 'http://localhost:9377';
const USER_ID = process.env.CAMOFOX_USER_ID || 'character-image-searcher';
const SESSION_KEY = process.env.CAMOFOX_SESSION_KEY || 'character-image-searcher-session';

const OPTIMIZED_WIDTH = 192;
const OPTIMIZED_HEIGHT = 288;
const MAX_IMAGE_SIZE = 100 * 1024;
const COLOR_LEVELS = [128, 96, 64, 48, 32];

let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.error('Error: "sharp" is required. Install with: npm install sharp');
    process.exit(1);
}

const MIN_IMAGE_BYTES = 5120;
const DOWNLOAD_CONCURRENCY = 3;
const ENGINE_CONCURRENCY = 3;

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
];
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

const ENGINE_PRIORITY = ['google', 'bing', 'duckduckgo'];

const SEARCH_ENGINES = {
    google: {
        buildUrl: q => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                let urls = [];
                document.querySelectorAll('div[data-ou]').forEach(el => {
                    const ou = el.getAttribute('data-ou');
                    if (ou) urls.push(ou);
                });
                if (!urls.length) {
                    document.querySelectorAll('a[href*="/imgres?"]').forEach(a => {
                        try {
                            const u = new URL(a.href);
                            const imgurl = u.searchParams.get('imgurl');
                            if (imgurl) urls.push(decodeURIComponent(imgurl));
                        } catch(e) {}
                    });
                }
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    bing: {
        buildUrl: q => `https://www.bing.com/images/search?q=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('a.iusc').forEach(a => {
                    try {
                        const m = JSON.parse(a.getAttribute('m'));
                        if (m.murl) urls.push(m.murl);
                    } catch(e) {}
                });
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    yahoo: {
        buildUrl: q => `https://images.search.yahoo.com/search/images?p=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('a[data-ylk*="murl"]').forEach(a => {
                    try {
                        const ylk = JSON.parse(a.getAttribute('data-ylk'));
                        if (ylk.murl) urls.push(ylk.murl);
                    } catch(e) {}
                });
                if (!urls.length) {
                    document.querySelectorAll('img[src]:not([src^="data:"])').forEach(img => urls.push(img.src));
                }
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    duckduckgo: {
        buildUrl: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('img.tile--img__media, img.js-images-tile').forEach(img => {
                    const src = img.getAttribute('data-src') || img.src;
                    if (src && !src.startsWith('data:')) urls.push(src);
                });
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    brave: {
        buildUrl: q => `https://search.brave.com/images?q=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('img[src]:not([src^="data:"])').forEach(img => urls.push(img.src));
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    yandex: {
        buildUrl: q => `https://yandex.com/images/search?text=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('.serp-item[data-url], .serp-item_type_search[data-url]').forEach(el => {
                    const url = el.getAttribute('data-url');
                    if (url) urls.push(url);
                });
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    ecosia: {
        buildUrl: q => `https://www.ecosia.org/images?q=${encodeURIComponent(q)}`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('a.iusc').forEach(a => {
                    try {
                        const m = JSON.parse(a.getAttribute('m'));
                        if (m.murl) urls.push(m.murl);
                    } catch(e) {}
                });
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    startpage: {
        buildUrl: q => `https://www.startpage.com/sp/search?query=${encodeURIComponent(q)}&t=images`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('div[data-ou]').forEach(el => {
                    const ou = el.getAttribute('data-ou');
                    if (ou) urls.push(ou);
                });
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    swisscows: {
        buildUrl: q => `https://swisscows.com/web?query=${encodeURIComponent(q)}&t=images`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('img[src^="http"]').forEach(img => urls.push(img.src));
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    },
    mojeek: {
        buildUrl: q => `https://www.mojeek.com/search?q=${encodeURIComponent(q)}&fmt=images`,
        extractScript: `
            (() => {
                const urls = [];
                document.querySelectorAll('img[src^="http"]').forEach(img => urls.push(img.src));
                return [...new Set(urls)].slice(0, 20);
            })()
        `
    }
};

async function apiRequest(method, endpoint, body) {
    const url = `${CAMOFOX_BASE_URL}${endpoint}`;
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json', 'User-Agent': randomUA() },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetchFn(url, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${method} ${endpoint} failed: ${res.status} ${text}`);
    }
    return res.json();
}

async function createTab(url) {
    return apiRequest('POST', '/tabs', {
        userId: USER_ID,
        sessionKey: SESSION_KEY,
        url
    });
}

async function evaluateInTab(tabId, expression) {
    const body = { expression, userId: USER_ID, sessionKey: SESSION_KEY };
    const result = await apiRequest('POST', `/tabs/${tabId}/evaluate`, body);
    return result.value ?? result.result ?? result;
}

async function getImages(tabId, limit, includeData = false) {
    const params = new URLSearchParams({ userId: USER_ID, limit: String(limit) });
    if (includeData) params.append('includeData', 'true');
    return apiRequest('GET', `/tabs/${tabId}/images?${params}`);
}

async function closeTab(tabId) {
    await apiRequest('DELETE', `/tabs/${tabId}?userId=${encodeURIComponent(USER_ID)}`).catch(() => { });
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function createHealthyTab(searchUrl, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const tab = await createTab(searchUrl);
            const tabId = tab.tabId || tab.id;
            if (!tabId) continue;
            await evaluateInTab(tabId, '1+1');
            return tabId;
        } catch (err) {
            if (attempt === retries) throw err;
            await delay(1500 * attempt);
        }
    }
}

const JUNK_PATTERNS = [
    'encrypted-tbn0.gstatic.com',
    'images.google.com/tbn',
    'th?id=',
    'tbn:',
    'google.com/images/spinner',
    'data:image',
    'base64,',
    'googlelogo',
    'favicon',
    'pixel',
    'google.com/logo',
    'gstatic.com'
];
function isJunkUrl(url) {
    return JUNK_PATTERNS.some(p => url.toLowerCase().includes(p.toLowerCase()));
}

function resolveOriginalUrl(url) {
    try {
        const parsed = new URL(url);
        if (parsed.hostname.endsWith('duckduckgo.com') && parsed.pathname === '/iu/') {
            const orig = parsed.searchParams.get('u');
            if (orig) return decodeURIComponent(orig);
        }
        if (parsed.hostname.includes('googleusercontent.com')) {
            return url.replace(/=w\d+-h\d+(-c)?$/, '').replace(/=s\d+$/, '');
        }
    } catch (e) { }
    return url;
}

async function optimizeImage(inputBuffer, outputPath) {
    let pipeline = sharp(inputBuffer)
        .resize(OPTIMIZED_WIDTH, OPTIMIZED_HEIGHT, { fit: 'fill' })
        .flatten({ background: { r: 0, g: 0, b: 0 } });

    let bestResult = null;
    for (const colors of COLOR_LEVELS) {
        const tmpPath = path.join(
            os.tmpdir(),
            `opt_${path.basename(outputPath, '.png')}_${Date.now()}_${colors}.png`
        );

        await pipeline
            .clone()
            .png({ compressionLevel: 9, palette: true, colours: colors, dither: 0.8 })
            .toFile(tmpPath);

        const size = fs.statSync(tmpPath).size;
        if (size <= MAX_IMAGE_SIZE) {
            fs.renameSync(tmpPath, outputPath);
            return { colors, size, underLimit: true };
        }

        if (!bestResult || size < bestResult.size) {
            if (bestResult && bestResult.tmpPath) fs.unlinkSync(bestResult.tmpPath);
            bestResult = { colors, size, tmpPath, underLimit: false };
        } else {
            fs.unlinkSync(tmpPath);
        }
    }

    if (bestResult && bestResult.tmpPath) {
        fs.renameSync(bestResult.tmpPath, outputPath);
        return { colors: bestResult.colors, size: bestResult.size, underLimit: false };
    }
    throw new Error('Image optimization failed');
}

async function downloadImageViaCamofox(url) {
    const tabId = await createHealthyTab(url, 2);
    await delay(3000);
    const imageResult = await getImages(tabId, 1, true);
    await closeTab(tabId);

    const images = imageResult.images || imageResult.results || [];
    if (!images.length) throw new Error('Camofox returned no image data');

    const img = images[0];
    const dataUri = img.data || img.src;
    if (!dataUri || !dataUri.startsWith('data:')) throw new Error('Invalid data URI');

    const b64 = dataUri.split(',')[1];
    return Buffer.from(b64, 'base64');
}

async function downloadAndOptimize(url, finalPath) {
    if (!url || isJunkUrl(url)) throw new Error('Junk URL');

    let rawBuffer;
    try {
        const resp = await fetchFn(url, {
            headers: { 'User-Agent': randomUA(), 'Accept': 'image/*,*/*;q=0.8' },
            redirect: 'follow',
            timeout: 15000
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const chunks = [];
        for await (const chunk of resp.body) chunks.push(chunk);
        rawBuffer = Buffer.concat(chunks);
    } catch (externalErr) {
        console.log(`      External download failed, using Camofox fallback: ${externalErr.message}`);
        try {
            rawBuffer = await downloadImageViaCamofox(url);
        } catch (camofoxErr) {
            throw new Error(`Both downloads failed: ${externalErr.message} | Camofox: ${camofoxErr.message}`);
        }
    }

    if (rawBuffer.length < MIN_IMAGE_BYTES) {
        throw new Error(`Image too small (${rawBuffer.length} bytes, minimum ${MIN_IMAGE_BYTES})`);
    }

    console.log(`      Download: ${rawBuffer.length} bytes -> optimizing to ${OPTIMIZED_WIDTH}x${OPTIMIZED_HEIGHT} PNG...`);

    await optimizeImage(rawBuffer, finalPath);

    const savedSize = fs.statSync(finalPath).size;
    console.log(`      ✓ Saved: ${finalPath} (${(savedSize / 1024).toFixed(1)} KB)`);
    return finalPath;
}

async function fetchFromEngine(query, engine, options, collected, maxTotal) {
    const eng = SEARCH_ENGINES[engine];
    if (!eng) return;
    const searchUrl = eng.buildUrl(query);
    console.log(`  [${engine}] Searching...`);

    let tabId;
    try {
        tabId = await createHealthyTab(searchUrl, options.retries || 3);
    } catch (err) {
        console.error(`  [${engine}] Tab failed: ${err.message}`);
        return;
    }

    await delay(options.waitMs || 2500 + Math.random() * 2000);

    const scrollScript = `
        (async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(r => setTimeout(r, 1200));
            }
            window.scrollTo(0, 0);
            return true;
        })()`;
    try { await evaluateInTab(tabId, scrollScript); } catch (e) { }
    await delay(1500);

    let urls = [];

    try {
        const extracted = await evaluateInTab(tabId, eng.extractScript);
        if (Array.isArray(extracted)) {
            urls = extracted.filter(u => typeof u === 'string' && u.length > 0);
        }
    } catch (e) {
        console.warn(`  [${engine}] Extraction failed, trying fallback.`);
    }

    if (urls.length === 0) {
        try {
            const imgData = await getImages(tabId, options.limit || 20, false);
            const images = imgData.images || imgData.results || [];
            urls = images.map(img => img.url || img.src).filter(Boolean);
        } catch (e) {
            console.warn(`  [${engine}] Fallback failed: ${e.message}`);
        }
    }

    await closeTab(tabId);
    await delay(200);

    urls = urls.map(resolveOriginalUrl).filter(u => !isJunkUrl(u));
    for (const url of urls) {
        if (collected.size >= maxTotal) break;
        if (![...collected].some(item => item.url === url)) {
            collected.add({ url, engine });
        }
    }
    console.log(`  [${engine}] Total unique URLs: ${collected.size} (max pool size: ${maxTotal})`);
}

function getFirstSeries(charData) {
    const firstApp = charData.first_appearance;
    if (!firstApp || typeof firstApp !== 'object') return null;
    for (const key of ['anime', 'manga', 'comics']) {
        const val = firstApp[key];
        if (val && typeof val === 'string') {
            const cleaned = val.toLowerCase();
            if (cleaned !== 'unknown' && cleaned !== 'null' && cleaned !== '') {
                return val
                    .replace(/[#\d{4}]/g, '')
                    .replace(/\(.*?\)/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
        }
    }
    return null;
}

function nameMatchScore(searchName, resultName) {
    const normalize = (n) => n.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const s = normalize(searchName);
    const r = normalize(resultName);
    if (s === r) return 100;

    const sWords = s.split(/\s+/).filter(w => w.length > 0);
    const rWords = r.split(/\s+/).filter(w => w.length > 0);
    if (sWords.length === 0 || rWords.length === 0) return 0;

    const sReversed = [...sWords].reverse().join(' ');
    if (sReversed === r) return 98;

    let sMatchedInR = 0;
    const rUsed = new Set();
    for (const sw of sWords) {
        for (let i = 0; i < rWords.length; i++) {
            if (rUsed.has(i)) continue;
            if (sw === rWords[i]) {
                sMatchedInR++;
                rUsed.add(i);
                break;
            }
        }
    }

    let rMatchedInS = 0;
    const sUsed = new Set();
    for (const rw of rWords) {
        for (let i = 0; i < sWords.length; i++) {
            if (sUsed.has(i)) continue;
            if (rw === sWords[i]) {
                rMatchedInS++;
                sUsed.add(i);
                break;
            }
        }
    }

    const totalUnique = new Set([...sWords, ...rWords]).size;
    const maxWords = Math.max(sWords.length, rWords.length);
    const minWords = Math.min(sWords.length, rWords.length);

    if (sMatchedInR === sWords.length && sWords.length <= rWords.length) {
        return sWords.length === rWords.length ? 99 : Math.min(92, 80 + Math.round((sMatchedInR / totalUnique) * 15));
    }

    if (rMatchedInS === rWords.length && rWords.length < sWords.length) {
        return Math.min(88, 75 + Math.round((rMatchedInS / totalUnique) * 15));
    }

    const matchCount = Math.max(sMatchedInR, rMatchedInS);
    if (matchCount === 0) return 0;

    if (matchCount >= Math.max(2, minWords)) {
        return Math.min(82, 60 + Math.round((matchCount / maxWords) * 25));
    }

    if (matchCount === 1) {
        if (minWords === 1 && maxWords >= 2) return 65;
        return Math.round((matchCount / maxWords) * 50);
    }

    return 0;
}

async function verifySeries(malId, expectedSeries) {
    if (!expectedSeries || expectedSeries.length < 3) return false;
    const cleanExpected = expectedSeries.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (cleanExpected.length < 3) return false;

    try {
        const res = await fetchFn(
            `https://api.jikan.moe/v4/characters/${malId}/full`,
            { headers: { 'User-Agent': 'CharacterDataset/1.0' } }
        );
        if (!res.ok) return false;
        const data = await res.json();
        const fullChar = data.data;
        if (!fullChar || !fullChar.anime) return false;

        return fullChar.anime.some(a => {
            const title = (a.anime?.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '');
            if (title.includes(cleanExpected) || cleanExpected.includes(title)) return true;

            const url = (a.anime?.url || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ');
            if (url.includes(cleanExpected)) return true;

            return false;
        });
    } catch {
        return false;
    }
}

async function fetchFromJikan(charData) {
    const searchName = charData.full_name || charData.name;
    const cleanName = searchName.replace(/[,]/g, '').trim();
    console.log(`  [jikan] Searching MyAnimeList for: "${cleanName}"`);

    try {
        const res = await fetchFn(
            `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(cleanName)}&limit=5&order_by=favorites&sort=desc`,
            { headers: { 'User-Agent': 'CharacterDataset/1.0' } }
        );
        if (!res.ok) {
            console.log(`  [jikan] HTTP ${res.status}`);
            return null;
        }
        const data = await res.json();
        const results = data.data || [];
        if (results.length === 0) {
            console.log(`  [jikan] No results`);
            return null;
        }

        const scored = [];
        for (const c of results) {
            if (!c.images?.jpg?.image_url) continue;
            const score = nameMatchScore(cleanName, c.name);
            scored.push({ char: c, score });
            console.log(`  [jikan]   "${c.name}" -> score ${score}`);
        }

        scored.sort((a, b) => b.score - a.score);
        if (scored.length === 0) return null;

        const best = scored[0];
        const expectedSeries = getFirstSeries(charData);

        if (best.score >= 95) {
            console.log(`  [jikan] ACCEPTED (score ${best.score}): "${best.char.name}"`);
            return best.char.images.jpg.image_url;
        }

        if (best.score >= 80 && expectedSeries) {
            console.log(`  [jikan] Checking series for "${best.char.name}": expected "${expectedSeries}"`);
            const match = await verifySeries(best.char.mal_id, expectedSeries);
            if (match) {
                console.log(`  [jikan] ACCEPTED (score ${best.score}, series verified): "${best.char.name}"`);
                return best.char.images.jpg.image_url;
            }
            console.log(`  [jikan] Series mismatch for "${best.char.name}"`);

            for (let i = 1; i < scored.length; i++) {
                const alt = scored[i];
                if (alt.score < 70) break;
                console.log(`  [jikan] Trying alternative: "${alt.char.name}" (score ${alt.score})`);
                const altMatch = await verifySeries(alt.char.mal_id, expectedSeries);
                if (altMatch) {
                    console.log(`  [jikan] ACCEPTED (score ${alt.score}, series verified): "${alt.char.name}"`);
                    return alt.char.images.jpg.image_url;
                }
            }
        }

        console.log(`  [jikan] No reliable match (best score ${best.score}), falling back to web search`);
        return null;
    } catch (err) {
        console.log(`  [jikan] Error: ${err.message}`);
        return null;
    }
}

function buildWebSearchQuery(charData) {
    const name = charData.name || '';
    const publisher = (charData.publisher || 'unknown').replace(/_/g, ' ');
    const series = getFirstSeries(charData);

    const cleanName = name.replace(/[#_]/g, ' ').replace(/\s+/g, ' ').trim();

    if (series) {
        const cleanSeries = series.replace(/[#\d{4}]/g, '').replace(/\s+/g, ' ').trim();
        if (cleanSeries.length > 40) {
            return `${cleanName} from ${cleanSeries.substring(0, 40).trim()} portrait art`;
        }
        return `${cleanName} from ${cleanSeries} portrait official art`;
    }
    return `${cleanName} ${publisher} character portrait official art`;
}

async function processCharacter(name, charData, options) {
    const query = buildWebSearchQuery(charData);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Character: ${name} (${charData.name})`);
    console.log(`Series: ${getFirstSeries(charData) || 'N/A'}`);
    console.log(`Query: "${query}"`);

    const target = options.target || 1;
    const destPath = path.join(options.output || OUTPUT_DIR, `${name}.png`);

    const outDir = options.output || OUTPUT_DIR;
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    if (charData.publisher === 'anime') {
        const jikanUrl = await fetchFromJikan(charData);
        if (jikanUrl) {
            try {
                await downloadAndOptimize(jikanUrl, destPath);
                console.log(`    ✓ Saved 1/1 (Jikan): ${path.relative(process.cwd(), destPath)}`);
                return;
            } catch (err) {
                console.log(`  [jikan] Download failed: ${err.message}, falling back to web search`);
            }
        }
        await delay(1200);
    }

    const maxCollect = target * 20;
    const collected = new Set();
    const enginesToUse = options.engines || ENGINE_PRIORITY;

    let engineIdx = 0;
    const queue = async () => {
        while (engineIdx < enginesToUse.length && collected.size < maxCollect) {
            const engine = enginesToUse[engineIdx++];
            await fetchFromEngine(query, engine, options, collected, maxCollect);
        }
    };
    await Promise.all(Array.from({ length: ENGINE_CONCURRENCY }, () => queue()));

    const priorityMap = {};
    enginesToUse.forEach((eng, idx) => priorityMap[eng] = idx);
    const sortedUrls = [...collected].sort((a, b) => {
        const pa = priorityMap[a.engine] ?? 999;
        const pb = priorityMap[b.engine] ?? 999;
        return pa - pb;
    });

    console.log(`  Collected ${sortedUrls.length} unique URL(s)`);

    let saved = false;
    for (let i = 0; i < sortedUrls.length && !saved; i++) {
        const item = sortedUrls[i];
        try {
            await downloadAndOptimize(item.url, destPath);
            console.log(`    ✓ Saved 1/1 (${item.engine}): ${path.relative(process.cwd(), destPath)}`);
            saved = true;
        } catch (err) {
            console.error(`    ✗ Skip: ${err.message}`);
        }
    }

    if (!saved) {
        console.log(`  ✗ Failed to download image for ${name}`);
    }
}

function printHelp() {
    console.log(`
Usage: node getImages.js [OPTIONS]

Options:
  --batch <N|all>   Number of characters (default: all)
  --target <N>      Images per character (default: 1)
  --engines <e1,...> Comma-separated engines (default: google,bing,duckduckgo)
  --query <q>       Single query mode
  --output <path>   Output directory (default: ./data/images)
  --no-resume       Ignore progress log, re-download all
  --help            Show this help
`);
}

(async () => {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        process.exit(0);
    }

    const options = {
        target: 1,
        limit: 20,
        minBytes: MIN_IMAGE_BYTES,
        engines: null,
        output: OUTPUT_DIR,
        batch: 'all',
        query: null,
        waitMs: null,
        retries: 3
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--query=')) options.query = arg.split('=')[1];
        else if (arg === '--query') options.query = args[++i];
        else if (arg.startsWith('--batch=')) options.batch = arg.split('=')[1];
        else if (arg === '--batch') options.batch = args[++i];
        else if (arg.startsWith('--target=')) options.target = parseInt(arg.split('=')[1], 10);
        else if (arg === '--target') options.target = parseInt(args[++i], 10);
        else if (arg.startsWith('--limit=')) options.limit = parseInt(arg.split('=')[1], 10);
        else if (arg === '--limit') options.limit = parseInt(args[++i], 10);
        else if (arg.startsWith('--min-bytes=')) options.minBytes = parseInt(arg.split('=')[1], 10);
        else if (arg === '--min-bytes') options.minBytes = parseInt(args[++i], 10);
        else if (arg.startsWith('--engines=')) options.engines = arg.split('=')[1].split(',').map(e => e.trim().toLowerCase()).filter(e => ENGINE_PRIORITY.includes(e));
        else if (arg === '--engines') options.engines = args[++i].split(',').map(e => e.trim().toLowerCase()).filter(e => ENGINE_PRIORITY.includes(e));
        else if (arg.startsWith('--output=')) options.output = arg.split('=')[1];
        else if (arg === '--output') options.output = args[++i];
        else if (arg.startsWith('--wait-ms=')) options.waitMs = parseInt(arg.split('=')[1], 10);
        else if (arg === '--wait-ms') options.waitMs = parseInt(args[++i], 10);
        else if (arg === '--no-resume') options.noResume = true;
    }

    if (!fs.existsSync(CHARACTERS_DIR)) {
        console.error('Character data directory not found:', CHARACTERS_DIR);
        process.exit(1);
    }

    const subDirs = fs.readdirSync(CHARACTERS_DIR).filter(f =>
        fs.statSync(path.join(CHARACTERS_DIR, f)).isDirectory()
    );
    const characterFiles = subDirs.reduce((acc, sub) => {
        const subPath = path.join(CHARACTERS_DIR, sub);
        const jsons = fs.readdirSync(subPath).filter(f => f.endsWith('.json'));
        return [...acc, ...jsons.map(f => path.join(subPath, f))];
    }, []);

    const characters = {};
    characterFiles.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const name = path.basename(file, '.json');
        characters[name] = { ...data, id: name, publisher: path.basename(path.dirname(file)) };
    });

    if (options.query) {
        console.log(`\nSingle search: "${options.query}"`);
        const collected = new Set();
        const enginesToUse = options.engines || ENGINE_PRIORITY;
        const maxCollect = options.target * 10;
        let idx = 0;
        const worker = async () => {
            while (idx < enginesToUse.length && collected.size < maxCollect) {
                const engine = enginesToUse[idx++];
                await fetchFromEngine(options.query, engine, options, collected, maxCollect);
            }
        };
        await Promise.all(Array.from({ length: ENGINE_CONCURRENCY }, () => worker()));

        const sortedUrls = [...collected].sort((a, b) => {
            const pa = (options.engines || ENGINE_PRIORITY).indexOf(a.engine);
            const pb = (options.engines || ENGINE_PRIORITY).indexOf(b.engine);
            return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
        });

        const outDir = path.join(options.output, 'single_query');
        fs.mkdirSync(outDir, { recursive: true });

        let saved = 0, poolIdx = 0, nextFile = 1;
        let mutex = Promise.resolve();
        const dlWorker = async () => {
            while (saved < options.target && poolIdx < sortedUrls.length) {
                const item = sortedUrls[poolIdx++];
                let fIdx;
                await (mutex = mutex.then(() => { fIdx = nextFile++; }));
                const dest = path.join(outDir, `image${fIdx}.png`);
                try {
                    await downloadAndOptimize(item.url, dest);
                    saved++;
                    console.log(`  saved: ${dest}`);
                } catch (e) {
                    console.error(`  skip: ${e.message}`);
                }
            }
        };
        await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, () => dlWorker()));
        process.exit(0);
    }

    let charNames = Object.keys(characters);
    if (options.batch && options.batch !== 'all') {
        const n = parseInt(options.batch, 10);
        if (isNaN(n) || n <= 0) {
            console.error('Invalid batch number.');
            process.exit(1);
        }
        charNames = charNames.slice(0, n);
    }

    if (charNames.length === 0) {
        console.error('No characters found.');
        process.exit(1);
    }

    const resumeLog = path.join(options.output, '..', '.download_progress.log');
    const completed = new Set();
    if (!options.noResume && fs.existsSync(resumeLog)) {
        const lines = fs.readFileSync(resumeLog, 'utf-8').split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.split('|');
            if (parts.length >= 2 && parts[0] === 'OK') {
                completed.add(parts[1].trim());
            }
        }
        console.log(`\nResume mode: ${completed.size} character(s) already completed.`);
    }

    const toProcess = charNames.filter(n => !completed.has(n));
    console.log(`\nProcessing ${toProcess.length} character(s) (${completed.size} skipped)...`);
    if (!options.waitMs) {
        options.waitMs = options.batch === 'all' ? 4000 + Math.random() * 3000 : 2500 + Math.random() * 2000;
    }

    for (let i = 0; i < toProcess.length; i++) {
        const name = toProcess[i];
        const charData = characters[name];
        await processCharacter(name, charData, options);
        fs.appendFileSync(resumeLog, `OK | ${name}\n`);
        if (options.batch === 'all' && i < toProcess.length - 1) {
            console.log(`\nWaiting between characters...`);
            await delay(3000 + Math.random() * 5000);
        }
    }

    console.log('\nDone.');
})();
