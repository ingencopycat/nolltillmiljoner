/* Presentation-only enhancements. No calculation, storage or analytics ownership. */
(() => {
  if (!document.addEventListener) return;
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-rule-review]').forEach(note => {
      if (new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' }) >= note.dataset.ruleReview) {
        const warning = document.createElement('strong');
        warning.textContent = ' Regelversionen behöver granskas. Kontrollera aktuell information hos källan. ';
        note.prepend(warning);
      }
    });
    const nav = document.querySelector('.main-nav');
    if(nav) {
      const account=nav.querySelector('[data-account-nav]')||document.createElement('a');account.href='konto.html';account.textContent='Konto';account.dataset.accountNav='';account.setAttribute('aria-label','Kontrollerar kontostatus');if(!account.parentNode)nav.appendChild(account);
      // Use the same persisted Supabase session adapter on every page. Never infer
      // authentication from a local owner ID or briefly present a logged-out label.
      let accountAdapter=window.NTMAccount?.adapter||window.NTMSocialAdapter, request=0, subscribed=false;
      const load=src=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.append(script);});
      async function updateAccountNav(){
        const current=++request;
        try {
          if(!window.NTMCloudConfig)await load('cloud-config.js');
          if(!window.NTMCloudConfig?.enabled){account.textContent='Logga in';account.removeAttribute('aria-label');return;}
          if(!accountAdapter){
            if(!window.supabase)await load('vendor/supabase/supabase.js');
            if(!window.NTMCloudAdapter)await load('cloud-adapter.js');
            accountAdapter=window.NTMAccount?.adapter||window.NTMSocialAdapter||window.NTMCloudAdapter.create(window.NTMCloudConfig);
          }
          if(!subscribed){accountAdapter.onSessionChange(updateAccountNav);subscribed=true;}
          const session=await accountAdapter.session();
          if(current!==request)return;
          if(!session){account.textContent='Logga in';account.href='konto.html';}
          else {
            account.textContent='Konto';account.href='konto.html';
            try {const profile=await accountAdapter.socialWrite('mine');if(current===request&&profile?.username)account.textContent='@'+profile.username;}
            catch(_){/* An unavailable public profile must not erase a valid account state. */}
          }
          account.removeAttribute('aria-label');
        } catch(_) {if(current===request){account.textContent='Konto';account.href='konto.html';account.removeAttribute('aria-label');}}
      }
      updateAccountNav();
      window.addEventListener('ntm-account-change',updateAccountNav);
      window.addEventListener('ntm-profile-change',updateAccountNav);
      window.addEventListener('focus',updateAccountNav);
    }
    const menu = document.getElementById('mobileNavToggle');
    const learn = document.querySelector('.nav-learn');
    const topbar=menu?.closest('.topbar');
    const backdrop=document.createElement('div');backdrop.className='ntm-menu-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-hidden','true');document.body.append(backdrop);
    let modal=false,opener=null,overflow='',inertNodes=[];
    const isOpen=()=>Boolean(nav?.classList.contains('open')||learn?.open);
    function syncMenu(){
      const active=isOpen();if(active===modal)return;modal=active;
      backdrop.hidden=!active;topbar?.classList.toggle('ntm-menu-layer',active);
      if(active){
        opener=nav?.classList.contains('open')?menu:learn?.querySelector('summary');
        overflow=document.body.style.overflow;document.body.style.overflow='hidden';
        inertNodes=[...document.body.children].filter(n=>n!==topbar&&n!==backdrop&&!['SCRIPT','STYLE'].includes(n.tagName)).map(n=>[n,n.inert]);
        inertNodes.forEach(([n])=>n.inert=true);
        if(nav?.classList.contains('open'))nav.querySelector('a')?.focus();
      }else{document.body.style.overflow=overflow;inertNodes.forEach(([n,previous])=>n.inert=previous);inertNodes=[];}
    }
    function closeMenus(returnFocus = false) {
      const focusedInside = nav?.contains(document.activeElement);
      if (learn) learn.open = false;
      if (nav) nav.classList.remove('open');
      menu?.setAttribute('aria-expanded', 'false');
      syncMenu();
      if (returnFocus) opener?.focus();
    }
    if(nav)new MutationObserver(syncMenu).observe(nav,{attributes:true,attributeFilter:['class']});
    if(learn)new MutationObserver(syncMenu).observe(learn,{attributes:true,attributeFilter:['open']});
    backdrop.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();closeMenus(true);});
    nav?.addEventListener('click',event=>{if(event.target.closest('a'))closeMenus();});
    window.addEventListener('resize',()=>closeMenus());
    document.addEventListener('keydown', event => {
      if(event.key==='Tab'&&modal){
        const nodes=[...topbar.querySelectorAll('a,button,summary,input,select,[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);
        const first=nodes[0],last=nodes.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
      if (event.key !== 'Escape') return;
      if(isOpen()){event.preventDefault();closeMenus(true);}
    });
    document.addEventListener('click', event => {
      if (nav && !nav.contains(event.target) && !menu?.contains(event.target)
          && !document.getElementById('themeToggle')?.contains(event.target)) closeMenus();
    });
    document.querySelectorAll('[data-metrics-toggle]').forEach(button => {
      const grid = document.getElementById(button.getAttribute('aria-controls'));
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(expanded));
        grid.dataset.metrics = expanded ? 'all' : 'compact';
        button.textContent = expanded ? 'Visa färre nyckeltal' : 'Visa alla nyckeltal';
      });
    });
    function reveal(target) {
      if (!target) return;
      let parent = target.parentElement;
      while (parent) { if (parent.tagName === 'DETAILS') parent.open = true; parent = parent.parentElement; }
      if (target.tagName === 'DETAILS') target.open = true;
    }
    document.querySelectorAll('.section-local-nav a').forEach(link => {
      const target = document.getElementById(link.hash.slice(1));
      link.addEventListener('click', () => reveal(target));
      if (target && ['thesisHistorySection', 'outcomeSection'].includes(target.id)) {
        const sync = () => { link.hidden = target.hidden; };
        sync(); new MutationObserver(sync).observe(target, { attributes: true, attributeFilter: ['hidden'] });
      }
    });
    // Focus via validation or a deep link must not be trapped behind a closed disclosure.
    document.addEventListener('focusin', event => { if (!event.target.closest('summary')) reveal(event.target); });
    document.addEventListener('invalid', event => reveal(event.target), true);
    document.querySelectorAll('details.depth-panel').forEach(panel => {
      panel.addEventListener('toggle', () => {
        if (panel.open && typeof Chart !== 'undefined') requestAnimationFrame(() => {
          Object.values(Chart.instances).forEach(chart => { if (panel.contains(chart.canvas)) chart.resize(); });
        });
      });
    });
    document.querySelectorAll('.table-wrap, .table-wrapper, .stock-scenario-table-wrap, .sensitivity-table-wrap').forEach(wrap => {
      wrap.classList.add('financial-scroll'); wrap.setAttribute('tabindex', '0'); wrap.setAttribute('role', 'region');
      if (!wrap.hasAttribute('aria-label') && !wrap.hasAttribute('aria-labelledby')) wrap.setAttribute('aria-label', 'Finansiell tabell. Rulla i sidled för fler kolumner.');
    });
    if (location.hash) reveal(document.getElementById(location.hash.slice(1)));
    // Existing shared links can restore scenarios directly. Keep their controls discoverable.
    if (new URLSearchParams(location.search).has('scenario')) document.querySelectorAll('[data-scenario-depth]').forEach(panel => { panel.open = true; });
  });
})();
