/* Configure an already staged public site. Never modify the source checkout. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {validate}=require('./cloud_config.cjs');
const {apply}=require('./security_policy.cjs');

function configure(site,env=process.env) {
  const config={enabled:true,url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY};
  const validated=validate(config);
  config.url=validated.origin;
  const target=fs.realpathSync(site),source=fs.realpathSync(path.join(__dirname,'..'));
  if(target===source || !fs.existsSync(path.join(target,'min-ntm.html'))
    || fs.existsSync(path.join(target,'.git')))throw new Error('Use a separate staged site directory');
  // Only public settings enter this artifact, regardless of other process variables.
  const configFile=path.join(target,'cloud-config.js');
  const htmlFiles=fs.readdirSync(target).filter(name=>name.endsWith('.html'));
  for(const name of [...htmlFiles,'cloud-config.js']) {
    if(fs.lstatSync(path.join(target,name)).isSymbolicLink())throw new Error('Staged files must not be symlinks');
  }
  fs.writeFileSync(configFile,'/* Generated public settings; protected by database RLS. */\nwindow.NTMCloudConfig = Object.freeze('+JSON.stringify(config,null,2)+');\n');
  for(const name of htmlFiles) {
    const file=path.join(target,name);
    fs.writeFileSync(file,apply(fs.readFileSync(file,'utf8'),configFile));
  }
  return validated;
}
if(require.main===module) {
  try {
    if(process.argv.length!==4 || process.argv[2]!=='--site')throw new Error('Usage');
    configure(process.argv[3]);
    console.log('Public cloud config and exact-origin CSP generated in staged site. Live validation still required.');
  } catch(_) {
    // Do not echo input values, provider responses or unrelated environment variables.
    console.error('Cloud configuration failed. Use --site <staged-directory> and valid SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.');
    process.exitCode=1;
  }
}
module.exports={configure};
