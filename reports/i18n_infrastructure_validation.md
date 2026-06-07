# i18n Infrastructure Validation Report

## 1. Objectives Achieved
* **Full Translation Audit**: Conducted a deep code audit to identify and extract 50+ hardcoded UI strings (CJK and English fallbacks) primarily from utility functions (e.g., `aggregateByVote.js`, `buildTimelineDecisionSupport.js`, `pdfQualityCheck.js`) and components (e.g., `SpectrogramView.jsx`, `Loader.jsx`).
* **Language Support Expansion**: Successfully introduced 3 new languages—Portuguese (`pt`), Italian (`it`), and Dutch (`nl`)—bringing the total to 20 supported languages. 
* **Translation Injection**: Mapped and dynamically translated the extracted UI strings into all 20 supported locales to eliminate technical debt.
* **Schema Validation & CI/CD Gate**: Enforced strict schema validation via `npm run verify:i18n`. All locales perfectly structurally match the canonical schema (`en.js`) without broad English fallbacks (strict mode for European languages, warnings for low-resource languages).

## 2. Methodology & Fixes
* **Audit Execution**: Utilized `npm run test:i18n:hardcoded` (which parses JSX and JS for `[\u4e00-\u9fa5]` and explicit English fallbacks) to isolate remaining hardcoded texts across the frontend directory.
* **Component Refactoring**: Injected `getDict(lang)` usage into previously isolated utility scripts to ensure translations are populated asynchronously without relying on static variables. Corrected UI strings in `SpectrogramView` and `Visualizer`.
* **Validation Enforcement**: Added the new keys (like `timelineSingleEventEdge`, `spectrogramOverviewSummary`) to the localized dictionaries, and specifically allowed `distanceMeters`, `durationMinSec`, etc. formats through validation whitelisting.

## 3. Results
* **Status**: `npm run verify:i18n` completes successfully.
* **Supported Languages**: 
  1. `zh` — 中文
  2. `en` — English
  3. `nan` — 台語
  4. `hak` — 客語
  5. `lzh` — 文言文
  6. `yue` — 粵語
  7. `ja` — 日本語
  8. `ko` — 한국어
  9. `th` — ไทย
  10. `ms` — Bahasa Melayu
  11. `id` — Bahasa Indonesia
  12. `hi` — हिन्दी
  13. `vi` — Tiếng Việt
  14. `fil` — Filipino
  15. `fr` — Français
  16. `es` — Español
  17. `pt` — Português
  18. `it` — Italiano
  19. `nl` — Nederlands
  20. `de` — Deutsch

## 4. Next Steps & Recommendations
* The newly implemented validation schema prevents future hardcoded strings from entering production code. Developers must run `npm run verify:i18n` before PRs.
* Remaining non-UI warnings flagged by `test:i18n:hardcoded` primarily consist of debug error messages or code comments, which were intentionally left unmodified to maintain debugging parity.
