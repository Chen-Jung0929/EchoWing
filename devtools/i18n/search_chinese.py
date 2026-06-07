import os
import re

def search_chinese(directory):
    pattern = re.compile(r'[\u4e00-\u9fa5]')
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.js') or file.endswith('.jsx'):
                if 'locales' in root:
                    continue
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        for i, line in enumerate(lines):
                            if pattern.search(line):
                                print(f"{path}:{i+1}:{line.strip()}")
                except Exception as e:
                    pass

search_chinese('c:\\EchoWing-hotfix\\frontend\\src')
