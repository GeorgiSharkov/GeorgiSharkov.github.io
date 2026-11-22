const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const security = require("../site-security.js");
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "script.js"), "utf8");

// Execute the real production renderers with synthetic feed data, without a browser.
function productionFunction(name) {
  const start = source.indexOf(`  const ${name} = `);
  assert.notEqual(start, -1, `Missing production function: ${name}`);
  const end = source.indexOf("\n  };", start);
  assert.notEqual(end, -1);
  return source.slice(start, end + 5);
}

function pulseRenderers() {
  const select = {};
  const context = vm.createContext({
    CyberSharkSecurity: security, URL, Intl, Date,
    filterForm: { querySelector: () => select },
  });
  const names = ["getPriority", "getAnalystAction", "extractLinks", "formatDate", "populateVendorFilter", "renderPulseCard"];
  vm.runInContext("const {escapeHtml, safeExternalUrl, finiteNumber} = CyberSharkSecurity;\n" +
    names.map(productionFunction).join("\n") + `\nglobalThis.renderers = {${names.join(",")}};`, context);
  return { ...context.renderers, select };
}

test("external URLs reject executable schemes, local hosts and embedded credentials", () => {
  for (const value of [null, "", "javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "//evil.example/", "http://example.com/", "https://u:p@example.com/", "https://127.0.0.1/", "https://2130706433/", "https://[::1]/", "https://host.local/", "https://example.com:8443/"]) {
    assert.equal(security.safeExternalUrl(value), "#", String(value));
  }
  assert.equal(security.safeExternalUrl("https://example.com/advisory?id=1&lang=en"), "https://example.com/advisory?id=1&lang=en");
});

test("hostile KEV fields stay text and cannot create HTML elements or NVD attributes", () => {
  const render = pulseRenderers();
  const attack = '\"><img src=x onerror=alert(1)><svg onload=alert(2)>';
  const entry = Object.fromEntries(["cveID", "vulnerabilityName", "shortDescription", "vendorProject", "product", "knownRansomwareCampaignUse", "requiredAction"].map((key) => [key, attack]));
  const html = render.renderPulseCard({ ...entry, dateAdded: "2026-11-22", dueDate: "invalid", notes: 'https://example.com/advisory?a=1&b=2\"onmouseover=alert(1)' });
  assert.doesNotMatch(html, /<img|<svg|href="javascript:/i);
  assert.match(html, /&lt;img/);
  assert.match(html, /https:\/\/nvd\.nist\.gov\//);
  assert.match(html, /a=1&amp;b=2/);
  assert.match(html, /Unknown/);
});

test("vendor filter escapes both option values and labels", () => {
  const render = pulseRenderers();
  render.populateVendorFilter([{ vendorProject: '\"><img src=x onerror=alert(1)>' }]);
  assert.doesNotMatch(render.select.innerHTML, /<img|<script/i);
  assert.equal((render.select.innerHTML.match(/<option/g) || []).length, 2);
  assert.match(render.select.innerHTML, /&quot;&gt;&lt;img/);
});

test("advisory links are HTTPS-only and HTML attribute safe", () => {
  const links = pulseRenderers().extractLinks('javascript:alert(1); http://example.com/; https://user:secret@example.com/; https://example.com/a?x=1&y=2');
  assert.equal(links.length, 1);
  assert.equal(links[0], "https://example.com/a?x=1&y=2");
});

test("news cards escape hostile publisher text and reject executable image URLs", () => {
  const news = fs.readFileSync(path.join(root, "cyber-news.js"), "utf8");
  const start = news.indexOf("  const initials = ");
  const end = news.indexOf("  const bindImageFallbacks = ", start);
  const context = vm.createContext({
    escapeHtml: security.escapeHtml, safeUrl: security.safeExternalUrl,
    formatDate: () => "22 Nov 2026",
  });
  vm.runInContext(news.slice(start, end) + "\nglobalThis.renderCard = cardMarkup;", context);
  const html = context.renderCard({ title: '<img src=x onerror=alert(1)>', description: '<script>alert(1)</script>', topic: 'test', source: 'Publisher', publishedAt: '2026-11-22', url: 'javascript:alert(1)', image: 'data:image/svg+xml,<svg onload=alert(1)>' });
  assert.doesNotMatch(html, /<img|<script|href="javascript:|src="data:/i);
  assert.match(html, /&lt;script/);
  assert.match(html, /href="#"/);
});

test("public preview has no username or localStorage owner bypass", () => {
  assert.doesNotMatch(source, /ownerToken|atcorPreviewOwner/);
  const expression = source.match(/const isOwner = ([^;]+);/)[1];
  assert.equal(vm.runInNewContext(expression, { window: { location: { hostname: "georgisharkov.github.io" } } }), false);
  assert.equal(vm.runInNewContext(expression, { window: { location: { hostname: "localhost" } } }), true);
  for (const value of ["NaN", "Infinity", "-1"]) {
    const context = vm.createContext({ attemptKey: "test-attempts", maxVisitorAttempts: 3, sessionAttempts: 0, window: { localStorage: { getItem: () => value } } });
    vm.runInContext(productionFunction("getAttempts") + "\nglobalThis.attempts = getAttempts();", context);
    assert.equal(context.attempts, 3);
  }
});

test("all published pages load shared security boundaries before application scripts", () => {
  for (const file of fs.readdirSync(root).filter((name) => name.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.match(html, /name="referrer" content="no-referrer"/, file);
    assert.match(html, /http-equiv="Content-Security-Policy"/, file);
    const helper = html.indexOf('src="site-security.js');
    const application = html.indexOf('src="script.js');
    assert.ok(helper >= 0 && helper < application, file);
  }
});
