"""
將 SILIC soundclass.csv 轉成後端可讀的 silic_taxonomy.csv。

輸入欄位（soundclass.csv）：
  sounclass_id, species_name, sound_class, scientific_name, freq_low, freq_high

輸出欄位（silic_taxonomy.csv）：
  primary_label, yolo_class_index, soundclass_id, species_name, sound_class,
  scientific_name, freq_low, freq_high, common_name_zh, common_name_en

primary_label 使用 soundclass_id 字串（對應 SilicPredictor.labels 與 API species_id）。
列順序與輸入相同，yolo_class_index 為 0..N-1（須與 YOLO 權重類別順序一致）。

用法（在 backend/ 目錄）：
    python scripts/taxo_gen.py
    python scripts/taxo_gen.py --input models/silic/soundclass.csv --output models/silic/silic_taxonomy.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import pandas as pd

BACKEND_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = BACKEND_ROOT / "models" / "silic" / "soundclass.csv"
DEFAULT_OUTPUT = BACKEND_ROOT / "models" / "silic" / "silic_taxonomy.csv"

_ID_COLUMNS = ("sounclass_id", "soundclass_id", "sound_class_id")


def _resolve_id_column(df: pd.DataFrame) -> str:
    for name in _ID_COLUMNS:
        if name in df.columns:
            return name
    raise ValueError(f"找不到類別 ID 欄位，需要其一: {_ID_COLUMNS}")


def build_silic_taxonomy(df: pd.DataFrame) -> pd.DataFrame:
    id_col = _resolve_id_column(df)
    ids = df[id_col].astype(int)

    out = pd.DataFrame(
        {
            "primary_label": ids.astype(str),
            "yolo_class_index": range(len(df)),
            "soundclass_id": ids,
            "species_name": df["species_name"].astype(str).str.strip(),
            "sound_class": df["sound_class"].astype(str).str.strip(),
            "scientific_name": df["scientific_name"].astype(str).str.strip(),
            "freq_low": pd.to_numeric(df["freq_low"], errors="coerce"),
            "freq_high": pd.to_numeric(df["freq_high"], errors="coerce"),
            "common_name_zh": df["species_name"].astype(str).str.strip(),
            "common_name_en": "",
        }
    )
    return out


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
            sys.stderr.reconfigure(encoding="utf-8")
        except Exception:
            pass

    parser = argparse.ArgumentParser(description="Convert soundclass.csv → silic_taxonomy.csv")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="來源 CSV")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="輸出 CSV")
    args = parser.parse_args()

    if not args.input.is_file():
        print(f"找不到輸入檔: {args.input}", file=sys.stderr)
        return 1

    df = pd.read_csv(args.input)
    if df.empty:
        print("輸入 CSV 為空", file=sys.stderr)
        return 1

    out = build_silic_taxonomy(df)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.output, index=False, encoding="utf-8-sig")

    dup_ids = out["primary_label"].duplicated().sum()
    print(f"已寫入 {args.output}")
    print(f"  列數: {len(out)}")
    print(f"  primary_label 重複: {dup_ids}")
    if dup_ids:
        print("  警告: primary_label 應唯一，請檢查 soundclass.csv", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
