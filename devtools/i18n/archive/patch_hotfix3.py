import os
import re

locales_dir = r"c:\EchoWing-hotfix\frontend\src\i18n\locales"
langs_to_fix = ['lzh.js', 'yue.js', 'ja.js', 'ko.js', 'th.js', 'ms.js', 'id.js']

for filename in langs_to_fix:
    filepath = os.path.join(locales_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # In guideModels, the third element is SILIC. It has `name` containing SILIC.
    # The structure looks like:
    #     {
    #       name: 'SILIC...',
    #       window: '5 seconds',
    #       type: '...',
    #       source: '...',
    #       citation: '...',
    #     },
    # We want to insert `link: 'https://github.com/RedbirdTaiwan/silic',` before `citation:`
    # We'll use regex to match `(source:\s*['"][^'"]+['"],\s*)(citation:\s*['"])` ONLY if it's the 3rd model (SILIC).
    # Since Perch and BirdNET already have `link:`, the regex `source: ...., citation:` ONLY matches SILIC because Perch/BirdNET have `link` in between `source` and `citation`!
    
    if "https://github.com/RedbirdTaiwan/silic" not in content:
        content = re.sub(
            r"(source:\s*[\"'][^\"']+[\"'],\s*)(citation:\s*[\"'])",
            r"\1link: 'https://github.com/RedbirdTaiwan/silic',\n      \2",
            content
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch 3 applied.")
