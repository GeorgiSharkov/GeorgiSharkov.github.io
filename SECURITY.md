# Security

Report a suspected vulnerability privately to gnssngmail@gmail.com. Include the affected page, reproducible steps and expected impact. Do not post credentials or personal information in public issues.

## Review: 22 November 2026

This is a static GitHub Pages site with plain JavaScript and Python standard-library feed updaters. The PHP, cloud and incident case-study articles are educational content; there is no PHP runtime or live ATCOR backend hosted here.

The review found and addressed unsafe HTML interpolation in Threat Pulse feed cards and vendor filters; unsafe advisory attribute handling; a public preview owner-mode bypass; and overly broad, unbounded feed fetches. Public feed strings are escaped and external URLs validated. Download destinations and redirects are restricted, size-limited and checked for public DNS addresses. Workflows use pinned action commits, timeouts and non-persisted checkout credentials. Regression tests cover malicious inputs and download boundaries. Dependabot proposes GitHub Actions updates; it does not merge them automatically.

Every page includes a no-referrer policy and a baseline meta Content Security Policy limiting base URLs, object embeds and form destinations. This baseline deliberately does not claim to enforce a restrictive script policy: Google Analytics and the consent manager execute third-party scripts. A full script policy needs a separately tested consent/analytics integration.

## Limits

- The ATCOR example's three-output limit is browser-side convenience, not authentication or an enforceable per-person quota. Public links and browser storage grant no owner privileges. Unlimited local development previews are available only on loopback hosts. A real owner account or reliable usage quota requires a server-side authentication/rate-limiting service.
- GitHub Pages controls HTTP response headers. A meta policy cannot implement frame-ancestors, and this repository cannot enforce all response-header protections. Use a separately configured hosting/proxy service if response-header controls become necessary; no paid service was added by this review.
- Trusted third-party scripts and publisher images remain external dependencies. Publisher content is not executed as site HTML.
- This was a source review, targeted local regression testing and non-disruptive live verification, not a guarantee against every vulnerability or a penetration test of GitHub's infrastructure.
- Repository administrators should retain HTTPS enforcement, secret scanning and push protection, review Dependabot updates, and secure their GitHub accounts with strong MFA. Required pull-request protection was not enabled because the scheduled feed publishers currently write to main.
