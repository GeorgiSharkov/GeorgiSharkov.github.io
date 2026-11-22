/* Shared boundaries for text and external URLs rendered from public feeds. */
(() => {
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  const safeExternalUrl = (value) => {
    if (typeof value !== "string" || !value.trim() || value.length > 4096) return "#";
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== "https:" || url.username || url.password ||
          (url.port && url.port !== "443") || !host.includes(".") ||
          host.endsWith(".localhost") || host.endsWith(".local") ||
          /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return "#";
      return url.href;
    } catch {
      return "#";
    }
  };

  const finiteNumber = (value, minimum = 0, maximum = 1000000000) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : minimum;
  };

  const security = Object.freeze({ escapeHtml, safeExternalUrl, finiteNumber });
  if (typeof module !== "undefined" && module.exports) module.exports = security;
  else Object.defineProperty(globalThis, "CyberSharkSecurity", { value: security });
})();
