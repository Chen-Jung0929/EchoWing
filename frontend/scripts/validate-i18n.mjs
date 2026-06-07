import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SUPPORTED_LANGS = ['zh', 'en', 'ja', 'ko', 'fr', 'es', 'th', 'de', 'lzh', 'id', 'yue', 'ms'];

// These lists are allowed to fall back if necessary, but ideally we translate everything.
// The script enforces strict matching, except we won't fail for intentional design if documented.
// For now, strict validation is required by the prompt.

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
            if (compareObjects(baseVal[i], targetVal[i], lang, `${fullPath}[${i}]`)) {
              hasErrors = true;
            }
          } else if (typeof baseVal[i] !== typeof targetVal[i]) {
            console.error(`[${lang}] Array item type mismatch at ${fullPath}[${i}].`);
            hasErrors = true;
          }
        }
      }
    } else if (typeof baseVal === 'object' && baseVal !== null) {
      if (compareObjects(baseVal, targetVal, lang, fullPath)) {
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

  return hasErrors;
}

async function runValidation() {
  console.log('Loading canonical locales (zh.js, en.js)...');
  const zh = await loadLocale('zh');
  const en = await loadLocale('en');

  // Verify canonicals match each other structurally
  console.log('Verifying zh vs en structural match...');
  const canonicalMismatch = compareObjects(zh, en, 'en-vs-zh');
  if (canonicalMismatch) {
    console.error('Canonical locales zh and en do not match structurally. Fix them first.');
    process.exit(1);
  }

  console.log('Structural match passed for canonicals. Validating all locales...');
  
  let failed = false;

  for (const lang of SUPPORTED_LANGS) {
    if (lang === 'zh' || lang === 'en') continue;
    const target = await loadLocale(lang);
    const hasErrors = compareObjects(zh, target, lang);
    if (hasErrors) {
      failed = true;
    } else {
      console.log(`[${lang}] OK`);
    }
  }

  if (failed) {
    console.error('\nValidation failed! Fix the errors above.');
    process.exit(1);
  }

  console.log('\nAll 12 locales passed structure and coverage validation!');
}

runValidation().catch(err => {
  console.error(err);
  process.exit(1);
});
