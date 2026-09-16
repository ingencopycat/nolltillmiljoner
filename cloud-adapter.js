/* Supabase REST boundary. Public publishable key only; session persistence and refresh are owned by the official Supabase SDK. */
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
  function create(config,{fetch:request=root.fetch.bind(root),createClient=root.supabase?.createClient}={}) {
    const c=validConfig(config);if(!c)throw error('disabled');
    if(!createClient)throw error('config');
    let logoutFailure=false,signingOut=false;
    const client=createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
      global:{fetch:async(url,options)=>{
        const logout=String(url).includes('/auth/v1/logout');
        const logoutRefresh=()=>signingOut && String(url).includes('/auth/v1/token');
        const discardExpired=()=>{
          // Offline logout must not depend on refreshing first. Use the SDK's
          // invalid-refresh cleanup, and report unconfirmed server revocation.
          logoutFailure=true;
          return new Response(JSON.stringify({error_code:'refresh_token_not_found'}),{status:400,headers:{'Content-Type':'application/json'}});
        };
        try {
          const timeout=AbortSignal.timeout(15000),signal=options?.signal?AbortSignal.any([options.signal,timeout]):timeout;
          const response=await request(url,{...options,signal,credentials:'omit',referrerPolicy:'no-referrer'});
          if(logoutRefresh() && response.status>=500)return discardExpired();
          if(logout && !response.ok && ![401,403,404].includes(response.status)){logoutFailure=true;return new Response(null,{status:204});}
          return response;
        }catch(e){
          // Local logout must complete even offline. The SDK clears its own session;
          // report failed server revocation separately after that cleanup.
          if(logoutRefresh())return discardExpired();
          if(logout){logoutFailure=true;return new Response(null,{status:204});}throw e;
        }
      }}});
    function authError(e,otp=false){
      if(e?.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(e?.code))return error('auth_rate_limit');
      if(e?.code==='otp_expired')return error('otp_expired');
      if(otp&&[400,401,403,422].includes(e?.status))return error('otp_invalid');
      return error([401,403].includes(e?.status)?'auth':'network');
    }
    async function logout(){
      logoutFailure=false;signingOut=true;
      try{
        const {error:e}=await client.auth.signOut({scope:'local'});
        if(logoutFailure)throw error('network');if(e)throw authError(e);
      }finally{signingOut=false;}
    }
    async function token(){
      const {data,error:e}=await client.auth.getSession();if(e)throw authError(e);
      if(!data.session)throw error('auth');return data.session.access_token;
    }
    async function call(path,body,authenticated=false,retried=false) {
      const accessToken=authenticated?await token():null;
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
      try {
        const response=await request(c.url+path,{method:body===undefined?'GET':'POST',
          headers:{apikey:c.key,'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer '+accessToken}:{})},
          body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});
        if(!response.ok) {
          if(response.status===401 && authenticated){
            // A token can expire between getSession() and the gateway check.
            if(!retried){
              const {data,error:e}=await client.auth.refreshSession();
              if(!e && data.session)return call(path,body,true,true);
              if(e && (!e.status || e.status>=500))throw authError(e);
            }
            await logout().catch(()=>{});
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
      async requestOtp(email){const {error:e}=await client.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(e)throw authError(e);},
      async verifyOtp(email,token) {
        const {data,error:e}=await client.auth.verifyOtp({email,token,type:'email'});
        if(e)throw authError(e,true);if(!data.user?.id)throw error('auth');return {userId:data.user.id};
      },
      async session(){
        const {data,error:e}=await client.auth.getSession();if(e)throw authError(e);if(!data.session)return null;
        // Validate restored identity with Auth, not just locally decoded JWT data.
        const {data:user,error:invalid}=await client.auth.getUser();
        if(invalid){if([401,403].includes(invalid.status)){await logout().catch(()=>{});return null;}throw authError(invalid);}
        return user.user?{userId:user.user.id}:null;
      },
      onSessionChange(callback){const {data}=client.auth.onAuthStateChange(event=>{
        if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','INITIAL_SESSION'].includes(event))setTimeout(callback,0);
      });return ()=>data.subscription.unsubscribe();},
      async socialRead(action,args={}) {return call('/rest/v1/rpc/ntm_social_read',{action,args});},
      async usernameAvailability(username) {return call('/rest/v1/rpc/ntm_username_availability',{username},true);},
      async socialWrite(action,args={}) {return call('/rest/v1/rpc/ntm_social_write',{action,args},true);},
      async put(records) {return call('/rest/v1/rpc/ntm_put_records',{records},true);},
      async list() {return call('/rest/v1/rpc/ntm_export_records',{},true);},
      async profile() {const user=await call('/auth/v1/user',undefined,true);return {id:user.id,email:user.email,createdAt:user.created_at};},
      async deleteAccount() {return call('/rest/v1/rpc/ntm_delete_account',{},true);},
      logout
    };
  }
  root.NTMCloudAdapter={create,validConfig};
})(typeof window!=='undefined'?window:globalThis);
