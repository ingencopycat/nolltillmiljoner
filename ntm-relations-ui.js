/* Select public company context only; never inspect a user's thesis or storage. */
document.addEventListener('DOMContentLoaded', () => {
  const ticker = new URLSearchParams(location.search).get('ticker')?.toUpperCase();
  document.querySelectorAll('[data-relation-ticker]').forEach(block => {
    block.hidden = block.dataset.relationTicker !== ticker;
  });
});
