/* Supabase REST boundary. Public publishable key only; authenticated tokens stay in memory. */
(function(root) {
  'use strict';
  const error=code=>Object.assign(new Error(code),{code});
  function validConfig(config) {
    if(!config || config.enabled!==true)return null;
    const url=new URL(config.url);
    if(url.protocol!=='https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)
      || url.pathname!=='/' || url.port || url.search || url.hash || url.username || url.password
      || typeof config.publishableKey!=='string' || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey)) throw error('config');
    return {url:url.origin,key:config.publishableKey};
  }
  function create(config,{fetch:request=root.fetch.bind(root),now=()=>Date.now()}={}) {
    const c=validConfig(config);if(!c)throw error('disabled');
    let auth=null;
    async function call(path,body,authenticated=false) {
      if(authenticated && (!auth || auth.expiresAt<=now())) {auth=null;throw error('auth');}
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
      try {
        const response=await request(c.url+path,{method:body===undefined?'GET':'POST',
          headers:{apikey:c.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+auth.accessToken}:{})},
          body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok) {
          // Supabase returns this after confirmed account deletion: there is no
          // remaining Auth user to log out. Inspect only the bounded error code.
          if(path==='/auth/v1/logout' && response.status===403) {
            const detail=await response.json().catch(()=>null);
            if(detail?.error_code==='user_not_found') {auth=null;throw error('auth');}
          }
          if(response.status===401)auth=null;
          if(path==='/auth/v1/otp' || path==='/auth/v1/verify') {
            const detail=await response.json().catch(()=>null),code=detail?.code||detail?.error_code;
            if(response.status===429 || ['over_email_send_rate_limit','over_request_rate_limit'].includes(code))throw error('auth_rate_limit');
            if(code==='otp_expired')throw error('otp_expired');
            if(path==='/auth/v1/verify' && [400,401,403,422].includes(response.status))throw error('otp_invalid');
          }
          if(path.startsWith('/rest/v1/rpc/ntm_social_') && [400,403,404,429].includes(response.status))
            throw error(({400:'invalid',403:'forbidden',404:'missing',429:'rate_limit'})[response.status]);
          // Provider responses can echo sensitive values; never log or display their bodies.
          throw error(response.status===409?'conflict':response.status===401?'auth':'network');
        }
        return response.status===204?null:await response.json();
      } finally {clearTimeout(timer);}
    }
    return {
      requestOtp:email=>call('/auth/v1/otp',{email,create_user:true}),
      async verifyOtp(email,token) {
        const result=await call('/auth/v1/verify',{email,token,type:'email'});
        if(!result?.access_token || !result.user?.id || !Number.isFinite(result.expires_in))throw error('auth');
        auth={userId:result.user.id,accessToken:result.access_token,expiresAt:now()+result.expires_in*1000};
        return {userId:auth.userId}; // No retained refresh token; re-authenticate after reload/expiry.
      },
      async session(){if(auth?.expiresAt<=now())auth=null;return auth?{userId:auth.userId}:null;},
      async socialRead(action,args={}) {return call('/rest/v1/rpc/ntm_social_read',{action,args});},
      async usernameAvailability(username) {return call('/rest/v1/rpc/ntm_username_availability',{username},true);},
      async socialWrite(action,args={}) {return call('/rest/v1/rpc/ntm_social_write',{action,args},true);},
      async put(records) {return call('/rest/v1/rpc/ntm_put_records',{records},true);},
      async list() {return call('/rest/v1/rpc/ntm_export_records',{},true);},
      async profile() {const user=await call('/auth/v1/user',undefined,true);return {id:user.id,email:user.email,createdAt:user.created_at};},
      async deleteAccount() {return call('/rest/v1/rpc/ntm_delete_account',{},true);},
      async logout(){if(!auth)return;try{await call('/auth/v1/logout',{},true);}catch(e){if(e.code!=='auth')throw e;}finally{auth=null;}}
    };
  }
  root.NTMCloudAdapter={create,validConfig};
})(typeof window!=='undefined'?window:globalThis);
