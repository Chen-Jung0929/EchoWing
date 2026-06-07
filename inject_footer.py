import os
import glob
import re

files = glob.glob('frontend/src/i18n/locales/*.js')

zh_keys = """
  footerRights: '版權所有。',
  footerDescription: '結合人工智慧與聲學分析的鳥類叫聲辨識平台。',
"""

en_keys = """
  footerRights: 'All rights reserved.',
  footerDescription: 'AI-powered bird sound recognition platform.',
"""

zh_langs = ['zh.js', 'nan.js', 'hak.js', 'yue.js', 'lzh.js']

for f in files:
    filename = os.path.basename(f)
    keys_to_insert = zh_keys if filename in zh_langs else en_keys
    
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Insert before the last closing brace
    if 'footerRights' not in content:
        content = re.sub(r'};\s*$', keys_to_insert + '};\n', content)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

print(f"Appended footer text to {len(files)} files.")
