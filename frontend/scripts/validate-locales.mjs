import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');

async function main() {
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.js'));
  
  const locales = {};
  for (const file of files) {
    const filePath = path.join(LOCALES_DIR, file);
    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
    const mod = await import(fileUrl);
    locales[file.replace('.js', '')] = mod.default;
  }

  const zh = locales['zh'];
  const en = locales['en'];
  const baseKeys = Object.keys(zh);
  
  console.log(`Base locale (zh) has ${baseKeys.length} keys.`);

  for (const [lang, dict] of Object.entries(locales)) {
    if (lang === 'zh' || lang === 'en') continue;
    
    let untranslated = 0;
    for (const key of baseKeys) {
      if (dict[key] === en[key] && dict[key] !== undefined && typeof dict[key] === 'string') {
        untranslated++;
      }
    }
    
    console.log(`Locale: ${lang} -> Untranslated fallback keys: ${untranslated} / ${baseKeys.length}`);
  }
}

main().catch(console.error);
