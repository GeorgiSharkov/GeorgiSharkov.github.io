"""Render the article archive and homepage teasers from the published catalogue."""

import json
import re
from datetime import date
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def render():
    articles = json.loads((ROOT / "threat-articles.json").read_text(encoding="utf-8"))
    if not articles:
        raise ValueError("The published article catalogue must not be empty")
    seen = set()
    for article in articles:
        path = article["url"]
        if not re.fullmatch(r"[a-z0-9-]+\.html", path) or not (ROOT / path).is_file():
            raise ValueError(f"Missing or invalid article path: {path}")
        if path in seen:
            raise ValueError(f"Duplicate article: {path}")
        seen.add(path)
        if date.fromisoformat(article["published"]) > date.today():
            raise ValueError(f"Cannot publish a future-dated article: {path}")
    articles.sort(key=lambda item: item["published"], reverse=True)

    def copy(article):
        return {key: escape(str(article[key]), quote=True)
                for key in ("title", "url", "published", "category", "summary")}

    latest = copy(articles[0])
    home_path = ROOT / "index.html"
    home = home_path.read_text(encoding="utf-8")
    tab = f'''<a class="threat-brief-tab" href="{latest['url']}">
      <span class="threat-brief-dot" aria-hidden="true"></span>
      <span class="threat-brief-tab-label">Latest threat brief</span>
      <strong>{latest['title']}</strong><span aria-hidden="true">&#8599;</span>
    </a>'''
    feature = f'''<section class="panel threat-brief-feature" id="threat-briefs" aria-labelledby="latest-brief-title">
      <div><p class="eyebrow">CYBERSHARK THREAT BRIEFS / SOC ANALYSIS</p>
      <p class="threat-brief-cadence">Weekly research. Practical investigation.</p>
      <h2 id="latest-brief-title">{latest['title']}</h2>
      <p class="threat-brief-summary">{latest['summary']}</p>
      <div class="guidance-case-meta"><span>{latest['category']}</span>
      <span>Published <time datetime="{latest['published']}">{latest['published']}</time></span></div>
      <div class="cta-row"><a class="button button-primary" href="{latest['url']}">Read the latest brief</a>
      <a class="button button-ghost" href="threat-briefs.html">All threat articles</a></div></div>
      <aside class="threat-brief-outline" aria-label="Inside each SOC brief">
      <span class="eyebrow">INSIDE THE BRIEF</span><ol><li>What happened and who is exposed</li>
      <li>Technical attack chain explained</li><li>Logs, evidence, and hunt queries</li>
      <li>Containment, remediation, and lessons</li></ol>
      <a href="threat-briefs.html">Explore the article library &#8594;</a></aside>
    </section>'''
    for marker, content in (("THREAT_BRIEF_TAB", tab), ("THREAT_BRIEF_FEATURE", feature)):
        pattern = rf"<!-- {marker}:START -->.*?<!-- {marker}:END -->"
        replacement = f"<!-- {marker}:START -->\n{content}\n<!-- {marker}:END -->"
        home, count = re.subn(pattern, lambda match: replacement, home, flags=re.S)
        if count != 1:
            raise ValueError(f"Expected exactly one homepage marker: {marker}")

    head = home.split("</head>", 1)[0] + "</head>"
    head = re.sub(r"<title>.*?</title>", "<title>Threat Briefs | CyberShark SOC Articles</title>", head)
    head = head.replace(
        "CyberShark is Georgi Sharkov's cyberpunk home for SOC tooling, research, projects, and publications.",
        "CyberShark threat briefs: technical incident walkthroughs, vulnerability analysis, SOC hunt queries, and remediation guidance."
    )
    cards = []
    for number, article in enumerate(articles):
        item = copy(article)
        tags = "".join(f"<span>{escape(tag)}</span>" for tag in article["tags"])
        cards.append(f'''<article class="info-card threat-brief-card">
          <div class="threat-brief-card-top"><span class="card-tag">{'LATEST / ' if number == 0 else ''}{item['category']}</span>
          <time datetime="{item['published']}">{item['published']}</time></div>
          <h2><a href="{item['url']}">{item['title']}</a></h2><p>{item['summary']}</p>
          <div class="guidance-case-meta">{tags}</div>
          <a class="button button-ghost" href="{item['url']}">Read SOC breakdown &#8594;</a></article>''')

    archive = head + '''
<body><div class="page-shell">
  <div class="grid-noise" aria-hidden="true"></div>
  <header class="topbar"><a class="brand" href="index.html">
  <img class="brand-mark" src="brand-mark.svg" alt=""><span class="brand-copy"><strong>CYBERSHARK</strong><span>Threat Briefs</span></span></a>
  <nav class="topnav" aria-label="Primary"><a href="index.html">Home</a><a href="threat-briefs.html" aria-current="page">Threat Briefs</a>
  <a href="threat-pulse.html">Pulse</a><a href="investigation-guidance.html">Guidance</a><a href="cyber-news.html">News</a></nav></header>
  <main><section class="panel threat-brief-library-hero"><p class="eyebrow">THREAT INTELLIGENCE / TECHNICAL WALKTHROUGHS</p>
  <h1>Threat briefs<span>From the headline to the investigation.</span></h1>
  <p>Original CyberShark analysis for SOC analysts: understand the mechanism, identify the evidence, hunt the behaviour, and plan the response.</p>
  <p class="threat-brief-cadence">New research scheduled for Monday mornings. Each article shows its publication date and sources.</p></section>
  <section class="threat-brief-library" aria-label="Published SOC articles">''' + "\n".join(cards) + '''</section></main>
  <footer class="footer"><p>CyberShark / Georgi Sharkov</p><a href="index.html">Back to home &#8594;</a></footer>
</div><script src="script.js?v=20261002-3"></script></body></html>
'''
    home_path.write_text(home, encoding="utf-8")
    (ROOT / "threat-briefs.html").write_text(archive, encoding="utf-8")
    print(f"Published catalogue rendered: {len(articles)} articles; latest: {articles[0]['url']}")


if __name__ == "__main__":
    render()
