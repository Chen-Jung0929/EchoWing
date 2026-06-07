const fs = require('fs');
const path = require('path');

// We'll read the files using a simple regex/eval or dynamically importing them if they are commonjs.
// But they use `export default en;` which is ES module.
// We can strip the export default and evaluate.
function parseLocale(filename) {
    let content = fs.readFileSync(filename, 'utf-8');
    // Remove imports
    content = content.replace(/import .*?;\n/g, '');
    // Remove export default
    content = content.replace(/export default .*?;/g, '');
    // Remove `/** ... */`
    content = content.replace(/\/\*\*[\s\S]*?\*\//g, '');
    
    // Some files might have `const de = { ...en, ... }`. We just remove `...en,`
    content = content.replace(/\.\.\.en,/g, '');
    
    // Now we have `const lang = { ... };`
    // We can evaluate it by adding `module.exports = lang;`
    const match = content.match(/const\s+(\w+)\s*=/);
    if (match) {
        content += `\nmodule.exports = ${match[1]};`;
        try {
            // Write to a temp js file and require it
            const tmpFile = path.join(__dirname, 'tmp_' + path.basename(filename));
            fs.writeFileSync(tmpFile, content, 'utf-8');
            const data = require(tmpFile);
            fs.unlinkSync(tmpFile);
            return data;
        } catch (e) {
            console.error("Error evaluating", filename, e);
        }
    }
    return {};
}

const en = parseLocale(path.join(__dirname, 'en.js'));
const langs = ['de', 'es', 'fr', 'id', 'ms'];

const missing = {};

langs.forEach(lang => {
    const data = parseLocale(path.join(__dirname, `${lang}.js`));
    missing[lang] = {};
    for (const key in en) {
        if (!(key in data)) {
            missing[lang][key] = en[key];
        } else if (typeof en[key] === 'object' && en[key] !== null) {
            // Check nested
            missing[lang][key] = {};
            for (const sub in en[key]) {
                if (!(sub in data[key])) {
                    missing[lang][key][sub] = en[key][sub];
                }
            }
            if (Object.keys(missing[lang][key]).length === 0) {
                delete missing[lang][key];
            }
        }
    }
});

fs.writeFileSync(path.join(__dirname, 'missing.json'), JSON.stringify(missing, null, 2), 'utf-8');
console.log('done');
