# Antigravity Handoff: EchoWing Frontend Result Interpretability

## Work Location

- Repository: `https://github.com/Chen-Jung0929/EchoWing`
- Branch: `feature/frontend-result-interpretability-audio-preview`
- Latest commit before this handoff: `85ac5ea`
- Local worktree used by Codex: `C:\EchoWing-frontend-result`
- Base: GitHub `main` commit `c329acb`

Do not work in `C:\EchoWing`; that worktree contains separate Perch model
optimization work. Do not modify backend inference, model files, Docker, API
schemas, SSE schemas, Google Sheets backend behavior, or species taxonomy.

## Objective

Continue frontend-only improvements that help users validate audio before
analysis and understand result confidence, timing, and XAI limitations.

## Completed

- Added pre-analysis audio preview:
  - native audio playback;
  - filename or recorded-audio label;
  - browser-decoded duration;
  - file size and MIME format;
  - accepted-format status;
  - replace, delete, and recording-download controls.
- Added live recording input-level meter using Web Audio API `AnalyserNode`.
  Audio context, animation frame, and media tracks are cleaned up.
- Added result summary card with top species, confidence, model, detected
  windows, XAI status, low-confidence warning, and interpretation hint.
- Added lightweight top-three-species confidence blocks across analysis
  windows. Selecting a block uses the existing timeline/result navigation.
- Added XAI-unavailable fallback:
  - predictions remain visible;
  - result actions are not blocked after XAI failure/unavailability;
  - prediction-only PDF remains downloadable;
  - PDF explicitly states that XAI is unavailable.
- Added locale support for:
  - `zh`, `en`, `ja`, `ko`;
  - `fr`, `es`, `th`, `de`, `lzh`, `id`, `yue`, `ms`.
- Changed the language menu to a vertical, full-width option list positioned
  directly below the language button. It scrolls on small screens.
- Added implementation and verification notes:
  `reports/frontend_result_interpretability_audio_preview_notes.md`.

## Important Files

- `frontend/src/App.jsx`
- `frontend/src/components/AudioPreview/AudioPreview.jsx`
- `frontend/src/components/AudioRecorder/AudioRecorder.jsx`
- `frontend/src/features/results/ResultSummaryCard.jsx`
- `frontend/src/features/results/SpeciesWindowOverview.jsx`
- `frontend/src/utils/ChunkResultsView.jsx`
- `frontend/src/utils/buildFullReportModel.js`
- `frontend/src/utils/pdf/pdfReportBuilder.js`
- `frontend/src/i18n/index.js`
- `frontend/src/i18n/locales/*.js`

## Validation Completed

From `frontend`:

```powershell
npm install
npm run build
npm run test:timeline
npm run test:pdf
```

All commands above passed. Scoped ESLint for the new and directly modified
integration files passed. Full `npm run lint` still fails on pre-existing
repository lint issues unrelated to this task.

Browser checks completed:

- landing page renders;
- vertical language menu lists all 12 locales;
- Thai and Cantonese switching works;
- menu works at desktop and mobile viewport widths;
- no new browser-console errors observed.

The available automated browser denied microphone access, so the live meter
and recorded-audio preview still need a real-browser manual check with
microphone permission.

## Recommended Next Checks

1. Use a real browser with microphone permission:
   - record for more than 5 seconds;
   - verify the live meter moves;
   - stop recording and verify playback metadata;
   - confirm tracks and microphone indicator stop.
2. Upload valid, shorter-than-5-second, and browser-undecodable files.
3. Run one real backend analysis and verify:
   - result summary card;
   - confidence-block selection;
   - XAI pending and available states;
   - XAI-unavailable state;
   - PDF/share/save actions.
4. Review translations with native speakers. New locales translate the main
   workflow and task-specific content; less common legacy text can fall back
   safely to English or Chinese.

## Demo Audio Decision

No suitable small, clearly reusable demo audio file exists in the repository.
Do not invent or add copyrighted audio. Add a demo button only after a
project-owned or appropriately licensed 5–30 second clip is available.

## Known Unrelated Issues

- Full repository lint has existing errors in unrelated components and helpers.
- Vite reports an existing large JavaScript chunk warning.
- Fresh worktrees report `backend/models/resnet18_v3_int8.onnx` as a Git LFS
  pointer mismatch. Do not stage or modify it for frontend work.

## Working Rules

- Keep changes frontend-first and localized.
- Add all user-facing text through the i18n locale system.
- Do not translate species names.
- Do not change backend inference or response schemas.
- Do not silently fix unrelated issues; document them separately.
- Before pushing, run build, timeline test, PDF test, and scoped lint.
