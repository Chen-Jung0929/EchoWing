import pandas as pd

df = pd.read_csv("models/species_info_completed_comma.csv")
MAX_COUNT = 15
i = 0
while i < len(df):
    if df.iloc[i]["curation_status"] == "needs_manual_review":
        print(df.iloc[i]["scientific_name"], "(", df.iloc[i]["common_name_en"], ")")
        MAX_COUNT -= 1
        if MAX_COUNT <= 0:
            break
    i += 1

print(i)
