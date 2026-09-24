/* Server-side distribution only. No HTML scraping, automatic retries or site writes. */
const fs = require('node:fs'), path = require('node:path');
const weekly = require('./check_weekly_events.cjs');
const channels = {macro: 'makro', earnings: 'rapporter'};
const fail = code => { throw new Error(code); };
const hash = value => require('node:crypto').createHash('sha256').update(value).digest('hex');
const pageHash = bytes => hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));

// News uses the canonical post registry and generated page, never scraped source prose.
function previewNews(root, slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) fail('invalid_publication');
  const context = require('node:vm').createContext({});
  require('node:vm').runInContext(fs.readFileSync(path.join(root, 'posts.js'), 'utf8'), context);
  const posts = require('node:vm').runInContext('NTM_POSTS', context);
  const matches = posts.filter(p => p.slug === slug);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'docs/internal/news-distribution.json'), 'utf8'));
  const review = manifest.articles?.[slug], post = matches[0];
  if (manifest.version !== 1 || matches.length !== 1 || !review || post.category !== 'Nyheter' || post.media.type !== 'none'
      || !post.editorial.sources?.length || post.editorial.verification.length || hash(JSON.stringify(post)) !== review.postSha256) fail('news_review_mismatch');
  const file = `post-${slug}.html`, bytes = fs.readFileSync(path.join(root, file));
  if (pageHash(bytes) !== review.htmlSha256) fail('news_page_mismatch');
  if (typeof review.text !== 'string' || !review.text.trim() || review.text.length > 1500
      || /https?:|@|[<>]/i.test(review.text)) fail('invalid_news_caption');
  const url = `https://nolltillmiljoner.se/${file}`;
  return {channel: 'nyheter', slug, text: `${review.text}\n\n[Läs hela på Noll till Miljoner →](<${url}>)`,
    url, image: null, htmlSha256: review.htmlSha256, identity: `news:${slug}`};
}

function preview(model, kind, week) {
  if (!channels[kind] || !/^\d{4}-W\d{2}$/.test(week)) fail('invalid_publication');
  const matches = model.artifacts.filter(a => a.kind === kind && a.week === week);
  if (matches.length !== 1) fail('unpublished_week');
  const artifact = matches[0], records = model.data[kind + 'Weeks']?.[week]?.[kind === 'macro' ? 'events' : 'reports'];
  const reviews = model.review.artifacts.filter(a => a.kind === kind && a.week === week && a.image === artifact.image);
  if (!Array.isArray(records) || reviews.length !== 1 || model.review.version !== 1) fail('unreviewed_publication');
  const expected = `./images/${channels[kind]}/week-${Number(week.slice(6))}.png`;
  if (artifact.image !== expected) fail('invalid_artifact');
  let bytes;
  try {
    const file = fs.realpathSync(path.resolve(model.root, artifact.image));
    if (!file.startsWith(fs.realpathSync(model.root) + path.sep)) fail('invalid_artifact');
    bytes = fs.readFileSync(file);
  } catch { fail('missing_artifact'); }
  if (bytes.length > 10 * 1024 * 1024 || !bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) fail('invalid_artifact');
  const hash = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
  if (reviews[0].sha256 !== hash || JSON.stringify(weekly.recordsForReview(kind, records)) !== JSON.stringify(reviews[0].records)
      || records.some(r => !/^\d{4}-\d{2}-\d{2}$/.test(r.date) || model.api.weekKey(r.date) !== week)) fail('review_mismatch');
  return {channel: channels[kind], week, text: `${kind === 'macro' ? 'Makro' : 'Rapporter'} — Vecka ${Number(week.slice(6))}, ${week.slice(0, 4)}`,
    image: artifact.image, identity: `${kind}:${week}:${hash}`};
}

// One pre-existing ledger on a separate branch. Missing/corrupt state NEVER means empty.
// Contents API SHA compare-and-swap prevents concurrent workers both reserving a send.
function githubLedger(env, fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY || '') || !env.GITHUB_TOKEN) fail('missing_ledger_config');
  const endpoint = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/contents/discord-ledger.json`;
  const branch = 'ntm-distribution-state';
  async function request(method, body) {
    let response;
    try {
      response = await fetcher(endpoint + (method === 'GET' ? `?ref=${branch}` : ''), {
        method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: {Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28'},
        ...(body ? {body: JSON.stringify(body)} : {})});
      if (!response.ok) fail('ledger_unavailable');
      return await response.json();
    } catch { fail('ledger_unavailable'); }
  }
  return {
    async read() {
      const result = await request('GET');
      try {
        const data = JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
        if (data.version !== 1 || !data.publications || Array.isArray(data.publications) || typeof data.publications !== 'object' || !result.sha) fail('invalid_ledger');
        return {data, sha: result.sha};
      } catch { fail('invalid_ledger'); }
    },
    async write(state) {
      const result = await request('PUT', {branch, sha: state.sha, message: 'Record Discord delivery state',
        content: Buffer.from(JSON.stringify(state.data, null, 2) + '\n').toString('base64')});
      if (!result.content?.sha) fail('ledger_unavailable');
      state.sha = result.content.sha;
    }
  };
}

async function deliver(plan, root, env, ledger, fetcher = fetch) {
  if (env.NTM_DISCORD_ENABLED !== 'true') fail('live_disabled');
  const secretNames = {makro: 'DISCORD_MAKRO_WEBHOOK_URL', rapporter: 'DISCORD_RAPPORTER_WEBHOOK_URL', nyheter: 'DISCORD_NYHETER_WEBHOOK_URL'};
  if (!Object.hasOwn(secretNames, plan.channel)) fail('invalid_destination');
  const secret = env[secretNames[plan.channel]];
  if (!/^https:\/\/discord\.com\/api(?:\/v10)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(secret || '')) fail('missing_or_invalid_webhook');
  const news = plan.channel === 'nyheter';
  let bytes;
  if (news) {
    if (JSON.stringify(previewNews(root, plan.slug)) !== JSON.stringify(plan)) fail('news_review_mismatch');
  } else {
    bytes = fs.readFileSync(path.resolve(root, plan.image));
    if (!plan.identity.endsWith(':' + hash(bytes))) fail('artifact_changed');
  }
  const state = await ledger.read();
  const previous = state.data.publications[plan.identity];
  if (previous) {
    if (previous.status === 'sent') return {status: 'already_sent', identity: plan.identity};
    fail('delivery_uncertain_manual_review_required');
  }
  if (news) {
    // A reviewed local preview is not proof of release. Fail before reserving or posting.
    try {
      const published = await fetcher(plan.url, {redirect: 'error', signal: AbortSignal.timeout(15000)});
      if (!published.ok || pageHash(Buffer.from(await published.arrayBuffer())) !== plan.htmlSha256) fail('news_not_published');
    } catch { fail('news_not_published'); }
  }
  state.data.publications[plan.identity] = {status: 'reserved', channel: plan.channel};
  await ledger.write(state); // Durable BEFORE the only POST; failure stops sending.
  const form = new FormData();
  form.append('payload_json', JSON.stringify({content: plan.text, allowed_mentions: {parse: []},
    ...(news ? {flags: 4} : {attachments: [{id: 0, filename: path.basename(plan.image)}]})}));
  if (!news) form.append('files[0]', new Blob([bytes], {type: 'image/png'}), path.basename(plan.image));
  let message;
  try {
    const response = await fetcher(secret + '?wait=true', {method: 'POST', redirect: 'error', body: form, signal: AbortSignal.timeout(15000)});
    if (!response.ok) fail('discord_unavailable');
    message = await response.json();
    if (!/^\d+$/.test(message.id || '')) fail('discord_unavailable');
  } catch { fail('delivery_uncertain_manual_review_required'); }
  // Do not retain provider payloads, URLs, channel IDs or credentials.
  state.data.publications[plan.identity] = {status: 'sent', channel: plan.channel, messageId: message.id};
  await ledger.write(state);
  return {status: 'sent', identity: plan.identity};
}

async function main(args = process.argv.slice(2), env = process.env) {
  const [kind, week, mode = '--dry-run'] = args;
  if (args.length > 3 || !['--dry-run', '--send'].includes(mode)) fail('invalid_arguments');
  const model = weekly.loadRepository(), plan = kind === 'news' ? previewNews(model.root, week) : preview(model, kind, week);
  if (mode === '--dry-run') { console.log(JSON.stringify(plan, null, 2)); return; }
  if (kind !== 'news' && weekly.check(model).some(i => i.level === 'error')) fail('weekly_validation_failed');
  console.log(JSON.stringify(await deliver(plan, model.root, env, githubLedger(env))));
}
module.exports = {preview, previewNews, githubLedger, deliver, main};
if (require.main === module) main().catch(() => { console.error('Discord distribution stopped safely. Check configuration, publication review and delivery ledger; do not retry an uncertain delivery.'); process.exitCode = 1; });
