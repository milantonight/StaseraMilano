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
  map = L.map('map').setView([45.4642, 9.1900], 13);

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
// Init
// =======================
document.addEventListener('DOMContentLoaded', () => {
  setupAttendance();
  setupMap();
  setupCreateEventButton()
});
// =======================
// Storage keys
// =======================
const ATTEND_KEY = 'staseraMilano_attendance_v1';
const EVENTS_KEY = 'staseraMilano_events_v1';

// =======================
// Helpers: storage
// =======================
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// =======================
// Attendance (localStorage)
// =======================
function setupAttendance() {
  const state = loadJSON(ATTEND_KEY, {});

  // Restore counts + button states from storage
  document.querySelectorAll('.card').forEach(card => {
    const id = card.id;
    if (!id) return;

    const countSpan = card.querySelector('.count');
    const btn = card.querySelector('.attend-btn');
    if (!countSpan || !btn) return;

    if (state[id]?.count !== undefined) countSpan.textContent = state[id].count;
    if (state[id]?.active) {
      btn.textContent = 'Ci sei ✔';
      btn.classList.add('active');
      btn.style.borderColor = '#0a7';
      btn.style.color = '#0a7';
    }
  });

  // Click handler (delegate-safe: we attach per button after render too)
  document.querySelectorAll('.attend-btn').forEach(btn => attachAttendHandler(btn));
}

function attachAttendHandler(btn) {
  if (btn.dataset.bound === '1') return;
  btn.dataset.bound = '1';

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

    const state = loadJSON(ATTEND_KEY, {});
    state[eventId] = { count, active: true };
    saveJSON(ATTEND_KEY, state);
  });
}

// =======================
// Map (Leaflet + OSM)
// =======================
let map;
let markersLayer;

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  map = L.map('map').setView([45.4642, 9.1900], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Markers from static cards
  document.querySelectorAll('.card').forEach(card => {
    const isUser = card.dataset.user === '1';
    // We will add user events separately
    if (!isUser) addMarkerFromCard(card);
  });

  // Markers from user events (storage)
  const userEvents = loadJSON(EVENTS_KEY, []);
  userEvents.forEach(ev => addMarkerFromEvent(ev));
}

function scrollToEvent(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.style.outline = '2px solid #111';
  setTimeout(() => (el.style.outline = 'none'), 1200);
}

function addMarkerFromCard(card) {
  const id = card.id;
  const lat = parseFloat(card.dataset.lat);
  const lng = parseFloat(card.dataset.lng);
  const place = card.dataset.place || '';
  const mapsUrl = card.dataset.maps || '#';
  if (!id || isNaN(lat) || isNaN(lng) || !markersLayer) return;

  const title = card.querySelector('.title')?.textContent || 'Evento';
  const meta = card.querySelector('.meta')?.textContent || '';

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

  const marker = L.marker([lat, lng]).addTo(markersLayer);
  marker.bindPopup(popupHtml);
  marker.on('popupopen', () => {
    const btn = document.querySelector(`button[data-jump="${id}"]`);
    if (btn) btn.onclick = () => scrollToEvent(id);
  });
}

function addMarkerFromEvent(ev) {
  if (!markersLayer) return;
  const id = ev.id;
  const lat = ev.lat;
  const lng = ev.lng;
  const mapsUrl = ev.mapsUrl;
  const place = ev.place || '';
  const title = ev.title || 'Evento';
  const meta = `${ev.time || 'Stasera'} • ${place}`;

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

  const marker = L.marker([lat, lng]).addTo(markersLayer);
  marker.bindPopup(popupHtml);
  marker.on('popupopen', () => {
    const btn = document.querySelector(`button[data-jump="${id}"]`);
    if (btn) btn.onclick = () => scrollToEvent(id);
  });
}

// =======================
// User events (Create Event local-only)
// =======================
function setupUserEventsFromStorage() {
  const section = document.getElementById('userEventsSection');
  const grid = document.getElementById('userEventsGrid');
  if (!section || !grid) return;

  const events = loadJSON(EVENTS_KEY, []);
  if (!events.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  grid.innerHTML = '';
  events.forEach(ev => {
    grid.appendChild(buildUserEventCard(ev));
  });

  // bind attendance handlers for new cards
  grid.querySelectorAll('.attend-btn').forEach(btn => attachAttendHandler(btn));
}

function buildUserEventCard(ev) {
  const card = document.createElement('article');
  card.className = 'card';
  card.id = ev.id;
  card.dataset.user = '1';
  card.dataset.lat = ev.lat;
  card.dataset.lng = ev.lng;
  card.dataset.place = ev.place;
  card.dataset.maps = ev.mapsUrl;

  card.innerHTML = `
    <p class="title">${escapeHtml(ev.title)}</p>
    <p class="meta">${escapeHtml(ev.time)} • ${escapeHtml(ev.place)} • creato da te</p>
    <p class="meta"><span class="count">${escapeHtml(String(ev.initialCount || 0))}</span> persone ci sono</p>

    <div class="tags">
      <span class="tag">🟢 Aperto a chi non si conosce</span>
      <span class="tag">${escapeHtml(ev.cost)}</span>
      <span class="tag">${escapeHtml(ev.requirements)}</span>
      <span class="tag">${escapeHtml(ev.distanceHint)}</span>
    </div>

    <div class="cta">
      <a class="primary attend-btn" href="#" data-event="${escapeHtml(ev.id)}">Ci sono</a>
      <a href="${ev.mapsUrl}" target="_blank" rel="noreferrer">Apri su Maps</a>
    </div>
  `;

  return card;
}

let pendingEventDraft = null;
let pendingClickHandler = null;

function openCreateEventDialog() {
  const title = prompt('Titolo evento (es: "Pizza + film", "Corsa easy", "Scacchi al bar")');
  if (!title) return;

  const time = prompt('Orario (es: "20:30")', '20:30');
  if (!time) return;

  const place = prompt('Luogo (es: "Darsena", "Parco Sempione", "Isola")');
  if (!place) return;

  const cost = prompt('Costo (es: "€0" oppure "€5 max")', '€0') || '€0';
  const requirements = prompt('Requisiti (es: "Porta: niente", "Scarpe comode")', 'Porta: niente') || 'Porta: niente';
  const distanceHint = prompt('Etichetta distanza (es: "Facile", "Vicino", "Metro ok")', 'Vicino') || 'Vicino';

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place + ' Milano')}`;

  pendingEventDraft = {
    id: 'user-' + Date.now(),
    title,
    time,
    place,
    cost,
    requirements,
    distanceHint,
    mapsUrl,
    initialCount: 0
  };

  if (!map) {
    alert('La mappa non è pronta. Ricarica la pagina e riprova.');
    pendingEventDraft = null;
    return;
  }

  enableMapPickMode();
}

function enableMapPickMode() {
  // Rimuovi eventuale handler precedente
  if (pendingClickHandler) {
    map.off('click', pendingClickHandler);
    pendingClickHandler = null;
  }

  const btn = document.getElementById('createEventBtn');
  if (btn) btn.textContent = 'Clicca un punto sulla mappa…';

  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.style.cursor = 'crosshair';

  alert('Adesso clicca un punto sulla mappa dove si svolge l’evento.');

  pendingClickHandler = function (e) {
    const { lat, lng } = e.latlng;
    const ev = { ...pendingEventDraft, lat, lng };

    // Salva evento (local-only)
    const events = loadJSON(EVENTS_KEY, []);
    events.unshift(ev);
    saveJSON(EVENTS_KEY, events);

    // Render + marker
    setupUserEventsFromStorage();
    addMarkerFromEvent(ev);

    // Reset modalità
    disableMapPickMode();

    // Vai all’evento creato
    scrollToEvent(ev.id);
  };

  map.on('click', pendingClickHandler);
}

function disableMapPickMode() {
  if (map && pendingClickHandler) {
    map.off('click', pendingClickHandler);
    pendingClickHandler = null;
  }
  pendingEventDraft = null;

  const btn = document.getElementById('createEventBtn');
  if (btn) btn.textContent = '+ Crea un evento';

  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.style.cursor = '';
}


function setupCreateEventButton() {
  const btn = document.getElementById('createEventBtn');
  if (!btn) return;
  btn.addEventListener('click', () => openCreateEventDialog());
}

// =======================
// Init
// =======================
document.addEventListener('DOMContentLoaded', () => {
  setupAttendance();
  setupMap();
  setupUserEventsFromStorage();
  setupCreateEventButton();
});
