// ════════════════════════════════════════════════════════════════
//  rooms.js — doll.gg /rooms — voice / video / chat rooms (LiveKit)
// ════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// LiveKit is loaded lazily when a user first enters a room so a CDN
// hiccup never kills the lobby buttons.
let _lk = null;
async function ensureLk() {
  if (!_lk) _lk = await import('https://esm.sh/livekit-client@2');
  return _lk;
}

// ── § CONFIG ─────────────────────────────────────────────────────
const VERSION        = '2026-06-30.29';
const SUPABASE_URL   = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const SUPABASE_ANON  = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const LIVEKIT_WS_URL = 'wss://pawsweb-z0kamke4.livekit.cloud';
const ROOM_SELECT    = 'id, slug, title, status, locked, audience_mode, host_nickname, host_accent, member_count, created_at, ended_at, participant_previews';
const ADMIN_UID      = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } },
});

// 8 distinct pastel/muted colors + 5 vivid/shiny colors.
// SHINY_COLORS are displayed with a glow effect in the picker.
const NORMAL_COLORS = [
  '#f08ab5', // pink
  '#c4a0d4', // lavender
  '#7ab8d4', // sky blue
  '#8ec4a0', // mint
  '#d4b07a', // tan
  '#d47aaa', // deep pink
  '#e8875a', // terracotta
  '#c8b054', // gold-olive
];
const SHINY_COLORS = [
  '#ff5fa0', '#9b55ff', '#00b8f5', '#00d47a', '#ffb300',
];
const ACCENT_COLORS = [...NORMAL_COLORS, ...SHINY_COLORS];

function safeAccent(value, fallback = ACCENT_COLORS[0]) {
  const s = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(s) ? s : fallback;
}

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_IMG_BYTES = 15 * 1024 * 1024; // 15 MB

const ADJECTIVES = ['soft','rosy','velvet','hazy','lunar','dewy','misty','coral','dusty','silky'];
const NOUNS      = ['echo','bloom','drift','glow','mist','haze','petal','wisp','veil','lace'];

// ── § ICONS ───────────────────────────────────────────────────────
// Inline SVGs — no emoji anywhere. Inherit color via fill="currentColor".
const _svg = (d) => `<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;
const ICON = {
  people: _svg('M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z'),
  lock:   _svg('M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm3 11c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z'),
  cam:    _svg('M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z'),
  screen: _svg('M20 3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h6l-2 3v1h8v-1l-2-3h6c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 13H4V5h16v11z'),
  mic:    _svg('M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z'),
  micOff: _svg('M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z'),
  fullscreen: _svg('M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z'),
  // Two-arrow rotate icon — clearly means "switch/flip"
  flipCam:    _svg('M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z'),
  ghost:  _svg('M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17C11.06 6.49 11.51 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'),
  image:  _svg('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'),
  dots:   _svg('M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'),
  end:    _svg('M6 6h12v12H6z'),
};


// ── § STATE ───────────────────────────────────────────────────────
const state = {
  view: 'lobby',
  user: { nickname: '', sessionId: '', role: 'guest', ghost: false, avatar: '', color: '' },
  rooms: [],
  room: null,
  participants: [],
  chat: [],
  // micOn   = currently transmitting (unmuted)
  // wantsMic = user's preferred mic state, used to restore after reconnects/forced mutes
  // micReady = device acquired & track published (stays true once enabled; mute keeps the
  //            device live so unmute is instant and the OS keeps the mic indicator on)
  media: { micOn: false, wantsMic: false, wantsCamera: false, micReady: false, serverMuted: false, deafened: false, cameraOn: false, screenOn: false, _preDeafenMicOn: false, _preServerMuteWantsMic: false, hasMultipleCameras: false, flipCamFacing: 'user', _localScreenAudioTrack: null },
  settings: {
    micDeviceId: 'default', speakerDeviceId: 'default', cameraDeviceId: 'default',
    cameraResolution: '720p',
    noiseSuppression: true, joinSound: true, mirrorSelf: true,
  },
  ui: { settingsOpen: false, chatHidden: false },
  _pendingAction: null,
  _sbPresenceChan: null,
  _sbChatSub:      null,
  _sbRoomStatusSub: null,
  _sbModerationSub: null,
  kickedSessionIds: new Set(),
  _lkRoom:           null,
  _localMicTrack:    null,
  _localCamTrack:    null,
  _localScreenTrack: null,
};

// Module-level room-list subscription (stays alive across lobby visits)
let _sbRoomListSub = null;
let _sbLockdownSub = null;
let _qualityMap = {}; // sessionId → LiveKit ConnectionQuality string
let _pendingParticipantRender = false; // deferred re-render while video is fullscreen
let _sharingOrder   = new Map(); // sessionId → monotonic rank (lower = started sharing earlier)
let _sharingCounter = 0;
let _videoAspectRatio = {}; // sessionId → { w, h } once a camera's real aspect ratio is known
let _repackTimer = null;    // debounce handle for scheduleRepack()

// ── § DEBUG LOGGER ────────────────────────────────────────────────
// Silent in production. Enable with: localStorage.setItem('dg_debug', '1')
// Never logs tokens, session IDs, or message content.
function dbg(tag, ...args) {
  if (!localStorage.getItem('dg_debug')) return;
  console.log(`[rooms:${tag}]`, new Date().toISOString().slice(11, 23), ...args);
}

// ── § EVENT LOG ───────────────────────────────────────────────────
// Privacy-safe structured event log. Never records nicknames, session IDs,
// message bodies, tokens, auth keys, or data URLs.
// Circular buffer (last 200 entries); accessible in DevTools via:
//   copy(JSON.stringify(window.__roomsLog, null, 2))
const _evtLog = [];
const _EVT_MAX = 200;
function logEvent(cat, evt, data = {}) {
  const entry = { t: Date.now(), cat, evt, ...data };
  _evtLog.push(entry);
  if (_evtLog.length > _EVT_MAX) _evtLog.shift();
  if (cat === 'error') console.error(`[rooms:${evt}]`, data);
}
window.__roomsLog = _evtLog;

// ── § IDENTITY ────────────────────────────────────────────────────
// Profile photos & chosen colors live only in localStorage + ephemeral
// presence — never in the database. They travel with you, but nothing is
// stored server-side.
const LS = {
  nick:        'dg_rooms_nick',
  sid:         'dg_rooms_sid',
  avatar:      'dg_rooms_avatar',
  color:       'dg_rooms_color',
  hostKeys:    'dg_rooms_host_keys',
  settings:    'dg_rooms_settings',
};

function loadHostKeys() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS.hostKeys) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function getHostKey(slug) {
  const key = loadHostKeys()[slug];
  return typeof key === 'string' ? key : '';
}

function saveHostKey(slug, key) {
  if (!slug || !key) return;
  const keys = loadHostKeys();
  keys[slug] = key;
  localStorage.setItem(LS.hostKeys, JSON.stringify(keys));
}

function forgetHostKey(slug) {
  if (!slug) return;
  const keys = loadHostKeys();
  delete keys[slug];
  localStorage.setItem(LS.hostKeys, JSON.stringify(keys));
}

function isHostForRoom(roomOrSlug) {
  const slug = typeof roomOrSlug === 'string' ? roomOrSlug : roomOrSlug?.slug;
  return !!getHostKey(slug);
}

async function loadIdentity() {
  // One-time migration from the old /voice/ keys so existing visitors keep their name.
  for (const [oldK, newK] of [['dg_voice_nick', LS.nick], ['dg_voice_sid', LS.sid]]) {
    const old = localStorage.getItem(oldK);
    if (old && !localStorage.getItem(newK)) localStorage.setItem(newK, old);
  }

  const nick   = localStorage.getItem(LS.nick);
  const sid    = localStorage.getItem(LS.sid) || crypto.randomUUID();
  localStorage.setItem(LS.sid, sid);
  state.user.sessionId = sid;
  if (nick) state.user.nickname = nick;
  state.user.avatar = localStorage.getItem(LS.avatar) || '';
  state.user.color  = safeAccent(localStorage.getItem(LS.color), '');

  // Admin detection: verify via Supabase Auth session (set when logged in at /admin/rooms/).
  // The localStorage flag only grants ghost mode; full admin powers require a real auth session.
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user?.id === ADMIN_UID) state.user.isAdmin = true;
  } catch { /* not logged in — not an error */ }
}

async function getAdminJwt() {
  if (!state.user.isAdmin) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    return session?.access_token || null;
  } catch { return null; }
}

function _loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS.settings) || '{}');
    if (typeof saved.noiseSuppression === 'boolean') state.settings.noiseSuppression = saved.noiseSuppression;
    if (typeof saved.joinSound        === 'boolean') state.settings.joinSound        = saved.joinSound;
    if (typeof saved.mirrorSelf       === 'boolean') state.settings.mirrorSelf       = saved.mirrorSelf;
    if (['720p', '1080p'].includes(saved.cameraResolution)) state.settings.cameraResolution = saved.cameraResolution;
    if (typeof saved.micDeviceId     === 'string' && saved.micDeviceId)     state.settings.micDeviceId     = saved.micDeviceId;
    if (typeof saved.speakerDeviceId === 'string' && saved.speakerDeviceId) state.settings.speakerDeviceId = saved.speakerDeviceId;
    if (typeof saved.cameraDeviceId  === 'string' && saved.cameraDeviceId)  state.settings.cameraDeviceId  = saved.cameraDeviceId;
  } catch {}
}

function _saveSettings() {
  try {
    localStorage.setItem(LS.settings, JSON.stringify({
      noiseSuppression: state.settings.noiseSuppression,
      joinSound:        state.settings.joinSound,
      mirrorSelf:       state.settings.mirrorSelf,
      cameraResolution: state.settings.cameraResolution,
      micDeviceId:      state.settings.micDeviceId,
      speakerDeviceId:  state.settings.speakerDeviceId,
      cameraDeviceId:   state.settings.cameraDeviceId,
    }));
  } catch {}
}

// Persist name + optional photo (data URL) + optional chosen color.
function saveIdentity({ nick, avatar, color }) {
  const clean = nick.trim().replace(/\s+/g, '_').slice(0, 24);
  state.user.nickname = clean;
  localStorage.setItem(LS.nick, clean);

  state.user.avatar = avatar || '';
  if (avatar) localStorage.setItem(LS.avatar, avatar);
  else        localStorage.removeItem(LS.avatar);

  state.user.color = safeAccent(color, '');
  if (state.user.color) localStorage.setItem(LS.color, state.user.color);
  else                  localStorage.removeItem(LS.color);
}

function accentForNick(nick) {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return ACCENT_COLORS[h % ACCENT_COLORS.length];
}

// My display color: chosen color wins, else a stable hash of the name.
function myAccent() {
  return safeAccent(state.user.color, accentForNick(state.user.nickname || '?'));
}

// Render an avatar: a photo if present, otherwise the first initial on a color chip.
function avatarInner(nickname, accent, avatar) {
  if (avatar) return `<img class="avatar-img" src="${escHtml(avatar)}" alt="">`;
  return escHtml((nickname || '?')[0].toUpperCase());
}

// Downscale an image File to a data URL. maxPx caps the longest edge.
// Canvas re-encode strips EXIF and validates actual image content.
function fileToDataUrl(file, maxPx, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(Object.assign(new Error('no file'), { code: 'NO_FILE' })); return; }
    if (file.size > MAX_IMG_BYTES) { reject(Object.assign(new Error('too large'), { code: 'TOO_LARGE' })); return; }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) { reject(Object.assign(new Error('unsupported type'), { code: 'BAD_TYPE' })); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const scale = Math.min(1, maxPx / Math.max(w, h));
      w = Math.round(w * scale); h = Math.round(h * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(Object.assign(new Error('decode failed'), { code: 'DECODE_FAILED' })); };
    img.src = url;
  });
}

// Encode a single image file at two quality levels in one pass.
// Returns { thumb, full } as JPEG data URLs.
function fileToThumbAndFull(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(Object.assign(new Error('no file'), { code: 'NO_FILE' })); return; }
    if (file.size > MAX_IMG_BYTES) { reject(Object.assign(new Error('too large'), { code: 'TOO_LARGE' })); return; }
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) { reject(Object.assign(new Error('unsupported type'), { code: 'BAD_TYPE' })); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxLong = Math.max(img.width, img.height);
      function encode(maxPx, quality) {
        const scale = Math.min(1, maxPx / maxLong);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        return c.toDataURL('image/jpeg', quality);
      }
      resolve({ thumb: encode(380, 0.78), full: encode(1280, 0.87) });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(Object.assign(new Error('decode failed'), { code: 'DECODE_FAILED' })); };
    img.src = url;
  });
}

function imgUploadError(err) {
  if (err?.code === 'TOO_LARGE') return 'Image is too large — max 15 MB.';
  if (err?.code === 'BAD_TYPE') return 'Unsupported file type — use JPEG, PNG, WebP, or GIF.';
  return "Couldn't read that image.";
}

function generateSlug(title) {
  if (title) {
    const s = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
    if (s) return s;
  }
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}-${Math.floor(Math.random() * 90) + 10}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ── § DB HELPERS ──────────────────────────────────────────────────
function roomFromDb(r) {
  const previews = Array.isArray(r.participant_previews)
    ? r.participant_previews.slice(0, 5).map(p => ({
      n: String(p?.n || '?').slice(0, 24),
      a: safeAccent(p?.a, accentForNick(String(p?.n || '?'))),
    }))
    : [];
  return {
    id:              r.id,
    slug:            r.slug,
    title:           r.title || null,
    host:            r.host_nickname,
    hostAccent:      safeAccent(r.host_accent, accentForNick(r.host_nickname)),
    member_count:    r.member_count ?? 1,
    locked:          r.locked,
    audience_mode:   r.audience_mode,
    audience:        r.audience_mode,
    startedAt:            new Date(r.created_at).getTime(),
    participant_previews: previews,
  };
}

function presenceToParticipant(p, existingParticipants) {
  const existing = existingParticipants?.find(x => x.sessionId === p.sessionId);
  return {
    nickname:    p.nickname,
    role:        p.role,
    muted:       p.muted,
    serverMuted: p.serverMuted || false,
    sharing:     p.sharing || null,
    accent:      safeAccent(p.accent, accentForNick(p.nickname)),
    avatar:      p.avatar || '',
    sessionId:   p.sessionId,
    speaking:    existing?.speaking || false,
  };
}

// ── § SUPABASE ────────────────────────────────────────────────────

async function sbLoadRooms() {
  try {
    const { data, error } = await sb.from('rooms')
      .select(ROOM_SELECT)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(roomFromDb);
  } catch (err) {
    console.error('sbLoadRooms:', err);
    return [];
  }
}

async function sbGetLockdown() {
  try {
    const { data, error } = await sb.from('app_settings')
      .select('rooms_locked')
      .eq('id', 'global')
      .single();
    if (error) throw error;
    return data?.rooms_locked === true;
  } catch (err) {
    console.error('sbGetLockdown:', err);
    return false;
  }
}

async function sbFetchRoom(slug) {
  try {
    const { data, error } = await sb.from('rooms')
      .select(ROOM_SELECT).eq('slug', slug).eq('status', 'active').single();
    if (error || !data) return null;
    return roomFromDb(data);
  } catch { return null; }
}

async function sbCreateRoom(slug, title, locked) {
  const adminJwt = state.user.isAdmin ? await getAdminJwt() : null;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-room`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      roomSlug: slug,
      title: title || null,
      locked,
      nickname: state.user.nickname,
      sessionId: state.user.sessionId,
      hostAccent: myAccent(),
      adminJwt: adminJwt || undefined,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `create-room ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
  if (body.hostKey) saveHostKey(slug, body.hostKey);
  return body.room;
}

async function sbUpdateRoom(slug, updates) {
  const hostKey = getHostKey(slug);
  const adminJwt = !hostKey && state.user.isAdmin ? await getAdminJwt() : null;
  if (!hostKey && !adminJwt) throw new Error('missing host key');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/room-control`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({ action: 'update', roomSlug: slug, hostKey: hostKey || undefined, adminJwt: adminJwt || undefined, updates }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `room-control ${res.status}`);
    logEvent('error', 'db_update_room', { msg: String(err.message || '').slice(0, 80) });
    throw err;
  }
}

async function sbEndRoom(slug, roomId) {
  // Host key verified server-side. Admin JWT accepted as alternative authority.
  // The trg_on_room_ended DB trigger deletes messages atomically on status change.
  try {
    const hostKey = getHostKey(slug);
    const adminJwt = !hostKey && state.user.isAdmin ? await getAdminJwt() : null;
    if (!hostKey && !adminJwt) throw new Error('missing host key');
    const res = await fetch(`${SUPABASE_URL}/functions/v1/end-room`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
      body: JSON.stringify({ roomSlug: slug, hostKey: hostKey || undefined, adminJwt: adminJwt || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `end-room ${res.status}`);
    }
  } catch (err) { logEvent('error', 'room_end_failed', { msg: String(err.message || '').slice(0, 80) }); console.error('sbEndRoom:', err); }
  // Trigger handles message cleanup, but purge explicitly as a safety net.
  if (roomId) {
    try { await sb.from('room_messages').delete().eq('room_id', roomId); } catch (err) { console.error('purge messages:', err); }
  }
}

async function sbLoadMessages(roomId, limit = 50) {
  try {
    const { data, error } = await sb.from('room_messages')
      .select('*')
      .eq('room_id', roomId)
      .eq('hidden', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).reverse().map(m => ({
      nick: m.nickname,
      body: m.body,
      time: new Date(m.created_at).getTime(),
      sessionId: m.session_id,
    }));
  } catch (err) { console.error('sbLoadMessages:', err); return []; }
}

async function sbSendMessage(roomId, body) {
  const { error } = await sb.from('room_messages').insert({
    room_id:    roomId,
    nickname:   state.user.nickname,
    session_id: state.user.sessionId,
    body,
  });
  if (error) throw error;
}

async function sbAddBan(roomId, type, value) {
  if (!state.room?.slug) return;
  const hostKey = getHostKey(state.room.slug);
  const adminJwt = !hostKey && state.user.isAdmin ? await getAdminJwt() : null;
  if (!hostKey && !adminJwt) throw new Error('missing host key');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/room-control`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      action: 'ban',
      roomSlug: state.room.slug,
      hostKey: hostKey || undefined,
      adminJwt: adminJwt || undefined,
      type,
      value,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `ban ${res.status}`);
}

async function sbModerate(action, targetSessionId, extra = {}) {
  if (!state.room?.slug || !targetSessionId) return;
  const hostKey = getHostKey(state.room.slug);
  const adminJwt = !hostKey && state.user.isAdmin ? await getAdminJwt() : null;
  if (!hostKey && !adminJwt) throw new Error('missing host key');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/room-control`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      action: 'moderate',
      roomSlug: state.room.slug,
      hostKey: hostKey || undefined,
      adminJwt: adminJwt || undefined,
      moderation: { action, targetSessionId, ...extra },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `moderate ${res.status}`);
}

function sbWatchRooms(onChange) {
  return sb.channel('lobby:rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, onChange)
    .subscribe();
}

function sbWatchLockdown(onChange) {
  return sb.channel('lobby:app_settings')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, onChange)
    .subscribe();
}

function sbWatchMessages(roomId, onMsg) {
  const chan = sb.channel(`chat:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'room_messages',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      const m = payload.new;
      if (m.hidden) return;
      if (m.session_id === state.user.sessionId) return; // already shown optimistically
      onMsg({ nick: m.nickname, body: m.body, time: new Date(m.created_at).getTime(), sessionId: m.session_id, dbId: m.id });
    })
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'room_messages',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      if (payload.new?.hidden) {
        document.querySelector(`[data-msg-db-id="${payload.new.id}"]`)?.remove();
      }
    });
  chan.subscribe((status) => {
    if (status === 'CHANNEL_ERROR') logEvent('error', 'sb_chat_channel_error', { roomId });
    else if (status === 'TIMED_OUT') logEvent('warn', 'sb_chat_channel_timeout', { roomId });
  });
  return chan;
}

function sbWatchModeration(roomId, onEvent) {
  return sb.channel(`moderation:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'room_moderation_events',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      if (payload.new) onEvent(payload.new);
    })
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') logEvent('error', 'sb_moderation_channel_error', { roomId });
      else if (status === 'TIMED_OUT') logEvent('warn', 'sb_moderation_channel_timeout', { roomId });
    });
}

function sbWatchCurrentRoom(roomId, onEnded, onUpdated) {
  if (!roomId) return null;
  return sb.channel(`room-status:${roomId}`)
    .on('postgres_changes', {
      event: 'UPDATE', schema: 'public', table: 'rooms',
      filter: `id=eq.${roomId}`,
    }, (payload) => {
      const r = payload.new;
      if (!r) return;
      if (r.status === 'ended') { onEnded(); return; }
      if (onUpdated) onUpdated(r);
    })
    .subscribe();
}

let _memberCountTimer = null;

function sbJoinPresence(slug) {
  const channel = sb.channel(`presence:${slug}`, {
    config: { presence: { key: state.user.sessionId } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const raw      = channel.presenceState();
    // Each key can accumulate multiple entries on repeated track() calls — take latest only
    const incoming = Object.values(raw).map(arr => arr[arr.length - 1]).filter(Boolean);
    const prev     = state.participants;

    state.participants = incoming
      .filter(p => !state.kickedSessionIds.has(p.sessionId))
      .map(p => presenceToParticipant(p, prev));

    // Always keep self in list — handles race where first sync fires before
    // channel.track() completes (incoming is empty, which would wipe the pre-populated self)
    if (state.view === 'room' &&
        !state.participants.some(p => p.sessionId === state.user.sessionId)) {
      const selfEntry = prev.find(p => p.sessionId === state.user.sessionId) || {
        nickname: state.user.nickname, role: state.user.role,
        muted: !state.media.micOn, serverMuted: false, sharing: null,
        accent: myAccent(), avatar: state.user.avatar, sessionId: state.user.sessionId, speaking: false,
      };
      state.participants.unshift(selfEntry);
    }

    if (state.view === 'room') {
      renderParticipants();
      updateTopbar();
    }

    // Host keeps member_count in DB — debounced to avoid hammering on rapid syncs
    if (state.user.role === 'host' && state.room?.slug) {
      clearTimeout(_memberCountTimer);
      _memberCountTimer = setTimeout(() => {
        if (state.room?.slug) {
          const visible = state.participants
            .filter(p => !(p.sessionId === state.user.sessionId && state.user.ghost));
          const previews = visible.slice(0, 5).map(p => ({ n: p.nickname, a: p.accent }));
          sbUpdateRoom(state.room.slug, {
            member_count: visible.length,
            participant_previews: previews,
          }).catch(() => {});
        }
      }, 2000);
    }
  });

  // Ephemeral chat image — broadcast only, never written to the database.
  channel.on('broadcast', { event: 'chat:image' }, ({ payload }) => {
    if (!payload || state.view !== 'room') return;
    if (payload.sessionId === state.user.sessionId) return; // already shown optimistically
    const size = (payload.thumb?.length || 0) + (payload.full?.length || 0);
    if (size > 900_000) return; // drop oversized payloads to prevent OOM/stall
    const thumb = payload.thumb || payload.src;
    const full  = payload.full  || payload.thumb || payload.src;
    appendImageMessage(payload.nick, thumb, full, payload.time || Date.now(), payload.sessionId);
  });

  channel.subscribe(async (status) => {
    if (status === 'CHANNEL_ERROR') {
      logEvent('error', 'sb_presence_error', { slug });
      if (state.view === 'room') showBanner('Realtime connection issue — presence may be stale.', '', null, 'warning');
    } else if (status === 'TIMED_OUT') {
      logEvent('warn', 'sb_presence_timeout', { slug });
    } else if (status === 'CLOSED') {
      logEvent('warn', 'sb_presence_closed', { slug });
    }
    if (status === 'SUBSCRIBED') {
      await channel.track(buildPresencePayload());
    }
  });

  return channel;
}

function buildPresencePayload() {
  return {
    nickname:    state.user.nickname,
    role:        state.user.role,
    muted:       !state.media.micOn,
    serverMuted: !!state.media.serverMuted,
    sharing:     state.media.cameraOn ? 'cam' : (state.media.screenOn ? 'screen' : null),
    accent:      myAccent(),
    avatar:      state.user.avatar || '',
    sessionId:   state.user.sessionId,
  };
}

async function sbTrackPresence(updates) {
  if (!state._sbPresenceChan) return;
  try {
    await state._sbPresenceChan.track({ ...buildPresencePayload(), ...updates });
  } catch (err) { console.error('sbTrackPresence:', err); }
}

// Fire a realtime broadcast to everyone on the room's presence channel.
function broadcastToRoom(event, payload) {
  if (!state._sbPresenceChan) return Promise.reject(new Error('no channel'));
  return state._sbPresenceChan.send({ type: 'broadcast', event, payload });
}

function handleModerationEvent(evt) {
  if (!evt || evt.target_session_id !== state.user.sessionId) return;
  if (state.user.role === 'host' || state.user.isAdmin) return; // host and admin are immune

  if (evt.action === 'mute') {
    setMicMuted(!!evt.muted, evt.muted ? 'A host muted you.' : null, { serverMute: true });
    sbTrackPresence({ serverMuted: !!evt.muted });
    return;
  }

  const text = evt.action === 'ban'
    ? 'You were banned from this room.'
    : 'You were removed from this room.';
  showBanner(text, 'Back to lobby', () => leaveRoom(), 'error');
  setTimeout(() => { if (state.view === 'room') leaveRoom(); }, 1800);
}

async function sbCleanupChannels() {
  dbg('sb', 'cleanup channels — removing presence/chat/status subs');
  clearTimeout(_memberCountTimer);
  const toRemove = [];
  if (state._sbPresenceChan)    toRemove.push(state._sbPresenceChan);
  if (state._sbChatSub)         toRemove.push(state._sbChatSub);
  if (state._sbRoomStatusSub)   toRemove.push(state._sbRoomStatusSub);
  if (state._sbModerationSub)   toRemove.push(state._sbModerationSub);
  state._sbPresenceChan = null;
  state._sbChatSub      = null;
  state._sbRoomStatusSub = null;
  state._sbModerationSub = null;
  for (const ch of toRemove) {
    try { await sb.removeChannel(ch); } catch {}
  }
}

// ── § LIVEKIT ─────────────────────────────────────────────────────

async function fetchLkToken(slug) {
  const adminJwt = state.user.isAdmin ? await getAdminJwt() : null;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/room-token`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify({
      roomSlug:  slug,
      nickname:  state.user.nickname,
      sessionId: state.user.sessionId,
      hostKey:   getHostKey(slug) || null,
      adminJwt:  adminJwt || null,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `token fetch ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
  return res.json(); // { token, lkUrl, role }
}

async function lkConnect(slug, tokenData) {
  if (state._lkRoom) return;
  dbg('lk', 'connecting to room', slug);
  lkSetStatusDot('lk-connecting');
  try {
    const { token, lkUrl, role } = tokenData ?? await fetchLkToken(slug);
    const { Room, RoomEvent, VideoPreset } = await ensureLk();

    const room = new Room({
      adaptiveStream: { pixelDensity: 1 },
      dynacast: true,
      videoPublishDefaults: {
        simulcast: true,
        videoSimulcastLayers: [
          new VideoPreset(320, 180, 300_000, 20),
          new VideoPreset(640, 360, 900_000, 24),
        ],
      },
    });
    room
      .on(RoomEvent.TrackSubscribed,          lkOnTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed,        lkOnTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged,    lkOnActiveSpeakers)
      .on(RoomEvent.ConnectionStateChanged,   lkOnConnectionState)
      .on(RoomEvent.Disconnected,             lkOnDisconnected)
      .on(RoomEvent.ConnectionQualityChanged, lkOnQualityChanged);

    await room.connect(lkUrl || LIVEKIT_WS_URL, token);
    state._lkRoom = room;

    // Always re-announce presence after a successful connect. Without this, a manual
    // "Rejoin" after retries exhausted (which called untrack()) leaves the user invisible
    // to others when their role didn't change and the mic wasn't restored.
    // Skip when ghosted — re-tracking would un-ghost the admin.
    if (!state.user.ghost) sbTrackPresence({}).catch(() => {});
    if (role && state.user.role !== role) {
      if (role !== 'host') forgetHostKey(slug);
      state.user.role = role;
      updateTopbar();
      updateDock();
      renderParticipants();
      if (!state.user.ghost) sbTrackPresence({ role }).catch(() => {});
    }
    dbg('lk', 'connected');
    updateDock();

    // If the user had the mic on before LK connected (or before a reconnect),
    // bring it back automatically.
    if (state.media.wantsMic && !micBlockedByAudience()) {
      await setMic(true, { silent: true, userIntent: false });
    }
    // Same for camera — restore it silently after a reconnect.
    if (state.media.wantsCamera) {
      state.media.wantsCamera = false;
      toggleCamera().catch(() => {});
    }
    // Refresh banner — dismisses the "tap to talk" hint that micBanner() may have
    // shown during the connection handshake before the mic was silently restored.
    micBanner();
  } catch (err) {
    const s = err.httpStatus;
    logEvent('error', 'lk_connect_failed', { httpStatus: s || 0, msg: String(err.message || '').slice(0, 80) });
    dbg('lk', 'connect failed — status', s, err.message);
    if (s === 403) {
      const msg = err.message === 'banned'
        ? 'You are banned from this room.'
        : err.message === 'room is locked'
          ? 'This room is locked.'
          : 'Access denied.';
      showBanner(msg, 'Back to lobby', () => leaveRoom(), 'error');
      setTimeout(() => { if (state.view === 'room') leaveRoom(); }, 2500);
    } else if (s === 404 || s === 410) {
      if (state.user.role !== 'host') {
        showBanner('This room is no longer available.', 'Back to lobby', () => leaveRoom(), 'warning');
        setTimeout(() => { if (state.view === 'room') leaveRoom(); }, 2500);
      }
    } else {
      console.error('LK connect failed:', err);
      lkSetStatusDot('lk-error');
    }
  }
}

async function lkDisconnect() {
  if (!state._lkRoom) return;
  dbg('lk', 'disconnect');
  _lkReconnectAttempt = 0; // reset so next join starts fresh
  clearTimeout(_lkReconnectTimer);
  const room = state._lkRoom;
  state._lkRoom = null; // clear first so handlers bail early
  lkCleanLocalTracks();
  document.querySelectorAll('.lk-audio').forEach(el => el.remove());
  hideScreenShareArea();
  try { await room.disconnect(); } catch {}
}

function lkCleanLocalTracks() {
  if (state._localMicTrack)              { state._localMicTrack.stop();              state._localMicTrack              = null; }
  if (state._localCamTrack)              { state._localCamTrack.stop();              state._localCamTrack              = null; }
  if (state._localScreenTrack)           { state._localScreenTrack.stop();           state._localScreenTrack           = null; }
  if (state.media._localScreenAudioTrack) { state.media._localScreenAudioTrack.stop(); state.media._localScreenAudioTrack = null; }
}

// ── LiveKit event handlers ────────────────────────────────────────

function lkOnTrackSubscribed(track, publication, participant) {
  const Track = _lk.Track; // _lk guaranteed loaded — we're inside a Room event callback
  if (track.kind === Track.Kind.Audio) {
    const el = track.attach();
    el.className = 'lk-audio';
    el.dataset.sid = participant.identity;
    el.muted = state.media.deafened;
    document.body.appendChild(el);
  } else if (track.kind === Track.Kind.Video) {
    if (publication.source === Track.Source.ScreenShare) {
      showScreenShareVideo(track, participant);
    } else {
      showParticipantVideo(track, participant.identity);
    }
  }
}

function lkOnTrackUnsubscribed(track, publication, participant) {
  const Track = _lk.Track;
  track.detach().forEach(el => el.remove());
  if (publication.source === Track.Source.ScreenShare) {
    hideScreenShareArea();
  } else if (track.kind === Track.Kind.Video) {
    hideParticipantVideo(participant.identity);
  }
}

function lkOnActiveSpeakers(speakers) {
  const speakingMap = new Map(speakers.map(s => [s.identity, s.audioLevel ?? 0.5]));
  state.participants.forEach(p => { p.speaking = speakingMap.has(p.sessionId); });
  document.querySelectorAll('.participant-card').forEach(card => {
    const sid = card.dataset.sid;
    const speaking = !!(sid && speakingMap.has(sid));
    const level = speakingMap.get(sid) ?? 0;
    card.classList.toggle('speaking', speaking);
    if (speaking) card.style.setProperty('--speak-level', level.toFixed(2));
    else card.style.removeProperty('--speak-level');
  });
}

function qualityTitle(q) {
  return { excellent: 'Excellent connection', good: 'Good connection', poor: 'Poor connection', lost: 'Connection lost' }[q] || '';
}

function lkOnQualityChanged(quality, participant) {
  _qualityMap[participant.identity] = quality;
  const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(participant.identity)}"]`);
  if (!card) return;
  let badge = card.querySelector('.p-quality');
  if (!badge) {
    const avatar = card.querySelector('.p-avatar');
    if (avatar) {
      badge = document.createElement('div');
      badge.innerHTML = '<div class="p-quality-bar"></div><div class="p-quality-bar"></div><div class="p-quality-bar"></div>';
      avatar.appendChild(badge);
    }
  }
  if (badge) {
    badge.className = `p-quality ${quality}`;
    badge.title = qualityTitle(quality);
  }
}

function lkSetStatusDot(cls) {
  const el = document.getElementById('lk-signal');
  if (!el) return;
  el.className = `lk-signal ${cls}`;
  const titles = {
    'lk-connecting':   'Connecting…',
    'lk-connected':    'Connected',
    'lk-reconnecting': 'Reconnecting…',
    'lk-error':        'Connection lost',
  };
  el.title = titles[cls] || '';
}

function lkOnConnectionState(connState) {
  const CS = _lk?.ConnectionState;
  if (CS && connState === CS.Reconnecting) {
    lkSetStatusDot('lk-reconnecting');
    showBanner('Reconnecting to voice…', '', null, 'warning');
  } else if (CS && connState === CS.Connected) {
    lkSetStatusDot('lk-connected');
    updateMicBtn();
    micBanner();
  } else if (CS && connState === CS.Disconnected) {
    lkSetStatusDot('lk-error');
  } else {
    lkSetStatusDot('lk-connecting');
  }
}

let _lkReconnectTimer = null;
let _lkReconnectAttempt = 0;
const _LK_RECONNECT_DELAYS = [2000, 5000, 10000]; // ~17s total before giving up

function lkOnDisconnected() {
  if (state.view !== 'room') return; // intentional or stale
  logEvent('warn', 'lk_disconnected', { attempt: _lkReconnectAttempt });
  state._lkRoom = null;
  lkCleanLocalTracks(); // stop physical devices so OS mic/camera indicators go dark during reconnect
  document.querySelectorAll('.lk-audio').forEach(el => el.remove());
  hideScreenShareArea();
  if (state.media.cameraOn) hideParticipantVideo(state.user.sessionId);
  // Keep separate intents so reconnect can restore mic and camera automatically.
  state.media.wantsMic    = state.media.wantsMic    || state.media.micOn;
  state.media.wantsCamera = state.media.wantsCamera || state.media.cameraOn;
  state.media.micOn = false;
  state.media.micReady = false; state.media.cameraOn = false; state.media.screenOn = false;
  _syncMicPresence();
  updateMicBtn();
  updateDock();
  lkSetStatusDot('lk-reconnecting');
  clearTimeout(_lkReconnectTimer);

  // All retries exhausted — remove presence so others stop seeing a ghost, then show manual rejoin.
  if (_lkReconnectAttempt >= _LK_RECONNECT_DELAYS.length) {
    logEvent('error', 'lk_reconnect_exhausted', { attempts: _LK_RECONNECT_DELAYS.length });
    dbg('lk', 'reconnect exhausted after', _lkReconnectAttempt, 'attempts — removing presence');
    _lkReconnectAttempt = 0;
    // Untrack from Supabase presence so our tile disappears from others' lists immediately.
    state._sbPresenceChan?.untrack().catch(() => {});
    lkSetStatusDot('lk-error');
    showBanner('Voice connection lost.', 'Rejoin', () => {
      if (state.room) lkConnect(state.room.slug);
    });
    return;
  }

  const delay = _LK_RECONNECT_DELAYS[_lkReconnectAttempt];
  dbg('lk', `reconnect attempt ${_lkReconnectAttempt + 1}/${_LK_RECONNECT_DELAYS.length} in ${delay}ms`);
  showBanner(`Reconnecting… (${_lkReconnectAttempt + 1}/${_LK_RECONNECT_DELAYS.length})`, '', null, 'warning');
  _lkReconnectAttempt++;

  _lkReconnectTimer = setTimeout(async () => {
    if (!state.room || state.view !== 'room') return;
    if (state._lkRoom) { _lkReconnectAttempt = 0; return; } // already reconnected somehow
    await lkConnect(state.room.slug);
    if (state._lkRoom) {
      dbg('lk', 'reconnect succeeded on attempt', _lkReconnectAttempt);
      _lkReconnectAttempt = 0;
      // Restore presence so our tile reappears for others (not when ghosted).
      if (!state.user.ghost) sbTrackPresence({}).catch(() => {});
    } else {
      lkOnDisconnected(); // recurse for next backoff attempt
    }
  }, delay);
}

// ── Video helpers ─────────────────────────────────────────────────

function showParticipantVideo(track, identity) {
  const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(identity)}"]`);
  if (!card) return;
  let wrap = card.querySelector('.p-video-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'p-video-wrap';
    (card.querySelector('.p-avatar') || card).after(wrap);
  }
  const video = track.attach();
  video.autoplay = true; video.playsInline = true;
  video.muted = (identity === state.user.sessionId);
  video._lkTrack = track;
  const isLocal = identity === state.user.sessionId;
  if (isLocal && state.settings.mirrorSelf && state.media.flipCamFacing !== 'environment') video.style.transform = 'scaleX(-1)';
  wrap.innerHTML = '';
  wrap.appendChild(video);
  addFullscreenBtn(wrap, video);
  if (isLocal && state.media.hasMultipleCameras) addFlipCamBtn(wrap);
  card.classList.add('has-video');
  // Snap the wrap to the video's real aspect ratio on first load and again
  // any time the camera rotates (resize fires on intrinsic-dimension changes).
  const syncAspect = () => {
    if (video.videoWidth && video.videoHeight) {
      wrap.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
      const prev = _videoAspectRatio[identity];
      if (!prev || prev.w !== video.videoWidth || prev.h !== video.videoHeight) {
        _videoAspectRatio[identity] = { w: video.videoWidth, h: video.videoHeight };
        scheduleRepack(); // real height now known/changed — the packer was using a placeholder estimate
      }
    }
  };
  video.addEventListener('loadedmetadata', syncAspect, { once: true });
  video.addEventListener('resize', syncAspect);
  // The card just grew from a 140px avatar-only estimate to a video tile — the
  // packer needs to redistribute columns using the (still placeholder, until
  // syncAspect resolves) video-sized estimate instead of the stale avatar one.
  scheduleRepack();
}

// Fullscreen toggle for any video tile (works on desktop + iOS Safari).
// iOS Safari clears srcObject on fullscreen exit, so we re-attach the LK track
// (stored as video._lkTrack) before resuming playback.
function goFullscreen(video) {
  if (!video) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    return;
  }

  const recoverVideo = () => {
    video.style.objectFit = '';
    if (video._lkTrack) video._lkTrack.attach(video);
    video.load?.();        // unfreeze iOS Safari after fullscreen exit
    video.play().catch(() => {});
    if (_pendingParticipantRender) {
      _pendingParticipantRender = false;
      renderParticipants();
    }
  };

  video.style.objectFit = 'contain'; // show full frame (no crop) while fullscreen

  if (video.requestFullscreen) {
    video.requestFullscreen();
    document.addEventListener('fullscreenchange', function onFsExit() {
      if (!document.fullscreenElement) {
        recoverVideo();
        document.removeEventListener('fullscreenchange', onFsExit);
      }
    });
  } else if (video.webkitEnterFullscreen) {
    // iOS Safari native fullscreen — fires webkitendfullscreen on the element
    video.addEventListener('webkitendfullscreen', recoverVideo, { once: true });
    video.webkitEnterFullscreen();
  } else if (video.webkitRequestFullscreen) {
    video.webkitRequestFullscreen();
    document.addEventListener('webkitfullscreenchange', function onFsExit() {
      if (!document.webkitFullscreenElement) {
        recoverVideo();
        document.removeEventListener('webkitfullscreenchange', onFsExit);
      }
    });
  }
}

function addFullscreenBtn(container, video) {
  if (container.querySelector('.fs-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'fs-btn';
  btn.title = 'Fullscreen';
  btn.setAttribute('aria-label', 'Fullscreen');
  btn.innerHTML = ICON.fullscreen;
  btn.addEventListener('click', (e) => { e.stopPropagation(); goFullscreen(video); });
  container.appendChild(btn);
}

function addFlipCamBtn(wrap) {
  const btn = document.createElement('button');
  btn.className = 'flip-cam-btn';
  btn.title = 'Flip camera';
  btn.setAttribute('aria-label', 'Flip camera');
  btn.innerHTML = ICON.flipCam;
  btn.addEventListener('click', (e) => { e.stopPropagation(); flipCamera(); });
  wrap.appendChild(btn);
}

async function flipCamera() {
  if (!state._lkRoom || !state.media.cameraOn || !state._localCamTrack) return;
  const { createLocalVideoTrack } = await ensureLk();
  state.media.flipCamFacing = state.media.flipCamFacing === 'environment' ? 'user' : 'environment';
  const myCard = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`);
  myCard?.classList.add('cam-loading');
  const oldTrack = state._localCamTrack;
  try {
    await state._lkRoom.localParticipant.unpublishTrack(oldTrack);
    oldTrack.stop();
    state._localCamTrack = null;
    const track = await createLocalVideoTrack({ facingMode: state.media.flipCamFacing });
    const _encBitrate = state.settings.cameraResolution === '1080p' ? 4_000_000 : 2_500_000;
    await state._lkRoom.localParticipant.publishTrack(track, {
      videoEncoding: { maxBitrate: _encBitrate, maxFramerate: 30 },
    });
    state._localCamTrack = track;
    showParticipantVideo(track, state.user.sessionId);
  } catch {
    // Old track is already stopped — camera is now effectively off. Reset state so the
    // user isn't stuck with a "camera on" dock button and no video.
    state.media.flipCamFacing = state.media.flipCamFacing === 'environment' ? 'user' : 'environment';
    state.media.cameraOn = false;
    state._localCamTrack = null;
    hideParticipantVideo(state.user.sessionId);
    updateDockBtnState('btn-camera', false);
    _syncSharingPresence();
    showBanner('Could not switch camera. Tap camera to restart.', 'OK', hideBanner);
  } finally {
    document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`)
      ?.classList.remove('cam-loading');
  }
}

function hideParticipantVideo(identity) {
  const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(identity)}"]`);
  if (!card) return;
  card.querySelector('.p-video-wrap')?.remove();
  card.classList.remove('has-video');
  delete _videoAspectRatio[identity];
  scheduleRepack(); // card just shrank back to the 140px avatar estimate — redistribute columns
}

function showScreenShareVideo(track, participant) {
  const area = document.getElementById('screenshare-area');
  if (!area) return;
  area.hidden = false;
  const name = participant.name || participant.identity || 'someone';
  area.innerHTML = `<div class="ss-label">${escHtml(name)} is sharing their screen</div>`;
  const video = track.attach();
  video.autoplay = true; video.playsInline = true; video.muted = true;
  video._lkTrack = track;
  area.appendChild(video);
  addFullscreenBtn(area, video);
}

function hideScreenShareArea() {
  const area = document.getElementById('screenshare-area');
  if (area) { area.hidden = true; area.innerHTML = ''; }
}

// Re-attach all video tracks after the participant grid is re-rendered by presence sync.
// renderParticipants() wipes innerHTML so every <video> element is destroyed; we must
// re-attach each subscribed remote track (LK only fires TrackSubscribed once).
function reattachAllVideos() {
  if (state.media.cameraOn && state._localCamTrack) {
    const myCard = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`);
    if (myCard && !myCard.querySelector('.p-video-wrap')) {
      showParticipantVideo(state._localCamTrack, state.user.sessionId);
    }
  }
  if (!state._lkRoom || !_lk) return;
  const { Track } = _lk;
  for (const [, p] of state._lkRoom.remoteParticipants) {
    for (const pub of p.trackPublications.values()) {
      if (pub.track && pub.kind === Track.Kind.Video && pub.source !== Track.Source.ScreenShare) {
        const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(p.identity)}"]`);
        if (card && !card.querySelector('.p-video-wrap')) {
          showParticipantVideo(pub.track, p.identity);
        }
      }
    }
  }
}

// ── § ROUTER ──────────────────────────────────────────────────────
function parseSlug() {
  return new URLSearchParams(location.search).get('room') || null;
}

function navigateTo(slug) {
  if (slug) {
    history.pushState({ view: 'room', slug }, '', `?room=${encodeURIComponent(slug)}`);
  } else {
    history.pushState({ view: 'lobby' }, '', location.pathname);
  }
}

window.addEventListener('popstate', async () => {
  const slug = parseSlug();
  if (slug) {
    let room = state.rooms.find(r => r.slug === slug);
    if (!room) room = await sbFetchRoom(slug);
    if (room) {
      requireNickname(() => joinRoom(room.slug));
    } else {
      doShowLobby();
    }
  } else {
    doShowLobby();
  }
});

// ── § RENDER / LOBBY ──────────────────────────────────────────────
function renderLobby() {
  // One-time: the skeleton is only ever visible before the first real render.
  document.getElementById('lobby-skeleton')?.remove();
  document.getElementById('lobby-skeleton-pill')?.remove();

  const grid   = document.getElementById('rooms-grid');
  const empty  = document.getElementById('empty-state');
  const nickEl = document.getElementById('lobby-nick-display');
  const createBtn = document.getElementById('btn-create');
  const createEmptyBtn = document.getElementById('btn-create-empty');
  const lockdownNotice = document.getElementById('lobby-lockdown-notice');

  if (state.user.nickname && nickEl) nickEl.textContent = state.user.nickname;

  // Lockdown blocks room creation for everyone except the admin.
  const locked = !!state.roomsLocked && !state.user.isAdmin;
  if (lockdownNotice) lockdownNotice.hidden = !locked;
  if (createBtn) createBtn.disabled = locked;
  if (createEmptyBtn) createEmptyBtn.disabled = locked;

  const hasRooms = state.rooms.length > 0;
  // When the lobby is empty, only the empty-state CTA shows; the header button
  // appears once there are rooms to sit beside.
  if (createBtn) createBtn.hidden = !hasRooms;

  if (!hasRooms) {
    grid.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    grid.innerHTML = state.rooms.map(renderRoomCard).join('');
    grid.querySelectorAll('.room-card').forEach(card => {
      const tryJoin = () => {
        const slug = card.dataset.slug;
        const room = state.rooms.find(r => r.slug === slug);
        if (!room) return;
        if (room.locked && !isHostForRoom(room)) { showLobbyBanner('This room is locked.'); return; }
        requireNickname(() => joinRoom(slug));
      };
      card.addEventListener('click', tryJoin);
      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        tryJoin();
      });
    });
  }
}

function renderRoomCard(room) {
  const isYours = isHostForRoom(room);
  const title = room.title ? escHtml(room.title) : `@${escHtml(room.host)}`;

  const previews = room.participant_previews || [];
  const shown    = previews.slice(0, 3);
  const overflow = room.member_count - shown.length;

  let thumbnailHtml;
  if (shown.length > 0) {
    const bubbles = shown.map((p, i) =>
      `<div class="card-bubble" style="background:${escHtml(p.a)};z-index:${shown.length - i}">${avatarInner(p.n, p.a, '')}</div>`
    ).join('');
    const moreHtml = overflow > 0
      ? `<div class="card-bubble card-bubble-more">+${overflow}</div>`
      : '';
    thumbnailHtml = `<div class="card-bubbles">${bubbles}${moreHtml}</div>`;
  } else {
    thumbnailHtml = `<div class="card-avatar" style="background:${room.hostAccent}">${avatarInner(room.host, room.hostAccent, '')}</div>`;
  }

  return `<div class="room-card${room.locked ? ' locked' : ''}${isYours ? ' yours' : ''}"
               data-slug="${escHtml(room.slug)}"
               role="button" tabindex="${room.locked && !isYours ? '-1' : '0'}"
               aria-label="${title}, ${room.member_count} participant${room.member_count !== 1 ? 's' : ''}${room.locked ? ', locked' : ''}">
    ${thumbnailHtml}
    <div class="card-name">
      ${title}${isYours ? ' <span class="yours-tag">(yours)</span>' : ''}
    </div>
    <div class="card-meta">
      <span class="count">${ICON.people} ${room.member_count}</span>
      ${room.locked ? `<span class="badge badge-locked">${ICON.lock} locked</span>` : ''}
    </div>
    ${!room.locked || isYours ? '<div class="card-join">join</div>' : ''}
  </div>`;
}

// ── § TRANSITIONS ─────────────────────────────────────────────────
async function doShowLobby() {
  await lkDisconnect();
  await sbCleanupChannels();
  resetLeaveConfirm();

  state.view = 'lobby';
  state.room = null;
  state.participants = [];
  state.chat = [];
  state.media = {
    micOn: false, wantsMic: false, wantsCamera: false, micReady: false, serverMuted: false, deafened: false,
    cameraOn: false, screenOn: false, _preDeafenMicOn: false, _preServerMuteWantsMic: false,
    hasMultipleCameras: false, flipCamFacing: 'user', _localScreenAudioTrack: null,
  };
  _cameraToggling  = false;
  _screenToggling  = false;
  _lockToggling    = false;
  _audienceToggling = false;
  _ghostToggling   = false;
  _lastJoinTime   = 0;
  state.ui.settingsOpen = false;
  stopMicTest();
  state.user.role = 'guest';
  state.user.ghost = false;
  state.kickedSessionIds = new Set();
  _qualityMap      = {};
  _sharingOrder    = new Map();
  _sharingCounter  = 0;
  _videoAspectRatio = {};
  document.getElementById('btn-leave')?.classList.remove('is-leaving');
  document.getElementById('btn-back')?.classList.remove('is-leaving');

  const swap = () => {
    document.getElementById('view-room').hidden = true;
    document.getElementById('view-lobby').hidden = false;
    document.getElementById('settings-panel').hidden = true;
    document.getElementById('user-menu').hidden = true;
  };
  if (document.startViewTransition) document.startViewTransition(swap);
  else swap();

  if (state.ui.chatHidden) {
    state.ui.chatHidden = false;
    document.getElementById('panel-chat')?.classList.remove('chat-hidden');
    document.getElementById('panel-participants')?.classList.remove('chat-hidden-partner');
    const tb = document.getElementById('btn-toggle-chat');
    if (tb) tb.textContent = 'hide chat';
  }

  _msgBurst.length = 0; // reset chat cooldown between sessions

  [state.rooms, state.roomsLocked] = await Promise.all([sbLoadRooms(), sbGetLockdown()]);
  renderLobby();

  // Subscribe to room list changes (once; stays alive)
  if (!_sbRoomListSub) {
    _sbRoomListSub = sbWatchRooms(async () => {
      if (state.view !== 'lobby') return;
      state.rooms = await sbLoadRooms();
      renderLobby();
    });
  }
  // Subscribe to lockdown changes (once; stays alive) so the lobby updates
  // live if an admin flips the switch while someone is browsing.
  if (!_sbLockdownSub) {
    _sbLockdownSub = sbWatchLockdown(async () => {
      if (state.view !== 'lobby') return;
      state.roomsLocked = await sbGetLockdown();
      renderLobby();
    });
  }

  // Speculative warm-up: most people browse the lobby for at least a moment
  // before clicking a room, so pre-fetch the LiveKit SDK now (ensureLk() memoizes,
  // so this just makes the real join-time call resolve from cache). Silently
  // falls back to today's on-demand load path on a slow/offline connection.
  setTimeout(() => { ensureLk().catch(() => {}); }, 400);
}

let _lastJoinTime = 0;
let _leaveConfirmTimer = null;

async function joinRoom(slug) {
  const now = Date.now();
  if (now - _lastJoinTime < 2000) return;
  _lastJoinTime = now;

  // Pulse the room card's join pill while the access-check/token fetch is in flight.
  // Looked up by slug (not passed in) since joinRoom() has multiple call sites —
  // a lobby card click, an auto-rejoin path, and a ?room= deep link — and not all
  // of them have a visible card to begin with, hence the optional chaining throughout.
  const card = document.querySelector(`.room-card[data-slug="${CSS.escape(slug)}"]`);
  card?.classList.add('joining');
  const stopLoading = () => card?.classList.remove('joining');

  let room = state.rooms.find(r => r.slug === slug);
  if (!room) room = await sbFetchRoom(slug);
  if (!room) { _lastJoinTime = 0; stopLoading(); return; }

  // Re-fetch to get the latest locked state
  if (room.id) {
    const fresh = await sbFetchRoom(slug);
    if (fresh) room = fresh;
  }

  if (room.locked && !isHostForRoom(room)) {
    showLobbyBanner('This room is locked.');
    _lastJoinTime = 0;
    stopLoading();
    return;
  }

  // Verify server access before joining presence — prevents banned users or
  // JS-bypass attempts from briefly appearing in the participant list and
  // reading chat history before the 403 triggers leaveRoom().
  let tokenData;
  try {
    tokenData = await fetchLkToken(slug);
  } catch (err) {
    const s = err.httpStatus;
    if (s === 403 && String(err.message).includes('banned')) {
      showLobbyBanner('You are banned from this room.');
    } else if (s === 403 && String(err.message).includes('temporarily disabled')) {
      state.roomsLocked = true;
      renderLobby();
      showLobbyBanner('Rooms are temporarily paused.');
    } else if (s === 403) {
      showLobbyBanner('This room is locked.');
    } else if (s === 404 || s === 410) {
      showLobbyBanner('This room is no longer available.');
    } else {
      showLobbyBanner('Could not join room. Try again.');
    }
    _lastJoinTime = 0;
    stopLoading();
    return;
  }

  state.user.role = tokenData.role === 'host' ? 'host' : 'guest';

  await enterRoom(room, true, tokenData);
  // No explicit stopLoading() here: enterRoom() swaps the visible view away from
  // the lobby, and this card's HTML is fully regenerated next time renderLobby()
  // runs, so the 'joining' class never has a chance to linger visibly.
}

async function enterRoom(room, pushNav, tokenData) {
  dbg('lifecycle', 'enter room', room.slug, 'role:', state.user.role);
  state.view = 'room';
  state.room = room;

  if (pushNav) {
    history.replaceState({ view: 'lobby' }, '', location.pathname);
    navigateTo(room.slug);
  }

  await sbCleanupChannels();

  // Pre-populate self so first render shows you immediately (before Supabase presence sync)
  state.participants = [{
    nickname: state.user.nickname, role: state.user.role,
    muted: true, serverMuted: false, sharing: null,
    accent: myAccent(), avatar: state.user.avatar, sessionId: state.user.sessionId, speaking: false,
  }];

  // Connect to LiveKit (non-blocking, fire-and-forget). Started here rather than at
  // the end of this function so the WebRTC handshake runs concurrently with the chat
  // history fetch below instead of strictly after it — lkConnect() has no dependency
  // on state.chat or any of the subscriptions set up further down. Pass pre-fetched
  // tokenData when available to skip the extra round-trip.
  if (room.id) lkConnect(room.slug, tokenData);

  // Load message history
  state.chat = await sbLoadMessages(room.id);

  // Presence: join channel and broadcast self
  state._sbPresenceChan = sbJoinPresence(room.slug);

  // Chat real-time subscription
  state._sbChatSub = sbWatchMessages(room.id, (msg) => {
    state.chat.push(msg);
    appendMessage(msg.nick, msg.body, msg.time, false, { dbId: msg.dbId, sessionId: msg.sessionId });
  });

  // Trusted host moderation events (service-role inserted by room-control)
  state._sbModerationSub = sbWatchModeration(room.id, handleModerationEvent);

  // Watch for room ended or updated (lock, audience mode, etc.)
  state._sbRoomStatusSub = sbWatchCurrentRoom(room.id,
    () => {
      if (state.user.role !== 'host') {
        showBanner('The host ended this room.', 'Back to lobby', () => leaveRoom());
        setTimeout(() => {
          if (state.view === 'room' && state.room?.slug === room.slug) leaveRoom();
        }, 4000);
      }
    },
    (updated) => {
      if (!state.room) return;
      if (typeof updated.locked !== 'undefined') state.room.locked = updated.locked;
      if (typeof updated.audience_mode !== 'undefined') {
        const wasAudience = state.room.audience;
        state.room.audience = updated.audience_mode;
        if (state.user.role !== 'host' && updated.audience_mode !== wasAudience) {
          if (updated.audience_mode && state.media.micOn) setMicMuted(true, null, { serverMute: false });
          appendSystemMessage(
            updated.audience_mode
              ? 'Audience mode on — only the host can speak'
              : 'Audience mode off — everyone can speak',
            'action'
          );
          micBanner();
        }
      }
      updateTopbar();
      updateDock();
    }
  );

  renderRoom();
  micBanner();
  setTimeout(() => appendSystemMessage(`${state.user.nickname} joined`, 'join'), 200);
  if (state.settings.joinSound) playJoinSound();
}

async function leaveRoom() {
  if (!state.room) { doShowLobby(); return; }
  dbg('lifecycle', 'leave room', state.room?.slug, 'role:', state.user.role);

  document.getElementById('btn-leave')?.classList.add('is-leaving');
  document.getElementById('btn-back')?.classList.add('is-leaving');

  appendSystemMessage(`${state.user.nickname} left`, 'leave');

  if (state.room.id && state.user.role === 'host' && isHostForRoom(state.room)) {
    await sbEndRoom(state.room.slug, state.room.id);
  }

  await doShowLobby();
  history.replaceState({ view: 'lobby' }, '', location.pathname);
}

function resetLeaveConfirm() {
  clearTimeout(_leaveConfirmTimer);
  _leaveConfirmTimer = null;
  const btn = document.getElementById('btn-leave');
  if (btn) btn.textContent = 'leave';
}

function requestLeaveRoom() {
  navigator.vibrate?.(8);
  const liveMedia = state.media.cameraOn || state.media.screenOn;
  if (liveMedia && !_leaveConfirmTimer) {
    const btn = document.getElementById('btn-leave');
    if (btn) btn.textContent = 'end?';
    showBanner('Camera or screen share is still on.', 'End now', () => {
      resetLeaveConfirm();
      leaveRoom();
    }, 'warning');
    _leaveConfirmTimer = setTimeout(resetLeaveConfirm, 3000);
    return;
  }
  resetLeaveConfirm();
  leaveRoom();
}

let _lastRoomCreate = 0;

// "Start a room" creates instantly — no modal. The title defaults to the host's
// name and can be edited inline from the topbar afterwards.
async function createRoom() {
  const now = Date.now();
  if (now - _lastRoomCreate < 10_000) {
    showLobbyBanner('Wait a moment before creating another room.');
    return;
  }
  _lastRoomCreate = now;
  const btns = [document.getElementById('btn-create'), document.getElementById('btn-create-empty')].filter(Boolean);
  btns.forEach(b => setBtnLoading(b, true, 'Starting…'));
  const title  = state.user.nickname; // default title = your name
  const slug   = generateSlug(`${title}-${Math.floor(Math.random() * 900) + 100}`);
  let room = null;
  try {
    const data = await sbCreateRoom(slug, title, false);
    room = roomFromDb(data);
  } catch (err) {
    // On slug collision, retry once with a freshly generated slug.
    if (String(err.message).includes('slug already exists')) {
      const retrySlug = generateSlug(`${title}-${Math.floor(Math.random() * 900) + 100}`);
      try {
        const data2 = await sbCreateRoom(retrySlug, title, false);
        room = roomFromDb(data2);
      } catch (err2) {
        console.error('Failed to create room (retry):', err2);
        _lastRoomCreate = 0; // release cooldown so the user can try again immediately
        btns.forEach(b => setBtnLoading(b, false));
        showLobbyBanner('Could not create room. Try again.');
        return;
      }
    } else {
      _lastRoomCreate = 0; // release cooldown on any other failure too
      btns.forEach(b => setBtnLoading(b, false));
      if (err.httpStatus === 403 && String(err.message).includes('temporarily disabled')) {
        state.roomsLocked = true;
        renderLobby();
        showLobbyBanner('Rooms are temporarily paused.');
      } else {
        console.error('Failed to create room:', err);
        showLobbyBanner('Could not create room. Try again.');
      }
      return;
    }
  }

  state.user.role = 'host';
  btns.forEach(b => setBtnLoading(b, false));
  await enterRoom(room, true);
}

// Title editing removed — room name is always the host's @username.

// ── § RENDER / ROOM ───────────────────────────────────────────────
function renderRoom() {
  const swap = () => {
    document.getElementById('view-lobby').hidden = true;
    document.getElementById('view-room').hidden  = false;
  };
  if (document.startViewTransition) document.startViewTransition(swap);
  else swap();
  updateTopbar();
  renderParticipants();
  renderChat(state.chat);
  updateDock();
}

function updateTopbar() {
  const room   = state.room;
  const isHost = state.user.role === 'host';

  // Room name always shows host @name — not editable.
  const hostEl = document.getElementById('topbar-host');
  if (hostEl) hostEl.textContent = `@${room.host || ''}`;

  document.getElementById('topbar-locked-badge').hidden = !room.locked;
  const audBadge = document.getElementById('topbar-audience-badge');
  if (audBadge) audBadge.hidden = !room.audience;
  const ghostBadge = document.getElementById('topbar-ghost-badge');
  if (ghostBadge) ghostBadge.hidden = !state.user.ghost;

  document.getElementById('topbar-count').innerHTML = `${ICON.people} ${state.participants.length}`;
  document.getElementById('participant-count').textContent = state.participants.length;
}

// Sort order: streamers first (earliest start first), then host, then stable.
function sortParticipants(list) {
  list.forEach(p => {
    if (p.sharing && p.sessionId && !_sharingOrder.has(p.sessionId)) {
      _sharingOrder.set(p.sessionId, _sharingCounter++);
    } else if (!p.sharing && p.sessionId) {
      _sharingOrder.delete(p.sessionId);
    }
  });
  return [...list].sort((a, b) => {
    const aRank    = a.sessionId !== undefined ? _sharingOrder.get(a.sessionId) : undefined;
    const bRank    = b.sessionId !== undefined ? _sharingOrder.get(b.sessionId) : undefined;
    const aSharing = aRank !== undefined;
    const bSharing = bRank !== undefined;
    if (aSharing !== bSharing) return aSharing ? -1 : 1;
    if (aSharing)              return aRank - bRank;
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    return 0;
  });
}

// ── § PARTICIPANT GRID PACKING ──────────────────────────────────────
// Greedy shortest-column bin-packing so a tall camera tile never strands a
// shorter neighbor's row with dead space (see the comment on .participant-grid
// in rooms.css for why grid-auto-flow:dense and CSS multi-column don't work here).

const PG_COLUMN_GAP = 12; // must match .participant-grid/.pg-column's `gap` in rooms.css

// Reads .pg-column's current computed width from CSS rather than hardcoding
// 163/178 in JS, so the per-breakpoint card width only ever lives in one place.
function getColumnWidth() {
  const existing = document.querySelector('.pg-column');
  if (existing) return parseFloat(getComputedStyle(existing).width) || 178;
  const grid = document.getElementById('participant-grid');
  if (!grid) return 178;
  const probe = document.createElement('div');
  probe.className = 'pg-column';
  probe.style.visibility = 'hidden';
  probe.style.position = 'absolute';
  grid.appendChild(probe);
  const w = parseFloat(getComputedStyle(probe).width) || 178;
  probe.remove();
  return w;
}

function getColumnCount(containerWidth, cardWidth) {
  const isMobilePortrait = window.matchMedia('(max-width: 767px)').matches
    && !window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
  if (isMobilePortrait) return 2; // matches the fixed 2-column mobile layout
  return Math.max(1, Math.floor((containerWidth + PG_COLUMN_GAP) / (cardWidth + PG_COLUMN_GAP)));
}

// Pre-measurement estimate used only for packing decisions — never applied to
// the DOM. Real rendered height still comes from the browser (padding, name,
// badges, and — once known — the video's real aspect ratio).
function estimateCardHeight(p, cardWidth) {
  if (p.sharing !== 'cam') return 140; // matches .participant-card:not(.has-video) min-height
  const known = _videoAspectRatio[p.sessionId];
  const ratio = known ? (known.h / known.w) : (9 / 16); // 16:9 placeholder default until known
  return Math.round(cardWidth * ratio) + 60; // + avatar/name/badges chrome below the video
}

// Walks sortParticipants()'s already sharer-first list and drops each participant
// into whichever column currently has the smallest running estimated height.
function packIntoColumns(sortedList, columnCount, cardWidth) {
  const columns = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);
  for (const p of sortedList) {
    let shortest = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[shortest]) shortest = i;
    }
    columns[shortest].push(p);
    heights[shortest] += estimateCardHeight(p, cardWidth) + PG_COLUMN_GAP;
  }
  return columns;
}

// Debounced re-render for the few triggers where a card's real height becomes
// known/changes AFTER it was already placed (a video's real aspect ratio
// resolving, a camera toggling on/off, a container resize). Every existing
// renderParticipants() call site (mute, join/leave, kick, sharing change, etc.)
// keeps calling it directly for instant feedback — only those triggers should
// ever go through this debounce.
function scheduleRepack() {
  clearTimeout(_repackTimer);
  _repackTimer = setTimeout(() => {
    _repackTimer = null;
    renderParticipants();
  }, 120);
}

function renderParticipants() {
  const grid   = document.getElementById('participant-grid');
  const hintEl = document.getElementById('room-hint');
  const isHost = state.user.role === 'host';

  // Guard: never wipe innerHTML while a video tile is in fullscreen — doing so
  // briefly removes the video element from the DOM, which makes browsers exit FS.
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  if (fsEl && grid.contains(fsEl)) {
    _pendingParticipantRender = true;
    hintEl.hidden = state.participants.length > 1;
    document.getElementById('participant-count').textContent = state.participants.length;
    document.getElementById('topbar-count').innerHTML = `${ICON.people} ${state.participants.length}`;
    return;
  }
  _pendingParticipantRender = false;

  // Lift video wraps into an off-screen stash BEFORE the innerHTML wipe so they
  // stay inside the document tree. Setting innerHTML destroys children; a detached
  // video element gets paused/blanked by iOS Safari and some Android browsers.
  // The stash keeps them alive and playing during the synchronous re-render.
  let stash = document.getElementById('_video-stash');
  if (!stash) {
    stash = document.createElement('div');
    stash.id = '_video-stash';
    stash.style.cssText = 'position:fixed;top:-10000px;left:-10000px;pointer-events:none';
    document.body.appendChild(stash);
  }

  const wrapMap = {};
  const knownSids = new Set();
  grid.querySelectorAll('.participant-card[data-sid]').forEach(card => {
    knownSids.add(card.dataset.sid);
    const wrap = card.querySelector('.p-video-wrap');
    if (wrap) {
      wrapMap[card.dataset.sid] = wrap;
      stash.appendChild(wrap); // moves it out of grid before innerHTML wipe
    }
  });

  const visible = sortParticipants(
    state.participants.filter(p => !(p.sessionId === state.user.sessionId && state.user.ghost))
  );
  const cardWidth   = getColumnWidth();
  const columnCount = Math.min(getColumnCount(grid.parentElement.clientWidth, cardWidth), visible.length || 1);
  const columns     = packIntoColumns(visible, columnCount, cardWidth);
  grid.innerHTML = columns
    .map(col => `<div class="pg-column">${col.map(p => renderParticipantCard(p, isHost)).join('')}</div>`)
    .join('');

  // Re-insert preserved wraps from stash into their new cards.
  grid.querySelectorAll('.participant-card[data-sid]').forEach(card => {
    const wrap = wrapMap[card.dataset.sid];
    if (wrap) {
      (card.querySelector('.p-avatar') || card).after(wrap);
      card.classList.add('has-video');
    }
    if (_cameraToggling && card.dataset.sid === state.user.sessionId) {
      card.classList.add('cam-loading');
    }
    if (!knownSids.has(card.dataset.sid)) {
      card.classList.add('is-new');
    }
  });

  // Wraps still in stash belong to participants who just left — clean them up.
  stash.innerHTML = '';

  if (isHost || state.user.isAdmin) {
    grid.querySelectorAll('.participant-card.host-can-act').forEach(card => {
      const sid = card.dataset.sid;
      const findParticipant = () => state.participants.find(x => x.sessionId === sid);

      // Quick-mute button
      card.querySelector('.p-mute-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        const p = findParticipant();
        if (p) handleDirectMute(p);
      });

      // Three-dot menu button — primary affordance on mobile
      const dotsBtn = card.querySelector('.p-dots-btn');
      if (dotsBtn) {
        dotsBtn.addEventListener('click', e => {
          e.stopPropagation();
          const p = findParticipant();
          if (p) {
            const rect = e.currentTarget.getBoundingClientRect();
            openUserMenu(p, rect.right - 10, rect.bottom + 4);
          }
        });
        // touchstart fires before iOS captures first-tap focus on the card,
        // so the menu opens immediately without requiring a second tap.
        dotsBtn.addEventListener('touchstart', e => {
          e.preventDefault();
          e.stopPropagation();
          const p = findParticipant();
          if (p) {
            const rect = dotsBtn.getBoundingClientRect();
            openUserMenu(p, rect.right - 10, rect.bottom + 4);
          }
        }, { passive: false });
      }

      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        const p = findParticipant();
        if (p) openUserMenu(p, e.clientX, e.clientY);
      });
      let pressTimer;
      card.addEventListener('pointerdown', e => {
        if (e.target.closest('.p-mute-btn') || e.target.closest('.p-dots-btn')) return;
        pressTimer = setTimeout(() => {
          const p = findParticipant();
          if (p) {
            const rect = card.getBoundingClientRect();
            openUserMenu(p, rect.right - 20, rect.bottom - 20);
          }
        }, 600);
      });
      card.addEventListener('pointerup',     () => clearTimeout(pressTimer));
      card.addEventListener('pointercancel', () => clearTimeout(pressTimer));
    });
  }

  hintEl.hidden = state.participants.length > 1;
  document.getElementById('participant-count').textContent = state.participants.length;
  document.getElementById('topbar-count').innerHTML = `${ICON.people} ${state.participants.length}`;
  reattachAllVideos();
}

function renderParticipantCard(p, isHost) {
  const isYou  = p.sessionId ? p.sessionId === state.user.sessionId
    : p.nickname === state.user.nickname;
  const canAct = (isHost || state.user.isAdmin) && !isYou;

  const badgeHtml = [
    p.role === 'host'     ? `<span class="badge badge-host">host</span>`      : '',
    p.role === 'audience' ? `<span class="badge badge-audience">audience</span>` : '',
    p.serverMuted         ? `<span class="badge badge-muted">muted</span>`    : '',
    p.sharing === 'cam'   ? `<span class="p-sharing-label">${ICON.cam} cam</span>`    : '',
    p.sharing === 'screen'? `<span class="p-sharing-label">${ICON.screen} screen</span>` : '',
  ].filter(Boolean).join('');

  const speakLevelStyle = p.speaking ? ` style="--speak-level:0.5"` : '';

  const _q = p.sessionId ? _qualityMap[p.sessionId] : null;
  const qualityHtml = (_q && _q !== 'unknown')
    ? `<div class="p-quality ${_q}" title="${qualityTitle(_q)}"><div class="p-quality-bar"></div><div class="p-quality-bar"></div><div class="p-quality-bar"></div></div>`
    : '';

  return `<div class="participant-card${isYou ? ' is-you' : ''}${p.speaking ? ' speaking' : ''}${canAct ? ' host-can-act' : ''}"
               data-nick="${escHtml(p.nickname)}"
               data-sid="${escHtml(p.sessionId || '')}"${speakLevelStyle}>
    ${canAct ? `<button class="p-mute-btn${p.serverMuted ? ' is-muted' : ''}" data-nick="${escHtml(p.nickname)}" title="${p.serverMuted ? 'Unmute' : 'Mute'}" aria-label="${p.serverMuted ? 'Unmute' : 'Mute'} ${escHtml(p.nickname)}">${p.serverMuted ? ICON.micOff : ICON.mic}</button>` : ''}
    ${canAct ? `<button class="p-dots-btn" title="Options" aria-label="Options for ${escHtml(p.nickname)}">${ICON.dots}</button>` : ''}
    <div class="p-avatar${p.avatar ? ' has-photo' : ''}" style="background:${p.accent}">
      ${avatarInner(p.nickname, p.accent, p.avatar)}
      ${p.muted || p.serverMuted ? '<div class="p-mic-off" title="Muted"></div>' : ''}
      ${qualityHtml}
    </div>
    <div class="p-name">
      ${escHtml(p.nickname)}${isYou ? ' <span class="you-tag">(you)</span>' : ''}
    </div>
    ${badgeHtml ? `<div class="p-badges">${badgeHtml}</div>` : ''}
  </div>`;
}

function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

function updateScrollBtn() {
  const chatEl = document.getElementById('chat-messages');
  const btn    = document.getElementById('btn-scroll-bottom');
  if (btn && chatEl) btn.hidden = isNearBottom(chatEl, 120);
}

function renderChat(messages) {
  const el = document.getElementById('chat-messages');
  el.innerHTML = '';
  messages.forEach(m => {
    if (m.sys) appendSystemMessage(m.body, m.kind);
    else appendMessage(m.nick, m.body, m.time, false, { sessionId: m.sessionId });
  });
  el.scrollTop = el.scrollHeight;
  updateScrollBtn();
}

function updateDock() {
  const isHost  = state.user.role === 'host';
  const isAdmin = state.user.isAdmin;
  document.querySelectorAll('.host-ctrl').forEach(el => { el.hidden = !isHost; });
  // Ghost is an admin-only tool — available to admins in any room.
  document.querySelectorAll('.admin-ctrl').forEach(el => { el.hidden = !isAdmin; });

  const roleBadge = document.getElementById('dock-role-badge');
  roleBadge.hidden = state.user.role === 'guest';
  if (!roleBadge.hidden) roleBadge.textContent = state.user.role;

  // Host controls are now icon toggles — reflect on/off via aria-pressed + label.
  const lockBtn  = document.getElementById('btn-lock');
  const audBtn   = document.getElementById('btn-audience');
  const ghostBtn = document.getElementById('btn-ghost');
  if (lockBtn) {
    lockBtn.setAttribute('aria-pressed', state.room?.locked ? 'true' : 'false');
    const t = state.room?.locked ? 'Unlock room' : 'Lock room';
    lockBtn.title = t; lockBtn.setAttribute('aria-label', t);
  }
  if (audBtn) {
    audBtn.setAttribute('aria-pressed', state.room?.audience ? 'true' : 'false');
    const t = state.room?.audience ? 'End audience mode' : 'Audience mode — only you can speak';
    audBtn.title = t; audBtn.setAttribute('aria-label', t);
  }
  if (ghostBtn) {
    ghostBtn.setAttribute('aria-pressed', state.user.ghost ? 'true' : 'false');
    const t = state.user.ghost ? 'Unghost — become visible' : 'Go ghost — hide yourself';
    ghostBtn.title = t; ghostBtn.setAttribute('aria-label', t);
  }

  updateMicBtn();
  // Deafen uses a separate class for distinct visual state
  const deafenBtn = document.getElementById('btn-deafen');
  if (deafenBtn) {
    deafenBtn.classList.toggle('deafened', state.media.deafened);
    deafenBtn.setAttribute('aria-pressed', state.media.deafened ? 'true' : 'false');
  }
  updateDockBtnState('btn-camera',  state.media.cameraOn);
  updateDockBtnState('btn-screen',  state.media.screenOn);
}

function updateMicBtn() {
  const btn = document.getElementById('btn-mic');
  if (!btn) return;
  const disconnected   = state.view === 'room' && !state._lkRoom;
  const audienceLocked = !!state.room?.audience && state.user.role !== 'host' && !disconnected;
  const serverBlocked  = state.view === 'room' && state.media.serverMuted && !state.media.micOn && !disconnected;
  btn.disabled = disconnected || audienceLocked || serverBlocked;
  btn.classList.toggle('mic-muted',        !state.media.micOn && !disconnected && !audienceLocked);
  btn.classList.toggle('mic-disconnected', disconnected);
  btn.classList.toggle('mic-server-muted', serverBlocked);
  btn.classList.toggle('audience-locked',  audienceLocked);
  btn.setAttribute('aria-pressed', state.media.micOn && !disconnected && !audienceLocked ? 'true' : 'false');
  btn.setAttribute('aria-label',
    disconnected    ? 'Mic unavailable while reconnecting'
    : audienceLocked  ? 'Mic off — audience mode'
    : serverBlocked   ? 'Mic muted by host'
    : state.media.micOn ? 'Mic on' : 'Mic off'
  );
}

function updateDockBtnState(id, active) {
  const btn = document.getElementById(id);
  if (btn) btn.setAttribute('aria-pressed', active ? 'true' : 'false');
}

// Generic button loading state: dims the button, blocks re-clicks, swaps its
// label for a pulsing-dot + text. Restores the original innerHTML when turned off.
function setBtnLoading(btn, isLoading, label) {
  if (!btn) return;
  if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
  btn.classList.toggle('is-loading', isLoading);
  btn.innerHTML = isLoading
    ? `<span class="btn-loading-dot" aria-hidden="true"></span><span>${label}</span>`
    : btn.dataset.defaultHtml;
}

// ── § SETUP MODAL ─────────────────────────────────────────────────
// Name + optional photo + name color. Draft values live here until confirm.
let _setupAvatar = '';
let _setupColor  = '';

function requireNickname(then) {
  if (state.user.nickname) { then(); return; }
  showSetupModal(then);
}

function showSetupModal(onComplete) {
  closeUserMenu();
  closeSettings();
  state._pendingAction = onComplete || null;
  _setupAvatar = state.user.avatar || '';
  _setupColor  = state.user.color  || '';

  const nameInput = document.getElementById('input-nickname');
  nameInput.value = state.user.nickname || '';
  document.getElementById('nickname-error').hidden = true;

  buildColorSwatches();
  renderSetupAvatar();

  showOverlay();
  document.getElementById('modal-setup').hidden = false;
  nameInput.focus();
}

function buildColorSwatches() {
  const wrap = document.getElementById('setup-colors');
  if (!wrap) return;
  const swatch = (val, bg, label, selected, extra = '') =>
    `<button type="button" class="color-swatch${selected ? ' selected' : ''}${extra}" role="radio"
       aria-checked="${selected ? 'true' : 'false'}" data-color="${escHtml(val)}"
       style="--sw:${bg}" title="${label}" aria-label="${label} color"></button>`;
  const _typedName = document.getElementById('input-nickname')?.value || state.user.nickname || 'a';
  const autoBg = accentForNick(_typedName);
  let html = swatch('', autoBg, 'auto', !_setupColor);
  html += NORMAL_COLORS.map(c => swatch(c, c, c, _setupColor === c)).join('');
  html += SHINY_COLORS.map(c => swatch(c, c, c, _setupColor === c, ' shiny')).join('');
  wrap.innerHTML = html;
  wrap.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      _setupColor = btn.dataset.color;
      wrap.querySelectorAll('.color-swatch').forEach(b => {
        const on = b === btn;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      renderSetupAvatar();
    });
  });
}

function renderSetupAvatar() {
  const el = document.getElementById('setup-avatar');
  if (!el) return;
  const name   = (document.getElementById('input-nickname').value || state.user.nickname || '?');
  const accent = _setupColor || accentForNick(name);
  el.style.background = accent;
  el.classList.toggle('has-photo', !!_setupAvatar);

  let img = el.querySelector('.setup-avatar-img');
  if (_setupAvatar) {
    if (!img) { img = document.createElement('img'); img.className = 'setup-avatar-img'; img.alt = ''; el.insertBefore(img, el.firstChild); }
    img.src = _setupAvatar;
  } else if (img) { img.remove(); }

  const initialEl = el.querySelector('.setup-avatar-initial');
  if (initialEl) initialEl.textContent = (name[0] || '?').toUpperCase();
  document.getElementById('setup-avatar-remove').hidden = !_setupAvatar;
}

function closeModals() {
  document.getElementById('modal-overlay').hidden = true;
  document.getElementById('modal-setup').hidden = true;
  state._pendingAction = null;
}

function showOverlay() {
  document.getElementById('modal-overlay').hidden = false;
}

let _lobbyToast = null;
function showLobbyBanner(msg) {
  _lobbyToast?.remove();
  const div = document.createElement('div');
  div.className = 'lobby-toast';
  div.textContent = msg;
  document.body.appendChild(div);
  _lobbyToast = div;
  setTimeout(() => { if (_lobbyToast === div) { div.remove(); _lobbyToast = null; } }, 3500);
}

// ── § MEDIA STATE ─────────────────────────────────────────────────

function _syncMicPresence() {
  sbTrackPresence({ muted: !state.media.micOn });
  const self = state.participants.find(p =>
    p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname
  );
  if (self) { self.muted = !state.media.micOn; renderParticipants(); }
}

function _syncSharingPresence() {
  const sharing = state.media.cameraOn ? 'cam' : (state.media.screenOn ? 'screen' : null);
  sbTrackPresence({ sharing });
  const self = state.participants.find(p =>
    p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname
  );
  if (self) { self.sharing = sharing; renderParticipants(); }
}

// Mic model: once you turn the mic on, the device stays acquired for the whole
// session. Muting just mutes the published track (LiveKit keeps it live), so
// unmute is instant, there's no permission re-prompt, and the OS mic indicator
// stays on while muted — nobody can hear you, but you're never "disconnected".
function micBlockedByAudience() {
  return !!state.room?.audience && state.user.role !== 'host';
}

async function setMic(on, opts = {}) {
  const userIntent = opts.userIntent !== false;
  if (on && state.media.serverMuted && !opts.allowServerMuted) {
    if (userIntent) state.media.wantsMic = true;
    updateMicBtn();
    if (!opts.silent) showBanner('A host muted you.', 'OK', hideBanner, 'warning');
    return;
  }
  if (on && micBlockedByAudience() && !opts.allowAudience) {
    if (userIntent) state.media.wantsMic = true;
    state.media.micOn = false;
    updateMicBtn();
    _syncMicPresence();
    if (!opts.silent) micBanner();
    return;
  }

  if (userIntent) state.media.wantsMic = !!on;

  // No LiveKit yet (connecting / offline): do not advertise a live mic.
  if (!state._lkRoom) {
    state.media.micOn = false;
    updateMicBtn();
    _syncMicPresence();
    if (!opts.silent) micBanner();
    return;
  }
  // Optimistic: flip the button immediately so it never visibly lags the click.
  state.media.micOn = on;
  updateMicBtn();
  try {
    await state._lkRoom.localParticipant.setMicrophoneEnabled(on, {
      echoCancellation: true,
      noiseSuppression: state.settings.noiseSuppression,
      autoGainControl:  true,
      deviceId: state.settings.micDeviceId !== 'default' ? state.settings.micDeviceId : undefined,
    });
    if (on) {
      if (!state.media.micReady) populateDevices(); // device labels become readable after first permission grant
      state.media.micReady = true;
    }
    state._localMicTrack = state._lkRoom.localParticipant.getTrackPublication?.(_lk?.Track?.Source?.Microphone)?.track || state._localMicTrack;
    if (!opts.silent) { if (on) hideBanner(); else micBanner(); }
  } catch (err) {
    state.media.micOn = !on;
    updateMicBtn();
    if (on && userIntent) state.media.wantsMic = false;
    if (!opts.silent) handleMicError(err);
    return;
  }
  updateMicBtn();
  _syncMicPresence();
}

// Re-acquire the mic so a changed noise-suppression setting takes effect live.
async function applyNoiseSuppression() {
  if (state._lkRoom && state.media.micReady && state.media.micOn) {
    await setMic(false, { silent: true });
    await setMic(true,  { silent: true });
  }
}

async function applySpeakerDevice(deviceId) {
  if (!('setSinkId' in HTMLAudioElement.prototype)) return; // iOS Safari — OS handles routing
  const audios = document.querySelectorAll('audio');
  for (const el of audios) {
    await el.setSinkId(deviceId).catch(() => {});
  }
}

function handleMicError(err) {
  logEvent('error', 'mic_failed', { errName: err?.name || 'unknown' });
  if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
    showBanner('Microphone is blocked. Allow it in your browser settings, then try again.', 'Retry', () => toggleMic(), 'error');
  } else if (err?.name === 'NotFoundError') {
    showBanner('No microphone found. Connect one, then try again.', 'Settings', openSettings, 'error');
  } else {
    showBanner('Couldn’t turn on your microphone.', 'Retry', () => toggleMic(), 'error');
  }
}

// Gentle nudge — only shown until the user enables their mic the first time.
function micBanner() {
  if (state.media.micOn) { hideBanner(); return; }
  if (state.media.serverMuted) { showBanner('A host muted you.', '', null, 'warning'); return; }
  if (micBlockedByAudience()) { showBanner('Audience mode is on — only the host can speak.', '', null, 'info'); return; }
  if (!state.media.micReady) showBanner('You’re muted — tap the mic to talk.', 'Unmute', () => toggleMic(), 'info');
  else hideBanner();
}

function toggleMic() {
  navigator.vibrate?.(8);
  if (!state._lkRoom && state.view === 'room') {
    showBanner('Voice is still connecting.', '', null, 'warning');
    return;
  }
  if (state.media.serverMuted && !state.media.micOn) { micBanner(); return; }
  if (micBlockedByAudience() && !state.media.micOn) { micBanner(); return; }
  setMic(!state.media.micOn);
}

// Forced mute/unmute from a host or audience mode — host is immune.
async function setMicMuted(muted, reason, opts = {}) {
  if (state.user.role === 'host') return;
  const serverMute = opts.serverMute !== false;

  if (muted) {
    if (serverMute) {
      state.media._preServerMuteWantsMic = state.media.wantsMic || state.media.micOn;
      state.media.serverMuted = true;
    }
    await setMic(false, { silent: true, userIntent: false });
    updateMicBtn();
    if (reason) showBanner(reason, 'OK', hideBanner, 'warning');
    return;
  }

  if (serverMute) state.media.serverMuted = false;
  const shouldRestore = serverMute && state.media._preServerMuteWantsMic;
  state.media._preServerMuteWantsMic = false;
  if (shouldRestore && !micBlockedByAudience()) {
    await setMic(true, { silent: true, userIntent: false });
  }
  updateMicBtn();
  if (micBlockedByAudience()) micBanner();
  else hideBanner();
}

function toggleDeafen() {
  navigator.vibrate?.(8);
  // Deafen = mute all incoming audio for yourself. Discord-style, it also mutes
  // your own mic while deafened, then restores it when you undeafen.
  state.media.deafened = !state.media.deafened;
  document.querySelectorAll('.lk-audio').forEach(el => { el.muted = state.media.deafened; });
  if (state.media.deafened) {
    state.media._preDeafenMicOn = state.media.micOn;
    if (state.media.micOn) setMic(false, { silent: true });
  } else if (state.media._preDeafenMicOn) {
    state.media._preDeafenMicOn = false;
    if (!micBlockedByAudience()) setMic(true, { silent: true });
  }
  const btn = document.getElementById('btn-deafen');
  if (btn) {
    btn.classList.toggle('deafened', state.media.deafened);
    btn.setAttribute('aria-pressed', state.media.deafened ? 'true' : 'false');
    btn.setAttribute('aria-label', state.media.deafened ? 'Deafened — click to undeafen' : 'Deafen');
  }
}

let _cameraToggling = false;
async function toggleCamera() {
  if (_cameraToggling) return;
  navigator.vibrate?.(8);
  _cameraToggling = true;
  try {
    if (!state._lkRoom) {
      showBanner('Camera is available after voice connects.', '', null, 'warning');
      updateDockBtnState('btn-camera', false);
      return;
    }

    if (!state.media.cameraOn) {
      // Show a loading indicator on the local card while the device warms up (can take 1-3s).
      const myCard = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`);
      myCard?.classList.add('cam-loading');
      const { createLocalVideoTrack } = await ensureLk();
      try {
        // Build constraints — if no explicit device selected, let browser pick any camera.
        const camConstraints = {};
        if (state.settings.cameraDeviceId && state.settings.cameraDeviceId !== 'default') {
          camConstraints.deviceId = { exact: state.settings.cameraDeviceId };
        }
        const resMap = { '720p': [1280, 720], '1080p': [1920, 1080] };
        const [rW, rH] = resMap[state.settings.cameraResolution] || resMap['720p'];
        camConstraints.width  = { min: Math.round(rW * 0.75), ideal: rW };
        camConstraints.height = { min: Math.round(rH * 0.75), ideal: rH };
        let track;
        try {
          track = await createLocalVideoTrack(camConstraints);
        } catch (firstErr) {
          // Only fall back to browser-default constraints when the chosen device failed
          // specifically (NotFoundError or exact deviceId mismatch). For other errors
          // (NotAllowedError, NotReadableError) the fallback would also fail — rethrow
          // immediately so the outer catch shows the right banner without a second delay.
          if (camConstraints.deviceId || firstErr.name === 'NotFoundError') {
            track = await createLocalVideoTrack({});
          } else {
            throw firstErr;
          }
        }
        await state._lkRoom.localParticipant.publishTrack(track, {
          videoEncoding: { maxBitrate: rH >= 1080 ? 4_000_000 : 2_500_000, maxFramerate: 30 },
        });
        state._localCamTrack = track;
        state.media.cameraOn = true;
        // Detect multiple cameras NOW (before showParticipantVideo) so the flip button
        // appears immediately — populateDevices() is internally async and would miss this call.
        const camDevices = await navigator.mediaDevices?.enumerateDevices().catch(() => []) ?? [];
        state.media.hasMultipleCameras = camDevices.filter(d => d.kind === 'videoinput').length > 1;
        populateDevices();
        showParticipantVideo(track, state.user.sessionId);
      } catch (err) {
        logEvent('error', 'cam_failed', { errName: err?.name || 'unknown' });
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          showBanner('Camera access denied. Allow it in browser settings, then retry.', 'Retry', () => toggleCamera());
        } else if (err.name === 'NotFoundError') {
          showBanner('No camera found. Connect a camera or enable Continuity Camera on your iPhone.', 'OK', hideBanner);
        } else {
          showBanner('Could not start camera.', 'Retry', toggleCamera);
        }
      } finally {
        document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`)
          ?.classList.remove('cam-loading');
      }
    } else {
      if (state._localCamTrack) {
        try { await state._lkRoom.localParticipant.unpublishTrack(state._localCamTrack); } catch {}
        state._localCamTrack.stop();
        state._localCamTrack = null;
      }
      state.media.cameraOn = false;
      hideParticipantVideo(state.user.sessionId);
    }

    updateDockBtnState('btn-camera', state.media.cameraOn);
    _syncSharingPresence();
  } finally {
    _cameraToggling = false;
  }
}

let _screenToggling = false;
async function toggleScreen() {
  if (_screenToggling) return;
  navigator.vibrate?.(8);
  _screenToggling = true;
  try {
    if (!state._lkRoom) {
      showBanner('Screen share is available after voice connects.', '', null, 'warning');
      updateDockBtnState('btn-screen', false);
      return;
    }

    if (!state.media.screenOn) {
      const screenBtn = document.getElementById('btn-screen');
      screenBtn?.classList.add('screen-loading');
      const { createLocalScreenTracks } = await ensureLk();
      try {
        const tracks = await createLocalScreenTracks({ audio: true });
        const videoTrack = tracks[0];
        const audioTrack = tracks[1] || null;
        if (!videoTrack) throw new Error('no screen video track');

        await state._lkRoom.localParticipant.publishTrack(videoTrack);
        if (audioTrack) {
          state._lkRoom.localParticipant.publishTrack(audioTrack).catch(() => {});
        }
        state._localScreenTrack = videoTrack;
        state.media._localScreenAudioTrack = audioTrack || null;
        state.media.screenOn = true;

        showScreenShareVideo(videoTrack, { name: state.user.nickname, identity: state.user.sessionId });
        appendSystemMessage(`${state.user.nickname} started sharing their screen`, 'action');

        // Browser stop-sharing button (native UI)
        videoTrack.mediaStreamTrack.addEventListener('ended', () => {
          if (state.media.screenOn) toggleScreen();
        }, { once: true });
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          logEvent('error', 'screen_share_failed', { errName: err?.name || 'unknown' });
          showBanner('Could not share screen.', 'OK', hideBanner);
        }
      } finally {
        screenBtn?.classList.remove('screen-loading');
      }
    } else {
      if (state._localScreenTrack) {
        try { await state._lkRoom.localParticipant.unpublishTrack(state._localScreenTrack); } catch {}
        state._localScreenTrack.stop();
        state._localScreenTrack = null;
      }
      if (state.media._localScreenAudioTrack) {
        try { await state._lkRoom.localParticipant.unpublishTrack(state.media._localScreenAudioTrack); } catch {}
        state.media._localScreenAudioTrack.stop();
        state.media._localScreenAudioTrack = null;
      }
      state.media.screenOn = false;
      hideScreenShareArea();
      appendSystemMessage(`${state.user.nickname} stopped sharing their screen`, 'action');
    }

    updateDockBtnState('btn-screen', state.media.screenOn);
    _syncSharingPresence();
  } finally {
    _screenToggling = false;
  }
}

// ── § BANNER ──────────────────────────────────────────────────────
function showBanner(text, actionText, actionFn, variant = 'error') {
  const banner   = document.getElementById('room-banner');
  const textEl   = document.getElementById('banner-text');
  const actionEl = document.getElementById('banner-action-btn');
  textEl.textContent = text;
  actionEl.textContent = actionText || '';
  actionEl.style.display = actionText ? '' : 'none';
  actionEl.onclick = actionFn ? () => actionFn() : null;
  banner.classList.remove('banner-info', 'banner-warning', 'banner-error');
  banner.classList.add(`banner-${variant}`, 'banner-visible');
}

function hideBanner() {
  document.getElementById('room-banner').classList.remove('banner-visible');
}

// ── § SETTINGS ────────────────────────────────────────────────────
let _micTestStream = null, _micTestRaf = null, _micTestCtx = null;

async function startMicTest() {
  try {
    _micTestStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    _micTestCtx = new AudioContext();
    const src = _micTestCtx.createMediaStreamSource(_micTestStream);
    const analyser = _micTestCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function frame() {
      if (!state.ui.settingsOpen) { stopMicTest(); return; }
      analyser.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      const pct = Math.min(100, (avg / 128) * 250);
      const fill = document.getElementById('mictest-fill');
      if (fill) fill.style.width = pct + '%';
      _micTestRaf = requestAnimationFrame(frame);
    }
    _micTestRaf = requestAnimationFrame(frame);
  } catch (_) {}
}

function stopMicTest() {
  cancelAnimationFrame(_micTestRaf);
  _micTestRaf = null;
  _micTestStream?.getTracks().forEach(t => t.stop());
  _micTestStream = null;
  if (_micTestCtx) { _micTestCtx.close().catch(() => {}); _micTestCtx = null; }
  const fill = document.getElementById('mictest-fill');
  if (fill) fill.style.width = '0%';
}

function openSettings() {
  state.ui.settingsOpen = true;
  document.getElementById('settings-panel').hidden = false;
  document.getElementById('settings-version').textContent = `v${VERSION}`;
  populateDevices();
  startMicTest();
}

function closeSettings() {
  state.ui.settingsOpen = false;
  document.getElementById('settings-panel').hidden = true;
  stopMicTest();
}

function toggleSettings() {
  if (state.ui.settingsOpen) closeSettings(); else openSettings();
}

function populateDevices() {
  if (!navigator.mediaDevices?.enumerateDevices) return;
  navigator.mediaDevices.enumerateDevices().then(devices => {
    const micSel     = document.getElementById('sel-mic');
    const speakerSel = document.getElementById('sel-speaker');
    const camSel     = document.getElementById('sel-camera');
    const mics       = devices.filter(d => d.kind === 'audioinput');
    const speakers   = devices.filter(d => d.kind === 'audiooutput');
    const cameras    = devices.filter(d => d.kind === 'videoinput');
    state.media.hasMultipleCameras = cameras.length > 1;
    if (mics.length >= 1) {
      micSel.innerHTML = mics.map(d =>
        `<option value="${escHtml(d.deviceId)}">${escHtml(d.label || `Microphone ${d.deviceId.slice(0,4)}`)}</option>`
      ).join('');
      micSel.value = state.settings.micDeviceId;
    }
    // iOS Safari returns 0 audiooutput devices — OS routes audio automatically there.
    // Hide the speaker row entirely rather than showing a useless "Default" option.
    const speakerLbl = document.getElementById('lbl-speaker');
    const hasSpeakers = speakers.length >= 1 && 'setSinkId' in HTMLAudioElement.prototype;
    if (speakerLbl)  speakerLbl.hidden  = !hasSpeakers;
    speakerSel.hidden = !hasSpeakers;
    if (hasSpeakers) {
      speakerSel.innerHTML = speakers.map(d =>
        `<option value="${escHtml(d.deviceId)}">${escHtml(d.label || `Speaker ${d.deviceId.slice(0,4)}`)}</option>`
      ).join('');
      speakerSel.value = state.settings.speakerDeviceId;
    }
    if (camSel && cameras.length >= 1) {
      camSel.innerHTML = cameras.map(d =>
        `<option value="${escHtml(d.deviceId)}">${escHtml(d.label || `Camera ${d.deviceId.slice(0,4)}`)}</option>`
      ).join('');
      camSel.value = state.settings.cameraDeviceId;
    }
  }).catch(() => {});
}

// ── § HOST CONTROLS ───────────────────────────────────────────────
let _lockToggling = false;
async function toggleLock() {
  if (!state.room || _lockToggling) return;
  _lockToggling = true;
  const prev = state.room.locked;
  state.room.locked = !prev;
  updateDock();
  updateTopbar();
  try {
    await sbUpdateRoom(state.room.slug, { locked: state.room.locked });
    appendSystemMessage(state.room.locked ? 'Room locked by host' : 'Room unlocked by host', 'action');
    // postgres_changes subscription in sbWatchCurrentRoom notifies all participants
    const r = state.rooms.find(x => x.slug === state.room?.slug);
    if (r) r.locked = state.room.locked;
  } catch {
    state.room.locked = prev;
    updateDock();
    updateTopbar();
    showBanner('Failed to update room. Try again.', null, null, 'error');
  } finally {
    _lockToggling = false;
  }
}

let _audienceToggling = false;
async function toggleAudience() {
  if (!state.room || _audienceToggling) return;
  _audienceToggling = true;
  const prev = state.room.audience;
  state.room.audience = !prev;
  updateTopbar();
  updateDock();
  renderParticipants();
  try {
    await sbUpdateRoom(state.room.slug, { audience_mode: state.room.audience });
    appendSystemMessage(
      state.room.audience
        ? 'Audience mode on — only the host can speak'
        : 'Audience mode off — everyone can speak',
      'action'
    );
  } catch {
    state.room.audience = prev;
    updateTopbar();
    updateDock();
    renderParticipants();
    showBanner('Failed to update room. Try again.', null, null, 'error');
  } finally {
    _audienceToggling = false;
  }
}

let _ghostToggling = false;
async function toggleGhost() {
  if (_ghostToggling) return;
  _ghostToggling = true;
  state.user.ghost = !state.user.ghost;
  updateDock();
  updateTopbar(); // ghost badge
  renderParticipants(); // immediately reflect in local grid without waiting for presence echo

  // Truly hide from others by leaving presence; you stay connected to audio + chat.
  // The presence sync handler re-adds you to your own list, so you still see yourself.
  try {
    if (state.user.ghost) {
      try { await state._sbPresenceChan?.untrack(); } catch {}
    } else {
      await sbTrackPresence({});
    }
    appendSystemMessage(
      state.user.ghost ? 'You went ghost — hidden from the list' : 'You are visible again', 'action'
    );
  } finally {
    _ghostToggling = false;
  }
}

// ── § CHAT ────────────────────────────────────────────────────────
const _msgBurst = []; // rolling timestamps of recent sends
let _msgIdSeq = 0;   // local counter for optimistic message identity

function chatCooldownMs() {
  const now = Date.now();
  // Drop entries older than 6s
  while (_msgBurst.length && now - _msgBurst[0] > 6000) _msgBurst.shift();
  const count = _msgBurst.length;
  if (count < 3) return 0;                           // burst of 3 allowed
  if (count >= 5) return Math.max(0, 5000 - (now - _msgBurst[_msgBurst.length - 1])); // heavy spam → 5s
  return Math.max(0, 2000 - (now - _msgBurst[_msgBurst.length - 1]));                 // light spam → 2s
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const body  = input.value.trim();
  if (!body) return;

  if (state.room?.locked) {
    const el = document.getElementById('chat-cooldown');
    if (el) {
      clearInterval(_cooldownTimer);
      el.textContent = 'Room is locked — chat is paused.';
      el.hidden = false;
      el.classList.add('show');
      setTimeout(hideChatCooldown, 3000);
    }
    return;
  }

  const wait = chatCooldownMs();
  if (wait > 0) { showChatCooldown(wait); return; }
  hideChatCooldown();

  _msgBurst.push(Date.now());

  const msgId = ++_msgIdSeq;
  input.value = '';
  const msg = { nick: state.user.nickname, body, time: Date.now() };
  state.chat.push(msg);
  appendMessage(msg.nick, msg.body, msg.time, true, { msgId, sessionId: state.user.sessionId }); // optimistic

  if (state.room?.id) {
    try {
      await sbSendMessage(state.room.id, body);
    } catch (err) {
      logEvent('error', 'msg_send_failed', { code: err?.code });
      console.error('sendMessage failed:', err);
      markMsgFailed(msgId, body);
    }
  }
}

// Visible anti-spam notice with a live countdown above the chat input.
let _cooldownTimer = null;
function showChatCooldown(ms) {
  const el = document.getElementById('chat-cooldown');
  if (!el) return;
  clearInterval(_cooldownTimer);
  const end = Date.now() + ms;
  const tick = () => {
    const left = Math.ceil((end - Date.now()) / 1000);
    if (left <= 0) { hideChatCooldown(); return; }
    el.textContent = `Easy there — you’re sending too fast. Try again in ${left}s.`;
  };
  el.hidden = false;
  el.classList.add('show');
  tick();
  _cooldownTimer = setInterval(tick, 250);
}
function hideChatCooldown() {
  clearInterval(_cooldownTimer);
  const el = document.getElementById('chat-cooldown');
  if (el) { el.hidden = true; el.classList.remove('show'); }
}

let _imgErrTimer;
function showChatImgError(msg) {
  const el = document.getElementById('chat-img-error');
  if (!el) return;
  clearTimeout(_imgErrTimer);
  el.textContent = msg;
  el.hidden = false;
  el.classList.add('show');
  _imgErrTimer = setTimeout(() => { el.hidden = true; el.classList.remove('show'); }, 4000);
}

// The sender's chosen name color, when we know it (self always; others via presence).
function nickColor(nick, sessionId) {
  if (sessionId && sessionId === state.user.sessionId) return myAccent();
  if (!sessionId && nick === state.user.nickname) return myAccent();
  return state.participants.find(x => sessionId ? x.sessionId === sessionId : x.nickname === nick)?.accent || '';
}

function appendMessage(nick, body, time, isNewMsg, { msgId, dbId, sessionId } = {}) {
  const el  = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  if (msgId) div.dataset.msgId  = msgId;
  if (dbId)  div.dataset.msgDbId = dbId;
  const isYou = sessionId ? sessionId === state.user.sessionId : nick === state.user.nickname;
  const color = nickColor(nick, sessionId);
  const styleAttr = color ? ` style="color:${escHtml(color)}"` : '';
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <div class="chat-msg-body">${escHtml(body)}</div>
  `;
  el.appendChild(div);
  if (isNearBottom(el)) el.scrollTop = el.scrollHeight;
  updateScrollBtn();
  return div;
}

function markMsgFailed(msgId, body) {
  const div = document.querySelector(`[data-msg-id="${msgId}"]`);
  if (!div) return;
  div.classList.add('msg-failed');
  const label = document.createElement('div');
  label.className = 'msg-failed-label';
  label.textContent = 'Failed to send. ';
  const retry = document.createElement('button');
  retry.className = 'msg-retry-btn';
  retry.textContent = 'Retry';
  retry.addEventListener('click', async () => {
    div.classList.remove('msg-failed');
    label.remove();
    try {
      if (state.room?.id) await sbSendMessage(state.room.id, body);
    } catch { markMsgFailed(msgId, body); }
  });
  label.appendChild(retry);
  div.appendChild(label);
}

// Image message — rendered as a thumbnail that opens a fullscreen viewer.
// Images are ephemeral: broadcast over realtime, never written to the DB.
// thumb: small inline preview; full: higher-quality for the viewer.
function appendImageMessage(nick, thumb, full, time, sessionId) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const isYou = sessionId ? sessionId === state.user.sessionId : nick === state.user.nickname;
  const color = nickColor(nick, sessionId);
  const styleAttr = color ? ` style="color:${escHtml(color)}"` : '';
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <img class="chat-msg-img" src="${escHtml(thumb)}" alt="image from ${escHtml(nick)}">
  `;
  el.appendChild(div);
  const imgEl = div.querySelector('.chat-msg-img');
  imgEl?.addEventListener('click', () => openImageViewer(full));
  imgEl?.addEventListener('error', () => imgEl.classList.add('chat-msg-img--broken'));
  if (isNearBottom(el)) el.scrollTop = el.scrollHeight;
  updateScrollBtn();
  return div;
}

async function sendChatImage(file) {
  if (!file) return;
  if (!state.room) return;
  const wait = chatCooldownMs();
  if (wait > 0) { showChatCooldown(wait); return; }
  let thumb, full;
  try {
    ({ thumb, full } = await fileToThumbAndFull(file));
  } catch (err) {
    logEvent('error', 'upload_failed', { code: err?.code || 'unknown' });
    showChatImgError(imgUploadError(err));
    return;
  }
  if (thumb.length + full.length > 800_000) {
    showChatImgError('Image is too large to send. Try a smaller photo.');
    return;
  }
  _msgBurst.push(Date.now());
  const optimisticEl = appendImageMessage(state.user.nickname, thumb, full, Date.now(), state.user.sessionId); // optimistic
  try {
    await broadcastToRoom('chat:image', {
      nick: state.user.nickname, thumb, full,
      src: thumb, // backward compat for old clients
      time: Date.now(), sessionId: state.user.sessionId,
    });
  } catch {
    optimisticEl?.remove();
    showChatImgError("Couldn't send image. Check your connection.");
  }
}

function openImageViewer(src) {
  const v = document.getElementById('img-viewer');
  const img = document.getElementById('img-viewer-img');
  if (!v || !img) return;
  img.src = src;
  v.hidden = false;
}
function closeImageViewer() {
  const v = document.getElementById('img-viewer');
  if (v) v.hidden = true;
}

function appendSystemMessage(text, kind = '') {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `chat-msg-sys ${kind}`;
  div.textContent = text;
  el.appendChild(div);
  if (isNearBottom(el)) el.scrollTop = el.scrollHeight;
  updateScrollBtn();
}

// ── § USER MENU ───────────────────────────────────────────────────
let _menuTarget = null;

function openUserMenu(participant, x, y) {
  _menuTarget = participant;
  const menu = document.getElementById('user-menu');
  menu.hidden = false;
  menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth  - 160))}px`;
  menu.style.top  = `${Math.max(4, Math.min(y, window.innerHeight - 160))}px`;
  menu.querySelector('[data-action="mute"]').textContent = participant.serverMuted ? 'unmute' : 'mute';
}

function closeUserMenu() {
  document.getElementById('user-menu').hidden = true;
  _menuTarget = null;
}

async function handleDirectMute(p) {
  const prev = p.serverMuted;
  p.serverMuted = !prev;
  renderParticipants();
  try {
    await sbModerate('mute', p.sessionId, { muted: p.serverMuted });
    appendSystemMessage(p.serverMuted ? `Host muted ${p.nickname}` : `Host unmuted ${p.nickname}`, 'action');
  } catch (err) {
    console.error('moderate mute:', err);
    p.serverMuted = prev;
    renderParticipants();
  }
}

async function handleUserAction(action) {
  const p = _menuTarget;
  closeUserMenu();
  if (!p) return;
  navigator.vibrate?.(8);

  switch (action) {
    case 'mute': {
      const prev = p.serverMuted;
      p.serverMuted = !prev;
      renderParticipants();
      try {
        await sbModerate('mute', p.sessionId, { muted: p.serverMuted });
        appendSystemMessage(p.serverMuted ? `Host muted ${p.nickname}` : `Host unmuted ${p.nickname}`, 'action');
      } catch (err) {
        console.error('moderate mute:', err);
        p.serverMuted = prev;
        renderParticipants();
      }
      break;
    }

    case 'kick': {
      if (!p.sessionId) break;
      const prevParticipants = [...state.participants];
      state.kickedSessionIds.add(p.sessionId);
      state.participants = state.participants.filter(x => x.sessionId !== p.sessionId);
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was kicked`, 'leave');
      renderParticipants();
      updateTopbar();
      try {
        await sbModerate('kick', p.sessionId);
      } catch (err) {
        console.error('moderate kick:', err);
        state.kickedSessionIds.delete(p.sessionId);
        state.participants = prevParticipants;
        state.room.member_count = prevParticipants.length;
        appendSystemMessage(`Could not kick ${p.nickname}`, 'action');
        renderParticipants();
        updateTopbar();
      }
      break;
    }

    case 'ban': {
      if (p.sessionId) state.kickedSessionIds.add(p.sessionId);
      const prevParticipants = [...state.participants];
      state.participants = state.participants.filter(x => x.sessionId !== p.sessionId);
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was banned`, 'leave');
      renderParticipants();
      updateTopbar();
      try {
        if (state.room?.id) {
          await sbAddBan(state.room.id, 'nickname', p.nickname);
          if (p.sessionId) {
            await sbAddBan(state.room.id, 'session', p.sessionId);
            await sbModerate('ban', p.sessionId);
          }
        } else if (p.sessionId) {
          await sbModerate('ban', p.sessionId);
        }
      } catch (err) {
        console.error('moderate ban:', err);
        if (p.sessionId) state.kickedSessionIds.delete(p.sessionId);
        state.participants = prevParticipants;
        state.room.member_count = prevParticipants.length;
        appendSystemMessage(`Could not ban ${p.nickname}`, 'action');
        renderParticipants();
        updateTopbar();
      }
      break;
    }

  }
}


// ── § SOUND ───────────────────────────────────────────────────────
function playJoinSound() {
  try {
    const ctx  = new AudioContext();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.onended = () => ctx.close().catch(() => {});
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
}

// ── § CRASH SAFETY ────────────────────────────────────────────────
// window.onerror catches unhandled JS exceptions; stops media on crash so
// the OS mic/camera indicator goes dark even if the app is hung.
window.onerror = function (msg, src, line, col) {
  logEvent('error', 'js_crash', { msg: String(msg).slice(0, 120), line, col });
  _doEmergencyMediaStop();
  _showCrashScreen();
  return false;
};

window.onunhandledrejection = function (e) {
  logEvent('error', 'unhandled_rejection', { reason: String(e.reason).slice(0, 120) });
};

function _doEmergencyMediaStop() {
  try { lkCleanLocalTracks(); } catch {}
  try {
    if (state._lkRoom) { const r = state._lkRoom; state._lkRoom = null; r.disconnect(); }
  } catch {}
}

function _showCrashScreen() {
  const el = document.getElementById('crash-recovery');
  if (el) el.hidden = false;
}

// ── § UTIL ────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── § INIT ────────────────────────────────────────────────────────
async function init() {
  await loadIdentity();
  _loadSettings();
  // Clamp must come AFTER _loadSettings restores the saved resolution from localStorage.
  if (!state.user.isAdmin && state.settings.cameraResolution === '1080p') {
    state.settings.cameraResolution = '720p';
  }

  // Sync checkboxes to persisted values (HTML defaults may differ from saved state).
  document.getElementById('chk-noise').checked     = state.settings.noiseSuppression;
  document.getElementById('chk-joinsound').checked = state.settings.joinSound;
  document.getElementById('chk-mirror').checked    = state.settings.mirrorSelf;

  // Populate camera resolution options (1080p restricted to admin).
  const selRes = document.getElementById('sel-resolution');
  if (selRes) {
    const resOpts = [
      { val: '720p', label: '720p' },
    ];
    if (state.user.isAdmin) resOpts.push({ val: '1080p', label: '1080p (admin)' });
    selRes.innerHTML = resOpts.map(o =>
      `<option value="${o.val}"${o.val === (state.settings.cameraResolution || '720p') ? ' selected' : ''}>${o.label}</option>`
    ).join('');
  }

  // Crash recovery: dismiss overlay and return to lobby
  document.getElementById('crash-rejoin-btn')?.addEventListener('click', () => {
    document.getElementById('crash-recovery').hidden = true;
    doShowLobby();
  });

  // ── Lobby events ── (start a room is instant — no create modal)
  document.getElementById('btn-create').addEventListener('click', () => {
    requireNickname(() => createRoom());
  });
  document.getElementById('btn-create-empty')?.addEventListener('click', () => {
    requireNickname(() => createRoom());
  });
  document.getElementById('btn-change-nick')?.addEventListener('click', () => {
    showSetupModal(null);
  });

  // ── Setup modal (name + photo + color) ──
  const avatarInput = document.getElementById('setup-avatar-input');
  document.getElementById('setup-avatar').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    avatarInput.value = '';
    if (!file) return;
    try {
      _setupAvatar = await fileToDataUrl(file, 240, 0.88);
      renderSetupAvatar();
    } catch (err) {
      const errEl = document.getElementById('nickname-error');
      errEl.textContent = imgUploadError(err);
      errEl.hidden = false;
    }
  });
  document.getElementById('setup-avatar-remove').addEventListener('click', () => {
    _setupAvatar = '';
    renderSetupAvatar();
  });
  document.getElementById('input-nickname').addEventListener('input', () => {
    buildColorSwatches(); // auto chip tracks the typed name
    renderSetupAvatar();
  });

  document.getElementById('btn-nickname-confirm').addEventListener('click', () => {
    const val = document.getElementById('input-nickname').value.trim();
    if (!val || val.length < 2) {
      const errEl = document.getElementById('nickname-error');
      errEl.textContent = 'please enter at least 2 characters.';
      errEl.hidden = false;
      return;
    }
    saveIdentity({ nick: val, avatar: _setupAvatar, color: _setupColor });
    const pendingFn = state._pendingAction; // capture before closeModals clears it
    closeModals();
    renderLobby();
    // If we changed identity from inside a room, push it to everyone live.
    if (state.view === 'room') { sbTrackPresence({}); renderParticipants(); }
    if (pendingFn) pendingFn();
  });
  document.getElementById('input-nickname').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-nickname-confirm').click();
  });

  document.getElementById('modal-overlay').addEventListener('click', () => {
    if (!state._pendingAction) closeModals();
  });

  // ── Room controls ──
  document.getElementById('btn-back').addEventListener('click', requestLeaveRoom);
  document.getElementById('btn-leave').addEventListener('click', requestLeaveRoom);
  document.getElementById('btn-mic').addEventListener('click', toggleMic);
  document.getElementById('btn-deafen').addEventListener('click', toggleDeafen);
  document.getElementById('btn-camera').addEventListener('click', toggleCamera);
  document.getElementById('btn-screen').addEventListener('click', toggleScreen);
  document.getElementById('btn-settings').addEventListener('click', toggleSettings);
  document.getElementById('btn-close-settings')?.addEventListener('click', closeSettings);

  document.getElementById('btn-copy-link').addEventListener('click', () => {
    navigator.clipboard?.writeText(location.href).then(() => {
      const btn = document.getElementById('btn-copy-link');
      const orig = btn.textContent;
      btn.textContent = 'copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    }).catch(() => {});
  });

  document.getElementById('btn-toggle-chat').addEventListener('click', () => {
    state.ui.chatHidden = !state.ui.chatHidden;
    document.getElementById('panel-chat').classList.toggle('chat-hidden', state.ui.chatHidden);
    document.getElementById('panel-participants').classList.toggle('chat-hidden-partner', state.ui.chatHidden);
    document.getElementById('btn-toggle-chat').textContent = state.ui.chatHidden ? 'show chat' : 'hide chat';
  });

  // ── Host controls ──
  document.getElementById('btn-lock').addEventListener('click', toggleLock);
  document.getElementById('btn-audience').addEventListener('click', toggleAudience);
  document.getElementById('btn-ghost').addEventListener('click', toggleGhost);
  document.getElementById('btn-admin-end')?.addEventListener('click', async () => {
    if (!state.room?.slug || !state.user.isAdmin) return;
    if (!confirm('End this room for everyone?')) return;
    await sbEndRoom(state.room.slug, state.room.id);
    await doShowLobby();
  });

  // ── Chat ──
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });

  // Chat images (ephemeral — broadcast only, never stored)
  const chatFile = document.getElementById('chat-file');
  document.getElementById('btn-chat-image').addEventListener('click', () => chatFile.click());
  chatFile.addEventListener('change', () => {
    const f = chatFile.files?.[0];
    chatFile.value = '';
    if (f) sendChatImage(f);
  });
  document.getElementById('chat-input').addEventListener('paste', e => {
    const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (item) { e.preventDefault(); sendChatImage(item.getAsFile()); }
  });

  // Scroll-to-bottom button
  document.getElementById('chat-messages')?.addEventListener('scroll', updateScrollBtn);
  document.getElementById('btn-scroll-bottom')?.addEventListener('click', () => {
    const el = document.getElementById('chat-messages');
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  });

  // Image viewer
  document.getElementById('img-viewer').addEventListener('click', closeImageViewer);

  // ── Settings ──
  document.getElementById('sel-mic').addEventListener('change', e => {
    state.settings.micDeviceId = e.target.value;
    _saveSettings();
    applyNoiseSuppression(); // re-acquire mic track with the new device immediately
  });
  document.getElementById('sel-speaker').addEventListener('change', e => {
    state.settings.speakerDeviceId = e.target.value;
    _saveSettings();
    applySpeakerDevice(e.target.value);
  });
  document.getElementById('sel-camera')?.addEventListener('change', e => {
    state.settings.cameraDeviceId = e.target.value;
    _saveSettings();
  });
  document.getElementById('sel-resolution')?.addEventListener('change', e => {
    state.settings.cameraResolution = e.target.value;
    _saveSettings();
  });
  // Refresh device lists when a camera or mic is plugged in or removed.
  // Only re-enumerate on devicechange when we already hold some media permission.
  // Calling enumerateDevices() cold can queue a system permission prompt on iOS.
  navigator.mediaDevices?.addEventListener('devicechange', () => {
    if (state.ui.settingsOpen || state.media.micReady || state.media.cameraOn) populateDevices();
  });
  document.getElementById('chk-noise').addEventListener('change', e => {
    state.settings.noiseSuppression = e.target.checked;
    _saveSettings();
    applyNoiseSuppression(); // re-acquire so it takes effect mid-call
  });
  document.getElementById('chk-joinsound').addEventListener('change', e => {
    state.settings.joinSound = e.target.checked;
    _saveSettings();
  });
  document.getElementById('chk-mirror').addEventListener('change', e => {
    state.settings.mirrorSelf = e.target.checked;
    _saveSettings();
    const myCard = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`);
    if (myCard) {
      const vid = myCard.querySelector('video');
      if (vid) vid.style.transform = (state.settings.mirrorSelf && state.media.flipCamFacing !== 'environment') ? 'scaleX(-1)' : '';
    }
  });

  // ── User menu ──
  document.getElementById('user-menu').querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleUserAction(btn.dataset.action));
  });

  // ── Global close handlers ──
  document.addEventListener('click', e => {
    if (!document.getElementById('user-menu').hidden &&
        !e.target.closest('#user-menu') &&
        !e.target.closest('.host-can-act')) closeUserMenu();
    if (!document.getElementById('settings-panel').hidden &&
        !e.target.closest('#settings-panel') &&
        !e.target.closest('#btn-settings'))  closeSettings();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeUserMenu(); closeSettings(); if (!state._pendingAction) closeModals(); closeImageViewer(); }
    if (state.view === 'room' && !e.target.matches('input, textarea, select')) {
      if (e.key === 'm' || e.key === 'M') toggleMic();
      if (e.key === 'd' || e.key === 'D') toggleDeafen();
    }
  });

  window.addEventListener('resize', () => {
    if (!document.getElementById('user-menu').hidden) closeUserMenu();
  });

  // Re-pack the participant grid whenever the panel's width changes for any
  // reason — window resize, orientation change, or the "hide chat" button
  // widening the panel with no viewport resize at all. One observer covers
  // all three causes instead of wiring a separate listener for each.
  new ResizeObserver(() => {
    if (state.view === 'room') scheduleRepack();
  }).observe(document.getElementById('panel-participants'));

  // ── Route ──
  const initialSlug = parseSlug();
  if (initialSlug) {
    history.replaceState({ view: 'lobby' }, '', location.pathname);
    history.pushState({ view: 'room', slug: initialSlug }, '', location.search);

    state.rooms = await sbLoadRooms();
    let room = state.rooms.find(r => r.slug === initialSlug);
    if (!room) room = await sbFetchRoom(initialSlug);

    if (room) requireNickname(() => joinRoom(initialSlug));
    else await doShowLobby();
  } else {
    await doShowLobby();
  }

  // ── Ungraceful exit cleanup ─────────────────────────────────────
  // pagehide fires on tab close, navigation away, and bfcache entry.
  // We do best-effort synchronous cleanup here — no await, no promises.
  window.addEventListener('pagehide', () => {
    if (state.view !== 'room') return;
    dbg('lifecycle', 'pagehide — cleaning up');

    // Stop local media immediately so the OS mic/camera indicator goes dark.
    lkCleanLocalTracks();

    // Disconnect LiveKit — fire-and-forget (browser may not complete async ops on unload).
    if (state._lkRoom) {
      const r = state._lkRoom;
      state._lkRoom = null;
      try { r.disconnect(); } catch {}
    }

    // Remove our Supabase presence entry so others stop seeing us immediately
    // instead of waiting for Supabase's ~30s WebSocket timeout.
    if (state._sbPresenceChan) {
      try { state._sbPresenceChan.untrack(); } catch {}
    }

    // Host: end the room so it doesn't linger for hours as an abandoned ghost room.
    // keepalive: true lets this fetch complete even after the page is unloading.
    if (state.room?.id && state.user.role === 'host' && isHostForRoom(state.room)) {
      dbg('lifecycle', 'host pagehide — ending room via keepalive fetch');
      const hostKey = getHostKey(state.room.slug);
      fetch(`${SUPABASE_URL}/functions/v1/end-room`, {
        method: 'POST',
        keepalive: true,
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({ roomSlug: state.room.slug, hostKey }),
      }).catch(() => {});
    }
  });
}

// Keep the room at the visible viewport height so the dock stays above the keyboard.
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const vvh = window.visualViewport.height;
    const keyboardOpen = window.innerHeight - vvh > 80;
    document.documentElement.style.setProperty('--vvh', `${keyboardOpen ? vvh : window.innerHeight}px`);
    if (keyboardOpen && document.activeElement === document.getElementById('chat-input')) {
      document.getElementById('chat-input')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });
}

init();
