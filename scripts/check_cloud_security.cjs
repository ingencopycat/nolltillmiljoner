/* Bounded pattern scan: report paths/categories only, never matched credentials. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {read}=require('./cloud_config.cjs'),{policy}=require('./security_policy.cjs');
const root=path.join(__dirname,'..');
const patterns=[
  ['Supabase secret key',/sb_secret_[A-Za-z0-9_-]{20,}/],
  ['JWT credential',/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  ['database credentials',/postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/],
  ['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]
];
function scan(files) {
  const findings=[];
  for(const file of files) {
    if(!fs.existsSync(file) || !fs.statSync(file).isFile())continue;
    const bytes=fs.readFileSync(file);if(bytes.includes(0))continue;
    const text=bytes.toString('utf8');
    for(const [label,pattern] of patterns)if(pattern.test(text))findings.push(path.relative(root,file)+': '+label);
  }
  if(findings.length)throw new Error(findings.join('\n'));
}
function checkSite(site) {
  const config=path.join(site,'cloud-config.js');read(config);
  const files=[];
  function visit(dir) {for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isSymbolicLink())throw new Error('Unexpected staged symlink');
    if(entry.isDirectory())visit(file);else files.push(file);
  }}
  visit(site);scan(files);
  for(const file of files.filter(f=>f.endsWith('.html'))) {
    const html=fs.readFileSync(file,'utf8');
    const policies=[...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/g)];
    if(policies.length!==1 || policies[0][1]!==policy(html,config))throw new Error('CSP mismatch: '+path.basename(file));
  }
}
if(require.main===module) {
  try {
    if(process.argv.length===4 && process.argv[2]==='--site')checkSite(path.resolve(process.argv[3]));
    else if(process.argv.length===2) {
      const files=cp.execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root}).toString().split('\0').filter(Boolean);
      scan(files.map(file=>path.join(root,file)));read();
    } else throw new Error('Usage: check_cloud_security.cjs [--site <directory>]');
    console.log('PASS credential-pattern scan/public configuration'+(process.argv.length>2?' and staged CSP':' (working tree; not git history)'));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}
module.exports={scan,checkSite};
