#!/usr/bin/env python3
"""Poll /api/warmup until models are ready (for HF Spaces demo preheat)."""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def fetch(url: str, method: str = "GET") -> dict:
    req = urllib.request.Request(url, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def main() -> int:
    parser = argparse.ArgumentParser(description="Preheat EchoWing API on Hugging Face Spaces")
    parser.add_argument(
        "--url",
        required=True,
        help="Space base URL, e.g. https://user-echowing-api.hf.space",
    )
    parser.add_argument("--interval", type=float, default=5.0, help="Poll interval seconds")
    parser.add_argument("--timeout", type=float, default=600.0, help="Max wait seconds")
    parser.add_argument("--trigger", action="store_true", help="POST /api/warmup once at start")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    warmup_url = f"{base}/api/warmup"
    ready_url = f"{base}/api/ready"

    if args.trigger:
        try:
            fetch(warmup_url, method="POST")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode() if exc.fp else ""
            print(f"warmup trigger: HTTP {exc.code} {body}", file=sys.stderr)

    deadline = time.monotonic() + args.timeout
    while time.monotonic() < deadline:
        try:
            payload = fetch(warmup_url)
        except urllib.error.HTTPError as exc:
            print(f"HTTP {exc.code}; retrying...", file=sys.stderr)
            time.sleep(args.interval)
            continue
        except urllib.error.URLError as exc:
            print(f"Connection failed: {exc}; retrying...", file=sys.stderr)
            time.sleep(args.interval)
            continue

        status = payload.get("status", "?")
        ready = payload.get("ready", False)
        print(json.dumps(payload, ensure_ascii=False))

        if ready:
            try:
                fetch(ready_url)
                print("OK: /api/ready returned 200")
            except urllib.error.HTTPError as exc:
                print(f"WARN: ready=false on /api/ready: HTTP {exc.code}", file=sys.stderr)
            return 0

        if status == "error":
            print(f"FAIL: {payload.get('error', 'unknown error')}", file=sys.stderr)
            return 1

        time.sleep(args.interval)

    print("TIMEOUT: models did not become ready in time", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
