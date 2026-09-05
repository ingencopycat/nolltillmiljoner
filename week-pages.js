const isMakroPage = window.location.pathname.toLowerCase().includes('makro');

const weekData = {
  '37': {
    title: 'Vecka 37',
    label: 'Vecka 37',
    image: isMakroPage ? './images/makro/week-37.png' : './images/rapporter/week-37.png'
  },
  '36': {
    title: 'Vecka 36',
    label: 'Vecka 36',
    image: isMakroPage ? './images/makro/week-36.png' : './images/rapporter/week-36.png'
  }
};

const archiveContainer = document.getElementById('weekArchive');
const visual = document.getElementById('weekVisual');
const label = document.getElementById('currentWeekLabel');
const title = document.getElementById('currentWeekTitle');
const weeks = Object.keys(weekData).sort((a, b) => Number(b) - Number(a));
const latestWeek = weeks[0];

function openLightbox(imageUrl) {
  if (window.NTMLightbox) {
    window.NTMLightbox.open([{ src: imageUrl, alt: 'Veckans bild' }]);
  }
}

function renderWeek(weekKey) {
  const item = weekData[weekKey];
  if (!item) return;

  if (visual) {
    visual.style.background = `linear-gradient(135deg, rgba(10, 15, 22, 0.16), rgba(10, 15, 22, 0.24)), url('${item.image}') center/contain no-repeat`;
    visual.title = `Öppna bild för ${item.title}`;
    visual.onclick = () => openLightbox(item.image);
  }

  if (label) {
    label.textContent = item.label;
  }

  if (title) {
    title.textContent = item.title;
  }

  if (archiveContainer) {
    archiveContainer.innerHTML = weeks.map((week) => {
      const activeClass = week === weekKey ? 'active' : '';
      return `<button type="button" class="archive-item ${activeClass}" data-week="${week}">${weekData[week].title}</button>`;
    }).join('');

    archiveContainer.querySelectorAll('.archive-item').forEach((button) => {
      button.addEventListener('click', function () {
        renderWeek(this.dataset.week);
      });
    });
  }
}

if (visual) {
  visual.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightbox(weekData[latestWeek].image);
    }
  });
  visual.setAttribute('tabindex', '0');
}

renderWeek(latestWeek);
