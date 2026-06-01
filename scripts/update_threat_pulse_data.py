#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen


KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "threat-pulse-data.json"
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


def main():
    kev = fetch_kev()
    snapshot = build_snapshot(kev)
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
