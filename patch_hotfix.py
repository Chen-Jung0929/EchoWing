import os
import re

locales_dir = r"c:\EchoWing-hotfix\frontend\src\i18n\locales"
for filename in os.listdir(locales_dir):
    if not filename.endswith('.js'): continue
    filepath = os.path.join(locales_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Task A: Add SILIC external link
    # We find where name matches SILIC and add the link field after source.
    # The block looks like:
    #     {
    #       name: 'SILIC (Academia Sinica)',
    #       window: '5 seconds',
    #       type: 'Experimental / project-specific model',
    #       source: 'Academia Sinica',
    #       citation: '...',
    #     },
    # So we can match `source: 'Academia Sinica',` and insert `link: 'https://github.com/RedbirdTaiwan/silic',`
    # Note that in zh.js, the source is 'Academia Sinica', same for all others.
    if "https://github.com/RedbirdTaiwan/silic" not in content:
        content = re.sub(
            r"(source:\s*'Academia Sinica',\s*)(citation:\s*['\"])",
            r"\1link: 'https://github.com/RedbirdTaiwan/silic',\n      \2",
            content
        )

    # Task B: Remove fast
    # 1. Delete modelTagFast entirely
    content = re.sub(r"\s*[\"']?modelTagFast[\"']?\s*:\s*['\"].*?['\"],?", "", content)
    
    # 2. Rename modelPerchFast label
    # e.g., 'Perch v2 Fast (Google TFLite)' -> 'Perch v2 (Google)'
    # and "Perch v2 Fast (Google TFLite)" -> "Perch v2 (Google)"
    # For hi.js it's 'Perch v2तेज़ (Google TFLite)'
    content = re.sub(r"['\"]Perch v2.*?\(Google TFLite\)['\"]", "'Perch v2 (Google)'", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch applied to all locales.")
