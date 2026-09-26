"""QA navigation through visible Research links/selects; never changes product state directly."""
def open_research_workspace(page, selector):
    """Reach mounted Research controls through the public workspace navigation."""
    if '/research.html' not in page.url:
        return
    target = page.locator(selector).first
    target.wait_for(state='attached')
    route = target.evaluate("""n=>({view:n.closest('[data-workspace]')?.dataset.workspace,
      topic:n.closest('[data-topic-panel]')?.dataset.topicPanel,
      section:n.closest('[data-thesis-panel]')?.dataset.thesisPanel})""")
    for dimension, nav in [('view','researchWorkspaceNav'),('topic','researchTopicNav'),('section','researchThesisNav')]:
        if not route.get(dimension):
            continue
        host=page.locator('#'+nav)
        if host.locator('select').is_visible():
            if host.locator('select').input_value()!=route[dimension]:
                host.locator('select').select_option(route[dimension])
        else:
            link=host.locator('[data-'+dimension+'="'+route[dimension]+'"]')
            if link.get_attribute('aria-current')!='page':
                link.click()
    pane=target.evaluate("n=>n.closest('[data-notebook-pane]')?.dataset.notebookPane")
    if pane and not target.is_visible():
        button=page.locator('#notebook-'+pane+'-button')
        if button.is_visible(): button.click()
    # Wave 3 assumption/editor disclosures are reached through their visible summaries.
    for ident in target.evaluate("n=>{if(n.tagName==='SUMMARY')n=n.parentElement;const a=[];for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&p.id)a.unshift(p.id);return a}"):
        details=page.locator('#'+ident)
        if details.get_attribute('open') is None:
            details.locator(':scope > summary').click()

