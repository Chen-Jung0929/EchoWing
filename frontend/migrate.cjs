const fs = require('fs');
const path = require('path');

const localesDir = path.join(process.cwd(), 'src/i18n/locales');
const locales = fs.readdirSync(localesDir).filter(f => f.endsWith('.js') && !f.startsWith('tmp_'));

const errorKeys = [
  'ERR_SERVER_HTTP_ERROR',
  'ERR_SERVER_NOT_READY',
  'ERR_BACKEND_TIMEOUT',
  'ERR_BACKEND_MODEL_FAILED',
];

for (const file of locales) {
  const p = path.join(localesDir, file);
  let content = fs.readFileSync(p, 'utf-8');
  
  let errorObj = {};
  for (const key of errorKeys) {
    const regex = new RegExp(`\\s*['"]?${key}['"]?\\s*:\\s*(['"\`])(.*?)\\1,?`, 'g');
    const match = regex.exec(content);
    if (match) {
      errorObj[key] = match[2];
      content = content.replace(match[0], '');
    }
  }
  
  if (Object.keys(errorObj).length > 0) {
    if (!errorObj.ERR_STREAM_CALLBACK_REQUIRED) errorObj.ERR_STREAM_CALLBACK_REQUIRED = errorObj.ERR_SERVER_HTTP_ERROR;
    if (!errorObj.ERR_UNKNOWN_BACKEND) errorObj.ERR_UNKNOWN_BACKEND = errorObj.ERR_SERVER_HTTP_ERROR;
    
    const apiErrorsStr = `\n  apiErrors: {\n${Object.entries(errorObj).map(([k, v]) => `    ${k}: "${v.replace(/"/g, '\\"')}",`).join('\n')}\n  },`;
    
    const lastBraceIndex = content.lastIndexOf('}');
    if (lastBraceIndex !== -1) {
      content = content.slice(0, lastBraceIndex) + apiErrorsStr + '\n' + content.slice(lastBraceIndex);
    }
    
    fs.writeFileSync(p, content);
  }
}
console.log('Locales updated.');
