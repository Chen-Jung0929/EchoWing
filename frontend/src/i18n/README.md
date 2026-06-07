# EchoWing Frontend i18n System

This folder contains the internationalization (i18n) setup for the EchoWing frontend.

## Supported Languages (20)
1. `zh` — 中文
2. `en` — English
3. `nan` — 台語 (Taiwanese Hokkien)
4. `hak` — 客語 (Hakka)
5. `lzh` — 文言文 (Classical Chinese)
6. `yue` — 粵語 (Cantonese)
7. `ja` — 日本語 (Japanese)
8. `ko` — 한국어 (Korean)
9. `th` — ไทย (Thai)
10. `ms` — Bahasa Melayu (Malay)
11. `id` — Bahasa Indonesia (Indonesian)
12. `hi` — हिन्दी (Hindi)
13. `vi` — Tiếng Việt (Vietnamese)
14. `fil` — Filipino
15. `fr` — Français (French)
16. `es` — Español (Spanish)
17. `pt` — Português (Portuguese)
18. `it` — Italiano (Italian)
19. `nl` — Nederlands (Dutch)
20. `de` — Deutsch (German)

## File Structure
- `languages.js`: Central registry. Defines `SUPPORTED_LANGS` and browser language detection logic.
- `index.js`: Exposes `getDict(lang)`. In development mode, `getDict` uses a JavaScript Proxy to detect missing translations and outputs console warnings.
- `locales/*.js`: Individual language dictionaries. `en.js` serves as the strict canonical schema.

## Development & CI Tools

The i18n system enforces strict schema validation to prevent regressions or missed translations. 

- **Validation Command**: `npm run verify:i18n`
- **Schema**: All locales must strictly match the structure and keys of `en.js`. Missing keys, type mismatches (string vs array), and `__TODO__` markers will cause the build to fail.
- **English Fallbacks**: For strict European locales (`pt`, `it`, `nl`, etc.), exact matches to English text will cause validation errors unless explicitly whitelisted in `validate-i18n.mjs`.

### Scripts

- `scripts/validate-i18n.mjs`: Core validation logic. Runs as the final CI gate before merges.
- `scripts/create-locale-template.mjs`: CLI tool to generate a new language file with `__TODO__` markers using the canonical English template.
- `scripts/find-hardcoded-ui-strings.mjs`: AST/Regex scanner that looks for `[A-Za-z]` fallbacks and `[\u4e00-\u9fa5]` literal strings outside of locale files.
