"""Build a compact, same-origin city index from GeoNames (CC BY 4.0)."""
import io
import json
import urllib.request
import zipfile
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://download.geonames.org/export/dump/"
FILES = ["cities15000.zip", "admin1CodesASCII.txt", "countryInfo.txt"]


def download(name):
    request = urllib.request.Request(BASE + name, headers={"User-Agent": "IshtarInsights-city-index/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main():
    with ThreadPoolExecutor(max_workers=3) as pool:
        cities_zip, admin_data, country_data = list(pool.map(download, FILES))
    admins = {row[0]: row[1] for line in admin_data.decode("utf-8").splitlines() if (row := line.split("\t")) and len(row) >= 2}
    countries = {row[0]: row[4] for line in country_data.decode("utf-8").splitlines() if not line.startswith("#") and len(row := line.split("\t")) >= 5}
    with zipfile.ZipFile(io.BytesIO(cities_zip)) as archive:
        lines = archive.read("cities15000.txt").decode("utf-8").splitlines()
    rows = []
    for line in lines:
        fields = line.split("\t")
        if len(fields) != 19:
            raise ValueError("Unexpected GeoNames row schema")
        aliases = list(dict.fromkeys([fields[2], *fields[3].split(",")]))
        aliases = [name for name in aliases if name and name != fields[1] and len(name) <= 80]
        rows.append([int(fields[0]), fields[1], admins.get(f"{fields[8]}.{fields[10]}", ""), countries.get(fields[8], fields[8]), fields[8], fields[10], float(fields[4]), float(fields[5]), fields[17], int(fields[14]), aliases])
    rows.sort(key=lambda row: (-row[9], row[0]))
    output = Path(__file__).resolve().parents[1] / "assets" / "cities"
    output.mkdir(parents=True, exist_ok=True)
    data = {"source": "GeoNames", "license": "https://creativecommons.org/licenses/by/4.0/", "builtAt": datetime.now(timezone.utc).isoformat(), "columns": ["id", "name", "region", "country", "countryCode", "adminCode", "latitude", "longitude", "timeZone", "population", "aliases"], "cities": rows}
    destination = output / "cities.json"
    destination.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Built {len(rows):,} cities; {destination.stat().st_size / 1048576:.2f} MiB")


if __name__ == "__main__":
    main()
