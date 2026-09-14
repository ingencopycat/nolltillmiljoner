/* Validate public configuration before allowing its exact origin into CSP. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function read() {
  const context={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../cloud-config.js'),'utf8'),context,{timeout:100});
  const config=context.window.NTMCloudConfig;
  if(!config || typeof config.enabled!=='boolean' || Object.keys(config).some(k=>!['enabled','url','publishableKey'].includes(k)))throw new Error('Invalid public cloud configuration');
  if(config.publishableKey!==undefined && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey))throw new Error('Only public publishable keys may appear in cloud config, even when disabled');
  if(!config.enabled)return null;
  const url=new URL(config.url);
  if(url.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) || url.pathname!=='/'
    || url.port || url.search || url.hash || url.username || url.password
    || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey))throw new Error('Cloud needs a Supabase origin and public publishable key');
  return {origin:url.origin};
}
module.exports={read};
