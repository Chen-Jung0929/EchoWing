import os

locales_dir = r"c:\EchoWing-hotfix\frontend\src\i18n\locales"
langs_to_fix = ['lzh.js', 'yue.js', 'ja.js', 'ko.js', 'th.js', 'ms.js', 'id.js']

for filename in langs_to_fix:
    filepath = os.path.join(locales_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the syntax error: \"link\": \"https://github.com/RedbirdTaiwan/silic\",
    content = content.replace('\\"link\\": \\"https://github.com/RedbirdTaiwan/silic\\",', '"link": "https://github.com/RedbirdTaiwan/silic",')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch 5 applied.")
