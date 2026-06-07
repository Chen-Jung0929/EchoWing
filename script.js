const fs = require('fs');
const path = require('path');

const dir = 'c:\\\\EchoWing-frontend-result\\\\frontend\\\\src\\\\i18n\\\\locales';

function readJS(file) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  content = content.replace(/import\s+.*?from\s+['\"].*?['\"];/g, '');
  content = content.replace(/\/\*\*[\s\S]*?\*\//g, '');
  content = content.replace(/export\s+default\s+\w+;/g, '');
  content = content.replace(/const\s+\w+\s*=\s*/g, 'return ');
  content = content.replace(/\.\.\.\w+,/g, '');
  return new Function(content)();
}

const zh = readJS('zh.js');
fs.writeFileSync('zh.json', JSON.stringify(zh, null, 2));

const locales = {};
['ja', 'ko', 'lzh', 'th', 'yue'].forEach(lang => {
  locales[lang] = readJS(lang + '.js');
  fs.writeFileSync(lang + '.json', JSON.stringify(locales[lang], null, 2));
});
console.log('done json dumps');
