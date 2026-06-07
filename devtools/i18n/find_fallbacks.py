import glob
import re

files = glob.glob('frontend/src/**/*.jsx', recursive=True) + glob.glob('frontend/src/**/*.js', recursive=True)

patterns = [
    r'\|\|\s*[\'"][^\'"]+[\'"]',
    r'\?\?\s*[\'"][^\'"]+[\'"]'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        lines = file.readlines()
        for i, line in enumerate(lines):
            for p in patterns:
                if re.search(p, line):
                    print(f"{f}:{i+1} - {line.strip()}")
