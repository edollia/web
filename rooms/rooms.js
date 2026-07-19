// ════════════════════════════════════════════════════════════════
//  rooms.js — doll.gg /rooms — voice / video / chat rooms (LiveKit)
// ════════════════════════════════════════════════════════════════

// LiveKit is loaded lazily when a user first enters a room so a CDN
// hiccup never kills the lobby buttons.
let _lk = null;
async function ensureLk() {
  if (!_lk) _lk = await import('https://esm.sh/livekit-client@2');
  return _lk;
}

// ── § CONFIG ─────────────────────────────────────────────────────
const VERSION        = '2026-07-05.40';
const SUPABASE_URL   = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const SUPABASE_ANON  = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const LIVEKIT_WS_URL = 'wss://pawsweb-z0kamke4.livekit.cloud';
const ROOM_SELECT    = 'id, slug, title, status, locked, audience_mode, host_nickname, host_accent, member_count, created_at, ended_at, participant_previews';
const ADMIN_UID      = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4';

// Supabase is loaded lazily too (like LiveKit) so ?demo=1 — and the lobby's very
// first paint — never block on a CDN fetch. In demo it's never loaded at all.
let sb = null;
async function ensureSb() {
  if (sb) return sb;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return sb;
}

// Name-colour palette, grouped for the picker:
//   • LOVED  — the 4 signature crowd-pleasers (pink / lilac / peach / blue)
//   • MORE   — 4 more cozy options (teal / rose / periwinkle / apricot)
//   • SHINY  — 5 special "highlight" colours that make your avatar + name GLOW
//              for everyone (opt-in only; auto-assigned colours never use these).
// No colour repeats across the three groups.
const LOVED_COLORS = [
  '#ff8fc4', // pink
  '#c9a0e8', // lilac
  '#ffb38a', // peach
  '#8ec5e8', // blue
];
const MORE_COLORS = [
  '#7fd6c0', // teal
  '#ffa6d0', // rose
  '#b0a6ec', // periwinkle
  '#ffc48a', // apricot
];
const NORMAL_COLORS = [...LOVED_COLORS, ...MORE_COLORS];
const SHINY_COLORS = [
  '#ff4f93', // hot pink
  '#a95cff', // electric violet
  '#ff8a3d', // tangerine
  '#37c6f4', // aqua
  '#2fd6a6', // spring green
];
const ACCENT_COLORS = [...NORMAL_COLORS, ...SHINY_COLORS];

// A "shiny" accent gets the glow treatment wherever the avatar/name renders.
function isShinyColor(hex) { return SHINY_COLORS.includes(String(hex || '').trim().toLowerCase()); }
// Convenience: the extra class + a --c var so CSS can paint a glow in the accent
// colour. Returns '' for normal colours (no glow, no cost).
function glowAttrs(accent) { return isShinyColor(accent) ? ' shiny-glow' : ''; }

function safeAccent(value, fallback = ACCENT_COLORS[0]) {
  const s = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(s) ? s : fallback;
}

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  // iPhone photo pickers may preserve HEIC/HEIF instead of transcoding to JPEG.
  // Keep the original File, but only accept it when the browser can decode it.
  'image/heic', 'image/heif', 'image/avif',
]);
const MAX_IMG_BYTES = 15 * 1024 * 1024; // 15 MB
// Chat attachments retain their original File objects until the batch sends.
// Bound both dimensions so a picker action cannot pin an unsafe amount of
// full-resolution image data in memory on mobile Safari.
const MAX_STAGED_IMAGES = 8;
const MAX_STAGED_BYTES = 40 * 1024 * 1024; // 40 MB across the whole batch
const MAX_IMAGE_DIMENSION = 12_000;
const MAX_IMAGE_PIXELS = 55_000_000; // includes normal 12 MP and iPhone 48 MP photos
const MAX_FALLBACK_DECODE_PIXELS = 25_000_000;
const STAGED_THUMB_PX = 232; // 58 CSS px at 4x: crisp without retaining a full decode

const IMAGE_EXT_TYPES = Object.freeze({
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
  heic: 'image/heic', heif: 'image/heif', avif: 'image/avif',
});

function acceptedImageType(file) {
  let type = String(file?.type || '').trim().toLowerCase().split(';')[0];
  if (type === 'image/jpg' || type === 'image/pjpeg') type = 'image/jpeg';
  if (type === 'image/x-png') type = 'image/png';
  if (type === 'image/heic-sequence') type = 'image/heic';
  if (type === 'image/heif-sequence') type = 'image/heif';
  if (ALLOWED_IMAGE_TYPES.has(type)) return type;

  // Some iOS share sheets and clipboard providers omit the MIME type. Only
  // infer from a known image extension when the provider supplied no useful
  // type; canvas decoding below still validates the actual bytes.
  if (!type || type === 'application/octet-stream') {
    const ext = String(file?.name || '').split('.').pop().toLowerCase();
    return IMAGE_EXT_TYPES[ext] || null;
  }
  return null;
}

function readFileChunk(file, byteCount = 1024 * 1024) {
  const blob = file.slice(0, Math.min(file.size, byteCount));
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsArrayBuffer(blob);
  });
}

function asciiAt(bytes, offset, length) {
  let out = '';
  for (let i = 0; i < length && offset + i < bytes.length; i++) out += String.fromCharCode(bytes[offset + i]);
  return out;
}

function jpegExifOrientation(bytes, view, dataStart, dataLength) {
  if (dataLength < 14 || asciiAt(bytes, dataStart, 6) !== 'Exif\0\0') return null;
  const tiff = dataStart + 6;
  const byteOrder = asciiAt(bytes, tiff, 2);
  const little = byteOrder === 'II';
  if (!little && byteOrder !== 'MM') return null;
  const read16 = offset => view.getUint16(offset, little);
  const read32 = offset => view.getUint32(offset, little);
  const segmentEnd = dataStart + dataLength;
  if (tiff + 8 > segmentEnd || read16(tiff + 2) !== 42) return null;
  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > segmentEnd) return null;
  const count = Math.min(read16(ifd), 256);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > segmentEnd) break;
    if (read16(entry) !== 0x0112 || read16(entry + 2) !== 3 || read32(entry + 4) < 1) continue;
    const orientation = read16(entry + 8);
    return orientation >= 1 && orientation <= 8 ? orientation : null;
  }
  return null;
}

// Header-only dimension inspection avoids decoding a maliciously huge image
// just to discover its size. Unknown/new formats still proceed to the browser
// decoder, with the stricter fallback guard below when resize-at-decode is not
// available.
async function imageHeaderDimensions(file, type = acceptedImageType(file)) {
  let buffer;
  try { buffer = await readFileChunk(file); } catch { return null; }
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  if (bytes.length < 10) return null;

  if (type === 'image/png' && bytes.length >= 24 && asciiAt(bytes, 1, 3) === 'PNG') {
    return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
  }
  if (type === 'image/gif' && (asciiAt(bytes, 0, 6) === 'GIF87a' || asciiAt(bytes, 0, 6) === 'GIF89a')) {
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }
  if (type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8) {
    const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
    let offset = 2;
    let orientation = 1;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset++; continue; }
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) break;
      const segmentLength = view.getUint16(offset, false);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) break;
      if (marker === 0xe1) {
        orientation = jpegExifOrientation(bytes, view, offset + 2, segmentLength - 2) || orientation;
      }
      if (sof.has(marker) && segmentLength >= 7) {
        let width = view.getUint16(offset + 5, false);
        let height = view.getUint16(offset + 3, false);
        if (orientation >= 5 && orientation <= 8) [width, height] = [height, width];
        return { width, height };
      }
      offset += segmentLength;
    }
  }
  if (type === 'image/webp' && bytes.length >= 30 && asciiAt(bytes, 0, 4) === 'RIFF' && asciiAt(bytes, 8, 4) === 'WEBP') {
    const chunk = asciiAt(bytes, 12, 4);
    if (chunk === 'VP8X') {
      const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
      return { width, height };
    }
    if (chunk === 'VP8 ' && bytes.length >= 30) {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]);
      const height = 1 + ((bytes[24] & 0x0f) << 10) + (bytes[23] << 2) + ((bytes[22] & 0xc0) >> 6);
      return { width, height };
    }
  }
  if (type === 'image/heic' || type === 'image/heif' || type === 'image/avif') {
    // HEIF/AVIF item properties expose dimensions in an `ispe` box. There can
    // be a thumbnail and a primary image, so retain the largest valid pair.
    let best = null;
    for (let i = 4; i + 16 <= bytes.length; i++) {
      if (asciiAt(bytes, i, 4) !== 'ispe') continue;
      const width = view.getUint32(i + 8, false);
      const height = view.getUint32(i + 12, false);
      if (width && height && (!best || width * height > best.width * best.height)) best = { width, height };
    }
    return best;
  }
  return null;
}

function assertSafeDimensions(dimensions) {
  if (!dimensions) return;
  const { width, height } = dimensions;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1
      || width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION
      || width * height > MAX_IMAGE_PIXELS) {
    throw Object.assign(new Error('unsafe dimensions'), { code: 'TOO_MANY_PIXELS' });
  }
}

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
  // Fit toggle: arrows inward = "show the whole frame" (contain, may add black bars)
  fitWhole:   _svg('M9 9V5H7v2H5v2h4zm6 0h4V7h-2V5h-2v4zM9 15H5v2h2v2h2v-4zm6 4h2v-2h2v-2h-4v4z'),
  // arrows outward = "zoom in / fill the bubble" (cover, crops edges)
  fitFill:    _svg('M7 7h2V5H5v4h2V7zm10-2h-2v2h2v2h2V5h-2zM7 17H5v2h4v-2H7v-2H5v2h2zm10 0v-2h-2v2h-2v2h4v-2z'),
  // Two-arrow rotate icon — "switch camera" (cycle front/back/lenses)
  flipCam:    _svg('M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z'),
  // Flip-horizontal — "mirror camera" (visual left/right flip of your own view)
  mirror:     _svg('M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z'),
  ghost:  _svg('M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17C11.06 6.49 11.51 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'),
  image:  _svg('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'),
  dots:   _svg('M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'),
  end:    _svg('M6 6h12v12H6z'),
  // paw print: one rounded pad + four toe beans (prettier than the old blob)
  paw:    _svg('M12 12.2c3.2 0 5.9 2.4 5.9 5.2 0 1.7-1.4 2.6-3.1 2.6-1.1 0-2-.5-2.8-.5s-1.7.5-2.8.5c-1.7 0-3.1-.9-3.1-2.6 0-2.8 2.7-5.2 5.9-5.2zM6.1 8.2c1.2 0 2.1 1.2 2.1 2.6S7.3 13.4 6.1 13.4 4 12.2 4 10.8s.9-2.6 2.1-2.6zm11.8 0c1.2 0 2.1 1.2 2.1 2.6s-.9 2.6-2.1 2.6-2.1-1.2-2.1-2.6.9-2.6 2.1-2.6zM9.7 3.8c1.2 0 2.1 1.3 2.1 2.8s-.9 2.8-2.1 2.8S7.6 8.1 7.6 6.6 8.5 3.8 9.7 3.8zm4.6 0c1.2 0 2.1 1.3 2.1 2.8s-.9 2.8-2.1 2.8-2.1-1.3-2.1-2.8.9-2.8 2.1-2.8z'),
  star:   _svg('M12 2l2.6 6.9L22 9.3l-5.5 4.6L18.2 22 12 17.8 5.8 22l1.7-8.1L2 9.3l7.4-.4z'),
  send:   _svg('M3 20.5L21 12 3 3.5 3 10l12 2-12 2z'),
  enter:  _svg('M20 11H7.83l4.88-4.88L11.3 4.7 4 12l7.3 7.3 1.41-1.42L7.83 13H20z'),
  heartFill: _svg('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z'),
  // swirl (stroked spiral) — kept outside _svg so it can be fill:none/stroke
  swirl:  '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M13.5 12a1.5 1.5 0 1 1-1.5-1.5A3.5 3.5 0 1 0 15.5 14 5.5 5.5 0 1 1 10 8.5"/></svg>',
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
  ui: { settingsOpen: false, chatHidden: false, chatView: 'full' },
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
let _videoFit = {};         // sessionId → 'cover' | 'contain' — each VIEWER's own per-stream zoom choice
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

// Random session id. crypto.randomUUID() only exists in a *secure context*, so on
// plain http:// (e.g. testing over a LAN IP on a phone) it's undefined and would
// throw. Fall back to getRandomValues (available everywhere) so the app still boots.
function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = (crypto?.getRandomValues?.(new Uint8Array(16))) ||
            Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;   // version 4
  b[8] = (b[8] & 0x3f) | 0x80;   // variant
  const h = [...b].map(x => x.toString(16).padStart(2, '0'));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

async function loadIdentity() {
  // One-time migration from the old /voice/ keys so existing visitors keep their name.
  for (const [oldK, newK] of [['dg_voice_nick', LS.nick], ['dg_voice_sid', LS.sid]]) {
    const old = localStorage.getItem(oldK);
    if (old && !localStorage.getItem(newK)) localStorage.setItem(newK, old);
  }

  const nick   = localStorage.getItem(LS.nick);
  const sid    = localStorage.getItem(LS.sid) || genId();
  localStorage.setItem(LS.sid, sid);
  state.user.sessionId = sid;
  if (nick) state.user.nickname = nick;
  state.user.avatar = localStorage.getItem(LS.avatar) || '';
  state.user.color  = safeAccent(localStorage.getItem(LS.color), '');

  // Admin detection: verify via Supabase Auth session (set when logged in at /admin/rooms/).
  // The localStorage flag only grants ghost mode; full admin powers require a real auth session.
  // Skipped entirely in demo so the demo needs no network / no CDN at all.
  if (!DEMO) {
    try {
      await ensureSb();
      const { data: { user } } = await sb.auth.getUser();
      if (user?.id === ADMIN_UID) state.user.isAdmin = true;
    } catch { /* not logged in / offline — not an error */ }
  }
}

async function getAdminJwt() {
  if (DEMO || !state.user.isAdmin) return null;
  try {
    await ensureSb();
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
  // Auto-assigned colours only ever pick from the calm set — the shiny glow
  // colours stay a deliberate, opt-in choice.
  return NORMAL_COLORS[h % NORMAL_COLORS.length];
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

function basicImageValidation(file) {
  if (!file) throw Object.assign(new Error('no file'), { code: 'NO_FILE' });
  if (file.size > MAX_IMG_BYTES) throw Object.assign(new Error('too large'), { code: 'TOO_LARGE' });
  const type = acceptedImageType(file);
  if (!type) throw Object.assign(new Error('unsupported type'), { code: 'BAD_TYPE' });
  return type;
}

const _temporaryImageObjectUrls = new Set();
let _imageWorkTail = Promise.resolve();

function runSerializedImageWork(work) {
  const run = _imageWorkTail.catch(() => {}).then(work);
  // Keep the shared tail fulfilled so one bad file cannot poison later work;
  // settle it to `undefined` so the queue itself never retains the last
  // encoded thumbnail/full-image result after its caller is finished.
  _imageWorkTail = run.then(() => undefined, () => undefined);
  return run;
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    _temporaryImageObjectUrls.add(url);
    let settled = false;
    const releaseUrl = () => {
      if (_temporaryImageObjectUrls.delete(url)) URL.revokeObjectURL(url);
    };
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      releaseUrl();
      img.onload = null;
      img.onerror = null;
      if (error) {
        img.src = '';
        reject(Object.assign(error, { code: 'DECODE_FAILED' }));
      } else {
        resolve(img);
      }
    };
    const timeout = setTimeout(() => finish(new Error('decode timed out')), 15_000);
    img.onload = () => finish();
    img.onerror = () => finish(new Error('decode failed'));
    img.src = url;
  });
}

// Decode at the requested bound when the browser supports it. On older Safari,
// fall back to a single HTMLImage decode, but refuse exceptionally large pixel
// counts first so one preview cannot exhaust the tab. Call cleanup immediately
// after drawing to release the decoder surface.
async function boundedImageSource(file, maxPx, knownDimensions = null) {
  const dimensions = knownDimensions || await imageHeaderDimensions(file);
  // Never fall through to an unconstrained HTMLImage decode when the header
  // could not be identified. All accepted normal/iPhone formats above expose
  // dimensions without decoding pixel data; a null result is malformed or an
  // unsupported container and is safer to reject.
  if (!dimensions) throw Object.assign(new Error('unknown dimensions'), { code: 'DECODE_FAILED' });
  assertSafeDimensions(dimensions);

  if (typeof createImageBitmap === 'function') {
    const scale = Math.min(1, maxPx / Math.max(dimensions.width, dimensions.height));
    const boundedLongEdge = Math.max(1, Math.round(Math.max(dimensions.width, dimensions.height) * scale));
    // Specify one edge only so the decoder preserves aspect ratio even when
    // EXIF rotates a JPEG and swaps its stored width/height.
    const resize = dimensions.width >= dimensions.height
      ? { resizeWidth: boundedLongEdge }
      : { resizeHeight: boundedLongEdge };
    const decodeBitmap = options => createImageBitmap(file, {
      imageOrientation: 'from-image',
      ...options,
      resizeQuality: 'high',
    });
    try {
      let bitmap = await decodeBitmap(resize);
      // Some engines historically interpreted resize dimensions before EXIF
      // rotation. Retry with the opposite constrained edge, then enforce the
      // real output bound instead of trusting the options.
      if (bitmap.width > maxPx || bitmap.height > maxPx) {
        bitmap.close?.();
        const opposite = resize.resizeWidth
          ? { resizeHeight: boundedLongEdge }
          : { resizeWidth: boundedLongEdge };
        bitmap = await decodeBitmap(opposite);
      }
      if (!bitmap.width || !bitmap.height || bitmap.width > maxPx || bitmap.height > maxPx) {
        bitmap.close?.();
        throw Object.assign(new Error('decoder ignored resize bound'), { code: 'TOO_MANY_PIXELS' });
      }
      return { source: bitmap, width: bitmap.width, height: bitmap.height, cleanup: () => bitmap.close?.() };
    } catch (err) {
      if (err?.code === 'TOO_MANY_PIXELS') throw err;
      // A supported MIME can still miss a platform decoder (notably HEIC off
      // Apple devices). The HTMLImage path below gives Safari a second chance.
    }
  }

  if (dimensions.width * dimensions.height > MAX_FALLBACK_DECODE_PIXELS) {
    throw Object.assign(new Error('unsafe fallback decode'), { code: 'TOO_MANY_PIXELS' });
  }
  const img = await loadImageElement(file);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  try {
    assertSafeDimensions({ width, height });
    return { source: img, width, height, cleanup: () => { img.src = ''; } };
  } catch (err) {
    img.src = '';
    throw err;
  }
}

// Downscale an image File to a data URL. maxPx caps the longest edge.
// Canvas re-encode strips EXIF and validates actual image content.
async function fileToDataUrl(file, maxPx, quality = 0.82) {
  basicImageValidation(file);
  const dimensions = await imageHeaderDimensions(file);
  assertSafeDimensions(dimensions);
  const decoded = await boundedImageSource(file, maxPx, dimensions);
  try {
    const scale = Math.min(1, maxPx / Math.max(decoded.width, decoded.height));
    const w = Math.max(1, Math.round(decoded.width * scale));
    const h = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(decoded.source, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    decoded.cleanup();
  }
}

// Encode a single image file at two quality levels in one pass.
// Returns { thumb, full } as JPEG data URLs.
async function fileToThumbAndFull(file) {
  basicImageValidation(file);
  const dimensions = await imageHeaderDimensions(file);
  assertSafeDimensions(dimensions);
  const decoded = await boundedImageSource(file, 1280, dimensions);
  try {
    const maxLong = Math.max(decoded.width, decoded.height);
    function encode(maxPx, quality) {
      const scale = Math.min(1, maxPx / maxLong);
      const w = Math.max(1, Math.round(decoded.width * scale));
      const h = Math.max(1, Math.round(decoded.height * scale));
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(decoded.source, 0, 0, w, h);
      return c.toDataURL('image/jpeg', quality);
    }
    return { thumb: encode(380, 0.78), full: encode(1280, 0.87) };
  } finally {
    decoded.cleanup();
  }
}

function imgUploadError(err) {
  if (err?.code === 'TOO_LARGE') return 'Image is too large — max 15 MB.';
  if (err?.code === 'TOO_MANY_PIXELS') return 'That photo has unusually large dimensions. Choose a smaller copy.';
  if (err?.code === 'BAD_TYPE') return 'Unsupported file type — use JPEG, PNG, WebP, GIF, HEIC, or AVIF.';
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

// Room slug = slugified title + a random suffix that ALWAYS survives the 24-char
// cap. (Appending the suffix before the slice meant a long name swallowed it,
// yielding the same slug every time — so even the collision retry re-collided.)
function slugWithSuffix(title) {
  // Strip any hyphen the slice left dangling so we never emit `base--NNNN`
  // (the create-room slug regex rejects trailing/double hyphens).
  const base = generateSlug(title).slice(0, 18).replace(/-+$/, '') || 'room';
  return `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
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
      // `s` = this participant's live media (cam/screen), if the host wrote it.
      // Travels inside the existing previews JSON → no schema change needed.
      s: (p?.s === 'cam' || p?.s === 'screen') ? p.s : null,
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
    // "live" dot on a lobby card only when someone inside is on cam/screen.
    is_streaming:    previews.some(p => p.s === 'cam' || p.s === 'screen'),
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
  if (DEMO) return; // demo mode: no backend — optimistic local state is the truth
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

async function sbSendMessage(roomId, body, sender = null) {
  if (DEMO) return null; // demo: the optimistic append is all there is
  let request = sb.from('room_messages').insert({
    room_id:    roomId,
    nickname:   sender?.nickname || state.user.nickname,
    session_id: sender?.sessionId || state.user.sessionId,
    body,
  }).select('id').single();
  const controller = new AbortController();
  let timeout = null;
  // Supabase v2 supports abortSignal. Keep the fallback unmodified if that API
  // ever disappears rather than racing an uncancelled insert that could later
  // succeed and be retried as a duplicate.
  if (typeof request.abortSignal === 'function') {
    request = request.abortSignal(controller.signal);
    timeout = setTimeout(() => controller.abort(), 20_000);
  }
  try {
    const { data, error } = await request;
    if (controller.signal.aborted) {
      throw Object.assign(new Error('Message send timed out.'), { code: 'SEND_TIMEOUT' });
    }
    if (error) throw error;
    return data?.id ?? null; // shared id so reactions/replies key consistently across clients
  } catch (err) {
    if (controller.signal.aborted && err?.code !== 'SEND_TIMEOUT') {
      throw Object.assign(new Error('Message send timed out.'), { code: 'SEND_TIMEOUT' });
    }
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function sbAddBan(roomId, type, value) {
  if (DEMO) return; // demo: ban is local only
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
  if (DEMO) return {}; // demo: moderation is applied to local state only
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
    config: {
      presence: { key: state.user.sessionId },
      // Await the server acknowledgement so `send()` can truthfully report
      // "timed out"/"error" instead of optimistic local queue acceptance.
      broadcast: { ack: true },
    },
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
          const previews = visible.slice(0, 5).map(p => ({ n: p.nickname, a: p.accent, s: p.sharing || null }));
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
    const thumb = payload.thumb || payload.src;
    const full  = payload.full  || payload.thumb || payload.src;
    if (!isSafeChatImageDataUrl(thumb, 400) || !isSafeChatImageDataUrl(full, 1300)) return;
    const size = thumb.length + full.length;
    if (size > 900_000) return; // drop oversized payloads to prevent OOM/stall
    appendImageMessage(payload.nick, thumb, full, payload.time || Date.now(), payload.sessionId, { replyTo: payload.replyTo });
  });

  // Ephemeral message reactions + reply context — broadcast only, never stored.
  channel.on('broadcast', { event: 'chat:reaction' }, ({ payload }) => {
    if (state.view === 'room') applyRemoteReaction(payload);
  });
  channel.on('broadcast', { event: 'chat:reply' }, ({ payload }) => {
    if (state.view === 'room') applyRemoteReply(payload);
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
function validateBroadcastStatus(status) {
  if (status === 'ok') return status;
  throw Object.assign(new Error(`realtime broadcast ${status || 'failed'}`), {
    code: status === 'timed out' ? 'BROADCAST_TIMEOUT' : 'BROADCAST_FAILED',
  });
}

async function broadcastToRoom(event, payload) {
  // Demo has no realtime channel — treat the optimistic local render as sent so
  // images/reactions/replies aren't rolled back by the "send failed" catch.
  if (DEMO) return 'ok';
  if (!state._sbPresenceChan) throw new Error('no channel');
  return validateBroadcastStatus(await state._sbPresenceChan.send({ type: 'broadcast', event, payload }));
}

function captureImageSendContext() {
  const room = state.room;
  if (!room || state.view !== 'room') return null;
  return {
    roomId: room.id ?? null,
    roomSlug: String(room.slug || ''),
    channel: state._sbPresenceChan,
    sessionId: state.user.sessionId,
    nickname: state.user.nickname,
  };
}

function imageSendContextIsCurrent(context) {
  if (!context || state.view !== 'room' || !state.room) return false;
  return (state.room.id ?? null) === context.roomId
    && String(state.room.slug || '') === context.roomSlug
    && state._sbPresenceChan === context.channel
    && state.user.sessionId === context.sessionId;
}

async function broadcastToCapturedRoom(context, event, payload) {
  if (!imageSendContextIsCurrent(context)) {
    throw Object.assign(new Error('room changed'), { code: 'ROOM_CHANGED' });
  }
  if (DEMO) return 'ok';
  if (!context.channel) throw new Error('no channel');
  return validateBroadcastStatus(await context.channel.send({ type: 'broadcast', event, payload }));
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
  // Camera-label overlay (mockup): little pill, bottom-left, camera glyph + name.
  const _vidNameTag = document.createElement('div');
  _vidNameTag.className = 'p-video-name';
  _vidNameTag.innerHTML = `${ICON.cam}<span>${escHtml(card.dataset.nick || '')}</span>`;
  wrap.appendChild(_vidNameTag);
  addFullscreenBtn(wrap, video);
  addFitToggleBtn(wrap, video, identity);       // per-viewer zoom-in / view-whole
  if (isLocal) {
    addMirrorBtn(wrap);                          // flip your own view left/right
    if (state.media.hasMultipleCameras || DEMO) addSwitchCamBtn(wrap); // cycle front/back/lenses
  }
  card.classList.add('has-video');
  applyVideoFit(wrap, video, identity);         // start from this viewer's saved choice (default: fill)
  // The bubble is a FIXED shape — it never resizes to the video's aspect ratio.
  // We only read the video's real dimensions to learn its orientation (portrait
  // vs landscape) so styling/black-bars are correct, and we update that live when
  // the camera rotates — WITHOUT re-rendering the grid (no flicker).
  const syncOrientation = () => {
    if (!video.videoWidth || !video.videoHeight) return;
    _videoAspectRatio[identity] = { w: video.videoWidth, h: video.videoHeight };
    const portrait = video.videoHeight > video.videoWidth;
    wrap.classList.toggle('vid-portrait', portrait);
    wrap.classList.toggle('vid-landscape', !portrait);
  };
  video.addEventListener('loadedmetadata', syncOrientation);
  video.addEventListener('resize', syncOrientation);  // fires on device rotation
  syncOrientation();
}

// This viewer's per-stream fit: 'cover' fills the bubble (crops), 'contain' shows
// the whole frame (black bars where the aspect doesn't match). Purely local — it
// never touches presence or the other person's stream.
function applyVideoFit(wrap, video, identity) {
  const fit = _videoFit[identity] || 'cover';
  video.style.objectFit = fit;
  wrap.classList.toggle('fit-contain', fit === 'contain');
  const btn = wrap.querySelector('.fit-btn');
  if (btn) {
    const toWhole = fit === 'cover';            // next tap shows the whole frame
    const ic  = btn.querySelector('.fit-ic');
    if (ic)  ic.innerHTML = toWhole ? ICON.fitWhole : ICON.fitFill;
    btn.title = toWhole ? 'Show the whole video' : 'Fill the bubble';
    btn.setAttribute('aria-label', btn.title);
  }
}

function addFitToggleBtn(wrap, video, identity) {
  if (wrap.querySelector('.fit-btn')) return;
  const btn = document.createElement('button');
  btn.className = 'fit-btn cam-tool-btn';       // same round icon look as mirror/switch
  btn.innerHTML = '<span class="fit-ic"></span>';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    _videoFit[identity] = (_videoFit[identity] || 'cover') === 'cover' ? 'contain' : 'cover';
    applyVideoFit(wrap, video, identity);
  });
  wrap.appendChild(btn);
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

// Mirror button — flips YOUR OWN view left/right (visual only, local). Handy so
// text/gestures read the right way round. Persists via the mirrorSelf setting.
function addMirrorBtn(wrap) {
  const btn = document.createElement('button');
  btn.className = 'mirror-cam-btn cam-tool-btn';
  btn.title = 'Mirror camera';
  btn.setAttribute('aria-label', 'Mirror camera');
  btn.innerHTML = ICON.mirror;
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleMirror(); });
  wrap.appendChild(btn);
}

function toggleMirror() {
  state.settings.mirrorSelf = !state.settings.mirrorSelf;
  _saveSettings();
  const chk = document.getElementById('chk-mirror');
  if (chk) chk.checked = state.settings.mirrorSelf;
  const vid = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"] .p-video-wrap video`);
  if (vid) vid.style.transform = (state.settings.mirrorSelf && state.media.flipCamFacing !== 'environment') ? 'scaleX(-1)' : '';
  navigator.vibrate?.(8);
}

// Switch-camera button — cycles front/back and through every lens on the device.
function addSwitchCamBtn(wrap) {
  const btn = document.createElement('button');
  btn.className = 'switch-cam-btn cam-tool-btn';
  btn.title = 'Switch camera';
  btn.setAttribute('aria-label', 'Switch camera');
  btn.innerHTML = ICON.flipCam;
  btn.addEventListener('click', (e) => { e.stopPropagation(); switchCamera(); });
  wrap.appendChild(btn);
}

async function switchCamera() {
  navigator.vibrate?.(8);
  if (DEMO) { await switchDemoCamera(); return; }
  if (!state._lkRoom || !state.media.cameraOn || !state._localCamTrack) return;

  // Enumerate every camera and step to the next one (wraps around).
  const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  const cams = devices.filter(d => d.kind === 'videoinput');
  let nextConstraint;
  if (cams.length > 1) {
    const curId = state.settings.cameraDeviceId;
    const idx   = Math.max(0, cams.findIndex(c => c.deviceId === curId));
    const next  = cams[(idx + 1) % cams.length];
    state.settings.cameraDeviceId = next.deviceId;
    _saveSettings();
    nextConstraint = { deviceId: { exact: next.deviceId } };
  } else {
    // Only one enumerated device (or labels hidden) — fall back to front/back toggle.
    state.media.flipCamFacing = state.media.flipCamFacing === 'environment' ? 'user' : 'environment';
    nextConstraint = { facingMode: state.media.flipCamFacing };
  }

  const { createLocalVideoTrack } = await ensureLk();
  const myCard = document.querySelector(`.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`);
  myCard?.classList.add('cam-loading');
  const oldTrack = state._localCamTrack;
  try {
    await state._lkRoom.localParticipant.unpublishTrack(oldTrack);
    oldTrack.stop();
    state._localCamTrack = null;
    const track = await createLocalVideoTrack(nextConstraint);
    const _encBitrate = state.settings.cameraResolution === '1080p' ? 4_000_000 : 2_500_000;
    await state._lkRoom.localParticipant.publishTrack(track, {
      videoEncoding: { maxBitrate: _encBitrate, maxFramerate: 30 },
    });
    state._localCamTrack = track;
    showParticipantVideo(track, state.user.sessionId);
  } catch {
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
  // No repack: the CSS grid reflows on its own when .has-video is removed, and
  // re-rendering the whole grid here caused visible flicker.
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

// ─────────────────────────────────────────────────────────────────
// DEMO MODE (?demo=1): a fully fake scenario for local UI testing — no
// Supabase, no LiveKit. Fills the lobby + a room with fake rooms, people,
// chat, now-playing, the admin pinned banner, and every redesign control.
// Completely inert unless the ?demo=1 query flag is present, so it is safe
// to ship on main (production never sees it).
// ─────────────────────────────────────────────────────────────────
const DEMO = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');

const DEMO_ROOMS = [
  { id:'d-lia', slug:'lia', title:"lia's cozy corner", host:'lia', hostAccent:'#ff8fc4', status:'active',
    locked:false, audience_mode:false, audience:false, chat_locked:false, member_count:9,
    host_is_admin:true, pinned_in_lobby:true,
    now_playing_kind:'music', now_playing_title:'sleepy town', now_playing_source:'lofi radio',
    participant_previews:[{n:'lia',a:'#ff8fc4'},{n:'mika',a:'#c9a0e8'},{n:'sol',a:'#ffb38a'}] },
  { id:'d-mika', slug:'mika', title:'mika & friends', host:'mika', hostAccent:'#c9a0e8', status:'active',
    locked:false, audience_mode:false, audience:false, chat_locked:false, member_count:4,
    now_playing_kind:'music', now_playing_title:'midnight drive', now_playing_source:'synthwave',
    participant_previews:[{n:'mika',a:'#c9a0e8'},{n:'kaz',a:'#8ec5e8'}] },
  { id:'d-study', slug:'study', title:'study lounge', host:'sora', hostAccent:'#ffb38a', status:'active',
    locked:false, audience_mode:true, audience:true, chat_locked:false, member_count:5, is_streaming:true,
    participant_previews:[{n:'sora',a:'#ffb38a',s:'cam'},{n:'nao',a:'#7fd6c0'},{n:'yui',a:'#ffa6d0'}] },
  { id:'d-priv', slug:'private', title:'private', host:'lia', hostAccent:'#ff8fc4', status:'active',
    locked:true, audience_mode:false, audience:false, chat_locked:false, member_count:2,
    participant_previews:[] },
  { id:'d-rainy', slug:'rainy', title:'rainy day', host:'rin', hostAccent:'#ffa6d0', status:'active',
    locked:false, audience_mode:false, audience:false, chat_locked:false, member_count:1,
    participant_previews:[{n:'rin',a:'#ffa6d0'}] },
  { id:'d-kpop', slug:'kpop', title:'movie night', host:'jin', hostAccent:'#8ec5e8', status:'active',
    locked:false, audience_mode:false, audience:false, chat_locked:false, member_count:6, is_streaming:true,
    now_playing_kind:'movie', now_playing_title:'spirited away', now_playing_source:'watch party',
    participant_previews:[{n:'jin',a:'#8ec5e8',s:'screen'},{n:'ari',a:'#b0a6ec'},{n:'mei',a:'#ffc48a'}] },
];

function demoParticipants() {
  return [
    { nickname: state.user.nickname, role:'host',     muted:false, serverMuted:false, sharing:null,   accent: myAccent(), avatar: state.user.avatar, sessionId: state.user.sessionId, speaking:true },
    { nickname:'mika', role:'guest',    muted:true,  serverMuted:false, sharing:null,   accent:'#c9a0e8', avatar:null, sessionId:'d-p-mika', speaking:false },
    { nickname:'sol',  role:'guest',    muted:false, serverMuted:false, sharing:null,   accent:'#ffb38a', avatar:null, sessionId:'d-p-sol',  speaking:false },
    { nickname:'kaz',  role:'guest',    muted:false, serverMuted:true,  sharing:null,   accent:'#8ec5e8', avatar:null, sessionId:'d-p-kaz',  speaking:false },
    { nickname:'nao',  role:'guest',    muted:true,  serverMuted:false, sharing:null,   accent:'#7fd6c0', avatar:null, sessionId:'d-p-nao',  speaking:false },
  ];
}

function demoChat() {
  const t = Date.now();
  return [
    { nick:'mika', body:'welcome in ~ get comfy', time:t-300000, sessionId:'d-p-mika',
      reactions:{ happy:['d-p-kaz','d-p-sol'] } },
    { nick:'kaz',  body:'this track is unreal fr', time:t-240000, sessionId:'d-p-kaz',
      reactions:{ cool:['d-p-mika'] } },
    { sys:true, kind:'action', body:'mika reacted to the song' },
    { nick:'sol',  body:'sharing my cam hehe ~', time:t-120000, sessionId:'d-p-sol',
      replyTo:{ nick:'kaz', text:'this track is unreal fr' } },
    { nick: state.user.nickname, body:'just got here, hi all :3', time:t-60000, sessionId: state.user.sessionId },
  ];
}

function startDemo() {
  state.user.nickname  = state.user.nickname || 'lia';
  state.user.sessionId = state.user.sessionId || 'demo-you';
  state.user.isAdmin   = true; // so admin-only controls (ghost, etc.) also show
  state.roomsLocked    = false;
  state.rooms = DEMO_ROOMS.map(r => ({ ...r }));
  state.view  = 'lobby';
  document.getElementById('view-room').hidden  = true;
  document.getElementById('view-lobby').hidden = false;
  renderLobby();
  showLobbyBanner('demo mode ~ fake data, no live connection. tap any room.');
}

function demoEnterRoom(slug) {
  const src = state.rooms.find(r => r.slug === slug) || state.rooms[0];
  state.user.role = 'host'; // host so every host/admin control is visible
  state.room = { ...src, host: src.host, audience: !!src.audience_mode, chat_locked: false };
  state.participants = demoParticipants();
  state.chat = demoChat();
  renderRoom();
  placeChatViewControl();
  placeHostControls();
  updateChatLockUI();
  // Show the room's real now-playing (music/movie), or no banner if none —
  // so all three states are eyeball-able across the demo rooms.
  if (src.now_playing_title) setNowPlaying({ kind: src.now_playing_kind, title: src.now_playing_title, source: src.now_playing_source });
  else setNowPlaying(null);
  if (isMobileView()) setChatView('hidden');
}

// ── § RENDER / LOBBY ──────────────────────────────────────────────

// §9 admin pinned banner: an admin-hosted room that opts into `pinned_in_lobby`
// renders as the big banner atop the lobby (and its normal card is skipped).
// Dormant-safe: `pinned_in_lobby` / `host_is_admin` aren't in ROOM_SELECT yet, so
// they read undefined, no room matches, and the banner stays hidden — nothing
// breaks pre-deploy. It lights up once the migration + select additions land.
// Returns the pinned room's slug (to de-dupe its card), or null.
function renderPinnedBanner(rooms) {
  const banner = document.getElementById('lobby-pinned-banner');
  if (!banner) return null;
  const room = rooms.find(r => r.pinned_in_lobby && r.host_is_admin && r.status !== 'ended');
  if (!room) { banner.hidden = true; return null; }

  const titleEl = document.getElementById('pinned-title');
  const npEl    = document.getElementById('pinned-np');
  const tagEl   = document.getElementById('pinned-tagline');
  const bubbles = document.getElementById('pinned-bubbles');
  const joinBtn = document.getElementById('btn-pinned-join');

  if (titleEl) titleEl.textContent = room.title || `@${room.host || ''}`;

  // now-playing line with the little equalizer glyph (#5), only when §10 data exists
  if (npEl) {
    if (room.now_playing_title) {
      npEl.innerHTML = '<span class="np-eq" aria-hidden="true"><i></i><i></i><i></i></span>'
        + `now playing · <b>${escHtml(room.now_playing_title)}</b>`
        + (room.now_playing_source ? ` — ${escHtml(room.now_playing_source)}` : '');
      npEl.hidden = false;
    } else { npEl.textContent = ''; npEl.hidden = true; }
  }
  if (tagEl) tagEl.textContent = 'come sit w me ~';

  // participant bubbles — same builder as the normal room cards
  if (bubbles) {
    const shown = (room.participant_previews || []).slice(0, 3);
    const overflow = (room.member_count || 0) - shown.length;
    bubbles.innerHTML = shown.map((p, i) =>
      `<div class="card-bubble" style="--c:${escHtml(p.a)};z-index:${shown.length - i}">${avatarInner(p.n, p.a, '')}</div>`
    ).join('') + (overflow > 0 ? `<div class="card-bubble card-bubble-more">+${overflow}</div>` : '');
  }

  // "join {host} ♡" (#5) — heart matches the mockup
  if (joinBtn) {
    joinBtn.innerHTML = `join ${escHtml(room.host || '')} <svg class="ic-heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.3l-1.3-1.2C6 14.8 3 12 3 8.7 3 6.2 5 4.2 7.5 4.2c1.5 0 2.9.7 3.8 1.9l.7.9.7-.9c.9-1.2 2.3-1.9 3.8-1.9C19 4.2 21 6.2 21 8.7c0 3.3-3 6.1-7.7 10.4L12 20.3z"/></svg>`;
    joinBtn.onclick = () => requireNickname(() => joinRoom(room.slug));
  }

  banner.hidden = false;
  return room.slug;
}

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
  // The chip shows the person's actual name (not the literal word "you").
  const chipName = document.querySelector('.profile-chip-you');
  if (chipName) {
    chipName.textContent = state.user.nickname || 'set a name';
    chipName.style.setProperty('--c', myAccent());
    chipName.classList.toggle('shiny-glow', isShinyColor(myAccent()));
  }

  // Profile-chip avatar (photo or initial, tinted with the user's accent)
  const av = document.getElementById('lobby-avatar');
  if (av) {
    av.style.setProperty('--c', myAccent());
    av.classList.toggle('shiny-glow', isShinyColor(myAccent()));
    av.innerHTML = avatarInner(state.user.nickname, state.user.color, state.user.avatar);
  }

  // Lockdown blocks room creation for everyone except the admin.
  const locked = !!state.roomsLocked && !state.user.isAdmin;
  if (lockdownNotice) lockdownNotice.hidden = !locked;
  if (createBtn) createBtn.disabled = locked;
  if (createEmptyBtn) createEmptyBtn.disabled = locked;

  // §9: an admin-hosted pinned room becomes the banner and skips its own card.
  const pinnedSlug = renderPinnedBanner(state.rooms);

  const hasRooms = state.rooms.length > 0;
  // When the lobby is empty, only the empty-state CTA shows; the header button
  // appears once there are rooms to sit beside.
  if (createBtn) createBtn.hidden = !hasRooms;

  if (!hasRooms) {
    grid.innerHTML = '';
    empty.hidden = false;
  } else {
    empty.hidden = true;
    grid.innerHTML = state.rooms.filter(r => r.slug !== pinnedSlug).map(renderRoomCard).join('');
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
  if (room.locked) {
    // Locked rooms show a lock badge instead of participant previews (mockup).
    thumbnailHtml = `<div class="card-avatar card-lock">${ICON.lock}</div>`;
  } else if (shown.length > 0) {
    const bubbles = shown.map((p, i) =>
      `<div class="card-bubble${glowAttrs(p.a)}" style="--c:${escHtml(p.a)};z-index:${shown.length - i}">${avatarInner(p.n, p.a, '')}</div>`
    ).join('');
    const moreHtml = overflow > 0
      ? `<div class="card-bubble card-bubble-more">+${overflow}</div>`
      : '';
    thumbnailHtml = `<div class="card-bubbles">${bubbles}${moreHtml}</div>`;
  } else {
    thumbnailHtml = `<div class="card-avatar${glowAttrs(room.hostAccent)}" style="--c:${escHtml(room.hostAccent)}">${avatarInner(room.host, room.hostAccent, '')}</div>`;
  }

  return `<div class="room-card${room.locked ? ' locked' : ''}${isYours ? ' yours' : ''}"
               data-slug="${escHtml(room.slug)}"
               role="button" tabindex="${room.locked && !isYours ? '-1' : '0'}"
               aria-label="${title}, ${room.member_count} participant${room.member_count !== 1 ? 's' : ''}${room.locked ? ', locked' : ''}">
    ${room.is_streaming && !room.locked ? `<span class="card-live"><span class="card-live-word">live</span><span class="card-live-num">${room.member_count}</span></span>` : ''}
    ${thumbnailHtml}
    <div class="card-name">
      ${title}${isYours ? ' <span class="yours-tag">(yours)</span>' : ''}${room.locked ? ` <span class="badge badge-locked">${ICON.lock} locked</span>` : ''}
    </div>
    ${room.locked && !isYours
        ? `<div class="card-ask">dont ask me</div>`
        : `<div class="card-join">join ${ICON.enter}</div>`}
  </div>`;
}

// ── § TRANSITIONS ─────────────────────────────────────────────────
async function doShowLobby() {
  cancelActiveChatSend();
  releaseAllChatImageMessages();
  await lkDisconnect();
  await sbCleanupChannels();
  resetLeaveConfirm();

  // Release the demo camera preview if it's on (real getUserMedia stream).
  if (_demoCamStream) { _demoCamStream.getTracks().forEach(t => t.stop()); _demoCamStream = null; }

  // Discard any half-composed chat state (staged images, pending reply, reaction
  // stores) so nothing leaks into the next room.
  clearStagedImages();
  clearReplyTarget();
  _reactions.clear();
  _replyMeta.clear();
  closeReactionPicker();

  state.view = 'lobby';
  // A broadcast already queued before channel cleanup can land during the
  // awaited disconnects above. Sweep once more after closing the room view.
  releaseAllChatImageMessages();
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
  clearTimeout(_repackTimer);
  _repackTimer     = null;
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

  // reset chat view to full between sessions
  if (state.ui.chatView !== 'full') setChatView('full');

  _msgBurst.length = 0; // reset chat cooldown between sessions

  if (DEMO) { state.rooms = DEMO_ROOMS.map(r => ({ ...r })); renderLobby(); return; }

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
  if (DEMO) { demoEnterRoom(slug); return; }
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

  // Build the participant-card DOM now, before starting LiveKit — otherwise an
  // unusually fast TrackSubscribed event could arrive before any .participant-card
  // exists to attach its video to (showParticipantVideo() no-ops silently rather
  // than crashing, so that would just be a dropped tile, not an error). Harmless
  // to run this while #view-room is still hidden: clientWidth reads 0, so the
  // masonry packer clamps to a single column, and renderRoom()'s later call
  // (after the view is actually visible) recomputes the real column count.
  renderParticipants();

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
    if (msg.sessionId !== state.user.sessionId) bumpChatUnread();
  });

  // On mobile, chat is an overlay sheet — start closed so participants fill the
  // screen, and dock the full/peek/hide control inside the sheet header.
  placeChatViewControl();
  placeHostControls();
  if (isMobileView()) setChatView('hidden');

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
      if (typeof updated.title !== 'undefined' && updated.title !== state.room.title) {
        state.room.title = updated.title;
        updateTopbar(); // reflect a host's inline rename for everyone else in the room
      }
      if (typeof updated.locked !== 'undefined') state.room.locked = updated.locked;
      if (typeof updated.chat_locked !== 'undefined') {
        const wasChatLocked = state.room.chat_locked;
        state.room.chat_locked = updated.chat_locked;
        if (updated.chat_locked !== wasChatLocked) {
          updateChatLockUI();
          if (state.user.role !== 'host') {
            appendSystemMessage(updated.chat_locked ? 'Chat locked by host' : 'Chat unlocked by host', 'action');
          }
        }
      }
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
  updateChatLockUI();
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

// Update only the leave button's text label, preserving its paw icon.
function setLeaveLabel(txt) {
  const btn = document.getElementById('btn-leave');
  if (!btn) return;
  const label = btn.querySelector('.leave-label');
  if (label) label.textContent = txt;
  else btn.textContent = txt;
}

function resetLeaveConfirm() {
  clearTimeout(_leaveConfirmTimer);
  _leaveConfirmTimer = null;
  setLeaveLabel('leave');
}

function requestLeaveRoom() {
  navigator.vibrate?.(8);
  const liveMedia = state.media.cameraOn || state.media.screenOn;
  if (liveMedia && !_leaveConfirmTimer) {
    setLeaveLabel('end?');
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
  const slug   = slugWithSuffix(title);
  let room = null;
  try {
    const data = await sbCreateRoom(slug, title, false);
    room = roomFromDb(data);
  } catch (err) {
    // On slug collision, retry once with a freshly generated slug.
    if (String(err.message).includes('slug already exists')) {
      const retrySlug = slugWithSuffix(title);
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

  // Topbar shows the room title (mockup); falls back to @host when untitled.
  // The host can tap it to rename the room inline (initEditableTitle) — don't
  // clobber the field while it's being edited.
  const hostEl = document.getElementById('topbar-host');
  if (hostEl && !hostEl.querySelector('input')) hostEl.textContent = room.title || `@${room.host || ''}`;
  if (hostEl) {
    hostEl.classList.toggle('editable', isHost);
    hostEl.title = isHost ? 'Tap to rename the room' : '';
  }

  document.getElementById('topbar-locked-badge').hidden = !room.locked;
  const audBadge = document.getElementById('topbar-audience-badge');
  if (audBadge) audBadge.hidden = !room.audience;
  const ghostBadge = document.getElementById('topbar-ghost-badge');
  if (ghostBadge) ghostBadge.hidden = !state.user.ghost;

  document.getElementById('topbar-count').innerHTML = `${ICON.people} ${state.participants.length}`;
  document.getElementById('participant-count').textContent = state.participants.length;
}

// The room title defaults to the host's @username; the host can tap it in the
// topbar to type a custom name. Wired once — the node is static.
function initEditableTitle() {
  const el = document.getElementById('topbar-host');
  if (!el || el._wired) return;
  el._wired = true;
  el.addEventListener('click', () => {
    if (state.user.role !== 'host' || el.querySelector('input')) return;
    const input = document.createElement('input');
    input.className = 'topbar-title-input';
    input.type = 'text';
    input.maxLength = 40;
    input.value = state.room?.title || '';
    input.placeholder = state.room?.host ? `@${state.room.host}` : 'room name';
    el.textContent = '';
    el.appendChild(input);
    input.focus(); input.select();
    let done = false;
    const commit = async (save) => {
      if (done) return; done = true;
      const val = input.value.trim().slice(0, 40);
      input.remove();                 // drop the field so updateTopbar can repaint the text
      if (save && state.room) {
        state.room.title = val || null;
        const r = state.rooms.find(x => x.slug === state.room.slug);
        if (r) r.title = state.room.title;
        try { if (!DEMO && state.room.slug) await sbUpdateRoom(state.room.slug, { title: state.room.title }); } catch {}
      }
      updateTopbar();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter')  { e.preventDefault(); commit(true); }
      if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    });
    input.addEventListener('blur', () => commit(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  });
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

// ── § PARTICIPANT GRID ──────────────────────────────────────────────
// The grid is now plain responsive CSS (see .participant-grid in rooms.css), so
// there's no JS bin-packing. scheduleRepack() is kept only as a debounced
// re-render for the few triggers where a card changes AFTER first paint (a
// video's real aspect ratio resolving, a camera toggling on/off) — the CSS grid
// reflows on its own, but re-rendering keeps the tile markup in sync.
function scheduleRepack() {
  clearTimeout(_repackTimer);
  _repackTimer = setTimeout(() => {
    _repackTimer = null;
    renderParticipants();
  }, 120);
}

// Chat view: 'full' (shown) or 'hidden'. Pure UI — no LiveKit/Supabase. On
// mobile the sheet's height is set separately by the drag handle (initChatResize).
function setChatView(view) {
  // Two states only: chat is shown ('full') or hidden. (Legacy 'peek' → shown.)
  view = (view === 'hidden') ? 'hidden' : 'full';
  // Leaving the drag-resize fullscreen state whenever chat is toggled, so
  // participants never stay hidden while the sheet is closed.
  document.getElementById('room-main')?.classList.remove('chat-full');
  if (view === 'full') ensureChatSheetHeight();
  state.ui.chatView = view;
  state.ui.chatHidden = (view === 'hidden');
  const chat  = document.getElementById('panel-chat');
  const parts = document.getElementById('panel-participants');
  chat?.classList.toggle('chat-hidden', view === 'hidden');
  parts?.classList.toggle('chat-hidden-partner', view === 'hidden');
  const toggle = document.getElementById('btn-chat-view');
  if (toggle) {
    toggle.textContent = view === 'hidden' ? 'show chat' : 'hide chat';
    toggle.title = view === 'hidden' ? 'Show chat' : 'Hide chat';
    toggle.setAttribute('aria-pressed', String(view === 'hidden'));
  }
  const tb = document.getElementById('btn-toggle-chat');
  if (tb) tb.textContent = view === 'hidden' ? 'show chat' : 'hide chat';
  if (view !== 'hidden') clearChatUnread();
}

// ── Mobile chat: a drag-resizable bottom sheet split with participants ──────
function isMobileView() { return window.matchMedia('(max-width: 767px)').matches; }

// Remembered chat-sheet height (px) so it re-opens at the last size the user set.
let _chatSheetH = 0;

// Mobile only: dragging #chat-grabber resizes the participants/chat split by
// setting --chat-h on #room-main. Dragging it (nearly) shut hides the chat.
// Desktop is unaffected (the grabber is display:none there).
function initChatResize() {
  const grabber = document.getElementById('chat-grabber');
  const chat    = document.getElementById('panel-chat');
  const main    = document.getElementById('room-main');
  if (!grabber || !chat || !main || grabber._wired) return;
  grabber._wired = true;

  const MIN = 120;        // smallest the sheet snaps to while open
  const CLOSE_AT = 90;    // release below this (raw) height → hide the sheet
  const FULL_GAP = 72;    // release within this of the top → go fullscreen
  const RESERVE  = 132;   // px always kept for participants: the *applied* sheet
                          // height is capped at (room − RESERVE) so it can never
                          // overflow room-main and slide under/over the dock.
  const FLING = 0.55;     // px/ms — a flick faster than this commits in its direction
  const partialMax = () => Math.max(MIN, main.clientHeight - RESERVE);

  let dragging = false, startY = 0, startH = 0, live = 0, raw = 0;
  let lastY = 0, lastT = 0, vel = 0;   // velocity tracking for fling gestures

  const apply = (h) => {
    raw = h;                                    // true finger target (for thresholds)
    const capped = Math.min(partialMax(), h);
    if (capped < MIN) {
      // Below the usable height: DON'T keep shrinking (that squished the input +
      // messages and made them jump). Freeze the layout at MIN and slide the whole
      // sheet down as one piece — smooth "pull to dismiss", no internal reflow.
      live = MIN;
      main.style.setProperty('--chat-h', MIN + 'px');
      const slide = Math.min(MIN, MIN - capped);
      chat.style.transform = `translateY(${slide}px)`;
      chat.style.opacity = String(Math.max(0.4, 1 - slide / MIN));
    } else {
      live = capped;
      main.style.setProperty('--chat-h', live + 'px');
      chat.style.transform = '';
      chat.style.opacity = '';
    }
  };
  const resetSlide = () => { chat.style.transform = ''; chat.style.opacity = ''; };
  const goFull = () => {
    resetSlide();
    // Pin --chat-h to the full pixel height BEFORE flipping to fullscreen so the
    // snap animates px→px (no px↔% discontinuity that made the input bar jump).
    main.style.setProperty('--chat-h', main.clientHeight + 'px');
    main.classList.add('chat-full');
    _chatSheetH = Math.round(partialMax() * 0.7);   // where it returns to on the next drag
  };
  const onMove = (e) => {
    if (!dragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const now = performance.now();
    const dt = now - lastT;
    if (dt > 0) vel = (lastY - y) / dt;   // +ve = moving up (expanding)
    lastY = y; lastT = now;
    apply(startH + (startY - y));         // drag up → taller
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    grabber.classList.remove('dragging');
    main.classList.remove('chat-dragging');   // re-enable the snap transition
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    // A fast flick commits in its own direction regardless of where it stopped,
    // so the sheet feels weighted — flick up = fullscreen, flick down = dismiss.
    const flungUp   = vel >  FLING;
    const flungDown = vel < -FLING;
    if (flungDown || (raw <= CLOSE_AT && !flungUp)) {   // dismiss
      main.classList.remove('chat-full');
      resetSlide();
      setChatView('hidden');
    } else if (flungUp || raw >= main.clientHeight - FULL_GAP) { // fullscreen
      goFull();
    } else {                                            // settle at the dragged split
      resetSlide();
      main.classList.remove('chat-full');
      _chatSheetH = Math.max(MIN, live);
      main.style.setProperty('--chat-h', _chatSheetH + 'px');
    }
  };
  const onDown = (e) => {
    if (!isMobileView()) return;
    dragging = true;
    grabber.classList.add('dragging');
    main.classList.add('chat-dragging');   // suppress transition so the drag tracks 1:1
    main.classList.remove('chat-full');    // leave fullscreen so --chat-h drives the drag
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    startH = chat.getBoundingClientRect().height;
    live = startH; raw = startH;
    lastY = startY; lastT = performance.now(); vel = 0;
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  };
  grabber.addEventListener('pointerdown', onDown);
}

// Give the mobile chat sheet a sensible starting height the first time it opens.
function ensureChatSheetHeight() {
  const main = document.getElementById('room-main');
  if (!main || !isMobileView()) return;
  if (!_chatSheetH) _chatSheetH = Math.round(main.clientHeight * 0.5) || 320;
  main.style.setProperty('--chat-h', _chatSheetH + 'px');
}

// (Legacy no-op — the standalone chat toggle now lives statically in the topbar
// and is hidden on mobile via CSS, so nothing needs relocating per breakpoint.)
function placeChatViewControl() {
  const seg = document.getElementById('chat-view-control');
  if (!seg) return;
  const target = isMobileView()
    ? document.querySelector('.chat-header-bar')
    : document.querySelector('.topbar-right');
  if (target && seg.parentElement !== target) target.appendChild(seg);
}

// Lock/audience are icon buttons that live in the dock (bottom bar) on every
// breakpoint — same nodes, so ids/handlers are preserved. (They used to hop to a
// separate strip above the dock on mobile; the user asked for them in the bar.)
function placeHostControls() {
  const lock = document.getElementById('btn-lock');
  const audience = document.getElementById('btn-audience');
  if (!lock || !audience) return;
  const dockRight = document.querySelector('.dock-right');
  const leave = document.getElementById('btn-leave');
  if (dockRight && leave) { dockRight.insertBefore(lock, leave); dockRight.insertBefore(audience, leave); }
}

let _chatUnread = 0;
function bumpChatUnread() {
  if (!isMobileView() || state.ui.chatView !== 'hidden') return;
  _chatUnread++;
  const b = document.getElementById('chat-unread');
  if (b) { b.textContent = _chatUnread > 9 ? '9+' : String(_chatUnread); b.hidden = false; }
}
function clearChatUnread() {
  _chatUnread = 0;
  const b = document.getElementById('chat-unread');
  if (b) b.hidden = true;
}

// Hook for the deferred shared-music/movie project: populate + reveal the
// now-playing banner. No callers yet (no data source / CSP for players); wiring
// lives here so the banner is ready when that project lands. UI only.
let _npVolume = 70;          // 0–100, persisted across sessions
let _npPreMuteVolume = 70;   // remembers level so un-mute restores it

// Apply a music-volume level to the (inert until sourced) <audio>, the slider
// fill, and the mute-button state. Safe to call before any media exists.
function applyNpVolume(v, persist = true) {
  _npVolume = Math.max(0, Math.min(100, Math.round(v)));
  const audio  = document.getElementById('np-audio');
  const slider = document.getElementById('np-volume');
  const mute   = document.getElementById('btn-np-mute');
  if (audio)  audio.volume = _npVolume / 100;
  if (slider) { slider.value = _npVolume; slider.style.setProperty('--vol', _npVolume + '%'); }
  if (mute)   mute.classList.toggle('is-muted', _npVolume === 0);
  if (persist) { try { localStorage.setItem('dg_rooms_music_vol', String(_npVolume)); } catch {} }
}

function toggleNpMute() {
  if (_npVolume === 0) applyNpVolume(_npPreMuteVolume || 70);
  else { _npPreMuteVolume = _npVolume; applyNpVolume(0); }
}

// Vinyl (music) vs film-strip (movie) art for the now-playing banner.
const NP_ART_MUSIC = '<svg class="np-vinyl" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 13.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>';
const NP_ART_MOVIE = '<svg class="np-film" viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';

// Remembers the current media so a dismissed banner can be reopened from the
// topbar restore button.
let _lastNowPlaying = null;
function updateNpRestoreBtn() {
  const btn = document.getElementById('btn-np-restore');
  const banner = document.getElementById('now-playing');
  if (!btn) return;
  // Show the little restore chip only when there IS media but the banner is hidden.
  btn.hidden = !(_lastNowPlaying && banner && banner.hidden);
}

function setNowPlaying(info) {
  const banner = document.getElementById('now-playing');
  if (!banner) return;
  if (!info || !info.title) { _lastNowPlaying = null; banner.hidden = true; updateNpRestoreBtn(); return; }
  _lastNowPlaying = info;
  const kind = info.kind === 'movie' ? 'movie' : 'music';
  banner.classList.toggle('np-movie', kind === 'movie');
  const label = document.getElementById('np-label');
  if (label) label.textContent = kind === 'movie' ? 'now watching' : 'now playing';
  const art = document.getElementById('np-art');
  if (art) art.innerHTML = kind === 'movie' ? NP_ART_MOVIE : NP_ART_MUSIC;
  const t = document.getElementById('np-title');
  const s = document.getElementById('np-source');
  if (t) t.textContent = info.title;
  if (s) s.textContent = info.source ? `— ${info.source}` : '';
  const change = document.getElementById('np-change');
  if (change) change.hidden = state.user.role !== 'host';
  // Only attach CSP-allowed sources (blob: / MediaStream); external URLs are
  // intentionally ignored so the strict `media-src blob: mediastream:` holds.
  const audio = document.getElementById('np-audio');
  if (audio) {
    if (info.mediaStream) { audio.srcObject = info.mediaStream; audio.play?.().catch(() => {}); }
    else if (typeof info.audioSrc === 'string' && info.audioSrc.startsWith('blob:')) { audio.src = info.audioSrc; audio.play?.().catch(() => {}); }
    applyNpVolume(_npVolume, false);
  }
  banner.hidden = false;
  updateNpRestoreBtn();
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

  // The invite tile lives in the grid as its final cell; detach it (preserving
  // its node + bound copy handler) so the innerHTML wipe below doesn't destroy it.
  const rfom = document.getElementById('room-for-one-more');
  if (rfom && rfom.parentElement === grid) rfom.remove();

  grid.innerHTML = visible.map(p => renderParticipantCard(p, isHost)).join('');

  // Invite tile flows as the last grid cell (mockup).
  if (rfom && !rfom.hidden) grid.appendChild(rfom);

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
    // "audience" is a ROOM mode (host-controlled: mutes everyone but the host),
    // not a per-person role — so there's no per-participant audience badge. The
    // room-level state shows in the topbar (#topbar-audience-badge).
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
    <div class="p-avatar${p.avatar ? ' has-photo' : ''}${glowAttrs(p.accent)}" style="--c:${escHtml(p.accent)}">
      ${avatarInner(p.nickname, p.accent, p.avatar)}
      ${p.muted || p.serverMuted ? '<div class="p-mic-off" title="Muted"></div>' : ''}
      ${qualityHtml}
    </div>
    <span class="p-eq" aria-hidden="true"><i></i><i></i><i></i></span>
    <div class="p-name${glowAttrs(p.accent)}" style="--c:${escHtml(p.accent)}">
      ${escHtml(p.nickname)}${p.role === 'host' ? ` <span class="p-host-tag"><svg class="ic-heart" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 20.3l-1.3-1.2C6 14.8 3 12 3 8.7 3 6.2 5 4.2 7.5 4.2c1.5 0 2.9.7 3.8 1.9l.7.9.7-.9c.9-1.2 2.3-1.9 3.8-1.9C19 4.2 21 6.2 21 8.7c0 3.3-3 6.1-7.7 10.4L12 20.3z"/></svg>host</span>` : ''}${isYou ? ' <span class="you-tag">(you)</span>' : ''}
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
    else appendMessage(m.nick, m.body, m.time, false, { sessionId: m.sessionId, replyTo: m.replyTo, reactions: m.reactions });
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
    const lbl = ghostBtn.querySelector('.settings-action-label');
    if (lbl) lbl.textContent = state.user.ghost ? "you're hidden ~ tap to show" : 'go ghost';
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
  const disconnected   = state.view === 'room' && !state._lkRoom && !DEMO;
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
  const loved = LOVED_COLORS.map(c => swatch(c, c, c, _setupColor === c)).join('');
  const more  = MORE_COLORS.map(c => swatch(c, c, c, _setupColor === c)).join('');
  const shiny = SHINY_COLORS.map(c => swatch(c, c, c, _setupColor === c, ' shiny')).join('');
  wrap.innerHTML =
    `<div class="color-swatches">${swatch('', autoBg, 'auto', !_setupColor)}${loved}${more}</div>` +
    `<div class="color-swatches color-swatches-shiny">${shiny}</div>`;
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
  el.style.setProperty('--c', accent);
  el.classList.toggle('has-photo', !!_setupAvatar);
  el.classList.toggle('shiny-glow', isShinyColor(accent));

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

// Custom confirm dialog (replaces the native confirm()) — matches the app's
// modal style. Returns a Promise<boolean>. Esc / overlay / cancel → false.
function showConfirm({ title, body = '', confirmText = 'confirm', cancelText = 'cancel', danger = false } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay confirm-overlay';
    const wrap = document.createElement('div');
    wrap.className = 'modal confirm-modal';
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = `
      <div class="modal-box confirm-box">
        <h2 class="modal-title">${escHtml(title || 'are you sure?')}</h2>
        ${body ? `<p class="modal-sub">${escHtml(body)}</p>` : ''}
        <div class="confirm-actions">
          <button type="button" class="btn-soft confirm-cancel">${escHtml(cancelText)}</button>
          <button type="button" class="btn-primary${danger ? ' confirm-danger' : ''} confirm-ok">${escHtml(confirmText)}</button>
        </div>
      </div>`;
    const close = (result) => {
      document.removeEventListener('keydown', onKey);
      overlay.remove(); wrap.remove();
      resolve(result);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      else if (e.key === 'Enter') close(true);
    };
    overlay.addEventListener('click', () => close(false));
    wrap.querySelector('.confirm-cancel').addEventListener('click', () => close(false));
    wrap.querySelector('.confirm-ok').addEventListener('click', () => close(true));
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.appendChild(wrap);
    wrap.querySelector('.confirm-ok').focus();
  });
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
  if (DEMO) {                       // no LiveKit in demo — just flip the visual state
    state.media.micOn = !state.media.micOn;
    state.media.micReady = state.media.micOn;
    updateMicBtn();
    return;
  }
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
// Demo-only: a real getUserMedia camera preview so you can eyeball yourself
// before going live. No LiveKit — the stream attaches straight to your own tile.
let _demoCamStream = null;
async function toggleDemoCamera() {
  const sel = `.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`;
  if (!state.media.cameraOn) {
    // getUserMedia only exists in a secure context (https:// or localhost). Over
    // a plain http:// LAN IP the browser hides mediaDevices entirely, so explain
    // that instead of throwing a vague "could not start camera".
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      showBanner('Camera needs a secure page (https). On your phone, open the demo through an https link — a plain http:// address blocks the camera.', 'OK', hideBanner, 'warning');
      updateDockBtnState('btn-camera', false);
      return;
    }
    document.querySelector(sel)?.classList.add('cam-loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: state.media.flipCamFacing } }, audio: false });
      _demoCamStream = stream;
      state.media.cameraOn = true;
      // Minimal LiveKit-track-shaped shim so showParticipantVideo() works unchanged.
      showParticipantVideo({ _stream: stream, attach() { const v = document.createElement('video'); v.srcObject = stream; return v; }, detach() { return []; } },
        state.user.sessionId);
    } catch (err) {
      state.media.cameraOn = false;
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') showBanner('Camera access denied. Allow it in browser settings, then retry.', 'Retry', () => toggleCamera());
      else if (err?.name === 'NotFoundError') showBanner('No camera found.', 'OK', hideBanner);
      else showBanner('Could not start camera.', 'Retry', toggleCamera);
    } finally {
      document.querySelector(sel)?.classList.remove('cam-loading');
    }
  } else {
    if (_demoCamStream) { _demoCamStream.getTracks().forEach(t => t.stop()); _demoCamStream = null; }
    state.media.cameraOn = false;
    hideParticipantVideo(state.user.sessionId);
  }
  updateDockBtnState('btn-camera', state.media.cameraOn);
}

// Demo-only: actually flip between the front (user) and back (environment)
// cameras by re-acquiring the stream with the toggled facingMode. Works on a
// real phone; on a single-camera device it just re-gets the same one.
async function switchDemoCamera() {
  const sel = `.participant-card[data-sid="${CSS.escape(state.user.sessionId)}"]`;
  if (!state.media.cameraOn || !_demoCamStream) { showLobbyBanner('turn your camera on first ~'); return; }
  if (!navigator.mediaDevices?.getUserMedia) return;
  state.media.flipCamFacing = state.media.flipCamFacing === 'environment' ? 'user' : 'environment';
  document.querySelector(sel)?.classList.add('cam-loading');
  try {
    _demoCamStream.getTracks().forEach(t => t.stop());
    _demoCamStream = null;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: state.media.flipCamFacing } }, audio: false });
    _demoCamStream = stream;
    showParticipantVideo({ _stream: stream, attach() { const v = document.createElement('video'); v.srcObject = stream; return v; }, detach() { return []; } },
      state.user.sessionId);
    showLobbyBanner(state.media.flipCamFacing === 'environment' ? 'back camera ~' : 'front camera ~');
  } catch {
    // Re-grab whatever we can so the tile isn't left blank.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      _demoCamStream = stream;
      showParticipantVideo({ _stream: stream, attach() { const v = document.createElement('video'); v.srcObject = stream; return v; }, detach() { return []; } },
        state.user.sessionId);
    } catch {}
    showLobbyBanner('this device has just one camera ~');
  } finally {
    document.querySelector(sel)?.classList.remove('cam-loading');
  }
}

async function toggleCamera() {
  if (_cameraToggling) return;
  navigator.vibrate?.(8);
  _cameraToggling = true;
  try {
    if (DEMO) { await toggleDemoCamera(); return; }
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
    if (DEMO) {                     // demo: no real capture — just toggle the button state
      state.media.screenOn = !state.media.screenOn;
      updateDockBtnState('btn-screen', state.media.screenOn);
      return;
    }
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

// §8 lock chat — freezes chat for everyone but the host; the room stays open.
// Dormant-safe: the control only surfaces once `chat_locked` is actually selected
// on the room (typeof === 'boolean'), i.e. after the migration + Edge Function are
// deployed. Until then it reads undefined, the button stays hidden, and the send
// guard never trips — so shipping this pre-deploy changes nothing.
let _chatLockToggling = false;
async function toggleChatLock() {
  if (!state.room || _chatLockToggling) return;
  if (typeof state.room.chat_locked !== 'boolean') return; // feature not deployed yet
  _chatLockToggling = true;
  const prev = state.room.chat_locked;
  state.room.chat_locked = !prev;
  updateChatLockUI();
  try {
    await sbUpdateRoom(state.room.slug, { chat_locked: state.room.chat_locked });
    appendSystemMessage(state.room.chat_locked ? 'Chat locked by host' : 'Chat unlocked by host', 'action');
    const r = state.rooms.find(x => x.slug === state.room?.slug);
    if (r) r.chat_locked = state.room.chat_locked;
  } catch {
    state.room.chat_locked = prev;
    updateChatLockUI();
    showBanner('Failed to update chat lock. Try again.', null, null, 'error');
  } finally {
    _chatLockToggling = false;
  }
}

function updateChatLockUI() {
  const available = typeof state.room?.chat_locked === 'boolean';
  const locked = available && state.room.chat_locked;
  const isHost = state.user.role === 'host';
  const btn = document.getElementById('btn-lock-chat');
  if (btn) {
    btn.hidden = !(available && isHost);
    btn.setAttribute('aria-pressed', String(locked));
    btn.classList.toggle('is-active', locked);
    const lbl = btn.querySelector('span');
    if (lbl) lbl.textContent = locked ? 'chat locked' : 'lock chat';
    btn.title = locked ? 'Unlock chat' : 'Lock chat';
  }
  const input = document.getElementById('chat-input');
  if (input) {
    if (!input.dataset.ph) input.dataset.ph = input.getAttribute('placeholder') || '';
    const block = locked && !isHost;
    input.disabled = block;
    input.placeholder = block ? 'chat is locked ~' : input.dataset.ph;
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
let _chatSendInFlight = false;
let _activeChatSend = null;

function setChatSendBusy(busy) {
  const send = document.getElementById('btn-send');
  const image = document.getElementById('btn-chat-image');
  const file = document.getElementById('chat-file');
  if (send) {
    send.disabled = busy;
    send.setAttribute('aria-busy', busy ? 'true' : 'false');
  }
  if (image) image.disabled = busy;
  if (file) file.disabled = busy;
}

function cancelActiveChatSend() {
  const operation = _activeChatSend;
  if (!operation) return;
  operation.cancelled = true;
  operation.images.forEach(staged => { staged.file = null; });
  _activeChatSend = null;
  _chatSendInFlight = false;
  setChatSendBusy(false);
}

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
  if (_chatSendInFlight) return;
  const input = document.getElementById('chat-input');
  const body  = input.value.trim();
  const hasImages = _stagedImages.length > 0;
  if (!body && !hasImages) return;

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

  // §8: while chat is locked, only the host may post.
  if (state.room?.chat_locked && state.user.role !== 'host') {
    const el = document.getElementById('chat-cooldown');
    if (el) {
      clearInterval(_cooldownTimer);
      el.textContent = 'Chat is locked by the host.';
      el.hidden = false;
      el.classList.add('show');
      setTimeout(hideChatCooldown, 3000);
    }
    return;
  }

  const wait = chatCooldownMs();
  if (wait > 0) { showChatCooldown(wait); return; }
  hideChatCooldown();

  const sendContext = captureImageSendContext();
  if (!sendContext) return;
  // Detach this exact batch before the first await. Later remove/add actions
  // therefore cannot mutate which originals this send owns.
  const imgs = hasImages ? detachStagedImageFiles() : [];

  // The reply applies to whichever piece is sent first (text, else the images).
  const replyTo = _replyTarget ? { nick: _replyTarget.nick, text: _replyTarget.text } : null;
  clearReplyTarget();
  let replyUsed = false;
  const sendOperation = { images: imgs, cancelled: false };
  _activeChatSend = sendOperation;
  _chatSendInFlight = true;
  setChatSendBusy(true);
  try {
    if (body) {
      _msgBurst.push(Date.now());
      const msgId = ++_msgIdSeq;
      input.value = '';
      autoGrowChatInput();
      const time = Date.now();
      const msg = { nick: sendContext.nickname, body, time };
      state.chat.push(msg);
      const el = appendMessage(msg.nick, msg.body, msg.time, true, { msgId, sessionId: sendContext.sessionId, replyTo }); // optimistic
      if (replyTo) replyUsed = true;

      if (sendContext.roomId) {
        try {
          const dbId = await sbSendMessage(sendContext.roomId, body, sendContext);
          if (!sendOperation.cancelled && imageSendContextIsCurrent(sendContext)) {
            rekeyMessage(el, dbId); // adopt the shared id so peers' reactions/replies match
            if (replyTo) {
              broadcastToCapturedRoom(sendContext, 'chat:reply', {
                key: dbId ? 'm' + dbId : msgKey(sendContext.sessionId, time),
                replyTo,
                sessionId: sendContext.sessionId,
              }).catch(() => {});
            }
          }
        } catch (err) {
          logEvent('error', 'msg_send_failed', { code: err?.code });
          console.error('sendMessage failed:', err);
          if (!sendOperation.cancelled && imageSendContextIsCurrent(sendContext)) markMsgFailed(msgId, body);
        }
      } else if (replyTo && !sendOperation.cancelled && imageSendContextIsCurrent(sendContext)) {
        broadcastToCapturedRoom(sendContext, 'chat:reply', {
          key: msgKey(sendContext.sessionId, time), replyTo, sessionId: sendContext.sessionId,
        }).catch(() => {});
      }
    }

    // A room transition while text was being persisted cancels every remaining
    // image before it can decode, append locally, or broadcast on another room.
    if (imgs.length && !sendOperation.cancelled && imageSendContextIsCurrent(sendContext)) {
      _msgBurst.push(Date.now());
      for (let i = 0; i < imgs.length; i++) {
        if (sendOperation.cancelled || !imageSendContextIsCurrent(sendContext)) break;
        await sendChatImage(imgs[i].file, {
          replyTo: (!replyUsed && i === 0) ? replyTo : null,
          skipGate: true,
          sendContext,
          sendOperation,
        });
        imgs[i].file = null;
      }
    }
  } finally {
    imgs.forEach(staged => { staged.file = null; });
    if (_activeChatSend === sendOperation) {
      _activeChatSend = null;
      _chatSendInFlight = false;
      setChatSendBusy(false);
    }
  }
}

function broadcastReply(key, replyTo) {
  broadcastToRoom('chat:reply', { key, replyTo, sessionId: state.user.sessionId }).catch(() => {});
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

// ── § CHAT REACTIONS + REPLIES ─────────────────────────────────────
// Reactions reuse the site's existing face set (happy/cool/meh/sad PNGs at the
// repo root; CSP img-src 'self' allows same-origin). Reactions + replies are
// ephemeral like chat images — broadcast over realtime, never written to the DB.
const CHAT_REACTIONS = [
  { key: 'happy', img: '../site-images/happy.png', label: 'happy' },
  { key: 'cool',  img: '../site-images/cool.png',  label: 'cool'  },
  { key: 'meh',   img: '../site-images/meh.png',   label: 'meh'   },
  { key: 'sad',   img: '../site-images/sad.png',   label: 'sad'   },
];
const REACT_IMG = Object.fromEntries(CHAT_REACTIONS.map(r => [r.key, r.img]));

// A message's stable cross-client identity: sender + timestamp (both travel with
// every message, DB or broadcast), so a reaction/reply lands on the same message
// for everyone in the room.
function msgKey(sessionId, time, nick) { return `${sessionId || nick || '?'}:${time || 0}`; }

// Once the DB assigns your own message an id, adopt the shared `m<id>` key (which
// every other client already uses for it) and migrate any reactions/reply the
// optimistic node collected — otherwise your own message's reactions/replies
// would never line up with everyone else's.
function rekeyMessage(div, dbId) {
  if (!div || !dbId) return;
  const oldKey = div.dataset.key;
  const newKey = 'm' + dbId;
  if (oldKey === newKey) return;
  div.dataset.key = newKey;
  div.dataset.msgDbId = dbId;
  if (_reactions.has(oldKey)) { _reactions.set(newKey, _reactions.get(oldKey)); _reactions.delete(oldKey); }
  if (_replyMeta.has(oldKey)) { _replyMeta.set(newKey, _replyMeta.get(oldKey)); _replyMeta.delete(oldKey); }
  renderReactions(div, newKey);
}

const _reactions = new Map();   // key → Map(type → Set(sessionId))
const _replyMeta = new Map();   // key → replyTo, for replies that arrive before their message
let _replyTarget = null;        // the message currently being replied to

function getReact(key) {
  let m = _reactions.get(key);
  if (!m) { m = new Map(); _reactions.set(key, m); }
  return m;
}
function seedReactions(key, seed) {
  // seed: { type: [sessionId, …] } — used by demo/preload data.
  const m = getReact(key);
  for (const [type, ids] of Object.entries(seed || {})) {
    let set = m.get(type); if (!set) { set = new Set(); m.set(type, set); }
    (ids || []).forEach(id => set.add(id));
  }
}
function reactionSelector(key) {
  return `.chat-msg[data-key="${(window.CSS && CSS.escape) ? CSS.escape(key) : key}"]`;
}
function renderReactionsByKey(key) {
  document.querySelectorAll(reactionSelector(key)).forEach(div => renderReactions(div, key));
}
function renderReactions(div, key) {
  const cont = div.querySelector('.chat-msg-reactions');
  if (!cont) return;
  const m = _reactions.get(key);
  const me = state.user.sessionId;
  let html = '';
  if (m) for (const r of CHAT_REACTIONS) {
    const set = m.get(r.key);
    if (set && set.size) {
      html += `<button class="chat-react-pill${set.has(me) ? ' mine' : ''}" data-type="${r.key}">`
            + `<img src="${r.img}" alt="${r.label}"><span>${set.size}</span></button>`;
    }
  }
  cont.innerHTML = html;
  cont.hidden = !html;
  cont.querySelectorAll('.chat-react-pill').forEach(b =>
    b.addEventListener('click', (e) => { e.stopPropagation(); toggleReaction(key, b.dataset.type, true); }));
}
function toggleReaction(key, type, doBroadcast) {
  const m = getReact(key);
  let set = m.get(type); if (!set) { set = new Set(); m.set(type, set); }
  const me = state.user.sessionId;
  const add = !set.has(me);
  if (add) set.add(me); else set.delete(me);
  renderReactionsByKey(key);
  if (doBroadcast) broadcastToRoom('chat:reaction', { key, type, add, sessionId: me }).catch(() => {});
}
// Applies a reaction arriving over realtime from someone else.
function applyRemoteReaction(payload) {
  if (!payload || payload.sessionId === state.user.sessionId) return;
  const m = getReact(payload.key);
  let set = m.get(payload.type); if (!set) { set = new Set(); m.set(payload.type, set); }
  if (payload.add) set.add(payload.sessionId); else set.delete(payload.sessionId);
  renderReactionsByKey(payload.key);
}
function applyRemoteReply(payload) {
  if (!payload || !payload.key) return;
  _replyMeta.set(payload.key, payload.replyTo);
  document.querySelectorAll(reactionSelector(payload.key)).forEach(div => {
    if (div.querySelector('.chat-msg-replyref')) return;
    const body = div.querySelector('.chat-msg-body') || div.querySelector('.chat-msg-img');
    const ref = document.createElement('div');
    ref.innerHTML = replyRefHtml(payload.replyTo);
    if (body && ref.firstElementChild) body.parentElement.insertBefore(ref.firstElementChild, body);
  });
}

function replyRefHtml(replyTo) {
  if (!replyTo) return '';
  const snippet = (replyTo.text || '').slice(0, 80);
  return `<div class="chat-msg-replyref"><b>${escHtml(replyTo.nick || '')}</b>${escHtml(snippet)}</div>`;
}

// Per-message hover/tap actions: react + reply.
function attachMsgControls(div, info) {
  const actions = document.createElement('div');
  actions.className = 'chat-msg-actions';
  actions.innerHTML = `
    <button class="msg-act msg-act-react" title="React" aria-label="React">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8.5 14a4 4 0 0 0 7 0" stroke-linecap="round"/><circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none"/></svg>
    </button>
    <button class="msg-act msg-act-reply" title="Reply" aria-label="Reply">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
    </button>`;
  div.appendChild(actions);
  actions.querySelector('.msg-act-reply').addEventListener('click', (e) => {
    e.stopPropagation(); setReplyTarget(info);
  });
  actions.querySelector('.msg-act-react').addEventListener('click', (e) => {
    e.stopPropagation(); openReactionPicker(e.currentTarget, info.key);
  });
  // Touch devices have no hover — tap the bubble to reveal its actions.
  div.addEventListener('click', (e) => {
    if (e.target.closest('.chat-msg-actions, .chat-msg-reactions, a, img')) return;
    document.querySelectorAll('.chat-msg.show-actions').forEach(m => { if (m !== div) m.classList.remove('show-actions'); });
    div.classList.toggle('show-actions');
  });
}

let _reactPicker = null;
function closeReactionPicker() { _reactPicker?.remove(); _reactPicker = null; }
function openReactionPicker(anchor, key) {
  closeReactionPicker();
  const pick = document.createElement('div');
  pick.className = 'chat-react-picker';
  pick.innerHTML = CHAT_REACTIONS.map(r =>
    `<button class="chat-react-choice" data-type="${r.key}" title="${r.label}"><img src="${r.img}" alt="${r.label}"></button>`
  ).join('');
  document.body.appendChild(pick);
  const rect = anchor.getBoundingClientRect();
  pick.style.left = `${Math.max(6, Math.min(rect.left - 8, window.innerWidth - pick.offsetWidth - 6))}px`;
  pick.style.top  = `${Math.max(6, rect.top - pick.offsetHeight - 8)}px`;
  pick.querySelectorAll('.chat-react-choice').forEach(b =>
    b.addEventListener('click', (e) => { e.stopPropagation(); toggleReaction(key, b.dataset.type, true); closeReactionPicker(); }));
  _reactPicker = pick;
  setTimeout(() => document.addEventListener('click', closeReactionPicker, { once: true }), 0);
}

function setReplyTarget(info) {
  _replyTarget = { key: info.key, nick: info.nick, text: info.body };
  const bar = document.getElementById('chat-reply-bar');
  const to  = document.getElementById('chat-reply-to');
  const tx  = document.getElementById('chat-reply-text');
  if (to) to.textContent = info.nick || '';
  if (tx) tx.textContent = (info.body || '').slice(0, 80);
  if (bar) bar.hidden = false;
  document.getElementById('chat-input')?.focus();
}
function clearReplyTarget() {
  _replyTarget = null;
  const bar = document.getElementById('chat-reply-bar');
  if (bar) bar.hidden = true;
}

function appendMessage(nick, body, time, isNewMsg, { msgId, dbId, sessionId, replyTo, reactions } = {}) {
  const el  = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  if (msgId) div.dataset.msgId  = msgId;
  if (dbId)  div.dataset.msgDbId = dbId;
  const isYou = sessionId ? sessionId === state.user.sessionId : nick === state.user.nickname;
  const color = nickColor(nick, sessionId);
  const styleAttr = color ? ` style="color:${escHtml(color)};--c:${escHtml(color)}"` : '';
  const nickGlow = glowAttrs(color);
  // Prefer the shared DB id as the key so reactions/replies match across clients;
  // fall back to sender+time for optimistic/ephemeral messages.
  const key = dbId ? 'm' + dbId : msgKey(sessionId, time, nick);
  div.dataset.key = key;
  replyTo = replyTo || _replyMeta.get(key);
  if (reactions) seedReactions(key, reactions);
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}${nickGlow}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <div class="chat-msg-body">${replyRefHtml(replyTo)}<span class="chat-msg-text">${escHtml(body)}</span></div>
    <div class="chat-msg-reactions" hidden></div>
  `;
  attachMsgControls(div, { nick, body, sessionId, time, key });
  el.appendChild(div);
  renderReactions(div, key);
  // Your own just-sent message always scrolls into view (even if you were reading
  // history up top); others' messages only follow when you're already at the bottom.
  if (isNewMsg || isNearBottom(el)) el.scrollTop = el.scrollHeight;
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

const CHAT_IMAGE_MESSAGE_LIMIT = 12;
// One maximum eight-photo send can approach 6.4M encoded characters. Keep
// that complete batch while still imposing a firm long-session ceiling.
const CHAT_IMAGE_ENCODED_CHAR_LIMIT = 6_500_000;
const CHAT_IMAGE_DATA_URL_RE = /^data:image\/jpeg;base64,[a-z0-9+/=]+$/i;

function jpegDataUrlDimensions(value) {
  try {
    const encoded = value.slice(value.indexOf(',') + 1);
    // Canvas JPEGs expose SOF near the start. Reject unusual files with more
    // than 96 KiB of metadata rather than decoding their pixels in Safari.
    const sampleLength = Math.min(encoded.length, 131_072) & ~3;
    const bytes = atob(encoded.slice(0, sampleLength));
    if (bytes.charCodeAt(0) !== 0xff || bytes.charCodeAt(1) !== 0xd8) return null;
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes.charCodeAt(offset) !== 0xff) { offset += 1; continue; }
      let marker = bytes.charCodeAt(offset + 1);
      while (marker === 0xff) marker = bytes.charCodeAt(++offset + 1);
      offset += 2;
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (offset + 2 > bytes.length) return null;
      const segmentLength = (bytes.charCodeAt(offset) << 8) | bytes.charCodeAt(offset + 1);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;
      const isStartOfFrame = (marker >= 0xc0 && marker <= 0xc3)
        || (marker >= 0xc5 && marker <= 0xc7)
        || (marker >= 0xc9 && marker <= 0xcb)
        || (marker >= 0xcd && marker <= 0xcf);
      if (isStartOfFrame) {
        if (segmentLength < 7) return null;
        return {
          height: (bytes.charCodeAt(offset + 3) << 8) | bytes.charCodeAt(offset + 4),
          width: (bytes.charCodeAt(offset + 5) << 8) | bytes.charCodeAt(offset + 6),
        };
      }
      offset += segmentLength;
    }
  } catch {}
  return null;
}

function isSafeChatImageDataUrl(value, maxLongEdge) {
  if (!(typeof value === 'string'
    && value.length > 32
    && value.length <= 850_000
    && CHAT_IMAGE_DATA_URL_RE.test(value))) return false;
  const dimensions = jpegDataUrlDimensions(value);
  return Boolean(dimensions?.width && dimensions?.height
    && dimensions.width <= maxLongEdge
    && dimensions.height <= maxLongEdge);
}

function trimEphemeralImageMessages(container) {
  const messages = Array.from(container?.querySelectorAll('.chat-msg--image') || []);
  let encodedChars = messages.reduce((total, message) => (
    total + (Number(message.dataset.imageChars) || 0)
  ), 0);
  while (messages.length > CHAT_IMAGE_MESSAGE_LIMIT || encodedChars > CHAT_IMAGE_ENCODED_CHAR_LIMIT) {
    const oldest = messages.shift();
    encodedChars -= Number(oldest?.dataset.imageChars) || 0;
    const key = oldest?.dataset.key;
    if (key) {
      _reactions.delete(key);
      _replyMeta.delete(key);
      if (_replyTarget?.key === key) clearReplyTarget();
    }
    if (oldest) {
      oldest._releaseChatImage?.();
      delete oldest._releaseChatImage;
      oldest.remove();
    }
  }
}

function releaseAllChatImageMessages() {
  document.querySelectorAll('.chat-msg--image').forEach(message => {
    message._releaseChatImage?.();
    delete message._releaseChatImage;
    message.remove();
  });
  closeImageViewer();
}

// Image message — rendered as a thumbnail that opens a fullscreen viewer.
// Images are ephemeral: broadcast over realtime, never written to the DB.
// thumb: small inline preview; full: higher-quality for the viewer.
function appendImageMessage(nick, thumb, full, time, sessionId, { replyTo } = {}) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  if (!isSafeChatImageDataUrl(thumb, 400) || !isSafeChatImageDataUrl(full, 1300)) return;
  const div = document.createElement('div');
  div.className = 'chat-msg chat-msg--image';
  const isYou = sessionId ? sessionId === state.user.sessionId : nick === state.user.nickname;
  const color = nickColor(nick, sessionId);
  const styleAttr = color ? ` style="color:${escHtml(color)};--c:${escHtml(color)}"` : '';
  const nickGlow = glowAttrs(color);
  const key = msgKey(sessionId, time, nick);
  div.dataset.key = key;
  div.dataset.imageChars = String(thumb.length + full.length);
  replyTo = replyTo || _replyMeta.get(key);
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}${nickGlow}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    ${replyTo ? `<div class="chat-msg-body chat-msg-body--img">${replyRefHtml(replyTo)}</div>` : ''}
    <img class="chat-msg-img" src="${escHtml(thumb)}" alt="image from ${escHtml(nick)}">
    <div class="chat-msg-reactions" hidden></div>
  `;
  const imgEl = div.querySelector('.chat-msg-img');
  let viewerSource = full;
  const openFullImage = () => {
    if (viewerSource) openImageViewer(viewerSource);
  };
  imgEl?.addEventListener('click', openFullImage);
  imgEl?.addEventListener('error', () => imgEl.classList.add('chat-msg-img--broken'));
  div._releaseChatImage = () => {
    imgEl?.removeEventListener('click', openFullImage);
    imgEl?.removeAttribute('src');
    viewerSource = '';
  };
  attachMsgControls(div, { nick, body: 'photo', sessionId, time, key });
  el.appendChild(div);
  renderReactions(div, key);
  // Full image data lives in each click handler, so bound the number retained
  // during a long room session. Text history and current images are untouched.
  trimEphemeralImageMessages(el);
  // Your own image scrolls into view; others' only when already at the bottom.
  if (isYou || isNearBottom(el)) el.scrollTop = el.scrollHeight;
  updateScrollBtn();
  return div;
}

async function sendChatImage(file, {
  replyTo = null, skipGate = false, sendContext = null, sendOperation = null,
} = {}) {
  if (!file) return;
  const context = sendContext || captureImageSendContext();
  if (sendOperation?.cancelled || !imageSendContextIsCurrent(context)) return false;
  if (!skipGate) {
    const wait = chatCooldownMs();
    if (wait > 0) { showChatCooldown(wait); return; }
  }
  let thumb, full;
  try {
    ({ thumb, full } = await runSerializedImageWork(async () => {
      if (sendOperation?.cancelled || !imageSendContextIsCurrent(context)) {
        throw Object.assign(new Error('room changed'), { code: 'ROOM_CHANGED' });
      }
      return fileToThumbAndFull(file);
    }));
  } catch (err) {
    if (err?.code === 'ROOM_CHANGED' || sendOperation?.cancelled || !imageSendContextIsCurrent(context)) return false;
    logEvent('error', 'upload_failed', { code: err?.code || 'unknown' });
    showChatImgError(imgUploadError(err));
    return false;
  }
  // Encoding can outlive a room transition. Never append into the replacement
  // room or use its channel/session for a file selected in the previous one.
  if (sendOperation?.cancelled || !imageSendContextIsCurrent(context)) return false;
  if (thumb.length + full.length > 800_000) {
    showChatImgError('Image is too large to send. Try a smaller photo.');
    return false;
  }
  if (!skipGate) _msgBurst.push(Date.now());
  const time = Date.now();   // one timestamp so the optimistic + broadcast keys match
  const optimisticEl = appendImageMessage(context.nickname, thumb, full, time, context.sessionId, { replyTo }); // optimistic
  if (sendOperation?.cancelled || !imageSendContextIsCurrent(context)) {
    optimisticEl?.remove();
    return false;
  }
  try {
    await broadcastToCapturedRoom(context, 'chat:image', {
      nick: context.nickname, thumb, full,
      src: thumb, // backward compat for old clients
      time, sessionId: context.sessionId, replyTo,
    });
    if (replyTo && !sendOperation?.cancelled && imageSendContextIsCurrent(context)) {
      broadcastToCapturedRoom(context, 'chat:reply', {
        key: msgKey(context.sessionId, time), replyTo, sessionId: context.sessionId,
      }).catch(() => {});
    }
    return true;
  } catch (err) {
    optimisticEl?.remove();
    if (err?.code !== 'ROOM_CHANGED' && !sendOperation?.cancelled && imageSendContextIsCurrent(context)) {
      showChatImgError("Couldn't send image. Check your connection.");
    }
    return false;
  }
}

// ── Multi-image staging: pick several, preview them, send all on ✈ ──────────
// The strip only receives tiny generated thumbnails. Pointing its <img> tags at
// original Files made Safari retain one full decoded surface per selection — a
// handful of modern phone photos could exceed 300 MB before Send was tapped.
let _stagedImages = [];   // { file, previewUrl, disposed }
const STAGED_PREVIEW_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 58 58"><rect width="58" height="58" rx="8" fill="#fff5fa"/><path d="M16 39l8-9 6 6 5-6 8 9H16zm7-13a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="#e9b7ce"/></svg>'
);

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(Object.assign(new Error('thumbnail encode failed'), { code: 'DECODE_FAILED' }));
    }, 'image/png');
  });
}

async function makeStagedThumbnail(staged) {
  const file = staged.file;
  basicImageValidation(file);
  const dimensions = await imageHeaderDimensions(file);
  assertSafeDimensions(dimensions);
  if (staged.disposed) return null;
  // At 2x the square target, normal landscape/portrait crops still contain at
  // least 232 source pixels on their short edge before the final center crop.
  const decoded = await boundedImageSource(file, STAGED_THUMB_PX * 2, dimensions);
  try {
    if (staged.disposed) return null;
    const crop = Math.min(decoded.width, decoded.height);
    const sx = Math.max(0, (decoded.width - crop) / 2);
    const sy = Math.max(0, (decoded.height - crop) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = STAGED_THUMB_PX;
    canvas.height = STAGED_THUMB_PX;
    canvas.getContext('2d').drawImage(
      decoded.source,
      sx, sy, crop, crop,
      0, 0, STAGED_THUMB_PX, STAGED_THUMB_PX
    );
    return await canvasToPngBlob(canvas);
  } finally {
    decoded.cleanup();
  }
}

function queueStagedThumbnail(staged) {
  // Serialize decode work: at most one original photo has a transient decoded
  // surface, even when the picker returns the full batch at once.
  runSerializedImageWork(async () => {
    if (staged.disposed || !_stagedImages.includes(staged)) return;
    try {
      const blob = await makeStagedThumbnail(staged);
      if (!blob || staged.disposed || !_stagedImages.includes(staged)) return;
      staged.previewUrl = URL.createObjectURL(blob);
      renderImgPreview();
    } catch (err) {
      if (staged.disposed || !_stagedImages.includes(staged)) return;
      const idx = _stagedImages.indexOf(staged);
      if (idx !== -1) _stagedImages.splice(idx, 1);
      staged.disposed = true;
      renderImgPreview();
      showChatImgError(imgUploadError(err));
    }
  }).catch(() => {});
}

function stageImageFiles(fileList) {
  const files = [...(fileList || [])].filter(Boolean);
  if (!files.length) return;
  if (_chatSendInFlight) {
    showChatImgError('Your current message is still sending — add the next photo in a moment.');
    return;
  }

  let stagedBytes = _stagedImages.reduce((sum, staged) => sum + staged.file.size, 0);
  let unsupported = 0;
  let tooLarge = 0;
  let overCount = 0;
  let overTotal = 0;

  for (const file of files) {
    // Match send-time validation here so a file that can never send is not
    // retained as a full-resolution preview first.
    if (!acceptedImageType(file)) {
      unsupported++;
      continue;
    }
    if (file.size > MAX_IMG_BYTES) {
      tooLarge++;
      continue;
    }
    if (_stagedImages.length >= MAX_STAGED_IMAGES) {
      overCount++;
      continue;
    }
    if (stagedBytes + file.size > MAX_STAGED_BYTES) {
      overTotal++;
      continue;
    }

    const staged = { file, previewUrl: '', disposed: false };
    _stagedImages.push(staged);
    stagedBytes += file.size;
    queueStagedThumbnail(staged);
  }

  const notices = [];
  if (tooLarge) notices.push(`${tooLarge} ${tooLarge === 1 ? 'image is' : 'images are'} over the 15 MB per-image limit.`);
  if (unsupported) notices.push(`${unsupported} unsupported ${unsupported === 1 ? 'image was' : 'images were'} skipped (use JPEG, PNG, WebP, GIF, HEIC, or AVIF).`);
  if (overCount) notices.push(`${overCount} ${overCount === 1 ? 'image was' : 'images were'} skipped because a batch can hold up to ${MAX_STAGED_IMAGES}.`);
  if (overTotal) notices.push(`${overTotal} ${overTotal === 1 ? 'image was' : 'images were'} skipped because a batch can total up to ${MAX_STAGED_BYTES / 1024 / 1024} MB.`);
  if (notices.length) showChatImgError(notices.join(' '));

  renderImgPreview();
}
function removeStagedImage(idx) {
  const [gone] = _stagedImages.splice(idx, 1);
  if (gone) {
    gone.disposed = true;
    if (gone.previewUrl) URL.revokeObjectURL(gone.previewUrl);
    gone.previewUrl = '';
    gone.file = null;
  }
  renderImgPreview();
}
function detachStagedImageFiles() {
  const batch = _stagedImages.map(staged => ({ file: staged.file }));
  clearStagedImages();
  return batch;
}
function clearStagedImages() {
  _stagedImages.forEach(s => {
    s.disposed = true;
    if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    s.previewUrl = '';
    s.file = null;
  });
  _stagedImages = [];
  renderImgPreview();
}
function renderImgPreview() {
  const strip = document.getElementById('chat-img-preview');
  if (!strip) return;
  strip.hidden = _stagedImages.length === 0;
  strip.innerHTML = _stagedImages.map((s, i) =>
    `<div class="chat-img-thumb"><img src="${escHtml(s.previewUrl || STAGED_PREVIEW_PLACEHOLDER)}" alt="attachment ${i + 1}">`
    + `<button class="chat-img-rm" data-i="${i}" aria-label="Remove image" title="Remove">`
    + `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7A1 1 0 0 0 5.7 7.1L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/></svg></button></div>`
  ).join('');
  strip.querySelectorAll('.chat-img-rm').forEach(b =>
    b.addEventListener('click', () => removeStagedImage(Number(b.dataset.i))));
}

// pagehide also fires when Safari places the page in bfcache. Clear the strip
// and every in-flight decoder URL so cached Rooms pages retain no image bytes.
window.addEventListener('pagehide', () => {
  cancelActiveChatSend();
  clearStagedImages();
  releaseAllChatImageMessages();
  _temporaryImageObjectUrls.forEach(url => URL.revokeObjectURL(url));
  _temporaryImageObjectUrls.clear();
});

// Grow the chat textarea with its content, up to ~4 lines, then let it scroll.
const CHAT_INPUT_MAX_H = 112;
function autoGrowChatInput() {
  const el = document.getElementById('chat-input');
  if (!el || el.tagName !== 'TEXTAREA') return;
  el.style.height = 'auto';
  const full = el.scrollHeight;
  el.style.height = Math.min(full, CHAT_INPUT_MAX_H) + 'px';
  // Only show the scrollbar once we've actually hit the cap (no bar on a line or two).
  el.style.overflowY = full > CHAT_INPUT_MAX_H ? 'auto' : 'hidden';
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
  const img = document.getElementById('img-viewer-img');
  img?.removeAttribute('src');
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
// Block accidental double-tap-to-zoom (a fast second tap on ~the same spot)
// while leaving normal taps, scrolling, and pinch-zoom untouched. `touch-action`
// helps for taps on controls, but iOS still double-tap-zooms on plain text /
// empty areas — this closes that gap. Two different quick taps (e.g. rapid
// button presses) are NOT blocked because we require the taps to be near the
// same point, which a zoom double-tap always is.
function preventDoubleTapZoom() {
  let startX = 0, startY = 0, moved = false;
  let lastTapT = 0, lastTapX = 0, lastTapY = 0;
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0]; if (!t) return;
    startX = t.clientX; startY = t.clientY; moved = false;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    const t = e.touches[0]; if (!t) return;
    if (Math.hypot(t.clientX - startX, t.clientY - startY) > 12) moved = true;  // it's a scroll, not a tap
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || moved) return;                 // ignore scroll flicks — only real stationary taps count
    const now = Date.now();
    // A second stationary tap within 350ms at ~the same spot = the double-tap
    // zoom gesture. Cancel it; the click from tap 1 already fired, and pinch
    // (two fingers) is untouched.
    if (now - lastTapT <= 350 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 40) {
      e.preventDefault();
    }
    lastTapT = now; lastTapX = t.clientX; lastTapY = t.clientY;
  }, { passive: false });
}

async function init() {
  preventDoubleTapZoom();
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
  // Tap your profile chip to edit name / photo / colour.
  document.getElementById('btn-profile-chip')?.addEventListener('click', () => {
    showSetupModal(null);
  });
  // Mobile lobby layout toggle: post-it card grid ⇄ compact list. Persisted.
  const applyLobbyDesign = () => {
    const list = localStorage.getItem('dg_rooms_lobby_list') === '1';
    document.body.classList.toggle('lobby-list-mode', list);
    const lbl = document.querySelector('#btn-lobby-design .lobby-design-label');
    if (lbl) lbl.textContent = list ? 'list' : 'cards';
  };
  document.getElementById('btn-lobby-design')?.addEventListener('click', () => {
    const list = localStorage.getItem('dg_rooms_lobby_list') === '1';
    localStorage.setItem('dg_rooms_lobby_list', list ? '0' : '1');
    applyLobbyDesign();
  });
  applyLobbyDesign();

  // ── Setup modal (name + photo + color) ──
  const avatarInput = document.getElementById('setup-avatar-input');
  document.getElementById('setup-avatar').addEventListener('click', () => avatarInput.click());
  avatarInput.addEventListener('change', async () => {
    const file = avatarInput.files?.[0];
    avatarInput.value = '';
    if (!file) return;
    try {
      _setupAvatar = await runSerializedImageWork(() => fileToDataUrl(file, 240, 0.88));
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

  // Chat is shown or hidden — one desktop toggle. On mobile the chat is a
  // drag-resizable bottom sheet opened from the dock (see initChatResize).
  document.getElementById('btn-chat-view')?.addEventListener('click', () => {
    setChatView(state.ui.chatView === 'hidden' ? 'full' : 'hidden');
  });
  document.getElementById('btn-toggle-chat')?.addEventListener('click', () => {
    setChatView(state.ui.chatView === 'hidden' ? 'full' : 'hidden');
  });
  initChatResize();

  // Reveal the desktop show/hide toggle + the "room for one more" invite tile.
  document.getElementById('btn-chat-view')?.removeAttribute('hidden');
  const rfom = document.getElementById('room-for-one-more');
  if (rfom) {
    rfom.hidden = false;
    // reuses the same invite-copy behaviour as #btn-copy-link
    rfom.addEventListener('click', () => {
      navigator.clipboard?.writeText(location.href).then(() => {
        const sub = rfom.querySelector('.rfom-sub');
        if (sub) { const o = sub.textContent; sub.textContent = 'copied! ~'; setTimeout(() => { sub.textContent = o; }, 1500); }
      }).catch(() => {});
    });
  }

  // Leave button: paw icon + label span (so the 'end?' text swap keeps the paw).
  const leaveBtn = document.getElementById('btn-leave');
  if (leaveBtn && !leaveBtn.querySelector('.leave-label')) {
    leaveBtn.innerHTML = `${ICON.paw}<span class="leave-label">leave</span>`;
  }

  // Now-playing banner: hide button + pause toggle. UI only — the media data
  // source (now_playing_* columns / player) is a later, separate project, so
  // the banner stays absent until setNowPlaying() is called with real data.
  document.getElementById('btn-np-toggle')?.addEventListener('click', () => {
    document.getElementById('now-playing')?.setAttribute('hidden', '');
    updateNpRestoreBtn();   // reveal the topbar restore chip
  });
  // Restore chip: reopen the last-known now-playing banner.
  document.getElementById('btn-np-restore')?.addEventListener('click', () => {
    if (_lastNowPlaying) setNowPlaying(_lastNowPlaying);
  });
  document.getElementById('btn-np-pause')?.addEventListener('click', e => {
    e.currentTarget.classList.toggle('is-paused');
    const audio = document.getElementById('np-audio');
    if (audio) { if (e.currentTarget.classList.contains('is-paused')) audio.pause?.(); else audio.play?.().catch(() => {}); }
  });
  // Now-playing volume (§10): restore persisted level, then wire slider + mute.
  try { const v = parseInt(localStorage.getItem('dg_rooms_music_vol') || '', 10); if (!Number.isNaN(v)) _npVolume = Math.max(0, Math.min(100, v)); } catch {}
  applyNpVolume(_npVolume, false);
  document.getElementById('np-volume')?.addEventListener('input', e => applyNpVolume(+e.currentTarget.value));
  document.getElementById('btn-np-mute')?.addEventListener('click', toggleNpMute);

  // Dock chat button (mobile): open the chat sheet, or close it if already open.
  document.getElementById('btn-chat-toggle')?.addEventListener('click', () => {
    setChatView(state.ui.chatView === 'hidden' ? 'full' : 'hidden');
  });
  // Keep the full/peek/hide control + host-control pills in the correct
  // container across breakpoints.
  placeChatViewControl();
  placeHostControls();
  window.matchMedia('(max-width: 767px)').addEventListener('change', () => {
    placeChatViewControl();
    placeHostControls();
  });

  // ── Host controls ──
  document.getElementById('btn-lock').addEventListener('click', toggleLock);
  document.getElementById('btn-audience').addEventListener('click', toggleAudience);
  document.getElementById('btn-ghost').addEventListener('click', toggleGhost);
  document.getElementById('btn-admin-end')?.addEventListener('click', async () => {
    if (!state.room?.slug || !state.user.isAdmin) return;
    closeSettings();   // it now lives in the settings panel — close it before confirming
    const ok = await showConfirm({
      title: 'end this room?',
      body: 'this closes the room for everyone and can’t be undone.',
      confirmText: 'end room',
      cancelText: 'keep it open',
      danger: true,
    });
    if (!ok) return;
    await sbEndRoom(state.room.slug, state.room.id);
    await doShowLobby();
  });

  // ── Chat ──
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('btn-lock-chat')?.addEventListener('click', toggleChatLock);
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });
  // Grow the field as you type (up to ~4 rows, then it scrolls — see CSS).
  chatInput.addEventListener('input', autoGrowChatInput);
  document.getElementById('btn-cancel-reply')?.addEventListener('click', clearReplyTarget);
  initEditableTitle();

  // Chat images (ephemeral — broadcast only, never stored). Multi-select: files
  // are staged into a preview strip and all sent together on ✈.
  const chatFile = document.getElementById('chat-file');
  document.getElementById('btn-chat-image').addEventListener('click', () => chatFile.click());
  chatFile.addEventListener('change', () => {
    stageImageFiles(chatFile.files);
    chatFile.value = '';
  });
  chatInput.addEventListener('paste', e => {
    const imgs = [...(e.clipboardData?.items || [])].filter(i => i.type.startsWith('image/'));
    if (imgs.length) { e.preventDefault(); stageImageFiles(imgs.map(i => i.getAsFile())); }
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
  //
  // Participant tiles are a plain responsive CSS grid now — the browser reflows
  // columns on resize with no JS help, so no ResizeObserver/repack is needed.

  // ── Route ──
  if (DEMO) { startDemo(); return; }
  await ensureSb();   // real mode needs the Supabase client before any lobby/room fetch
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
