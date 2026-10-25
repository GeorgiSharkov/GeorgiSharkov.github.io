"""Validate cloud research and render it as a static SOC article. No generated code runs."""

import json
import os
import re
from datetime import datetime, timedelta, date
from html import escape
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

from build_threat_articles import render

ROOT = Path(__file__).resolve().parents[1]


def validate(brief, today):
    def text(value, limit=18000):
        if not isinstance(value, str) or not value.strip() or len(value) > limit:
            raise ValueError("Missing, invalid or excessive article text")

    for key, limit in (("title", 180), ("summary", 500), ("category", 100)):
        text(brief[key], limit)
    for key, minimum, maximum in (("tags", 3, 5), ("attack_chain", 3, 7), ("sections", 7, 16), ("sources", 2, 15)):
        if not isinstance(brief[key], list) or not minimum <= len(brief[key]) <= maximum:
            raise ValueError(f"Invalid article field: {key}")
    for tag in brief["tags"] + brief["attack_chain"]:
        text(tag, 150)
    urls = set()
    recent = False
    for source in brief["sources"]:
        text(source["title"], 400)
        text(source["url"], 2000)
        parsed = urlsplit(source["url"])
        if parsed.scheme != "https" or not parsed.hostname or "." not in parsed.hostname or parsed.username:
            raise ValueError("Sources must be public HTTPS pages")
        urls.add(source["url"])
        if source["reported"] != "Unknown":
            reported = date.fromisoformat(source["reported"])
            if reported > today:
                raise ValueError("A source report date is in the future")
            recent |= reported >= today - timedelta(days=7)
    if len(urls) < 2 or not recent:
        raise ValueError("Need two distinct sources and a report within the research window")
    prose = []
    for section in brief["sections"]:
        text(section["heading"], 250)
        for key in ("paragraphs", "bullets", "code_examples"):
            if not isinstance(section[key], list) or len(section[key]) > 30:
                raise ValueError("Invalid section content")
        for value in section["paragraphs"] + section["bullets"]:
            text(value)
            prose.append(value)
        for example in section["code_examples"]:
            for key in ("platform", "assumptions", "code"):
                text(example[key])
    combined = " ".join(prose)
    if len(combined.split()) < 900:
        raise ValueError("Research is too short for a technical SOC walkthrough")
    citations = [int(number) for number in re.findall(r"\[(\d+)\]", combined)]
    if len(set(citations)) < 2 or any(number < 1 or number > len(brief["sources"]) for number in citations):
        raise ValueError("Need valid inline references to at least two sources")


def publish(raw, today=None):
    today = today or datetime.now(ZoneInfo("Europe/London")).date()
    if len(raw) > 60000:
        raise ValueError("Article output exceeds the allowed size")
    brief = json.loads(raw)
    validate(brief, today)
    year, week, _ = today.isocalendar()
    research_week = f"{year}-W{week:02d}"
    catalogue_path = ROOT / "threat-articles.json"
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    if any(item.get("researchWeek") == research_week for item in catalogue):
        print("This week's brief is already present; nothing to publish")
        return

    slug = re.sub(r"[^a-z0-9]+", "-", brief["title"].lower()).strip("-")[:70]
    filename = f"weekly-threat-{today.isoformat()}-{slug}.html"
    article_path = ROOT / filename
    if article_path.exists():
        raise ValueError("Refusing to overwrite an existing article")

    def cited(value):
        return re.sub(r"\[(\d+)\]", lambda match: f'<a href="#source-{match[1]}" class="weekly-source-ref">[{match[1]}]</a>', escape(value))

    sections = []
    for number, section in enumerate(brief["sections"], 1):
        paragraphs = "".join(f"<p>{cited(value)}</p>" for value in section["paragraphs"])
        bullets = "".join(f"<li>{cited(value)}</li>" for value in section["bullets"])
        examples = "".join(
            f'<div class="weekly-query"><h3>{escape(example["platform"])}</h3>'
            f'<p>{escape(example["assumptions"])}</p><pre><code>{escape(example["code"])}</code></pre></div>'
            for example in section["code_examples"]
        )
        sections.append(f'<section class="panel weekly-section" id="step-{number}"><h2>{escape(section["heading"])}</h2>{paragraphs}'
                        + (f"<ul>{bullets}</ul>" if bullets else "") + examples + "</section>")
    chain = "".join(f"<li><span>{number:02d}</span>{escape(label)}</li>" for number, label in enumerate(brief["attack_chain"], 1))
    sources = "".join(
        f'<li id="source-{number}"><a href="{escape(source["url"], quote=True)}" target="_blank" rel="noreferrer">'
        f'{escape(source["title"])}</a><small>Report date: {escape(source["reported"])}</small></li>'
        for number, source in enumerate(brief["sources"], 1)
    )
    toc = "".join(f'<a href="#step-{number}">{escape(section["heading"])}</a>' for number, section in enumerate(brief["sections"], 1))
    head = (ROOT / "threat-briefs.html").read_text(encoding="utf-8").split("</head>", 1)[0] + "</head>"
    head = re.sub(r"<title>.*?</title>", lambda match: f'<title>{escape(brief["title"])} | CyberShark</title>', head)
    head = re.sub(r'(<meta\s+name="description"\s+content=")[^"]*(")',
                  lambda match: match[1] + escape(brief["summary"], quote=True) + match[2], head)
    page = head + f'''
<body class="weekly-body"><div class="page-shell">
<div class="grid-noise" aria-hidden="true"></div>
<header class="topbar"><a class="brand" href="index.html"><img class="brand-mark" src="brand-mark.svg" alt="">
<span class="brand-copy"><strong>CYBERSHARK</strong><span>Weekly SOC Brief</span></span></a>
<nav class="topnav" aria-label="Primary"><a href="index.html">Home</a><a href="threat-briefs.html">All threat briefs</a><a href="investigation-guidance.html">Guidance</a><a href="#sources">Sources</a></nav></header>
<main><article><header class="panel weekly-hero"><p class="eyebrow">{escape(brief["category"])} / WEEKLY SOC BRIEF</p>
<h1>{escape(brief["title"])}</h1><p class="weekly-deck">{escape(brief["summary"])}</p>
<p>Published <time datetime="{today}">{today}</time> / Research window: {today - timedelta(days=7)} to {today}</p>
</header><nav class="weekly-toc" aria-label="Article sections">{toc}</nav>
<section class="panel weekly-section"><p class="eyebrow">ATTACK PATH / ANALYST OVERVIEW</p><ol class="weekly-chain">{chain}</ol></section>
{"".join(sections)}<section class="panel weekly-section" id="sources"><h2>Sources and evidence</h2>
<p>Original CyberShark analysis based on the public reports below. Query examples require validation against your environment.</p><ol class="weekly-sources">{sources}</ol></section>
</article></main><footer class="footer"><p>CyberShark / Georgi Sharkov</p><a href="threat-briefs.html">All threat briefs &#8594;</a></footer>
</div><script src="script.js?v=20261002-3"></script></body></html>
'''
    article_path.write_text(page, encoding="utf-8")
    catalogue.append({
        "title": brief["title"], "url": filename, "published": today.isoformat(),
        "category": brief["category"], "summary": brief["summary"], "tags": brief["tags"],
        "researchWeek": research_week,
    })
    catalogue_path.write_text(json.dumps(catalogue, indent=2) + "\n", encoding="utf-8")
    render()
    print(f"Validated and rendered {filename}")


if __name__ == "__main__":
    publish(os.environ["WEEKLY_BRIEF_JSON"])
