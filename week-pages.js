const isMakroPage = window.location.pathname.toLowerCase().includes('makro');

const earningsWeekData = {
  '2026-W37': {
    title: 'Vecka 37',
    label: 'Vecka 37',
    image: './images/rapporter/week-37.png'
  },
  '2026-W36': {
    title: 'Vecka 36',
    label: 'Vecka 36',
    image: './images/rapporter/week-36.png'
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

function getIsoWeekKeyForDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
  const stockholmDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const day = stockholmDate.getUTCDay() || 7;
  stockholmDate.setUTCDate(stockholmDate.getUTCDate() + 4 - day);
  const isoYear = stockholmDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil((((stockholmDate - yearStart) / 86400000) + 1) / 7);
  return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
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
  return String(val);
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
      if (meta.lastSuccessfulUpdate) {
        try {
          const updateDate = new Date(meta.lastSuccessfulUpdate);
          const updateFormatted = new Intl.DateTimeFormat('sv-SE', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Stockholm'
          }).format(updateDate);
          updateInfo = `Uppdaterad: ${updateFormatted} (officiella källor)`;
        } catch (e) {
          updateInfo = '';
        }
      }

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
                const hasDetails = (event.description && event.description.trim().length > 0) || (event.source && event.source.trim().length > 0) || (event.sourceUrl && event.sourceUrl.trim().length > 0);
                const isRevised = !!event.isRevised;

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
                            <span class="macro-metric-label">Prognos</span>
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
        <p class="ntm-empty-state">Inga makrohändelser inlagda för veckan.</p>
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

function renderEarningsWeek(weekKey, weeksData) {
  const item = weeksData[weekKey];
  if (!item) return;

  if (visual) {
    visual.classList.remove('hidden');
    visual.style.background = `linear-gradient(135deg, rgba(10, 15, 22, 0.16), rgba(10, 15, 22, 0.24)), url('${item.image}') center/contain no-repeat`;
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
    const keys = Object.keys(weeksData).sort((a, b) => b.localeCompare(a));
    archiveContainer.innerHTML = keys.map((wk) => {
      const activeClass = wk === weekKey ? 'active' : '';
      return `<button type="button" class="archive-item ${activeClass}" data-week="${wk}">${escapeText(weeksData[wk].title)}</button>`;
    }).join('');

    archiveContainer.querySelectorAll('.archive-item').forEach((button) => {
      button.addEventListener('click', function () {
        renderEarningsWeek(this.dataset.week, weeksData);
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
  const weekKeys = Object.keys(earningsWeekData).sort((a, b) => b.localeCompare(a));
  const latest = weekKeys[0] || '2026-W37';
  renderEarningsWeek(latest, earningsWeekData);
}
