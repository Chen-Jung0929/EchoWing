import csv
from pathlib import Path


def load_taxonomy_map(taxonomy_csv_path: Path) -> dict[str, dict[str, str]]:

    mapping_dict = {}

    with open(taxonomy_csv_path, "r", newline="", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile)
        rows = list(reader)

        for row in rows:
            mapping_dict[row["primary_label"]] = {
                "sci_name": row["scientific_name"],
                "com_name": row["common_name"],
                "class": row["class_name"],
            }

    return mapping_dict
