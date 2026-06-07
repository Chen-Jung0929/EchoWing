# Frontend i18n Hardening & JSON Cleanup Report

## Summary
The goal of this task was to perform a verification and cleanup across the frontend, focused on translation completeness, user-facing i18n consistency, removal of user-visible debug JSON, and cleanup of stale frontend files.

## Actions Taken
1. **i18n Validation Script**:
   - Created `frontend/scripts/validate-i18n.mjs` to strictly check all 12 locales against `zh.js` and `en.js`. 
   - Added `test:i18n` to `package.json`.
   
2. **Translation Fixes**:
   - Addressed structural mismatches (array length) in `ja.js`, `ko.js`, `th.js`, and `lzh.js` regarding the `guideUsageSteps` and `guideHowSteps` arrays.
   - All 12 locales now pass the structure and coverage validation correctly (`npm run test:i18n` exits with 0).
   
3. **GuideModal & Privacy Notice Wire-up**:
   - Refactored `GuideModal.jsx` to render tabs dynamically based on `dict.guideTabs`.
   - Verified that `PrivacyNotice.jsx` properly links to `openPrivacyGuide` in `App.jsx`, which opens the `GuideModal` at the privacy tab.
   
4. **JSON Cleanup**:
   - Removed the raw JSON `<details>` block (`dict.rawResponse` and `JSON.stringify(result)`) entirely from `ChunkResultsView.jsx`.
   
5. **Dead Code**:
   - Verified that the stale components (`AudioUploader.jsx`, `useAudioProcessor.js`, `ResultDashboard.jsx`) were completely removed from the project source.
   
6. **API Error Mapping**:
   - Verified that `api.js` throws standardized error codes (`ERR_SERVER_HTTP_ERROR`, `ERR_SERVER_NOT_READY`, `ERR_BACKEND_TIMEOUT`, `ERR_BACKEND_MODEL_FAILED`).
   - Verified these codes exist as top-level translations in all 12 locales.
   
7. **Language Menu Refactor**:
   - Centralized the language definitions by creating a `LANG_OPTIONS` array in `i18n/index.js` and consuming it directly within `App.jsx`, removing hardcoded arrays and streamlining the mapping process.

8. **Build Check**:
   - Ran `npm run build`, and it passed successfully.
   
## Checkbox Status
- [x] Fix specific array length mismatches (`guideUsageSteps`, `guideHowSteps`) in `ja.js`, `ko.js`, `th.js`, and `lzh.js`.
- [x] Rerun `npm run test:i18n` to verify success.
- [x] `GuideModal.jsx` correctly receives `initialSection`, renders tab navigation via `dict.guideTabs`, and supports usage, models, how, privacy, credits.
- [x] `PrivacyNotice.jsx` links `privacyNoticeLearnMore` properly to open the privacy section of the modal.
- [x] Raw JSON backend response is entirely removed from `ChunkResultsView.jsx`.
- [x] Dead code files are verified deleted.
- [x] `api.js` throws standard error codes and UI maps them to `apiErrors`.
- [x] All 12 locales contain translations for the keys, as verified by `validate-i18n.mjs`.
- [x] `App.jsx` language menu correctly iterates through 12 languages and dynamically updates `document.documentElement.lang`.
- [x] `npm run build` passes with no errors.

## Known Remaining Limitations
- **Hardcoded Strings in Utility Functions**: While the main UI and API error messages have been fully migrated to `src/i18n/locales/*.js`, several utility functions (`aggregateByVote.js`, `buildTimelineDecisionSupport.js`, `spectrogramWithLabels.js`, `formatDistanceKm.js`, `formatPredictionDuration.js`, `pdfQualityCheck.js`) still contain hardcoded Chinese and English fallback logic (e.g., returning `{ zh: '...', en: '...' }` objects or using `lang === 'zh' ? ... : ...`). 
- Moving these strings directly into the 12 central `locale` files would require heavily refactoring their function signatures across multiple layers of callers (including the PDF rendering engine). To avoid violating the "Do not redesign the whole app" rule in this cleanup phase, these embedded strings were intentionally left as-is. They act as localized fallback structures, but will need architectural updates to natively support all 12 languages efficiently.
