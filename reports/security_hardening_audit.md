# Security Hardening Audit

## 1. Current frontend deployment assumptions
The frontend is a React + Vite application. It assumes a static hosting environment, specifically Vercel, as indicated by the existing `frontend/vercel.json` and client-side routing rewrites.

## 2. Current backend deployment assumptions
The backend is a FastAPI application. It is assumed to be deployed on Hugging Face Spaces or Render, as suggested by `HUGGINGFACE_DEPLOYMENT_GUIDE.md` and `render.yaml`. It uses `uvicorn` and handles concurrent prediction via a semaphore.

## 3. Current API base URL strategy
The frontend uses `import.meta.env.VITE_API_BASE ?? '/api'`, allowing the backend to be hosted on the same origin (proxied) or a different domain (like a Hugging Face Space).

## 4. Current CORS policy
The backend uses FastAPI's `CORSMiddleware` with a dangerously permissive policy: `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`.

## 5. Current upload size limits
The backend currently has a `max_body_mb: int = 50` configured in `config.py`.

## 6. Whether backend enforces upload limits or only frontend does
The backend partially enforces the limit in `/api/predict` by checking the `Content-Length` header. It does not enforce it dynamically while reading the stream, and the check is missing entirely from `/api/stream-predict`.

## 7. Whether streaming/chunked requests without Content-Length are possible
Yes, chunked transfer encoding or requests omitting the `Content-Length` header can bypass the current `Content-Length` check. A robust middleware or stream reader limit is needed.

## 8. Whether any security headers already exist
Yes, `frontend/vercel.json` already defines `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. However, it lacks `Strict-Transport-Security`, `Permissions-Policy`, and a `Content-Security-Policy`.

## 9. Whether Dependabot or security workflows already exist
Neither Dependabot configuration nor GitHub Actions security workflows currently exist in the repository.

## 10. Documented Risks not fixed in this task
- **Malware Scanning:** Uploaded audio files are not scanned for malware.
- **Distributed DDoS:** In-memory rate limiting does not protect against distributed denial-of-service (DDoS) attacks.
- **Authentication:** The API remains unauthenticated, allowing anonymous usage subject to rate limits.
- **WAF:** No Web Application Firewall is currently configured.
