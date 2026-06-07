# Frontend Hotfix Report: Language Switch Render Error, Model Labels & SILIC Link

## 1. Issue Overview
Three primary issues were addressed in this hotfix:
1. **Rendering Error on Language Switch**: Switching languages triggered an `ErrorBoundary` crash ("Oops! / 糟糕！"). This occurred because `getDict(lang)` used a shallow merge (`{ ...messages.en, ...messages[lang] }`). If a language translation file was incomplete, missing nested objects (like `guideModels` or `xaiEducation.sections`) were completely overwritten with `undefined`, crashing components that expected arrays or objects.
2. **SILIC Model External Link Missing**: The SILIC model citation in the GuideModal lacked the required external GitHub link.
3. **Outdated "Fast" Terminology**: The UI continued to display "Perch v2 Fast (Google TFLite)" and internal "fast" tags, which did not align with the desired neutral phrasing.

## 2. Root Cause Analysis & Fixes

### A. i18n Dictionary Deep Merge (Render Crash Fix)
- **Root Cause**: The function `createSafeDict` in `frontend/src/i18n/index.js` relied on the Javascript spread operator, which only performs a shallow merge. If a nested property like `xaiEducation` was missing in `zh.js`, it overwrote `en.js`'s `xaiEducation` entirely instead of merging the inner keys.
- **Fix**: Replaced shallow merging with a custom `deepMerge` utility. The `deepMerge` recursively merges objects while preserving arrays. This guarantees that missing keys in any nested level fallback correctly to English without wiping out the entire nested object.

### B. Defensive Component Rendering
- **Root Cause**: Components strictly expected `dict.guideModels` and `dict.xaiEducation.sections` to be arrays.
- **Fix**: Enhanced defensive programming in `GuideModal.jsx` and `XaiEducationPage.jsx`. Replaced `.map()` calls with `(Array.isArray(dict.guideModels) ? dict.guideModels : []).map()`, ensuring components render safely even if underlying data is malformed.

### C. ErrorBoundary Localization and Diagnostics
- **Fix**: Updated `ErrorBoundary.jsx` to log fatal error messages, standard stack traces, and component stack traces directly to the console for better diagnostics. The UI message now also attempts to localize based on the last saved language in `localStorage`, degrading gracefully if localization fails.

### D. SILIC External Link
- **Fix**: Wrote a Python patching script to inject `link: 'https://github.com/RedbirdTaiwan/silic'` into the `guideModels` definition for the SILIC model across all 20 supported `locales/*.js` files.

### E. Model Labels & "Fast" Cleanup
- **Fix**: 
  - Updated `modelPerchFast` text in all locales from `"Perch v2 Fast (Google TFLite)"` to `"Perch v2 (Google)"` (and appropriate localizations).
  - Deleted the `modelTagFast` key entirely from all locales.
  - Refactored `frontend/src/utils/modelLabel.js` to remove dependencies on `modelTagFast` and `tag: 'fast'`, allowing `LandingPage.jsx` to simply display the model name.

## 3. Validation
- **Validation Script**: Confirmed that `frontend/scripts/validate-i18n.mjs` recursively checks all fields against the `en.js` base schema.
- **Test Passed**: `npm run test:i18n` now successfully passes for all 20 languages, verifying that no keys (including nested ones like `guideModels[2].link`) are missing or incorrectly typed.
- **Build Passed**: `npm run build` completes successfully.

## 4. Conclusion
The frontend is now stabilized against language-switching crashes. Nested object fallbacks function as intended, and component logic is fortified against undefined arrays. The model labels are streamlined, and all model citations are accurate.
