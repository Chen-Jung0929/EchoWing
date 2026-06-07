import os
import glob
import re

files = glob.glob('frontend/src/i18n/locales/*.js')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Rename decisionSupport string key to decisionSupportTitle
    # We must be careful not to rename the object key.
    # The string key usually looks like: decisionSupport: '決策輔助',
    # or decisionSupport: "Decision Support",
    # The object key looks like: decisionSupport: {
    
    content = re.sub(r'([\'"]?)decisionSupport\1\s*:\s*([\'"].*?[\'"]),', r'decisionSupportTitle: \2,', content)
    
    # Remove rawResponse
    content = re.sub(r'([\'"]?)rawResponse\1\s*:\s*[\'"].*?[\'"],?\s*\n', '', content)
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print(f"Processed {len(files)} files.")
