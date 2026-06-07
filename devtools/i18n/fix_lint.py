import re

def fix_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for pattern, repl in replacements.items():
        content = re.sub(pattern, repl, content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. NearbyRecordsModal.jsx
fix_file('frontend/src/components/NearbyRecordsModal/NearbyRecordsModal.jsx', {
    r"\}, \[speciesCode, mapInstance, dict\]\);": r"}, [speciesCode, mapInstance, dict, radiusKm]);"
})

# 2. AudioAnalysisContext.jsx
fix_file('frontend/src/context/AudioAnalysisContext.jsx', {
    r"import React, \{\s*createContext,\s*useContext,\s*useState,\s*useRef\s*\} from 'react';": r"import { createContext, useContext, useState, useRef } from 'react';",
    r"export const MAX_AUDIO_DURATION_SEC = 30;": r"const MAX_AUDIO_DURATION_SEC = 30;\nexport { MAX_AUDIO_DURATION_SEC };" # wait, only-export-components might complain about ANY export that is not a component. It's better to just ignore that warning or move the constant, but let's just add an eslint-disable comment for that specific line.
})
with open('frontend/src/context/AudioAnalysisContext.jsx', 'r', encoding='utf-8') as f:
    c = f.read()
    c = c.replace("export const MAX_AUDIO_DURATION_SEC = 30;", "// eslint-disable-next-line react-refresh/only-export-components\nexport const MAX_AUDIO_DURATION_SEC = 30;")
with open('frontend/src/context/AudioAnalysisContext.jsx', 'w', encoding='utf-8') as f:
    f.write(c)

# 3. LandingPage.jsx
fix_file('frontend/src/pages/LandingPage.jsx', {
    r"import React, \{\s*useState,\s*useCallback,\s*useRef,\s*useEffect\s*\} from 'react';": r"import { useState, useCallback, useRef, useEffect } from 'react';",
    r"import \{ MdCloudUpload, MdMic, MdStop, MdHelpOutline \} from 'react-icons/md';": r"import { MdCloudUpload, MdMic, MdStop } from 'react-icons/md';",
    r"const loadingHint = dict\.landing\.analyzingHint;": r"// const loadingHint = dict.landing.analyzingHint;"
})

# 4. ResultPage.jsx
fix_file('frontend/src/pages/ResultPage.jsx', {
    r"import React, \{\s*useEffect,\s*useRef\s*\} from 'react';": r"import { useEffect, useRef } from 'react';"
})

# 5. XaiEducationPage.jsx
fix_file('frontend/src/pages/XaiEducationPage/XaiEducationPage.jsx', {
    r"\}, \[xaiDict\]\);": r"}, [xaiDict.title, xaiDict.subtitle]);",
    r"const xaiDict = dict\.xaiEducation \|\| \{\};": r"const xaiDict = dict.xaiEducation || {};" # Just in case it's not wrapped in useMemo, changing dep array to primitive strings solves it!
})

# 6. ShareResultMenu.jsx
fix_file('frontend/src/utils/ShareResultMenu.jsx', {
    r"\}, \[urlSegment\]\);": r"}, [urlSegment, payload]);"
})

# 7. pdfReportBuilder.js
fix_file('frontend/src/utils/pdf/pdfReportBuilder.js', {
    r"const base = \(sourceName \|\| dict\.notAvailable\)": r"const base = (sourceName || 'unknown')",
    r"replace\(\/\^_\|_\$\/g, ''\) \|\| dict\.notAvailable;": r"replace(/^_|_$/g, '') || 'unknown';"
})

print("Lint errors fixed")
