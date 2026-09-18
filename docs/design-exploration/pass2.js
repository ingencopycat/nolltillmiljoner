/* Composition refinement. Loaded after the isolated study renderer. */
const refine = new MutationObserver(() => {
  if(!document.documentElement.dataset.ready)return;
  refine.disconnect();
  if(document.body.classList.contains('surface-thesis')){
    const note=document.createElement('a');note.href='#review-panel';note.className='mobile-review';note.textContent='Dags att granska · 1 jan 2020 ↘';
    document.querySelector('.thesis-heading').append(note);
    document.querySelector('.review-panel').id='review-panel';
  }
  document.querySelectorAll('.company-dot').forEach(el=>el.remove());
  document.querySelectorAll('nav a.selected').forEach(el=>el.setAttribute('aria-current','page'));
});
refine.observe(document.documentElement,{attributes:true,attributeFilter:['data-ready']});
