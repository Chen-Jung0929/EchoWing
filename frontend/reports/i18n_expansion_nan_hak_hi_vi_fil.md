# i18n Expansion Report (Taiwanese, Hakka, Hindi, Vietnamese, Filipino)

## Overview
Successfully expanded EchoWing's internationalization (i18n) to include 5 new languages, bringing the total supported locales to 17.

## Added Locales
- **Taiwanese Hokkien (`nan`)**: Mapped to `nan-TW`. Added idiomatic Hokkien translations.
- **Hakka (`hak`)**: Mapped to `hak-TW`. Added idiomatic Hakka translations.
- **Hindi (`hi`)**: Mapped to `hi`. Used Devanagari script for ordinary UI labels while preserving technical terms.
- **Vietnamese (`vi`)**: Mapped to `vi`. Concise and natural Vietnamese UI translations.
- **Filipino (`fil`)**: Mapped to `fil`. Modern Filipino UI language.

## Validation & Integrity Checks
- **100% Structural Coverage**: All new locale files structurally match the base `en.js` file.
- **Strict English Fallback Handling**:
  - Validated using an updated `scripts/validate-i18n.mjs`.
  - Allowed technical tokens (`XAI`, `PDF`, `API`, `SSE`, `PCEN`, `Perch`, `BirdNET`, `SILIC`) and model-specific metadata (formula strings, component IDs, icons, source links) to fall back to English equivalents safely.
  - No broad UI strings were accidentally left as English fallback.
- **Test Suite Results**:
  - `npm run test:i18n` passed successfully for all 17 locales.
  
## Layout & Menu Order
The language selection menu was reordered to match the requested sequence:
`zh, en, nan, hak, lzh, yue, ja, ko, th, ms, id, hi, vi, fil, fr, es, de`

All new languages have been verified to load correctly without runtime syntax errors or missing keys.
