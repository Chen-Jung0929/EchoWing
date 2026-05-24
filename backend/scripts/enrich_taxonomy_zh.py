"""
以 scientific_name 查詢中文維基，寫入 taxonomy.csv 的 common_name_zh、zh_wiki_url。

使用 PyPI 套件 `wikipedia`（import wikipedia）。

用法（在 backend/ 目錄）：
    python scripts/enrich_taxonomy_zh.py
    python scripts/enrich_taxonomy_zh.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path

import wikipedia
from wikipedia.exceptions import DisambiguationError, PageError

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CSV = BACKEND_ROOT / "models" / "taxonomy.csv"
SLEEP_SEC = 0.15

wikipedia.set_user_agent(
    "BirdCLEF-TaxonomyBot/1.0 (https://github.com/; academic taxonomy enrichment)"
)


def _safe_page(title: str, lang: str, *, auto_suggest: bool = False):
    """載入維基頁面；失敗回傳 None。"""
    wikipedia.set_lang(lang)
    try:
        return wikipedia.page(title, auto_suggest=auto_suggest, redirect=True)
    except DisambiguationError as exc:
        if not exc.options:
            return None
        try:
            return wikipedia.page(exc.options[0], auto_suggest=False, redirect=True)
        except (PageError, DisambiguationError):
            return None
    except PageError:
        return None


def _first_zh_from_search(queries: list[str], *, max_results: int = 5) -> tuple[str, str]:
    """在中文維基以關鍵字搜尋，回傳第一個有效頁面的 (標題, URL)。"""
    wikipedia.set_lang("zh")
    seen: set[str] = set()
    for query in queries:
        q = query.strip()
        if not q:
            continue
        try:
            titles = wikipedia.search(q, results=max_results)
        except Exception:
            continue
        for title in titles:
            if title in seen:
                continue
            seen.add(title)
            page = _safe_page(title, "zh", auto_suggest=False)
            if page is not None:
                return page.title, page.url
    return "", ""


def _lookup_zh(scientific_name: str, en_common_name: str = "") -> tuple[str, str]:
    """回傳 (common_name_zh, zh_wiki_url)；找不到則空字串。"""
    sci = scientific_name.strip()
    en_common = en_common_name.strip()
    if not sci and not en_common:
        return "", ""

    queries: list[str] = []
    if sci:
        queries.append(sci)
    if en_common:
        queries.append(en_common)

    # 1) 英文學名直連，再以英文條目標題嘗試中文同名條目
    if sci:
        page_en = _safe_page(sci, "en", auto_suggest=True)
        if page_en is not None:
            page_zh = _safe_page(page_en.title, "zh", auto_suggest=True)
            if page_zh is not None:
                return page_zh.title, page_zh.url
            queries.insert(0, page_en.title)

    # 2) 中文維基搜尋（學名、英文俗名、英文條目標題）
    return _first_zh_from_search(queries)


def enrich_csv(csv_path: Path, *, dry_run: bool = False) -> None:
    with open(csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise ValueError("taxonomy.csv has no header")
        fieldnames = list(reader.fieldnames)
        rows = list(reader)

    for col in ("common_name_zh", "zh_wiki_url"):
        if col not in fieldnames:
            fieldnames.append(col)

    total = len(rows)
    found = 0
    for i, row in enumerate(rows, start=1):
        sci = row.get("scientific_name", "")
        en_common = row.get("common_name", "")
        zh_name, zh_url = _lookup_zh(sci, en_common)
        row["common_name_zh"] = zh_name
        row["zh_wiki_url"] = zh_url
        if zh_name:
            found += 1
        print(f"[{i}/{total}] {sci} -> {zh_name or '(未找到)'}")
        time.sleep(SLEEP_SEC)

    print(f"\n完成：{found}/{total} 筆找到中文維基頁面")

    if dry_run:
        print("(dry-run，未寫入檔案)")
        return

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Enrich taxonomy.csv with zh Wikipedia data (wikipedia package)"
    )
    parser.add_argument(
        "--csv",
        type=Path,
        default=DEFAULT_CSV,
        help="Path to taxonomy.csv",
    )
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if not args.csv.is_file():
        print(f"找不到 {args.csv}", file=sys.stderr)
        return 1

    enrich_csv(args.csv, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
