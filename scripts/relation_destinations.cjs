// Build-time file/fragment validation; runtime never probes or fabricates destinations.
const fs = require('node:fs');
const path = require('node:path');
function destinationExists(root, href) {
  const url = new URL(href, 'https://nolltillmiljoner.se/');
  const file = path.join(root, url.pathname.slice(1));
  if (!fs.existsSync(file)) return false;
  if (!url.hash) return true;
  const html = fs.readFileSync(file, 'utf8'), fragment = url.hash.slice(1);
  // Existing valuation mode URLs are handled by initStockValuationModes().
  if (url.pathname === '/aktievarderingskalkylator.html' && ['reverse', 'scenarios'].includes(fragment)) {
    return html.includes(`data-stock-mode="${fragment}"`);
  }
  return html.includes(`id="${fragment}"`);
}
module.exports = { destinationExists };
