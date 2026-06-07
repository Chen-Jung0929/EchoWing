import os
import re

locales_dir = r"c:\EchoWing-hotfix\frontend\src\i18n\locales"
for filename in ['fr.js', 'es.js', 'de.js']:
    filepath = os.path.join(locales_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The SILIC guide model is the 3rd one, so it should be the last citation before guideTabs
    # Or better, let's just find the block with SILIC and inject link before citation.
    
    # Actually, we can just replace citation: with link and citation for the SILIC block specifically.
    # Since SILIC has "SILIC" in the name, we can do a regex that finds the SILIC name, and then the next citation.
    # A simpler way:
    # Just look for the citation inside the SILIC object.
    # In fr.js: name: "SILIC (Académie Sinica)"
    # In es.js: name: "SÍLICA (Academia Sínica)" or similar
    # In de.js: name: "SILIC (Academia Sinica)"
    
    # The citation string for SILIC in each language is different.
    # Let's find: `source: "...",` and add `link: "https://github.com/RedbirdTaiwan/silic",`
    
    if "https://github.com/RedbirdTaiwan/silic" not in content:
        # Regex to match `source: "something",` and `citation: "something"`
        # Because we only need to patch the 3rd model, and the 1st has Perch, 2nd has BirdNET.
        # We can split by guideModels, find the last source/citation pair before guideTabs.
        pass
        
    # Better: just look for `(source:\s*["'][^"']+["'],\s*)(citation:\s*["'])` 
    # But this might match Perch and BirdNET too.
    # But Perch and BirdNET ALREADY have `link` BEFORE `citation`.
    # `link` comes BEFORE `citation`.
    # Wait, in the files, Perch and BirdNET have:
    # source: "...",
    # link: "...",
    # citation: "..."
    # So the regex `source: "...", citation:` WILL ONLY MATCH SILIC!
    # Because for Perch and BirdNET, between `source:` and `citation:` there is `link:`.
    
    content = re.sub(
        r"(source:\s*[\"'][^\"']+[\"'],\s*)(citation:\s*[\"'])",
        r"\1link: 'https://github.com/RedbirdTaiwan/silic',\n      \2",
        content
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Patch 2 applied.")
