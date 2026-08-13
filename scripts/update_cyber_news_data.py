#!/usr/bin/env python3
import html
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / "cyber-news-data.json"
USER_AGENT = "CyberSharkNews/1.0 (+https://georgisharkov.github.io/)"
PER_SOURCE_LIMIT = 4
TOTAL_LIMIT = 20

SOURCES = (
    {
        "name": "The Hacker News",
        "feed": "https://feeds.feedburner.com/TheHackersNews",
        "home": "https://thehackernews.com/",
        "kind": "News",
    },
    {
        "name": "SecurityWeek",
        "feed": "https://www.securityweek.com/feed/",
        "home": "https://www.securityweek.com/",
        "kind": "News",
    },
    {
        "name": "Cybersecurity News",
        "feed": "https://cybersecuritynews.com/feed/",
        "home": "https://cybersecuritynews.com/",
        "kind": "News",
    },
    {
        "name": "Krebs on Security",
        "feed": "https://krebsonsecurity.com/feed/",
        "home": "https://krebsonsecurity.com/",
        "kind": "Investigation",
    },
    {
        "name": "SANS ISC",
        "feed": "https://isc.sans.edu/rssfeed.xml",
        "home": "https://isc.sans.edu/",
        "kind": "DFIR",
    },
)

TAG_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
IMAGE_RE = re.compile(r"<img[^>]+src=[\"']([^\"']+)", re.IGNORECASE)
META_RE = re.compile(
    r"<meta\s+[^>]*(?:property|name)=[\"']([^\"']+)[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>",
    re.IGNORECASE,
)
META_RE_REVERSED = re.compile(
    r"<meta\s+[^>]*content=[\"']([^\"']*)[\"'][^>]*(?:property|name)=[\"']([^\"']+)[\"'][^>]*>",
    re.IGNORECASE,
)


def fetch_text(url, timeout=30):
    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8",
        },
    )
    with urlopen(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def local_name(tag):
    return tag.rsplit("}", 1)[-1].lower()


def child_text(node, names):
    for child in node.iter():
        if local_name(child.tag) in names and child.text:
            return child.text.strip()
    return ""


def clean_text(value, limit=260):
    value = html.unescape(TAG_RE.sub(" ", value or ""))
    value = SPACE_RE.sub(" ", value).strip()
    if len(value) <= limit:
        return value
    return value[: limit - 1].rsplit(" ", 1)[0] + "…"


def parse_date(value):
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def item_link(node):
    for child in node:
        if local_name(child.tag) != "link":
            continue
        href = child.attrib.get("href")
        rel = child.attrib.get("rel", "alternate")
        if href and rel in ("alternate", ""):
            return href.strip()
        if child.text:
            return child.text.strip()
    return child_text(node, {"guid"})


def feed_image(node, description, base_url):
    for child in node.iter():
        name = local_name(child.tag)
        if name in {"content", "thumbnail"}:
            candidate = child.attrib.get("url", "")
            media_type = child.attrib.get("type", "")
            if candidate and (name == "thumbnail" or media_type.startswith("image")):
                return urljoin(base_url, candidate)
        if name == "enclosure" and child.attrib.get("type", "").startswith("image"):
            return urljoin(base_url, child.attrib.get("url", ""))
    match = IMAGE_RE.search(description or "")
    return urljoin(base_url, match.group(1)) if match else ""


def article_metadata(url):
    try:
        document = fetch_text(url, timeout=15)[:500_000]
    except Exception:
        return {}

    metadata = {}
    for key, value in META_RE.findall(document):
        metadata[key.lower()] = html.unescape(value.strip())
    for value, key in META_RE_REVERSED.findall(document):
        metadata[key.lower()] = html.unescape(value.strip())

    image = metadata.get("og:image:secure_url") or metadata.get("og:image") or metadata.get("twitter:image")
    description = metadata.get("og:description") or metadata.get("description") or metadata.get("twitter:description")
    return {
        "image": secure_url(urljoin(url, image)) if image else "",
        "description": clean_text(description),
    }


def secure_url(value):
    parsed = urlparse(value)
    if parsed.scheme == "http":
        return parsed._replace(scheme="https").geturl()
    return value


def infer_topic(title, description, default):
    text = f"{title} {description}".lower()
    rules = (
        ("Ransomware", ("ransomware", "extortion")),
        ("Vulnerability", ("cve-", "zero-day", "zero day", "vulnerability", "exploit", "patch")),
        ("Malware", ("malware", "trojan", "stealer", "botnet", "backdoor", "rootkit")),
        ("Identity", ("phishing", "credential", "oauth", "identity", "account", "mfa")),
        ("Data breach", ("breach", "leak", "stolen data", "data theft")),
        ("Threat intelligence", ("apt", "espionage", "threat actor", "campaign")),
    )
    for topic, terms in rules:
        if any(term in text for term in terms):
            return topic
    return default


def parse_source(source):
    document = fetch_text(source["feed"])
    root = ET.fromstring(document)
    nodes = [node for node in root.iter() if local_name(node.tag) in {"item", "entry"}]
    stories = []

    for node in nodes[: PER_SOURCE_LIMIT + 2]:
        title = clean_text(child_text(node, {"title"}), limit=180)
        link = item_link(node)
        if not title or not link:
            continue

        raw_description = child_text(node, {"description", "summary", "encoded", "content"})
        description = clean_text(raw_description)
        published = parse_date(child_text(node, {"pubdate", "published", "updated", "date"}))
        image = feed_image(node, raw_description, link)
        metadata = article_metadata(link)
        image = secure_url(metadata.get("image") or image)
        description = metadata.get("description") or description or "Open the original report for full details and source context."

        stories.append(
            {
                "title": title,
                "url": link,
                "source": source["name"],
                "sourceUrl": source["home"],
                "publishedAt": published.isoformat(),
                "description": description,
                "image": image,
                "topic": infer_topic(title, description, source["kind"]),
                "kind": source["kind"],
            }
        )
        if len(stories) >= PER_SOURCE_LIMIT:
            break
        time.sleep(0.15)

    return stories


def main():
    previous_payload = None
    if OUTPUT_PATH.exists():
        try:
            previous_payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            previous_payload = None

    stories = []
    source_status = []

    for source in SOURCES:
        try:
            source_stories = parse_source(source)
            stories.extend(source_stories)
            source_status.append({"name": source["name"], "status": "ok", "stories": len(source_stories)})
        except Exception as error:
            source_status.append({"name": source["name"], "status": "error", "stories": 0, "message": str(error)[:180]})

    stories.sort(key=lambda item: item["publishedAt"], reverse=True)
    if not stories:
        previous_stories = (previous_payload or {}).get("stories", [])
        if previous_stories:
            print("No feeds responded; retaining the previous valid news snapshot.")
            return
        raise RuntimeError("No publisher feeds returned stories and no previous snapshot is available.")

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": min(len(stories), TOTAL_LIMIT),
        "stories": stories[:TOTAL_LIMIT],
        "sources": source_status,
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
