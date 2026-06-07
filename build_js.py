import json
import os

DIR = 'c:/EchoWing-frontend-result/frontend/src/i18n/locales/'

with open('translations.json', 'r', encoding='utf-8') as f:
    translations = json.load(f)

with open('zh.json', 'r', encoding='utf-8') as f:
    zh = json.load(f)

langs = ['ja', 'ko', 'lzh', 'th', 'yue']
for lang in langs:
    with open(lang + '.json', 'r', encoding='utf-8') as f:
        target = json.load(f)
    
    new_target = {}
    added_keys = []
    for key, val in zh.items():
        if key in target:
            new_target[key] = target[key]
        elif key in translations:
            new_target[key] = translations[key][lang]
            added_keys.append(key)
        else:
            print(f"Warning: missing {key} for {lang}")
            new_target[key] = val
    
    js_str = f"/** @type {{import('../index.js').LocaleMessages}} */\nconst {lang} = {json.dumps(new_target, ensure_ascii=False, indent=2)};\n\nexport default {lang};\n"
    
    with open(os.path.join(DIR, lang + '.js'), 'w', encoding='utf-8') as f:
        f.write(js_str)
        
    print(f"{lang} updated. Added {len(added_keys)} keys.")
