# Frontend Result Interpretability and Audio Preview Notes

## Summary

This branch improves result-page interpretation and pre-analysis audio usability.
It starts from GitHub `main` commit `c329acb`, which already contains the
previous frontend UX, i18n, privacy, and guide work.

## Files Changed

- `frontend/src/App.jsx`
- `frontend/src/components/AudioPreview/AudioPreview.jsx`
- `frontend/src/components/AudioRecorder/AudioRecorder.jsx`
- `frontend/src/features/results/ResultSummaryCard.jsx`
- `frontend/src/features/results/SpeciesWindowOverview.jsx`
- `frontend/src/i18n/locales/en.js`
- `frontend/src/i18n/locales/zh.js`
- `frontend/src/i18n/locales/ja.js`
- `frontend/src/i18n/locales/ko.js`
- `frontend/src/utils/ChunkResultsView.jsx`
- `frontend/src/utils/buildFullReportModel.js`
- `frontend/src/utils/pdf/pdfReportBuilder.js`

## Features Added

- A compact result summary card shows the top predicted species, confidence,
  model, detected analysis windows, XAI status, low-confidence warning, and a
  short interpretation reminder.
- A lightweight top-three-species window overview shows confidence blocks for
  each model analysis window. Selecting a block opens the corresponding
  time-window result using the existing result navigation path.
- Existing confidence, XAI, and timeline explanations remain available in the
  collapsible interpretation section.
- When prediction results exist but no XAI heatmap is returned, the UI clearly
  reports that XAI is unavailable and keeps result actions available.
- Prediction-only PDF reports are supported and explicitly state that XAI was
  unavailable.
- Uploaded and recorded audio now has a pre-analysis preview with native
  playback, filename/recorded-audio label, decoded duration, size, MIME format,
  accepted-format state, replace, delete, and recording download actions.
- Browser duration decoding begins immediately after selection. Unsupported
  local decoding is shown as a warning and still allows backend validation.
- Recording now includes a small live input-level meter using Web Audio API
  `AnalyserNode`. It does not retain waveform samples and cleans up its animation
  frame, audio context, and media tracks.
- All new user-facing strings are available in Chinese, English, Japanese, and
  Korean. This branch also adds French, Spanish, Thai, German, Classical
  Chinese, Indonesian, Cantonese, and Malay locale files. Species names remain
  unchanged.
- The language picker is now a vertically stacked, full-width option list
  positioned directly below the language button, with scrolling for smaller
  screens.

## Assumptions

- Chunk `index` values are analysis-window start times in seconds.
- Existing chunk predictions contain the confidence values needed for the
  lightweight window overview.
- A completed result with no chunk `xai_heatmap` and `xai_pending !== true`
  represents XAI unavailable or failed.
- The existing PDF generator can safely produce a report without XAI because
  it already treats spectrogram/XAI-derived material as optional.

## Limitations

- The confidence-window overview displays only the top three species to keep
  the result page compact.
- Selecting a confidence block uses the existing timeline selection mechanism;
  it does not introduce a new backend or URL-level tab state.
- Browser audio playback and duration decoding depend on browser codec support.
  A file accepted by the backend may still be undecodable in the browser.
- The live volume meter gracefully disappears when Web Audio API is
  unavailable.
- No suitable small, clearly reusable demo audio file exists in the repository.
  A classroom demo button was therefore not added. TODO: add a licensed,
  project-owned 5–30 second demo clip before enabling this feature.

## Known Issues Not Fixed

- Full `npm run lint` reports existing repository lint failures in unrelated
  components, services, timeline helpers, and PDF helpers.
- `frontend/src/utils/ChunkResultsView.jsx` and the PDF/report helpers already
  contain lint issues that predate this branch.
- Vite reports the existing large JavaScript chunk warning.
- Fresh worktrees report `backend/models/resnet18_v3_int8.onnx` as a Git LFS
  pointer mismatch. This branch does not modify or stage that model file.

## Intentionally Not Changed

- Backend inference algorithms and model selection behavior.
- API and SSE response schemas.
- Model files, model optimization work, and Docker configuration.
- Google Sheets backend behavior.
- Species taxonomy and species-name translation.

## Verification

- `npm install`: passed, zero reported vulnerabilities.
- `npm run build`: passed.
- `npm run test:timeline`: passed.
- `npm run test:pdf`: passed.
- Scoped lint for newly added components and main integration code: passed.
- Full `npm run lint`: runs but fails on existing repository lint issues.
- Browser manual check: landing page renders, Korean language switching works,
  the new vertical language menu lists all 12 locales, Thai switching works on
  desktop and mobile-width viewports, and no browser-console errors were
  observed.
- The available browser denied microphone permission, so the live meter and
  recorded-audio preview could not be exercised end to end in that session.
- Audio upload preview and result-page interactions were not exercised end to
  end because the browser automation session could not provide a local file and
  no backend result was available. Their integration paths were verified by
  scoped lint, production build, timeline test, and PDF smoke test.
