const crypto = require('node:crypto');

function policy(html) {
  const tradingView = html.includes('src="https://widgets.tradingview-widget.com/');
  const hashes = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attrs]) => !/\bsrc\s*=/i.test(attrs))
    .map(([, , body]) => `'sha256-${crypto.createHash('sha256').update(body.replace(/\r\n/g, '\n')).digest('base64')}'`);
  return "default-src 'self'; base-uri 'none'; object-src 'none'; form-action 'self'; "
    + "script-src 'self' https://static.cloudflareinsights.com " + (tradingView ? 'https://widgets.tradingview-widget.com ' : '') + [...new Set(hashes)].join(' ')
    + "; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' https://img.youtube.com data:"
    + (tradingView ? ' https://s3-symbol-logo.tradingview.com' : '') + '; '
    + "font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-src https://www.youtube.com"
    + (tradingView ? ' https://widgets.tradingview-widget.com' : '');
}
function apply(html) {
  html = html.replace(/\s*<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?\s*>/gi, '');
  return html.replace(/(<meta charset="utf-8"\s*\/?\s*>)/i,
    `$1\n    <meta http-equiv="Content-Security-Policy" content="${policy(html)}" />`);
}
module.exports = { policy, apply };
