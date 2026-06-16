"""
Downloads FIFA WC 2026 schedule from Kaggle and generates
src/lib/match-schedule.ts with matchId -> utcDate mapping.
Run once: python scripts/generate-schedule.py
"""
import json
import sys

try:
    import kagglehub
    from kagglehub import KaggleDatasetAdapter
    import pandas as pd
except ImportError:
    print("ERROR: pip install 'kagglehub[pandas-datasets]'")
    sys.exit(1)

# Team name map: Kaggle English name → Spanish name used in participants.ts
TEAM_MAP = {
    "Mexico": "México",
    "South Africa": "Sudáfrica",
    "Korea Republic": "Corea del Sur",
    "South Korea": "Corea del Sur",       # Kaggle uses this name
    "Czech Republic": "Chequia",
    "Czechia": "Chequia",
    "Canada": "Canadá",
    "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    "Qatar": "Catar",
    "Switzerland": "Suiza",
    "Brazil": "Brasil",
    "Morocco": "Marruecos",
    "Haiti": "Haití",
    "Scotland": "Escocia",
    "United States": "Estados Unidos",
    "USA": "Estados Unidos",              # Kaggle uses this name
    "Paraguay": "Paraguay",
    "Australia": "Australia",
    "Turkey": "Turquía",
    "Germany": "Alemania",
    "Curacao": "Curazao",
    "Curaçao": "Curazao",
    "Ivory Coast": "Costa de Marfil",
    "Côte d'Ivoire": "Costa de Marfil",
    "Ecuador": "Ecuador",
    "Netherlands": "Países Bajos",
    "Japan": "Japón",
    "Sweden": "Suecia",
    "Tunisia": "Túnez",
    "Belgium": "Bélgica",
    "Egypt": "Egipto",
    "Iran": "Irán",
    "IR Iran": "Irán",                    # Kaggle uses this name
    "New Zealand": "Nueva Zelanda",
    "Spain": "España",
    "Saudi Arabia": "Arabia Saudita",
    "Uruguay": "Uruguay",
    "Cape Verde": "Cabo Verde",
    "Cabo Verde": "Cabo Verde",
    "France": "Francia",
    "Senegal": "Senegal",
    "Iraq": "Irak",
    "Norway": "Noruega",
    "Argentina": "Argentina",
    "Algeria": "Argelia",
    "Austria": "Austria",
    "Jordan": "Jordania",
    "Portugal": "Portugal",
    "DR Congo": "RD Congo",
    "Congo DR": "RD Congo",
    "Democratic Republic of Congo": "RD Congo",
    "Uzbekistan": "Uzbekistán",
    "Colombia": "Colombia",
    "England": "Inglaterra",
    "Croatia": "Croacia",
    "Ghana": "Ghana",
    "Panama": "Panamá",
    # Playoff winners — resolved from WC 2026 qualification results
    # Deduced by matching group fixtures against participants.ts MATCH_IDS
    "Winner UEFA Playoff A": "Bosnia y Herzegovina",
    "Winner UEFA Playoff B": "Suecia",
    "Winner UEFA Playoff C": "Turquía",
    "Winner UEFA Playoff D": "Chequia",
    "Winner FIFA Playoff 1": "RD Congo",
    "Winner FIFA Playoff 2": "Irak",
}

# Our internal match IDs mapped by (home_es, away_es)
# Order mirrors participants.ts MATCHES array
MATCH_IDS = {
    ("México", "Sudáfrica"): "m37",
    ("Corea del Sur", "Chequia"): "m38",
    ("Chequia", "Sudáfrica"): "m39",
    ("México", "Corea del Sur"): "m40",
    ("Sudáfrica", "Corea del Sur"): "m41",
    ("Chequia", "México"): "m42",
    ("Canadá", "Bosnia y Herzegovina"): "m45",
    ("Catar", "Suiza"): "m46",
    ("Suiza", "Bosnia y Herzegovina"): "m47",
    ("Canadá", "Catar"): "m48",
    ("Suiza", "Canadá"): "m49",
    ("Bosnia y Herzegovina", "Catar"): "m50",
    ("Brasil", "Marruecos"): "m53",
    ("Haití", "Escocia"): "m54",
    ("Escocia", "Marruecos"): "m55",
    ("Brasil", "Haití"): "m56",
    ("Marruecos", "Haití"): "m57",
    ("Escocia", "Brasil"): "m58",
    ("Estados Unidos", "Paraguay"): "m61",
    ("Australia", "Turquía"): "m62",
    ("Estados Unidos", "Australia"): "m63",
    ("Turquía", "Paraguay"): "m64",
    ("Turquía", "Estados Unidos"): "m65",
    ("Paraguay", "Australia"): "m66",
    ("Alemania", "Curazao"): "m69",
    ("Costa de Marfil", "Ecuador"): "m70",
    ("Alemania", "Costa de Marfil"): "m71",
    ("Ecuador", "Curazao"): "m72",
    ("Curazao", "Costa de Marfil"): "m73",
    ("Ecuador", "Alemania"): "m74",
    ("Países Bajos", "Japón"): "m77",
    ("Suecia", "Túnez"): "m78",
    ("Países Bajos", "Suecia"): "m79",
    ("Túnez", "Japón"): "m80",
    ("Túnez", "Países Bajos"): "m81",
    ("Japón", "Suecia"): "m82",
    ("Bélgica", "Egipto"): "m85",
    ("Irán", "Nueva Zelanda"): "m86",
    ("Bélgica", "Irán"): "m87",
    ("Nueva Zelanda", "Egipto"): "m88",
    ("Nueva Zelanda", "Bélgica"): "m89",
    ("Egipto", "Irán"): "m90",
    ("España", "Cabo Verde"): "m93",
    ("Arabia Saudita", "Uruguay"): "m94",
    ("España", "Arabia Saudita"): "m95",
    ("Uruguay", "Cabo Verde"): "m96",
    ("Cabo Verde", "Arabia Saudita"): "m97",
    ("Uruguay", "España"): "m98",
    ("Francia", "Senegal"): "m101",
    ("Irak", "Noruega"): "m102",
    ("Francia", "Irak"): "m103",
    ("Noruega", "Senegal"): "m104",
    ("Noruega", "Francia"): "m105",
    ("Senegal", "Irak"): "m106",
    ("Argentina", "Argelia"): "m109",
    ("Austria", "Jordania"): "m110",
    ("Argentina", "Austria"): "m111",
    ("Jordania", "Argelia"): "m112",
    ("Argelia", "Austria"): "m113",
    ("Jordania", "Argentina"): "m114",
    ("Portugal", "RD Congo"): "m117",
    ("Uzbekistán", "Colombia"): "m118",
    ("Portugal", "Uzbekistán"): "m119",
    ("Colombia", "RD Congo"): "m120",
    ("Colombia", "Portugal"): "m121",
    ("RD Congo", "Uzbekistán"): "m122",
    ("Inglaterra", "Croacia"): "m125",
    ("Ghana", "Panamá"): "m126",
    ("Inglaterra", "Ghana"): "m127",
    ("Panamá", "Croacia"): "m128",
    ("Panamá", "Inglaterra"): "m129",
    ("Croacia", "Ghana"): "m130",
}

def translate(name):
    return TEAM_MAP.get(name, name)

print("Downloading FIFA WC 2026 dataset from Kaggle...")
try:
    matches_df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        "areezvisram12/fifa-world-cup-2026-match-data-unofficial",
        "matches.csv",
    )
    teams_df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        "areezvisram12/fifa-world-cup-2026-match-data-unofficial",
        "teams.csv",
    )
except Exception as e:
    print(f"ERROR downloading from Kaggle: {e}")
    print("Make sure you have a Kaggle API key configured (~/.kaggle/kaggle.json)")
    sys.exit(1)

print(f"Downloaded {len(matches_df)} matches, {len(teams_df)} teams")
print("Columns in matches:", list(matches_df.columns))
print("Columns in teams:", list(teams_df.columns))
print(matches_df.head(3).to_string())
print(teams_df.head(3).to_string())

# Build team_id -> team_name map
# Try common column names
name_col = next((c for c in ["team_name", "name", "team"] if c in teams_df.columns), None)
id_col = next((c for c in ["team_id", "id"] if c in teams_df.columns), None)

if not name_col or not id_col:
    print("ERROR: Could not find team name/id columns. Available:", list(teams_df.columns))
    sys.exit(1)

team_map = dict(zip(teams_df[id_col], teams_df[name_col]))
print(f"\nTeam map sample: {dict(list(team_map.items())[:5])}")

# Detect kickoff column
kickoff_col = next((c for c in ["kickoff_at", "kickoff", "date_time", "match_date", "datetime"] if c in matches_df.columns), None)
home_col = next((c for c in ["home_team_id", "home_id", "home_team"] if c in matches_df.columns), None)
away_col = next((c for c in ["away_team_id", "away_id", "away_team"] if c in matches_df.columns), None)

if not kickoff_col:
    print("ERROR: Could not find kickoff column. Available:", list(matches_df.columns))
    sys.exit(1)

print(f"\nUsing: kickoff={kickoff_col}, home={home_col}, away={away_col}")

# Build schedule: matchId -> utcDate
schedule = {}
unmatched = []

for _, row in matches_df.iterrows():
    home_en = team_map.get(row[home_col], str(row[home_col])) if home_col else str(row.get("home_team", ""))
    away_en = team_map.get(row[away_col], str(row[away_col])) if away_col else str(row.get("away_team", ""))
    home_es = translate(home_en)
    away_es = translate(away_en)
    kickoff = str(row[kickoff_col])

    match_id = MATCH_IDS.get((home_es, away_es))
    if match_id:
        # Normalize to UTC ISO string
        try:
            import re
            # kickoff_at is like "2026-06-11 15:00:00-06" — convert to ISO 8601
            # Replace space with T
            kickoff = kickoff.replace(" ", "T")
            # Add :00 to bare -06 offset if needed → -06:00
            kickoff = re.sub(r'([+-]\d{2})$', r'\1:00', kickoff)
            schedule[match_id] = kickoff
        except Exception:
            schedule[match_id] = kickoff
    else:
        unmatched.append(f"  ({home_es} vs {away_es}) — {kickoff}")

print(f"\nMatched: {len(schedule)} / {len(MATCH_IDS)} expected")
if unmatched:
    print(f"Unmatched ({len(unmatched)}):")
    for u in unmatched[:20]:
        print(u)

# Generate TypeScript file
ts_lines = [
    "// AUTO-GENERATED by scripts/generate-schedule.py — DO NOT EDIT MANUALLY",
    "// Source: Kaggle areezvisram12/fifa-world-cup-2026-match-data-unofficial",
    "// Maps our internal match IDs to UTC kickoff times.",
    "",
    "export const MATCH_SCHEDULE: Record<string, string> = {",
]
for match_id, kickoff in sorted(schedule.items(), key=lambda x: x[1]):
    ts_lines.append(f'  "{match_id}": "{kickoff}",')
ts_lines += ["};", ""]

out_path = "src/lib/match-schedule.ts"
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(ts_lines))

print(f"\nGenerated {out_path} with {len(schedule)} entries")
print("Done. Run `git add src/lib/match-schedule.ts` to commit.")
