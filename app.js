// =======================
// Attendance (localStorage)
// =======================
const STORAGE_KEY = 'staseraMilano_attendance_v1';

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setupAttendance() {
  const state = loadState();

  // Restore counts + button states from storage
  document.querySelectorAll('.card').forEach(card => {
    const id = card.id;
    if (!id) return;

    const countSpan = card.querySelector('.count');
    const btn = card.querySelector('.attend-btn');
    if (!countSpan || !btn) return;

    if (state[id]?.count !== undefined) {
      countSpan.textContent = state[id].count;
    }
    if (state[id]?.active) {
      btn.textContent = 'Ci sei ✔';
      btn.classList.add('active');
      btn.style.borderColor = '#0a7';
      btn.style.color = '#0a7';
    }
  });

  // Click handler
  document.querySelectorAll('.attend-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();

      const eventId = this.dataset.event;
      if (!eventId) return;
      if (this.classList.contains('active')) return;

      const card = document.getElementById(eventId);
      if (!card) return;

      const countSpan = card.querySelector('.count');
      let count = parseInt(countSpan.textContent, 10);
      if (isNaN(count)) count = 0;

      count += 1;
      countSpan.textContent = count;

      this.textContent = 'Ci sei ✔';
      this.classList.add('active');
      this.style.borderColor = '#0a7';
      this.style.color = '#0a7';

      const next = loadState();
      next[eventId] = { count, active: true };
      saveState(next);
    });
  });
}

// =======================
// Map (Leaflet + OSM)
// =======================
function setupMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  // Center Milano (Duomo)
  const map = L.map('map').setView([45.4642, 9.1900], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  function scrollToEvent(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.style.outline = '2px solid #111';
    setTimeout(() => (el.style.outline = 'none'), 1200);
  }

  // Build markers from DOM cards (so you edit events in one place)
  document.querySelectorAll('.card').forEach(card => {
    const id = card.id;
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);
    const place = card.dataset.place || '';
    const mapsUrl = card.dataset.maps || '#';

    if (!id || isNaN(lat) || isNaN(lng)) return;

    const titleEl = card.querySelector('.title');
    const metaEl = card.querySelector('.meta');
    const title = titleEl ? titleEl.textContent : 'Evento';
    const meta = metaEl ? metaEl.textContent : '';

    const popupHtml = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
        <div style="font-weight:700;margin-bottom:4px;">${escapeHtml(title)}</div>
        <div style="color:#555;margin-bottom:8px;">${escapeHtml(meta)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button data-jump="${id}" style="padding:8px 10px;border:1px solid #111;border-radius:10px;background:#fff;cursor:pointer;font-weight:600;">
            Vedi dettagli
          </button>
          <a href="${mapsUrl}" target="_blank" rel="noreferrer"
             style="display:inline-block;padding:8px 10px;border:1px solid #ccc;border-radius:10px;text-decoration:none;color:#111;">
            Apri su Maps
          </a>
        </div>
        <div style="margin-top:8px;color:#555;font-size:12px;">${escapeHtml(place)}</div>
      </div>
    `;

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(popupHtml);

    marker.on('popupopen', () => {
      const btn = document.querySelector(`button[data-jump="${id}"]`);
      if (btn) btn.onclick = () => scrollToEvent(id);
    });
  });

  // Tiny HTML escape (for safety in popup)
  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}

// =======================
// Placeholder button
// =======================
function setupCreateEventPlaceholder() {
  const btn = document.getElementById('createEventBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    alert('V1: “Crea evento” arriva dopo. Per ora stiamo validando l’idea.');
  });
}

// =======================
// Init
// =======================
document.addEventListener('DOMContentLoaded', () => {
  setupAttendance();
  setupMap();
  setupCreateEventPlaceholder();
});
