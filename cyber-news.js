(() => {
  const root = document.querySelector("[data-newsroom-root]");
  if (!root) return;

  const elements = {
    lead: root.querySelector("[data-news-lead]"),
    secondary: root.querySelector("[data-news-secondary]"),
    grid: root.querySelector("[data-news-grid]"),
    filters: root.querySelector("[data-news-filters]"),
    search: root.querySelector("[data-news-search]"),
    generated: root.querySelector("[data-news-generated]"),
    status: root.querySelector("[data-news-status]"),
    ticker: root.querySelector("[data-news-ticker]"),
  };

  const state = { stories: [], topic: "All", query: "" };
  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);

  const safeUrl = (value) => {
    try {
      const url = new URL(value, window.location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  };

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Recent" : dateFormatter.format(date);
  };

  const initials = (source = "Cyber News") => source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  const imageMarkup = (story, className = "") => {
    const image = safeUrl(story.image);
    const fallback = `<span class="news-image-fallback" aria-hidden="true">${escapeHtml(initials(story.source))}</span>`;
    if (image === "#") return `<div class="news-card-image ${className} is-fallback">${fallback}</div>`;
    return `<div class="news-card-image ${className}">
      <img src="${escapeHtml(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      ${fallback}
    </div>`;
  };

  const storyMeta = (story) => `<div class="news-card-meta">
    <span>${escapeHtml(story.topic)}</span>
    <span>${escapeHtml(story.source)}</span>
    <time datetime="${escapeHtml(story.publishedAt)}">${formatDate(story.publishedAt)}</time>
  </div>`;

  const leadMarkup = (story) => `<a href="${escapeHtml(safeUrl(story.url))}" target="_blank" rel="noreferrer" class="news-lead-link">
    ${imageMarkup(story, "news-lead-image")}
    <div class="news-lead-copy">
      ${storyMeta(story)}
      <h2>${escapeHtml(story.title)}</h2>
      <p>${escapeHtml(story.description)}</p>
      <span class="news-read-link">Read original report <b aria-hidden="true">-&gt;</b></span>
    </div>
  </a>`;

  const secondaryMarkup = (story) => `<article class="news-secondary-card">
    <a href="${escapeHtml(safeUrl(story.url))}" target="_blank" rel="noreferrer">
      ${imageMarkup(story)}
      <div>
        ${storyMeta(story)}
        <h3>${escapeHtml(story.title)}</h3>
      </div>
    </a>
  </article>`;

  const cardMarkup = (story) => `<article class="news-story-card">
    <a href="${escapeHtml(safeUrl(story.url))}" target="_blank" rel="noreferrer">
      ${imageMarkup(story)}
      <div class="news-story-copy">
        ${storyMeta(story)}
        <h3>${escapeHtml(story.title)}</h3>
        <p>${escapeHtml(story.description)}</p>
        <span class="news-read-link">Read at ${escapeHtml(story.source)} <b aria-hidden="true">-&gt;</b></span>
      </div>
    </a>
  </article>`;

  const bindImageFallbacks = () => {
    root.querySelectorAll(".news-card-image img").forEach((image) => {
      image.addEventListener("error", () => image.parentElement.classList.add("is-fallback"), { once: true });
    });
  };

  const renderGrid = () => {
    const query = state.query.trim().toLowerCase();
    const filtered = state.stories.filter((story) => {
      const matchesTopic = state.topic === "All" || story.topic === state.topic;
      const haystack = `${story.title} ${story.description} ${story.source} ${story.topic}`.toLowerCase();
      return matchesTopic && (!query || haystack.includes(query));
    });

    elements.grid.innerHTML = filtered.length
      ? filtered.map(cardMarkup).join("")
      : `<div class="news-empty-state"><strong>No matching stories</strong><span>Try another keyword or select All signal.</span></div>`;
    bindImageFallbacks();
  };

  const renderFilters = () => {
    const topics = ["All", ...new Set(state.stories.map((story) => story.topic))];
    elements.filters.innerHTML = topics.map((topic) => `<button type="button" class="news-filter${topic === state.topic ? " is-active" : ""}" data-news-topic="${escapeHtml(topic)}">${escapeHtml(topic === "All" ? "All signal" : topic)}</button>`).join("");
  };

  const render = (payload) => {
    state.stories = Array.isArray(payload.stories) ? payload.stories : [];
    if (!state.stories.length) throw new Error("The publisher snapshot contains no stories.");

    elements.lead.innerHTML = leadMarkup(state.stories[0]);
    elements.secondary.innerHTML = state.stories.slice(1, 4).map(secondaryMarkup).join("");
    const generatedAt = new Date(payload.generatedAt);
    elements.generated.textContent = Number.isNaN(generatedAt.getTime())
      ? "Current security edition"
      : `Updated ${generatedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}`;
    const healthy = (payload.sources || []).filter((source) => source.status === "ok").length;
    elements.status.textContent = `${state.stories.length} stories / ${healthy} publisher feeds online`;
    elements.ticker.textContent = [...new Set(state.stories.map((story) => story.topic))].join(" / ").toUpperCase();
    renderFilters();
    renderGrid();
    bindImageFallbacks();
  };

  const showError = () => {
    elements.generated.textContent = "Newsroom refresh delayed";
    elements.status.textContent = "Publisher links remain available below";
    elements.lead.innerHTML = `<div class="news-feed-error"><span>NEWS DESK / RETRY</span><h2>The latest edition could not load.</h2><p>Refresh shortly or use the source directory for direct access to trusted reporting.</p></div>`;
    elements.secondary.innerHTML = "";
    elements.grid.innerHTML = `<div class="news-empty-state"><strong>Live cards temporarily unavailable</strong><span>The original publisher routes remain active in the source directory.</span></div>`;
  };

  elements.filters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-news-topic]");
    if (!button) return;
    state.topic = button.dataset.newsTopic;
    renderFilters();
    renderGrid();
  });

  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderGrid();
  });

  fetch(`cyber-news-data.json?v=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`News snapshot returned ${response.status}`);
      return response.json();
    })
    .then(render)
    .catch(showError);
})();
