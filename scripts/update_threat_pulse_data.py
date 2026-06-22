#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
RADWARE_BASE_URL = "https://livethreatmap.radware.com/api/top/attacked?interval="
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "threat-pulse-data.json"
RADWARE_OUTPUT_PATH = ROOT / "radware-threat-map.json"
ENTRY_LIMIT = 20


def fetch_kev():
    with urlopen(KEV_URL, timeout=30) as response:
        return json.load(response)


def build_snapshot(kev):
    vulnerabilities = sorted(
        kev.get("vulnerabilities", []),
        key=lambda item: item.get("dateAdded", ""),
        reverse=True,
    )[:ENTRY_LIMIT]

    return {
        "title": kev.get("title"),
        "catalogVersion": kev.get("catalogVersion"),
        "dateReleased": kev.get("dateReleased"),
        "count": kev.get("count", len(kev.get("vulnerabilities", []))),
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "vulnerabilities": [
            {
                "cveID": item.get("cveID"),
                "vendorProject": item.get("vendorProject"),
                "product": item.get("product"),
                "vulnerabilityName": item.get("vulnerabilityName"),
                "dateAdded": item.get("dateAdded"),
                "shortDescription": item.get("shortDescription"),
                "requiredAction": item.get("requiredAction"),
                "dueDate": item.get("dueDate"),
                "knownRansomwareCampaignUse": item.get("knownRansomwareCampaignUse"),
                "notes": item.get("notes"),
                "cwes": item.get("cwes", []),
            }
            for item in vulnerabilities
        ],
    }


def fetch_radware(interval):
    with urlopen(f"{RADWARE_BASE_URL}{interval}", timeout=30) as response:
        return json.load(response)


def build_radware_snapshot():
    return {
        "title": "Radware Live Threat Map Top Attacked Regions",
        "source": "https://livethreatmap.radware.com/",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "intervals": {
            "hour": fetch_radware("hour"),
            "day": fetch_radware("day"),
        },
    }


def main():
    kev = fetch_kev()
    snapshot = build_snapshot(kev)
    radware_snapshot = build_radware_snapshot()
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    RADWARE_OUTPUT_PATH.write_text(json.dumps(radware_snapshot, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
