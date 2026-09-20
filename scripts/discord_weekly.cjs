/* Server-side distribution only. No HTML scraping, automatic retries or site writes. */
const fs = require('node:fs'), path = require('node:path');
const weekly = require('./check_weekly_events.cjs');
const channels = {macro: 'makro', earnings: 'rapporter'};
const fail = code => { throw new Error(code); };

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
  const secret = env[plan.channel === 'makro' ? 'DISCORD_MAKRO_WEBHOOK_URL' : 'DISCORD_RAPPORTER_WEBHOOK_URL'];
  if (!/^https:\/\/discord\.com\/api(?:\/v10)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(secret || '')) fail('missing_or_invalid_webhook');
  const bytes = fs.readFileSync(path.resolve(root, plan.image));
  if (!plan.identity.endsWith(':' + require('node:crypto').createHash('sha256').update(bytes).digest('hex'))) fail('artifact_changed');
  const state = await ledger.read();
  const previous = state.data.publications[plan.identity];
  if (previous) {
    if (previous.status === 'sent') return {status: 'already_sent', identity: plan.identity};
    fail('delivery_uncertain_manual_review_required');
  }
  state.data.publications[plan.identity] = {status: 'reserved', channel: plan.channel};
  await ledger.write(state); // Durable BEFORE the only POST; failure stops sending.
  const form = new FormData();
  form.append('payload_json', JSON.stringify({content: plan.text, allowed_mentions: {parse: []},
    attachments: [{id: 0, filename: path.basename(plan.image)}]}));
  form.append('files[0]', new Blob([bytes], {type: 'image/png'}), path.basename(plan.image));
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
  const model = weekly.loadRepository(), plan = preview(model, kind, week);
  if (mode === '--dry-run') { console.log(JSON.stringify(plan, null, 2)); return; }
  if (weekly.check(model).some(i => i.level === 'error')) fail('weekly_validation_failed');
  console.log(JSON.stringify(await deliver(plan, model.root, env, githubLedger(env))));
}
module.exports = {preview, githubLedger, deliver, main};
if (require.main === module) main().catch(() => { console.error('Discord distribution stopped safely. Check configuration, publication review and delivery ledger; do not retry an uncertain delivery.'); process.exitCode = 1; });
