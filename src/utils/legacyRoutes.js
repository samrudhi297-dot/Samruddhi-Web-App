/** Map legacy .html hrefs to React Router paths */
export const LEGACY_PAGE_ROUTES = new Map([
  ['index.html', '/'],
  ['product.html', '/products'],
  ['contact.html', '/contact'],
  ['about.html', '/about'],
  ['mission.html', '/mission'],
  ['landing.html', '/landing'],
  ['privacypolicy.html', '/privacy'],
  ['terms&conditions.html', '/terms'],
  ['success.html', '/success'],
  ['fail.html', '/fail'],
])

export function mapLegacyHrefToRoute(href) {
  if (!href) return null

  const cleaned = href.trim()

  if (/^(https?:|mailto:|tel:|javascript:)/i.test(cleaned)) return null
  if (cleaned === '#') return null

  // Already a clean SPA path
  if (cleaned.startsWith('/') && !cleaned.includes('.html')) return cleaned

  let path = cleaned.replace(/\s+/g, '').replace(/^\.\//, '')

  let hash = ''
  const hashIdx = path.indexOf('#')
  if (hashIdx >= 0) {
    hash = path.slice(hashIdx)
    path = path.slice(0, hashIdx)
  }

  if (path.startsWith('/')) path = path.slice(1)
  if (!path) return hash || null

  if (LEGACY_PAGE_ROUTES.has(path)) return LEGACY_PAGE_ROUTES.get(path) + hash

  const htmlMatch = path.match(/^(.+)\.html$/i)
  if (htmlMatch) {
    const slug = htmlMatch[1]
    const legacyFile = `${slug}.html`
    if (LEGACY_PAGE_ROUTES.has(legacyFile)) return LEGACY_PAGE_ROUTES.get(legacyFile) + hash
    return `/products/${slug}${hash}`
  }

  return null
}

export function rewriteLegacyHrefsInHtml(html) {
  return html.replace(/href=(["'])([^"']*)\1/gi, (match, quote, href) => {
    const route = mapLegacyHrefToRoute(href)
    if (!route) return match
    return `href=${quote}${route}${quote}`
  })
}
