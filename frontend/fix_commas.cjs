const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'src/i18n/locales');
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('tmp_'))) {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf-8');
  content = content.replace(/([^,}\s])(\s*apiErrors: {)/g, '$1,$2');
  fs.writeFileSync(p, content);
}
console.log('Fixed commas.');
