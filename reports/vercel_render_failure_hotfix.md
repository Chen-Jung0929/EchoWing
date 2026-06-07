# Vercel Production Rendering Failure - Hotfix Report

## 1. Starting Main Commit Hash
`955b68a0a586909290566487e05bc1116e90d24d` (Security hardening defense in depth)

## 2. Live Symptom Observed
The live production deployment on Vercel was only displaying the static fallback content wrapped inside the `<noscript>` block (e.g. "EchoWing - AI 鳥類聲學辨識平台", "功能特色", "請啟用 JavaScript 以使用完整功能"). The React application failed to render, leaving the `<div id="root"></div>` empty.

## 3. Exact Root Cause Found
There were **two critical root causes** triggering React to crash before rendering the initial view:
1. **Missing Lazy Import (`NotFoundPage`)**: In `App.jsx`, a route `<Route path="*" element={<NotFoundPage dict={dict} />} />` was added during previous SEO work, but the `NotFoundPage` component was never imported (`const NotFoundPage = React.lazy(...)` was missing). This caused an immediate `ReferenceError` exception within React Router DOM, crashing the entire UI tree.
2. **Defensive Favicon Assignment**: In `main.jsx`, the line `document.querySelector('link[rel="icon"]').href = '/logo.png';` lacked a null guard. If a user's browser, extension, or Vercel edge proxy altered the DOM `<head>` before the script executed, this strict assignment would throw a `TypeError`, instantly killing the app before `ReactDOM.createRoot` was invoked.

## 4. Files Changed
- `frontend/src/App.jsx`: Added the missing `const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));`. Imported and wrapped the main `<Routes>` block in an `<ErrorBoundary>`.
- `frontend/src/main.jsx`: Replaced the dangerous favicon assignment with a safe `if (favicon)` check. Added an `if (!rootElement)` check before calling `createRoot`.
- `frontend/src/components/ErrorBoundary/ErrorBoundary.jsx`: Created a new fallback UI component to catch future React tree crashes gracefully, avoiding total blank screens.

## 5. Was `index.html` missing root/script?
No. `index.html` was correctly formatted. It contained the required `<div id="root"></div>` and `<script type="module" src="/src/main.jsx"></script>`. The SEO fallback content was correctly wrapped inside a `<noscript>` tag and did not interfere with React mounting.

## 6. Was `main.jsx` favicon null crash present?
Yes. It was present and has been fixed by adding a null-check guard `const favicon = ...; if (favicon) { ... }`.

## 7. Were Vercel settings correct?
Yes. The Vercel settings assume `frontend` is the Root Directory. The project relies on `frontend/vercel.json` for edge routing and cache headers.

## 8. Was SPA rewrite added?
Yes. `frontend/vercel.json` already contained the exact SPA rewrite: `{"source": "/(.*)", "destination": "/index.html"}`. 

## 9. Build Output Result
**Build passed successfully:**
```text
> vite build
vite v8.0.11 building client environment for production...
transforming...✓ 338 modules transformed.
rendering chunks...
...
dist/index.html                                           5.21 kB │ gzip:   1.67 kB
dist/assets/index-BOTPXwdi.js                           553.33 kB │ gzip: 170.49 kB
✓ built in 985ms
```

## 10. Local Preview Result
`npm run preview` was tested locally using `curl http://localhost:4173/`. The build directory (`dist`) served `index.html` successfully, which properly referenced the dynamically injected `index-BOTPXwdi.js` asset in the `<head>`.

## 11. Direct Route Refresh Result
Due to the `vercel.json` SPA fallback mapping `/(.*)` to `/index.html`, any direct access to deep routes such as `/how-it-works` or `/result` will correctly return `index.html`, allowing React Router to take over client-side routing.

## 12. i18n Test Result
`npm run test:i18n` passed.
```text
All 12 locales passed structure and coverage validation!
```
(Timeline and PDF tests also passed. `npm run lint` reported 26 unrelated warnings/errors mostly related to `no-unused-vars`, but this does not affect the production build.)

## 13. Final Deployment Instructions
1. Push this branch (`hotfix/vercel-frontend-render-failure`) to the origin repository.
2. Merge the branch into `main`.
3. Vercel will automatically trigger a new production deployment. Monitor the Vercel dashboard to ensure the build completes.
4. Verify by opening `https://echo-wing.vercel.app/` in a fresh incognito window.

## 14. Remaining Risks
- The `vercel.json` defines some strict Content Security Policies (CSP) including `Content-Security-Policy-Report-Only`. Ensure that `fonts.gstatic.com` and other external CDN domains used by KaTeX or Hero animations are fully covered if this CSP ever switches from `Report-Only` to strict enforcement.
- The `no-unused-vars` lint issues could theoretically obscure dead code or import bugs. A future tech-debt PR should address the `eslint` output to ensure CI/CD stays pristine.
