#!/usr/bin/env python3
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen


KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
RADWARE_BASE_URL = "https://livethreatmap.radware.com/api/top/attacked?interval="
ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "threat-pulse-data.json"
RADWARE_OUTPUT_PATH = ROOT / "radware-threat-map.json"
ENTRY_LIMIT = 20
FETCH_ATTEMPTS = 3
REQUEST_HEADERS = {
    "Accept": "application/json",
    "User-Agent": "CyberShark-Threat-Pulse/1.0 (+https://georgisharkov.github.io/)",
}


def fetch_json(url, source_name):
    last_error = None

    for attempt in range(1, FETCH_ATTEMPTS + 1):
        try:
            request = Request(url, headers=REQUEST_HEADERS)
            with urlopen(request, timeout=30) as response:
                body = response.read()

            if not body.strip():
                raise ValueError(f"{source_name} returned an empty response")

            return json.loads(body)
        except (OSError, ValueError, json.JSONDecodeError) as error:
            last_error = error
            if attempt < FETCH_ATTEMPTS:
                time.sleep(attempt * 2)

    raise RuntimeError(
        f"Unable to load {source_name} after {FETCH_ATTEMPTS} attempts: {last_error}"
    ) from last_error


def fetch_kev():
    payload = fetch_json(KEV_URL, "CISA KEV")
    if not isinstance(payload, dict) or not isinstance(payload.get("vulnerabilities"), list):
        raise ValueError("CISA KEV returned an unexpected payload")
    return payload


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
    payload = fetch_json(f"{RADWARE_BASE_URL}{interval}", f"Radware {interval} feed")
    if not isinstance(payload, list) or not payload:
        raise ValueError(f"Radware {interval} feed returned no regional entries")
    return payload


def load_previous_radware_snapshot():
    try:
        payload = json.loads(RADWARE_OUTPUT_PATH.read_text(encoding="utf-8"))
        intervals = payload.get("intervals", {})
        if isinstance(intervals.get("hour"), list) and isinstance(intervals.get("day"), list):
            return payload
    except (OSError, ValueError, json.JSONDecodeError):
        pass
    return None


def build_radware_snapshot(previous_snapshot=None):
    try:
        intervals = {
            "hour": fetch_radware("hour"),
            "day": fetch_radware("day"),
        }
    except (OSError, ValueError, RuntimeError) as error:
        print(f"::warning title=Radware snapshot retained::{error}")
        return previous_snapshot

    return {
        "title": "Radware Live Threat Map Top Attacked Regions",
        "source": "https://livethreatmap.radware.com/",
        "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "intervals": intervals,
    }


def main():
    kev = fetch_kev()
    snapshot = build_snapshot(kev)
    radware_snapshot = build_radware_snapshot(load_previous_radware_snapshot())
    OUTPUT_PATH.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    if radware_snapshot is not None:
        RADWARE_OUTPUT_PATH.write_text(
            json.dumps(radware_snapshot, indent=2) + "\n", encoding="utf-8"
        )
    else:
        print("::warning title=Radware snapshot unavailable::No previous snapshot was available to retain")


if __name__ == "__main__":
    main()
