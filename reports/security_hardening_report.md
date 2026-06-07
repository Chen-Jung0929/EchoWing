# EchoWing Security Hardening Report

## 1. Branch Name
`feature/security-hardening-defense-in-depth`

## 2. Starting Commit Hash
`fbdb006abe6d783eaaee8244e9fa894d655396ad` (Base local repo from ZIP extraction)

## 3. Files Changed
- `frontend/vercel.json` (Added security headers, CSP)
- `backend/app/config.py` (Added settings: origin allowlist, rate limits, upload size)
- `backend/app/main.py` (Added MaxUploadSizeMiddleware, RateLimitMiddleware, restricted CORS, global Exception Handler)
- `.github/dependabot.yml` (Configured npm and pip automated updates)
- `.github/workflows/security-checks.yml` (Added CI pipeline for security tests)
- `backend/tests/test_security_limits.py` (Added tests for rate limits and payload sizes)
- `README.md` (Added documentation)

## 4. Threat Model Summary
EchoWing is an acoustic recognition app subject to common web attacks. The primary threats addressed in this pass include:
- Uncontrolled file uploads enabling denial-of-service (DoS) or out-of-memory errors.
- Inference API abuse from cross-origin applications leading to compute exhaustion.
- Potential clickjacking and MIME-type sniffing on the frontend.
- Unhandled internal exceptions leaking stack traces to the client.

## 5. What Was Protected
- **Clickjacking:** Mitigated via `X-Frame-Options: DENY` and `Content-Security-Policy`.
- **MIME Sniffing:** Mitigated via `X-Content-Type-Options: nosniff`.
- **Excessive Upload / DoS:** Prevented by `MaxUploadSizeMiddleware` dynamically counting bytes up to `25MB`.
- **Broad CORS:** Replaced `allow_origins=["*"]` with an environment-driven allowlist.
- **Dependency Drift:** Added Dependabot checks to detect vulnerable npm/pip packages.
- **User-Facing Error Leakage:** Implemented a global exception handler that returns structured `500` JSON errors instead of tracebacks.

## 6. What Was Not Protected
- **This is not a full penetration test.** The scope was non-destructive hardening.
- **No Authentication Layer Added.** The API remains anonymous.
- **No Distributed Rate Limiting.** In-process memory relies on the FastAPI process; it does not share state across multiple HF Space replicas.
- **No WAF.** There is no Web Application Firewall (like Cloudflare) deployed at the edge yet.
- **No Malware Scanning.** Uploaded audio files are parsed by torchaudio, which is generally robust, but no strict malware scan is conducted.
- **No Formal Security Audit.** 

## 7. Deployment Variables Required
You must set the following environment variables in production:
- `TRIAGELENS_ALLOWED_ORIGINS`: e.g., `https://echo-wing.vercel.app,http://localhost:5173`
- `TRIAGELENS_MAX_UPLOAD_BYTES`: e.g., `26214400` (25MB)
- `TRIAGELENS_ENABLE_RATE_LIMIT`: `true` or `false`
- `TRIAGELENS_RATE_LIMIT_WINDOW_SEC`: `60`
- `TRIAGELENS_RATE_LIMIT_MAX_REQUESTS`: `10`
- `TRIAGELENS_MAX_CONCURRENT_PREDICTIONS`: `1`

## 8. Local Development Defaults
Defaults are geared towards local developers out-of-the-box:
- CORS allows: `http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000`
- Rate limits: Disabled by default for easy local testing.
- Payload Limit: 25MB (26214400 bytes).

## 9. Production Deployment Checklist
- [ ] Configure `TRIAGELENS_ALLOWED_ORIGINS` to include exactly the Vercel frontend domains.
- [ ] Enable rate limiting `TRIAGELENS_ENABLE_RATE_LIMIT=true` if public API abuse is a concern.
- [ ] Deploy the backend to HuggingFace or Render and ensure SSE still streams properly.
- [ ] Deploy the frontend to Vercel and check browser console for CSP violations (currently in `Report-Only` mode to safely test).

## 10. Test Results
- `pytest backend/tests/test_security_limits.py` successfully blocks large payloads with HTTP 413, honors the CORS configuration, and validates health checks.
- Manual frontend builds (`npm run build`) complete successfully.

## 11. Known Limitations
- The Content Security Policy is currently in `Report-Only` mode. Once logs confirm no false positives, remove `-Report-Only` from `vercel.json` for enforcement.
- Rate limiting resets on service restart and tracks IP via `x-forwarded-for`, which depends on proxy trust.

## 12. Suggested Future Hardening
- Implement Redis-based rate limiting if deployed on a multi-instance scaling setup.
- Enforce the Content-Security-Policy (drop Report-Only).
- Add CodeQL advanced vulnerability scanning in GitHub Actions once standard CI is stable.

## 13. Example Manual Validation Commands
Verify headers on the frontend domain:
```bash
curl -I https://echo-wing.vercel.app
```

Check CORS policy from evil domain vs allowed domain:
```bash
curl -i -X OPTIONS https://<backend-domain>/api/health \
  -H "Origin: https://echo-wing.vercel.app" \
  -H "Access-Control-Request-Method: GET"

curl -i -X OPTIONS https://<backend-domain>/api/health \
  -H "Origin: https://evil.example" \
  -H "Access-Control-Request-Method: GET"
```

Check Upload Limits:
```bash
dd if=/dev/zero of=/tmp/oversize.wav bs=1M count=30
curl -i -X POST https://<backend-domain>/api/stream-predict -F "file=@/tmp/oversize.wav"
```
