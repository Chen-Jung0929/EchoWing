import csv
import io
from pathlib import Path

_NO_ZH_MARKERS = ("暫無中文俗名", "暫無標準中文名")
_CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp950", "gb18030", "latin-1")


def _decode_csv_text(path: Path) -> str:
    raw = path.read_bytes()
    last_error: UnicodeDecodeError | None = None
    for encoding in _CSV_ENCODINGS:
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError as exc:
            last_error = exc
    raise UnicodeDecodeError(
        last_error.encoding if last_error else "utf-8",
        last_error.object if last_error else b"",
        last_error.start if last_error else 0,
        last_error.end if last_error else 1,
        f"cannot decode {path} with {_CSV_ENCODINGS}",
    )


def _normalize_zh_common(zh: str) -> str:
    value = zh.strip()
    if not value or any(marker in value for marker in _NO_ZH_MARKERS):
        return ""
    return value


def _row_field(row: dict[str, str], *keys: str) -> str:
    for key in keys:
        if key in row and row[key] is not None:
            return str(row[key]).strip()
    return ""


def load_taxonomy_map(taxonomy_csv_path: Path) -> dict[str, dict[str, str]]:
    mapping_dict: dict[str, dict[str, str]] = {}
    text = _decode_csv_text(taxonomy_csv_path)
    reader = csv.DictReader(io.StringIO(text))

    for row in reader:
        primary_label = _row_field(row, "primary_label")
        if not primary_label:
            continue

        eng_common = _row_field(row, "common_name_en", "common_name")
        zh_common = _normalize_zh_common(_row_field(row, "common_name_zh"))
        zh_wiki = _row_field(
            row, "wiki_url_zh", "zh_wiki_url", "wikipedia_zh", "source_url_wikipedia_zh"
        )
        en_wiki = _row_field(
            row, "wiki_url_en", "wikipedia_en", "source_url_wikipedia_en"
        )
        sci_name = _row_field(row, "scientific_name")

        mapping_dict[primary_label] = {
            "sci_name": sci_name,
            "com_name_en": eng_common,
            "com_name_zh": zh_common,
            "zh_wiki_url": zh_wiki,
            "en_wiki_url": en_wiki,
            "class": _row_field(row, "class_name"),
        }

    return mapping_dict
