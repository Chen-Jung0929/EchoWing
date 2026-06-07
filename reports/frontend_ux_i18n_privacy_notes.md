# Frontend UX, i18n, Privacy, and Guide Notes

## Summary

This branch focuses only on frontend user experience, accessibility,
multilingual support, user guidance, privacy wording, and educational
documentation. It starts from GitHub `main` commit `64aeeb7`.

## Files Changed

- `frontend/src/App.jsx`
- `frontend/src/components/AudioRecorder/AudioRecorder.jsx`
- `frontend/src/components/GuideModal/GuideModal.jsx`
- `frontend/src/components/PrivacyNotice/PrivacyNotice.jsx`
- `frontend/src/components/Tooltip/Tooltip.jsx`
- `frontend/src/i18n/index.js`
- `frontend/src/i18n/locales/en.js`
- `frontend/src/i18n/locales/zh.js`
- `frontend/src/i18n/locales/ja.js`
- `frontend/src/i18n/locales/ko.js`
- `frontend/src/utils/audioDuration.js`
- `frontend/src/utils/ChunkResultsView.jsx`
- `frontend/src/utils/ResultTitleActions.jsx`

## User-Facing Features Added

- Recording immediately enters a disabled finalizing state after Stop is
  clicked, preventing repeated `MediaRecorder.stop()` calls.
- Browser-decodable audio shorter than 5 seconds is rejected before analysis.
  Decode failures are allowed through for backend handling.
- Chinese, English, Japanese, and Korean language choices are available.
- Language and theme preferences persist in `localStorage`; first-visit
  language selection uses browser language detection with English fallback.
- Guide content is organized into Usage, Models, How it works, Privacy & Data
  Use, and Credits sections.
- A lightweight first-visit privacy notice appears once and links to the full
  privacy guide.
- The model selector includes a compact model-source/window hint and a direct
  Models guide link.
- Loading text distinguishes audio preparation, model prediction, and XAI.
- The result action menu shows visible localized labels next to icons.
- A compact collapsible result-interpretation note explains confidence, XAI,
  and timeline limitations.
- Reusable hover/focus tooltip behavior is used for compact navigation controls;
  buttons retain accessible names.

## Privacy Wording

The interface now states that:

- uploaded audio is processed for analysis;
- uploaded audio should not be permanently stored or used for model training;
- field notes, observer notes, and GPS are sent to Google Sheets only after
  explicit save confirmation and only when integration is configured;
- users should avoid uploading private conversations or identifiable human
  speech;
- AI predictions are not guaranteed and should be verified through field
  observation.

## Intentionally Not Changed

- Backend inference and model-selection behavior.
- API or SSE response schemas.
- Model files, optimization runtimes, or Docker deployment.
- Google Sheets behavior.
- Species and taxonomy names.
- PDF report structure.
- Existing visual identity and hero scene.

## Limitations

- Japanese and Korean cover the main workflow, errors, guide, privacy,
  disclaimer, actions, and interpretation text. Less frequently used legacy
  screens fall back safely to English.
- Browser duration validation depends on `AudioContext.decodeAudioData`.
  Unsupported formats are allowed through for backend validation.
- The first-visit privacy notice records acknowledgement in browser
  `localStorage`; it is not a legal consent-management system.
- XAI loading stages use existing frontend/SSE events and do not represent a
  percentage-complete progress bar.

## Unrelated Issues Found But Not Fixed

- Fresh worktrees report `backend/models/resnet18_v3_int8.onnx` as a Git LFS
  pointer mismatch. It is unrelated to this frontend task.
- Full `npm run lint` currently reports existing errors in unrelated files,
  including ref access during render, synchronous state updates in effects,
  unused variables, and service/PDF helper lint failures.
- Vite reports an existing large JavaScript chunk warning after a successful
  production build.

## Verification

- `npm install`: completed, zero reported vulnerabilities.
- `npm run build`: passed.
- `npm run test:timeline`: passed.
- `npm run test:pdf`: passed.
- `npm run lint`: runs, but fails on existing repository lint errors described
  above.
- Browser manual checks passed for:
  - landing-page rendering;
  - Chinese, English, Japanese, and Korean language switching;
  - language and theme persistence after reload;
  - first-visit privacy notice dismissal persistence;
  - reopening the privacy notice from the Guide;
  - Usage, Models, How it works, Privacy, and Credits Guide navigation;
  - localized model hints and accessible control labels;
  - no new browser-console errors during the checked flows.
- Browser microphone permission was denied in the available test browser, so
  recording start/stop/finalizing behavior could not be exercised end to end.
  The recording state transitions and repeated-stop guard were verified in
  code and through the successful production build.
- Short-file rejection and result-page action labels were not exercised end to
  end because the available browser session had no suitable upload fixture or
  backend result. Their frontend paths were verified in code and build output.
- Screenshot capture timed out in the available browser automation session, so
  no reliable screenshots are included.

## TODO

- Expand Japanese and Korean translation coverage for legacy/rarely used
  screens if those workflows become user-facing priorities.
- Add automated browser tests for recording, duration validation, preference
  persistence, and the first-visit privacy notice.
- Confirm final team names before replacing the course-project attribution
  placeholder.
