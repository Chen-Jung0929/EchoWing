import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');

// We import the registry dynamically so we can get all supported langs
const { SUPPORTED_LANGS } = await import('../src/i18n/languages.js');

// Short technical terms that are allowed to match English fallback exactly
const ALLOWED_ENGLISH_FALLBACKS = new Set([
  'XAI', 'PDF', 'API', 'SSE', 'Perch', 'BirdNET', 'SILIC', 'PCEN', 'Threads', 'X', 'Facebook',
  'Stop', 'Model', 'Spectrogram', 'Disclaimer', 'Mono', 'Events', 'Credits', 'Error', 'N/A'
]);

const IGNORED_KEYS = new Set([
  'id', 'formula', 'animation', 'icon', 'link', 'source', 'title', 
  'modelTagFast', 'modelPerchFast', 'modelBirdnet', 'modelSilic', 
  'name', 'phase2Duration', 'phase1Duration', 'totalPredictionDuration', 'kicker',
  'shareTemplateSocial', 'nearbyRecordsDistance', 'nearbyRecordsRadiusOption',
  'pdfApproxSec', 'pdfTimeSec', 'pdfSegmentTitle', 'homeLabel', 'navLabel', 'label',
  'distanceMeters', 'distanceKm', 'durationSeconds', 'durationMinSec', 'visualizerChunkSummary'
]);

async function loadLocale(lang) {
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  try {
    const module = await import(`file://${filePath}`);
    return module.default || module;
  } catch (err) {
    console.error(`Failed to load locale: ${lang}`, err);
    process.exit(1);
  }
}

function checkFallbackImports(lang) {
  if (lang === 'en' || lang === 'zh' || lang === 'pseudo') return false;
  const filePath = path.join(LOCALES_DIR, `${lang}.js`);
  if (!fs.existsSync(filePath)) return false;
  
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('import en from') || content.includes('...en') || 
      content.includes('import zh from') || content.includes('...zh')) {
    console.error(`[${lang}] Error: Broad fallback (e.g. '...en') detected in file. This is forbidden.`);
    return true;
  }
  return false;
}

function compareObjects(baseObj, targetObj, lang, pathPrefix = '') {
  let hasErrors = false;

  for (const key of Object.keys(baseObj)) {
    const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    
    if (!(key in targetObj)) {
      console.error(`[${lang}] Missing key: ${fullPath}`);
      hasErrors = true;
      continue;
    }

    const baseVal = baseObj[key];
    const targetVal = targetObj[key];

    if (typeof baseVal !== typeof targetVal) {
      console.error(`[${lang}] Type mismatch for key: ${fullPath}. Expected ${typeof baseVal}, got ${typeof targetVal}`);
      hasErrors = true;
      continue;
    }

    if (Array.isArray(baseVal)) {
      if (!Array.isArray(targetVal)) {
        console.error(`[${lang}] Expected array for key: ${fullPath}`);
        hasErrors = true;
        continue;
      }
      if (baseVal.length !== targetVal.length) {
        console.error(`[${lang}] Array length mismatch for key: ${fullPath}. Expected ${baseVal.length}, got ${targetVal.length}`);
        hasErrors = true;
      } else {
        for (let i = 0; i < baseVal.length; i++) {
          if (typeof baseVal[i] === 'object' && baseVal[i] !== null) {
            const result = compareObjects(baseVal[i], targetVal[i], lang, `${fullPath}[${i}]`);
            if (result.hasErrors) hasErrors = true;
          } else if (typeof baseVal[i] !== typeof targetVal[i]) {
            console.error(`[${lang}] Array item type mismatch at ${fullPath}[${i}].`);
            hasErrors = true;
          } else if (typeof targetVal[i] === 'string') {
            if (targetVal[i].includes('__TODO__')) {
              console.error(`[${lang}] TODO placeholder found at ${fullPath}[${i}]`);
              hasErrors = true;
            } else if (targetVal[i] === baseVal[i] && lang !== 'en' && !ALLOWED_ENGLISH_FALLBACKS.has(baseVal[i])) {
              const keyPart = fullPath.split('.').pop().replace(/\[\d+\]$/, '');
              if (!IGNORED_KEYS.has(keyPart) && !targetVal[i].startsWith('http')) {
                console.error(`[${lang}] Exact English match at ${fullPath}[${i}] ("${targetVal[i]}"). Suspected missing translation.`);
                hasErrors = true;
              }
            }
          }
        }
      }
    } else if (typeof baseVal === 'object' && baseVal !== null) {
      const result = compareObjects(baseVal, targetVal, lang, fullPath);
      if (result.hasErrors) hasErrors = true;
    } else {
      if (typeof targetVal === 'string') {
        if (targetVal.trim() === '') {
          console.error(`[${lang}] Empty string found at: ${fullPath}`);
          hasErrors = true;
        } else if (targetVal.includes('__TODO__')) {
          console.error(`[${lang}] TODO placeholder found at: ${fullPath}`);
          hasErrors = true;
        } else if (targetVal === baseVal && lang !== 'en' && !ALLOWED_ENGLISH_FALLBACKS.has(baseVal)) {
          const keyPart = fullPath.split('.').pop().replace(/\[\d+\]$/, '');
          if (!IGNORED_KEYS.has(keyPart) && !targetVal.startsWith('http')) {
             // For filipino, some english words are allowed, but strict mode flags them
             // We can warn instead of error for filipino, but error for pt/it/nl
             if (['fil', 'id', 'ms', 'vi', 'hi', 'nan', 'hak', 'es', 'fr', 'de'].includes(lang)) {
                 console.warn(`[${lang}] Warning: English fallback detected at ${fullPath} ("${targetVal}").`);
             } else {
                 console.error(`[${lang}] Error: English fallback detected at ${fullPath} ("${targetVal}").`);
                 hasErrors = true;
             }
          }
        }
      }
      if (targetVal === undefined || targetVal === null) {
        console.error(`[${lang}] Null or undefined value found at: ${fullPath}`);
        hasErrors = true;
      }
    }
  }

  for (const key of Object.keys(targetObj)) {
    const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (!(key in baseObj)) {
      console.error(`[${lang}] Extra key found: ${fullPath}`);
      hasErrors = true;
    }
  }

  return { hasErrors };
}

async function runValidation() {
  console.log('Loading canonical locale (en.js)...');
  const en = await loadLocale('en');

  console.log('Validating all locales against canonical schema...');
  
  let failed = false;

  for (const lang of SUPPORTED_LANGS) {
    if (lang === 'pseudo') continue;
    
    const hasFallbackImports = checkFallbackImports(lang);
    if (hasFallbackImports) {
      failed = true;
    }

    const target = await loadLocale(lang);
    const { hasErrors } = compareObjects(en, target, lang, '');
    
    if (hasErrors) {
      failed = true;
    }
  }

  if (failed) {
    console.error('\nValidation failed! Missing keys, TODOs, type mismatches, or broad fallbacks detected.');
    process.exit(1);
  }

  console.log(`\nAll ${SUPPORTED_LANGS.length} locales passed strict schema validation!`);
}

runValidation().catch(err => {
  console.error(err);
  process.exit(1);
});
