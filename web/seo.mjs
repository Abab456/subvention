const fixed = { fr: ['/', '/estimation', '/programmes', '/services', '/guides/avant-travaux'], en: ['/', '/assessment', '/programs', '/services', '/guides/before-work'] };
export function approvedOrigin(value) {
  try { const url = new URL(value); if (url.protocol === 'https:' && !url.username && !url.password && !['localhost', '127.0.0.1'].includes(url.hostname)) return url.origin; } catch {}
  return null;
}
export function publicPaths(programs) {
  return ['fr', 'en'].flatMap(lang => [...fixed[lang].map(path => `/${lang}${path}`), ...programs.map(p => `/${lang}/${lang === 'fr' ? 'programmes' : 'programs'}/${encodeURIComponent(p.id)}`)]);
}
export function renderSitemap(programs, config = {}) {
  const origin = approvedOrigin(config.publicBaseUrl);
  const eligible = config.mode === 'production' && config.indexable === true && origin;
  const paths = eligible ? publicPaths(programs) : [];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${origin}${path.replaceAll('&', '&amp;')}</loc></url>`).join('')}</urlset>`;
}
export function websiteStructuredData(config = {}, language = 'fr') {
  const origin = approvedOrigin(config.publicBaseUrl);
  if (!origin) return '';
  const json = JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Subvention Énergie', url: origin + `/${language}/`, inLanguage: language === 'fr' ? 'fr-CA' : 'en-CA' }).replaceAll('<', '\\u003c');
  const nonce = typeof config.nonce === 'string' && /^[a-zA-Z0-9_-]+$/.test(config.nonce) ? ` nonce="${config.nonce}"` : '';
  return `<script type="application/ld+json"${nonce}>${json}</script>`;
}
