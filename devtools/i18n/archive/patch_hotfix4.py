import os
import re

locales_dir = r"c:\EchoWing-hotfix\frontend\src\i18n\locales"
langs_to_fix = ['lzh.js', 'yue.js', 'ja.js', 'ko.js', 'th.js', 'ms.js', 'id.js']

for filename in langs_to_fix:
    filepath = os.path.join(locales_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The problem was that JSON-like keys in some files have double quotes around the key names (e.g. "source": "...")
    if "https://github.com/RedbirdTaiwan/silic" not in content:
        content = re.sub(
            r"([\"']?source[\"']?\s*:\s*[\"'][^\"']+[\"'],\s*)([\"']?citation[\"']?\s*:\s*[\"'])",
            r"\1\"link\": \"https://github.com/RedbirdTaiwan/silic\",\n      \2",
            content
        )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch 4 applied.")
