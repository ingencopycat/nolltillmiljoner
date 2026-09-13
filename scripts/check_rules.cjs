const fs = require('node:fs');
const path = require('node:path');
function check(registry, today = new Date().toLocaleDateString('sv-SE', {timeZone:'Europe/Stockholm'})) {
  const issues = [];
  for (const rule of registry.rules || []) {
    for (const field of ['id','topic','page','effectiveFrom','effectiveYear','source','lastVerified','nextReview','status','manualReview']) {
      if (!rule[field]) issues.push(`${rule.id}: missing ${field}`);
    }
    for (const field of ['effectiveFrom','lastVerified','nextReview']) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rule[field]) || !Number.isFinite(Date.parse(rule[field]))
          || new Date(rule[field]).toISOString().slice(0,10) !== rule[field]) issues.push(`${rule.id}: invalid ${field}`);
    }
    if (!/^https:\/\//.test(rule.source)) issues.push(`${rule.id}: source must be HTTPS`);
    if (!Number.isInteger(rule.effectiveYear) || String(rule.effectiveYear) !== rule.effectiveFrom?.slice(0,4)) issues.push(`${rule.id}: effective year/date mismatch`);
    if (rule.lastVerified > today || rule.lastVerified >= rule.nextReview) issues.push(`${rule.id}: invalid review chronology`);
    if (rule.status !== 'verified' || today >= rule.nextReview) issues.push(`${rule.id}: owner review due ${rule.nextReview}`);
    if (rule.id === 'isk' && Number(today.slice(0,4)) !== rule.effectiveYear) issues.push('isk: current income year has no verified rules');
  }
  if (!registry.rules?.length) issues.push('No maintained rules');
  return issues;
}
module.exports = { check };
if (require.main === module) {
  const issues = check(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/rule-registry.json'),'utf8')));
  issues.forEach(issue => console.error('::error::' + issue));
  console.log(`Rule registry: ${issues.length} issues. Source verification remains an owner responsibility.`);
  process.exitCode = issues.length ? 1 : 0;
}
