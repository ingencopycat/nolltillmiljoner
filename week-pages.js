const isMakroPage = window.location.pathname.toLowerCase().includes('makro');

const earningsWeekData = {
  '2026-W39': {
    title: 'Vecka 39',
    label: 'Vecka 39',
    image: './images/rapporter/week-39-3840.webp',
    preview: './images/rapporter/week-39-1920.webp',
    fallback: './images/rapporter/week-39.png',
    schedule: ["Måndag: inga bolag listade före öppning. Efter stängning: ABVX.", "Tisdag före öppning: THO, MLKN, AZO. Efter stängning: KBH, WOR, AYTU.", "Onsdag före öppning: CBRL, GIS, CTAS, PAYX. Efter stängning: SFIX, FUL, NEOV.", "Torsdag före öppning: BB, DRI, SNX. Efter stängning: COST, LGCY, SCHL.", "Fredag: inga bolag listade."]
  },
  '2026-W38': {
    title: 'Vecka 38',
    label: 'Vecka 38',
    image: './images/rapporter/week-38-3840.webp',
    preview: './images/rapporter/week-38-1920.webp',
    fallback: './images/rapporter/week-38.png',
    schedule: ["Måndag före öppning: RFIL, HAIN. Efter stängning: HITI, PLAY, HYFT, KMTS.", "Tisdag före öppning: FPS, VRA, BIOX. Efter stängning: TCOM, EPM.", "Onsdag före öppning: LUXE, ISPR. Efter stängning: LEN.", "Torsdag före öppning: IPHA. Inga bolag listade efter stängning.", "Fredag: inga bolag listade."]
  },
  '2026-W37': {
    title: 'Vecka 37',
    label: 'Vecka 37',
    image: './images/rapporter/week-37-3840.webp',
    preview: './images/rapporter/week-37-1920.webp',
    fallback: './images/rapporter/week-37.png',
    schedule: ["Måndag: inga bolag listade.", "Tisdag före öppning: ABM, CAN, UNFI. Efter stängning: CASY, BRZE, TTAN, AVO, INNV.", "Onsdag före öppning: CHWY, CAL, SAIL, NNOX, ASO, SIG, CNM, JMKE, JILL, KFY. Efter stängning: AVAV, AEO, NAVN, WLTH, COO, LAKE, LMNR, LSAK, GLOO, SKIL.", "Torsdag före öppning: FLWS, M, MCFT, DBI, VNCE, SHOE, LOVE. Efter stängning: ORCL, ADBE, RH, DSGX, CPRT, LPTH, REF, AENT, ZUMZ.", "Fredag före öppning: KR, HOFT, MNY."]
  },
  '2026-W36': {
    title: 'Vecka 36',
    label: 'Vecka 36',
    image: './images/rapporter/week-36-3840.webp',
    preview: './images/rapporter/week-36-1920.webp',
    fallback: './images/rapporter/week-36.png',
    schedule: ["Måndag före öppning: SAIC, BLRX. Efter stängning: CANG.", "Tisdag före öppning: NIO, SSL, RZLV, MMED, MDT, YEXT, HMR. Efter stängning: CRDO, DELL, PANW, MDB, GTLB, SPWH.", "Onsdag före öppning: FCEL, CXM, BF.B, GIII, DAKT, OLLI. Efter stängning: AVGO, HPE, SNOW, NTAP, FIVE, AGX, CHPT, PVH, PHR, GOLD.", "Torsdag före öppning: CIEN, WLY, VSXY, LE, GCO, DOO, DLTH, BRC, CPB, TTC. Efter stängning: PATH, AMBA, DOCU, ZS, LULU, IOT, ASAN, BBCP, PL, SWBI.", "Fredag före öppning: KNOP."]
  }
};

const archiveContainer = document.getElementById('weekArchive');
const upcomingContainer = document.getElementById('upcomingWeeks');
const currentWeekContainer = document.getElementById('currentWeekNavigation');
const showMoreArchiveButton = document.getElementById('showMoreArchive');
const visual = document.getElementById('weekVisual');
const label = document.getElementById('currentWeekLabel');
const title = document.getElementById('currentWeekTitle');
const structuredContainer = document.getElementById('macroStructuredContent');

function parseIsoWeekKey(weekKey) {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey || ''));
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function compareIsoWeekKeys(firstKey, secondKey) {
  const first = parseIsoWeekKey(firstKey);
  const second = parseIsoWeekKey(secondKey);
  if (!first || !second) return 0;
  return first.year - second.year || first.week - second.week;
}

function getIsoWeekStartDate(weekKey) {
  const parsed = parseIsoWeekKey(weekKey);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, 0, 4));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1 + ((parsed.week - 1) * 7));
  return date;
}

function getFollowingIsoWeekKeys(currentWeekKey, count) {
  const currentStart = getIsoWeekStartDate(currentWeekKey);
  if (!currentStart) return [];
  return Array.from({ length: count }, (_, index) => {
    const weekStart = new Date(currentStart);
    weekStart.setUTCDate(weekStart.getUTCDate() + ((index + 1) * 7));
    return getIsoWeekKeyForDate(weekStart);
  });
}

function getIsoWeekKeyForDate(date = getNtmNow()) {
  return window.NTMWeekly.weekKey(window.NTMWeekly.dateKey(date));
}

function formatIsoWeekLabel(weekKey) {
  const parsed = parseIsoWeekKey(weekKey);
  return parsed ? `Vecka ${parsed.week}, ${parsed.year}` : weekKey;
}

function createEmptyMacroWeek(weekKey) {
  const label = formatIsoWeekLabel(weekKey);
  return { label, title: label, sourceTimezone: 'America/New_York', fallbackImage: null, events: [] };
}

function openLightbox(imageUrl, alt = 'Veckans bild') {
  if (window.NTMLightbox) {
    window.NTMLightbox.open([{ src: imageUrl, alt }]);
  }
}

function formatSwedishDayHeader(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Stockholm'
  }).format(dateObj);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function escapeText(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function formatMacroVal(val) {
  if (val === null || val === undefined || val === '') {
    return '–';
  }
  const text = String(val);
  return /^-0(?:[.,]0+)?%?$/.test(text) ? text.slice(1) : text;
}

function getRenderableMacroEvents(week) {
  if (!week || !Array.isArray(week.events)) return [];

  const normalizeFn = (window.NTM_MACRO && window.NTM_MACRO.normalizeMacroEvent) || function (event, timezone) {
    return { ...event, swedishDate: event.date, swedishTime: event.time || 'Tid ej angiven', hasTime: !!event.time, timestamp: 0 };
  };

  return week.events
    .map((event) => normalizeFn(event, week.sourceTimezone))
    .filter(Boolean)
    .sort((first, second) => {
      if (first.swedishDate !== second.swedishDate) {
        return first.swedishDate.localeCompare(second.swedishDate);
      }
      return first.timestamp - second.timestamp;
    });
}

function renderMacroWeek(weekKey, macroWeeks) {
  const week = macroWeeks[weekKey];
  if (!week) return;

  const normalizedEvents = getRenderableMacroEvents(week);
  const hasEvents = normalizedEvents.length > 0;
  const hasFallbackImage = typeof week.fallbackImage === 'string' && week.fallbackImage.trim().length > 0;
  const weekLabel = formatIsoWeekLabel(weekKey);

  if (hasEvents) {
    if (visual) visual.classList.add('hidden');
    if (structuredContainer) {
      structuredContainer.classList.remove('hidden');

      const daysMap = {};
      normalizedEvents.forEach((ev) => {
        daysMap[ev.swedishDate] = daysMap[ev.swedishDate] || [];
        daysMap[ev.swedishDate].push(ev);
      });

      const dateRangeText = week.dateRange || (window.NTM_MACRO && window.NTM_MACRO.getIsoWeekDateRange(weekKey)) || '';
      const meta = (window.NTM_WEEKLY_EVENTS && window.NTM_WEEKLY_EVENTS.meta) || {};
      let updateInfo = '';
      if (meta.schemaVersion === 2 && meta.lastCompleteFetch) {
        try {
          const updateDate = new Date(meta.lastCompleteFetch);
          const updateFormatted = new Intl.DateTimeFormat('sv-SE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Stockholm'
          }).format(updateDate);
          updateInfo = `Senaste fullständiga hämtning: ${updateFormatted}`;
        } catch (e) {
          updateInfo = '';
        }
      }

      updateInfo += `${updateInfo ? ' · ' : ''}${meta.schemaVersion !== 2 ? 'Äldre status: täckning per källa saknas' : meta.status === 'ok' ? 'Källhämtningar klara; enskilda värden kan saknas' : 'Delvis uppdaterad eller källor otillgängliga'}`;
      const fieldLabel = (event, field) => {
        if (event[field] === null || event[field] === undefined || event[field] === '') return 'Ej tillgänglig';
        const p = event.fieldProvenance?.[field];
        return ({ manual: 'Manuellt angiven', provider_derived: 'Beräknad från källa', reported: 'Rapporterad', provider: 'Separat leverantör' })[p?.kind] || 'Källa ej verifierad';
      };
      let html = `
        <div class="macro-week-header">
          <div class="macro-week-header-top">
            <div>
              <span class="section-kicker">${escapeText(weekLabel)}</span>
              <h2>${escapeText(week.title || week.label || weekKey)}</h2>
              ${dateRangeText ? `<p class="macro-date-range">${escapeText(dateRangeText)}</p>` : ''}
            </div>
            ${hasFallbackImage ? `
              <button type="button" class="ghost-btn macro-image-toggle-btn" id="macroImageToggleBtn" title="Visa originalbild i lightbox">
                🖼️ Visa originalbild
              </button>
            ` : ''}
          </div>
          ${updateInfo ? `<div class="macro-update-status">${escapeText(updateInfo)}</div>` : ''}
          <p class="note">Täckning: ett urval av främst amerikanska publiceringar från veckans angivna källor. Inte en fullständig global kalender. Tider visas i Europe/Stockholm; källans datum och tidszon finns under varje händelse. Saknad prognos betyder att underlag saknas.</p>
          ${meta.sources ? `<details><summary>Status per källa</summary>${Object.entries(meta.sources).map(([name, state]) => `<p>${escapeText(name)}: ${escapeText(({ current: 'Hämtad', failed: 'Hämtning misslyckades', cached: 'Tidigare kalender används; hämtning misslyckades', not_configured: 'Ej konfigurerad', unavailable: 'Ej tillgänglig' })[state] || 'Okänd status')}</p>`).join('')}</details>` : ''}
        </div>
        <div class="macro-days-list">
      `;

      Object.keys(daysMap).sort().forEach((dateKey) => {
        const dayEvents = daysMap[dateKey];
        const dayTitle = formatSwedishDayHeader(dateKey);

        html += `
          <div class="macro-day-group">
            <h3 class="macro-day-title">
              <span class="macro-day-bullet" aria-hidden="true">📅</span>
              ${escapeText(dayTitle)}
            </h3>
            <div class="macro-events-list">
              ${dayEvents.map((event) => {
                const hasDetails = true;
                const isRevised = !!event.isRevised;
                const context = window.NTMCalendarContext?.macro(event);

                return `
                  <article class="macro-event-card" id="event-${escapeText(event.id || '')}">
                    <div class="macro-event-main">
                      <span class="macro-event-time">${escapeText(event.hasTime ? event.swedishTime : 'Heldag')}</span>
                      <div class="macro-event-info">
                        <div class="macro-event-title-row">
                          <strong class="macro-event-title">${escapeText(event.eventName || 'Makrohändelse')}</strong>
                          <span class="macro-country-pill">${escapeText(event.country || 'USA')}</span>
                          ${event.period ? `<span class="macro-period-pill">Ref: ${escapeText(event.period)}</span>` : ''}
                        </div>
                        <div class="macro-metrics">
                          <div class="macro-metric">
                            <span class="macro-metric-label">Utfall ${isRevised ? '<span class="macro-revised-tag" title="Värdet har reviderats från ursprunglig publicering">Rev.</span>' : ''}</span>
                            <span class="macro-metric-val ${event.actual !== null && event.actual !== undefined ? 'has-actual' : ''}">${escapeText(formatMacroVal(event.actual))}</span>
                          </div>
                          <div class="macro-metric">
                            <span class="macro-metric-label">Prognos · ${escapeText(fieldLabel(event, 'forecast'))}</span>
                            <span class="macro-metric-val">${escapeText(formatMacroVal(event.forecast))}</span>
                          </div>
                          <div class="macro-metric">
                            <span class="macro-metric-label">Föregående</span>
                            <span class="macro-metric-val">${escapeText(formatMacroVal(event.previous))}</span>
                          </div>
                        </div>
                        ${hasDetails ? `
                          <details class="macro-details">
                            <summary>Förklaring &amp; källa</summary>
                            <div class="macro-details-body">
                              ${context ? `<p>${escapeText(context.state)}</p><p>${escapeText(context.time)}</p><p>${escapeText(context.revision)} ${escapeText(context.previous)}</p>${context.concept ? `<button type="button" class="ghost-btn" data-concept-help="${context.concept}">Förstå publiceringen med Knowledge</button>` : ''}` : ''}
                              ${[['actual', 'Utfall'], ['previous', 'Föregående'], ['forecast', 'Prognos']].map(([key, label]) => `<p>${label}: ${escapeText(fieldLabel(event, key))}${event.fieldProvenance?.[key]?.source ? ` · ${escapeText(event.fieldProvenance[key].source)}` : ''}${event.fieldProvenance?.[key]?.fetchedAt ? ` · hämtad ${escapeText(event.fieldProvenance[key].fetchedAt)}` : ''}</p>`).join('')}
                              ${event.description ? `<p class="macro-desc">${escapeText(event.description)}</p>` : ''}
                              ${event.source ? `
                                <p class="macro-source">Källa: ${event.sourceUrl ? `<a href="${escapeText(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeText(event.source)}</a>` : escapeText(event.source)}</p>
                              ` : ''}
                            </div>
                          </details>
                        ` : ''}
                      </div>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          </div>
        `;
      });

      html += `</div>`;
      structuredContainer.innerHTML = html;

      if (hasFallbackImage) {
        const toggleBtn = document.getElementById('macroImageToggleBtn');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            openLightbox(week.fallbackImage, week.title || week.label);
          });
        }
      }
    }
  } else if (hasFallbackImage) {
    if (structuredContainer) structuredContainer.classList.add('hidden');
    if (visual) {
      visual.classList.remove('hidden');
      visual.style.background = `linear-gradient(135deg, rgba(10, 15, 22, 0.16), rgba(10, 15, 22, 0.24)), url('${week.fallbackImage}') center/contain no-repeat`;
      visual.title = `Öppna bild för ${week.title || week.label || weekKey}`;
      visual.onclick = () => openLightbox(week.fallbackImage, week.title || week.label);
    }
    if (label) label.textContent = week.label || weekKey;
    if (title) title.textContent = week.title || week.label || weekKey;
  } else {
    if (visual) visual.classList.add('hidden');
    if (structuredContainer) {
      structuredContainer.classList.remove('hidden');
      structuredContainer.innerHTML = `
        <div class="macro-week-header">
            <span class="section-kicker">${escapeText(weekLabel)}</span>
          <h2>${escapeText(week.title || week.label || weekKey)}</h2>
        </div>
        <p class="ntm-empty-state">Inga verifierade makrohändelser inlagda för veckan. Kalendern kan vara ofullständig.</p>
      `;
    }
  }

}

function renderMacroArchive(selectedWeekKey, macroWeeks, currentWeekKey) {
  const startArchiveKey = '2026-W36';
  const weekKeys = Object.keys(macroWeeks).filter((key) => parseIsoWeekKey(key));
  const upcomingKeys = getFollowingIsoWeekKeys(currentWeekKey, 4);
  const pastKeys = weekKeys
    .filter((key) => compareIsoWeekKeys(key, startArchiveKey) >= 0 && compareIsoWeekKeys(key, currentWeekKey) < 0)
    .sort((first, second) => compareIsoWeekKeys(second, first));
  const visiblePastKeys = pastKeys.slice(0, 8);
  const renderButton = (weekKey) => {
    const activeClass = weekKey === selectedWeekKey ? 'active' : '';
    return `<button type="button" class="archive-item ${activeClass}" data-week="${weekKey}">${escapeText(formatIsoWeekLabel(weekKey))}</button>`;
  };
  const renderUpcomingItem = (weekKey) => {
    const hasRenderableEvents = getRenderableMacroEvents(macroWeeks[weekKey]).length > 0;
    const activeClass = weekKey === selectedWeekKey ? 'active' : '';
    const disabledClass = hasRenderableEvents ? '' : ' is-disabled';
    const disabledAttribute = hasRenderableEvents ? '' : ' disabled aria-disabled="true"';
    const statusText = hasRenderableEvents ? '' : ' · Ej inlagt ännu';
    return `<button type="button" class="archive-item${disabledClass} ${activeClass}" data-week="${weekKey}"${disabledAttribute}>${escapeText(formatIsoWeekLabel(weekKey) + statusText)}</button>`;
  };
  const currentActiveClass = selectedWeekKey === currentWeekKey ? 'active' : '';

  if (currentWeekContainer) {
    currentWeekContainer.innerHTML = `<button type="button" class="archive-item ${currentActiveClass}" data-week="${currentWeekKey}">Denna vecka · ${escapeText(formatIsoWeekLabel(currentWeekKey))}</button>`;
  }

  if (upcomingContainer) {
    upcomingContainer.innerHTML = upcomingKeys.map(renderUpcomingItem).join('');
  }
  if (archiveContainer) {
    archiveContainer.innerHTML = visiblePastKeys.map(renderButton).join('') || '<p class="ntm-empty-state">Inga tidigare veckor.</p>';
  }
  if (showMoreArchiveButton) {
    showMoreArchiveButton.classList.toggle('hidden', pastKeys.length <= 8);
  }

  [currentWeekContainer, upcomingContainer, archiveContainer].forEach((container) => {
    if (!container) return;
    container.querySelectorAll('.archive-item:not(:disabled)').forEach((button) => {
      button.addEventListener('click', () => {
        renderMacroWeek(button.dataset.week, macroWeeks);
        renderMacroArchive(button.dataset.week, macroWeeks, currentWeekKey);
      });
    });
  });
}

function getReportWeekStatus(weekKey, currentWeekKey) {
  if (weekKey === currentWeekKey) return 'Aktuell';
  return compareIsoWeekKeys(weekKey, currentWeekKey) > 0 ? 'Kommande' : 'Arkiv';
}

function getInitialEarningsWeek(weeksData, currentWeekKey) {
  const keys = Object.keys(weeksData).filter((key) => parseIsoWeekKey(key));
  if (weeksData[currentWeekKey]) return currentWeekKey;
  const nextWeek = keys
    .filter((key) => compareIsoWeekKeys(key, currentWeekKey) > 0)
    .sort(compareIsoWeekKeys)[0];
  return nextWeek || keys.sort((first, second) => compareIsoWeekKeys(second, first))[0] || currentWeekKey;
}

function renderEarningsWeek(weekKey, weeksData, currentWeekKey = getIsoWeekKeyForDate()) {
  const item = weeksData[weekKey];
  if (!item) return;

  if (visual) {
    visual.classList.remove('hidden');
    visual.style.background = 'none';
    visual.classList.add('week-report-image');
    visual.innerHTML = `<picture><source type="image/webp" srcset="${item.preview} 1920w, ${item.image} 3840w" sizes="(max-width: 720px) 100vw, 1100px"><img src="${item.fallback}" width="3840" height="2160" loading="lazy" decoding="async" alt="Rapportkalender ${item.title}, Earnings Whispers. Samma bolag och tidpunkter finns i texten nedan."></picture>`;
    let text = document.getElementById('earnings-readable');
    if (!text) { text = document.createElement('section'); text.id = 'earnings-readable'; visual.after(text); }
    text.replaceChildren();
    const heading = document.createElement('h3'); heading.textContent = `${item.title}: rapportkalender i text`; text.append(heading);
    const note = document.createElement('p'); note.textContent = 'Avskrift av Earnings Whispers-bilden. Tickers och tidpunkter återges som publicerade, inte som liveverifierad kalender. Före/efter avser USA-börsens öppning/stängning. Kontrollera bolagets IR-sida för ändringar.'; text.append(note);
    if(window.NTMCalendarContext){const context=document.createElement('p');context.className='note';context.textContent=window.NTMCalendarContext.earnings(weekKey,getIsoWeekStartDate(weekKey));text.append(context);}
    for (const row of item.schedule) { const paragraph = document.createElement('p'); paragraph.textContent = row; text.append(paragraph); }
    visual.title = `Öppna bild för ${item.title}`;
    visual.onclick = () => openLightbox(item.image, item.title);
  }

  if (label) {
    label.textContent = item.label;
  }

  if (title) {
    title.textContent = item.title;
  }

  if (archiveContainer) {
    const keys = Object.keys(weeksData)
      .filter((key) => parseIsoWeekKey(key))
      .sort((first, second) => compareIsoWeekKeys(second, first));
    archiveContainer.innerHTML = keys.map((wk) => {
      const activeClass = wk === weekKey ? 'active' : '';
      const status = getReportWeekStatus(wk, currentWeekKey);
      return `<button type="button" class="archive-item ${activeClass}" data-week="${wk}" aria-label="${escapeText(`${status}: ${weeksData[wk].title}`)}"><span class="archive-item-status">${escapeText(status)}</span> ${escapeText(weeksData[wk].title)}</button>`;
    }).join('');

    archiveContainer.querySelectorAll('.archive-item').forEach((button) => {
      button.addEventListener('click', function () {
        renderEarningsWeek(this.dataset.week, weeksData, currentWeekKey);
      });
    });
  }
}

if (visual) {
  visual.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      visual.click();
    }
  });
  visual.setAttribute('tabindex', '0');
}

if (isMakroPage) {
  const weeklyEvents = window.NTM_WEEKLY_EVENTS || {};
  const macroWeeks = weeklyEvents.macroWeeks || {
    '2026-W37': { label: 'Vecka 37', title: 'Vecka 37', fallbackImage: './images/makro/week-37.png', events: [] },
    '2026-W36': { label: 'Vecka 36', title: 'Vecka 36', fallbackImage: './images/makro/week-36.png', events: [] }
  };
  const currentWeekKey = getIsoWeekKeyForDate();
  const displayMacroWeeks = { ...macroWeeks };
  if (!displayMacroWeeks[currentWeekKey]) {
    displayMacroWeeks[currentWeekKey] = createEmptyMacroWeek(currentWeekKey);
  }
  renderMacroWeek(currentWeekKey, displayMacroWeeks);
  renderMacroArchive(currentWeekKey, displayMacroWeeks, currentWeekKey);
} else {
  const currentWeekKey = getIsoWeekKeyForDate();
  const initialWeek = getInitialEarningsWeek(earningsWeekData, currentWeekKey);
  renderEarningsWeek(initialWeek, earningsWeekData, currentWeekKey);
}
