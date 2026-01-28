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

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// =======================
// Attendance (localStorage)
// =======================
function setupAttendance() {
  const state = loadJSON(ATTEND_KEY, {});

  // Restore counts + button states
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

  // Bind handlers
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
    let count = parseInt(countSpan?.textContent || '0', 10);
    if (isNaN(count)) count = 0;

    count += 1;
    if (countSpan) countSpan.textContent = count;

    this.textContent = 'Ci sei ✔';
    this.classList.add('active');

    const state = loadJSON(ATTEND_KEY, {});
    state[eventId] = { count, active: true };
    saveJSON(ATTEND_KEY, state);
  });
}

// =======================
// Map (Leaflet + OSM)
// =======================
let map = null;
let markersLayer = null;

let userLocation = null;     // { lat, lng }
let userMarker = null;

const markerByEventId = new Map(); // eventId -> marker

function setupMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  map = L.map('map').setView([45.4642, 9.1900], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Static markers from DOM cards
  document.querySelectorAll('.card').forEach(card => {
    // Se in futuro vuoi distinguere eventi “user”, lo fai con card.dataset.user === '1'
    addMarkerFromCard(card);
  });

  // User events from storage
  const userEvents = loadJSON(EVENTS_KEY, []);
  userEvents.forEach(ev => addMarkerFromEvent(ev));

  setupNearMeSelect();
}

function addMarkerFromCard(card) {
  if (!markersLayer) return;

  const id = card.id;
  const lat = parseFloat(card.dataset.lat);
  const lng = parseFloat(card.dataset.lng);
  const place = card.dataset.place || '';
  const mapsUrl = card.dataset.maps || '#';
  if (!id || isNaN(lat) || isNaN(lng)) return;

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
  markerByEventId.set(id, marker);
  marker.bindPopup(popupHtml);
  marker.on('popupopen', () => {
    const btn = document.querySelector(`button[data-jump="${id}"]`);
    if (btn) btn.onclick = () => scrollToEvent(id);
  });
}

function addMarkerFromEvent(ev) {
  if (!markersLayer || !ev) return;

  const id = ev.id;
  const lat = Number(ev.lat);
  const lng = Number(ev.lng);
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

  const mapsUrl = ev.mapsUrl || '#';
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
  markerByEventId.set(id, marker);
  marker.bindPopup(popupHtml);
  marker.on('popupopen', () => {
    const btn = document.querySelector(`button[data-jump="${id}"]`);
    if (btn) btn.onclick = () => scrollToEvent(id);
  });
}

function scrollToEvent(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.style.outline = '2px solid #111';
  setTimeout(() => (el.style.outline = 'none'), 1200);
}

function setupNearMeSelect() {
  const select = document.getElementById('areaSelect');
  if (!select || !map) return;

  select.addEventListener('change', () => {
    const value = String(select.value || '');
    if (!value.toLowerCase().includes('vicino')) return;

    requestUserLocationImmediately(true);
  });
}

function requestUserLocationImmediately(focusNearest = false) {
  if (!navigator.geolocation || !map) {
    console.log('[geo] geolocation o map non disponibili', { hasGeo: !!navigator.geolocation, hasMap: !!map });
    return;
  }

  console.log('[geo] richiesta posizione...');

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      console.log('[geo] OK', pos.coords);

      userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      if (userMarker) {
        userMarker.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        userMarker = L.circleMarker([userLocation.lat, userLocation.lng], { radius: 8 })
          .addTo(map)
          .bindPopup('Tu sei qui');
      }

      map.setView([userLocation.lat, userLocation.lng], 14);

      if (focusNearest) focusNearestEvent();
    },
    (err) => {
      console.log('[geo] ERRORE', err.code, err.message);
      // niente panico: restiamo su Milano
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
  );
  updateDistanceBadges();

}


function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}
function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// stima rozza ma utile: 4.8 km/h ~ 80 m/min
function estimateWalkMinutes(meters) {
  if (!Number.isFinite(meters)) return null;
  return Math.max(1, Math.round(meters / 80));
}

function updateDistanceBadges() {
  if (!userLocation) return;
  console.log('[dist] updateDistanceBadges chiamata, userLocation=', userLocation);

  const cards = getAllEventCards();
  
  cards.forEach(card => {
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);
    const d = distanceMeters(userLocation, { lat, lng });

    const distEl = card.querySelector('[data-distance]');
    if (!distEl) return;

    const mins = estimateWalkMinutes(d);
    distEl.textContent = `📍 ${formatDistance(d)} • ~${mins} min a piedi`;
  });
  console.log('[dist] cards=', cards.length, 'badges=', document.querySelectorAll('[data-distance]').length);

}


function getAllEventCards() {
  return Array.from(document.querySelectorAll('.card')).filter(card => {
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);
    return card.id && !isNaN(lat) && !isNaN(lng);
  });
}

function focusNearestEvent() {
  if (!userLocation || !map) return;

  const cards = getAllEventCards();
  if (!cards.length) return;

  let best = null;
  let bestDist = Infinity;

  cards.forEach(card => {
    const lat = parseFloat(card.dataset.lat);
    const lng = parseFloat(card.dataset.lng);
    const d = distanceMeters(userLocation, { lat, lng });
    if (d < bestDist) {
      bestDist = d;
      best = card;
    }
  });

  if (!best) return;

  const lat = parseFloat(best.dataset.lat);
  const lng = parseFloat(best.dataset.lng);
  map.setView([lat, lng], 14);

  const marker = markerByEventId.get(best.id);
  if (marker) marker.openPopup();

  scrollToEvent(best.id);
}
// =======================
// Filters (Solo mode)
// =======================
const SOLO_KEY = 'staseraMilano_soloMode_v1';

function setupSoloMode() {
  const cb = document.getElementById('soloMode');
  if (!cb) return;

  // restore
  const saved = loadJSON(SOLO_KEY, { on: false });
  cb.checked = !!saved.on;

  // apply once on load
  applySoloFilter(cb.checked);

  cb.addEventListener('change', () => {
    saveJSON(SOLO_KEY, { on: cb.checked });
    applySoloFilter(cb.checked);
  });
}

function applySoloFilter(on) {
  const cards = Array.from(document.querySelectorAll('.card'));
  cards.forEach(card => {
    if (!on) {
      card.hidden = false;
      return;
    }

    // Heuristica semplice: se dentro ai tag/meta c'è una di queste parole, è "ansia bassa"
    const text = card.innerText.toLowerCase();
    const ok =
      text.includes('volti nuovi') ||
      text.includes('zero pressione') ||
      text.includes('nessun invito') ||
      text.includes('principianti') ||
      text.includes('tranquillo') ||
      text.includes('easy');
      text.includes('Aperto a tutti');
    card.hidden = !ok;
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
  events.forEach(ev => grid.appendChild(buildUserEventCard(ev)));

  // bind attendance handlers for new cards
  grid.querySelectorAll('.attend-btn').forEach(btn => attachAttendHandler(btn));
   updateDistanceBadges();
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
    <p class="meta distance" data-distance>📍 —</p>
    <p class="meta"><span class="count">${escapeHtml(String(ev.initialCount || 0))}</span> già persone ci sono</p>
  

    <div class="tags">
      <span class="tag">🟢 Volti Nuovi Benvenuti!</span>
      <span class="tag">${escapeHtml(ev.cost || '€0')}</span>
      <span class="tag">${escapeHtml(ev.requirements || 'Porta: niente')}</span>
      <span class="tag">${escapeHtml(ev.distanceHint || 'Vicino')}</span>
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

function setupCreateEventButton() {
  const btn = document.getElementById('createEventBtn');
  if (!btn) return;
  btn.addEventListener('click', openCreateEventDialog);
  const cancelBtn = document.getElementById('cancelCreateBtn');
  if (cancelBtn) cancelBtn.addEventListener('click', disableMapPickMode);

}

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
  if (pendingClickHandler) {
    map.off('click', pendingClickHandler);
    pendingClickHandler = null;
  }
  const cancelBtn = document.getElementById('cancelCreateBtn');
  if (cancelBtn) cancelBtn.hidden = false;

  const btn = document.getElementById('createEventBtn');
  if (btn) btn.textContent = 'Clicca un punto sulla mappa…';

  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.style.cursor = 'crosshair';

  alert('Adesso clicca un punto sulla mappa dove si svolge l’evento.');

  pendingClickHandler = function (e) {
    const { lat, lng } = e.latlng;
    const ev = { ...pendingEventDraft, lat, lng };

    const events = loadJSON(EVENTS_KEY, []);
    events.unshift(ev);
    saveJSON(EVENTS_KEY, events);

    setupUserEventsFromStorage();
    addMarkerFromEvent(ev);

    disableMapPickMode();
    scrollToEvent(ev.id);
  };

  map.on('click', pendingClickHandler);
   updateDistanceBadges();
  
}

function disableMapPickMode() {
  if (map && pendingClickHandler) {
    map.off('click', pendingClickHandler);
    pendingClickHandler = null;
  }
  pendingEventDraft = null;
    const cancelBtn = document.getElementById('cancelCreateBtn');
  if (cancelBtn) cancelBtn.hidden = true;


  const btn = document.getElementById('createEventBtn');
  if (btn) btn.textContent = '+ Crea un evento';

  const mapEl = document.getElementById('map');
  if (mapEl) mapEl.style.cursor = '';
}

// =======================
// Init (UNA volta sola)
// =======================
document.addEventListener('DOMContentLoaded', () => {
  setupAttendance();
  setupMap();
  setupUserEventsFromStorage();
  setupCreateEventButton();
  setupSoloMode();
  // Se vuoi che chieda subito la posizione e vada al più vicino:
  requestUserLocationImmediately(true);
});

