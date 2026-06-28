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
const SUPABASE_URL   = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const SUPABASE_ANON  = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const LIVEKIT_WS_URL = 'wss://pawsweb-z0kamke4.livekit.cloud';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } },
});

const ACCENT_COLORS = [
  '#f08ab5', '#c4a0d4', '#7ab8d4', '#8ec4a0', '#d4b07a',
  '#a07ad4', '#7ab4d4', '#d47aaa', '#70b8a0', '#c4a070',
];

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
  ghost:  _svg('M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75C21.27 7.11 17 4 12 4c-1.27 0-2.49.2-3.64.57l2.17 2.17C11.06 6.49 11.51 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z'),
  image:  _svg('M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z'),
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
  // micReady = device acquired & track published (stays true once enabled; mute keeps the
  //            device live so unmute is instant and the OS keeps the mic indicator on)
  media: { micOn: false, micReady: false, serverMuted: false, deafened: false, cameraOn: false, screenOn: false, _preDeafenMicOn: false },
  settings: {
    micDeviceId: 'default', speakerDeviceId: 'default', cameraDeviceId: 'default',
    noiseSuppression: true, joinSound: true,
  },
  ui: { settingsOpen: false, chatHidden: false, activeTab: 'participants' },
  bans: [],
  _pendingAction: null,
  _sbPresenceChan: null,
  _sbChatSub:      null,
  _sbRoomStatusSub: null,
  kickedSessionIds: new Set(),
  _lastMsgTime: 0,
  _lkRoom:           null,
  _localMicTrack:    null,
  _localCamTrack:    null,
  _localScreenTrack: null,
};

// Module-level room-list subscription (stays alive across lobby visits)
let _sbRoomListSub = null;

// ── § IDENTITY ────────────────────────────────────────────────────
// Profile photos & chosen colors live only in localStorage + ephemeral
// presence — never in the database. They travel with you, but nothing is
// stored server-side.
const LS = {
  nick:   'dg_rooms_nick',
  sid:    'dg_rooms_sid',
  avatar: 'dg_rooms_avatar',
  color:  'dg_rooms_color',
};

function loadIdentity() {
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
  state.user.color  = localStorage.getItem(LS.color)  || '';
  // admin flag: set via localStorage.setItem('dollgg_role', 'admin') in console
  if (localStorage.getItem('dollgg_role') === 'admin') state.user.isAdmin = true;
}

// Persist name + optional photo (data URL) + optional chosen color.
function saveIdentity({ nick, avatar, color }) {
  const clean = nick.trim().replace(/\s+/g, '_').slice(0, 24);
  state.user.nickname = clean;
  localStorage.setItem(LS.nick, clean);

  state.user.avatar = avatar || '';
  if (avatar) localStorage.setItem(LS.avatar, avatar);
  else        localStorage.removeItem(LS.avatar);

  state.user.color = color || '';
  if (color) localStorage.setItem(LS.color, color);
  else       localStorage.removeItem(LS.color);
}

function accentForNick(nick) {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return ACCENT_COLORS[h % ACCENT_COLORS.length];
}

// My display color: chosen color wins, else a stable hash of the name.
function myAccent() {
  return state.user.color || accentForNick(state.user.nickname || '?');
}

// Render an avatar: a photo if present, otherwise the first initial on a color chip.
function avatarInner(nickname, accent, avatar) {
  if (avatar) return `<img class="avatar-img" src="${escHtml(avatar)}" alt="">`;
  return escHtml((nickname || '?')[0].toUpperCase());
}

// Downscale an image File to a small square-ish data URL so nothing heavy is
// ever broadcast or stored. maxPx caps the longest edge.
function fileToDataUrl(file, maxPx, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) { reject(new Error('not an image')); return; }
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
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
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
  return {
    id:              r.id,
    slug:            r.slug,
    title:           r.title || null,
    host:            r.host_nickname,
    host_session_id: r.host_session_id,
    hostAccent:      r.host_accent || accentForNick(r.host_nickname),
    member_count:    r.member_count || 1,
    locked:          r.locked,
    audience_mode:   r.audience_mode,
    audience:        r.audience_mode,
    startedAt:       new Date(r.created_at).getTime(),
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
    accent:      p.accent || accentForNick(p.nickname),
    avatar:      p.avatar || '',
    sessionId:   p.sessionId,
    speaking:    existing?.speaking || false,
  };
}

// ── § SUPABASE ────────────────────────────────────────────────────

async function sbLoadRooms() {
  try {
    const { data, error } = await sb.from('rooms')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(roomFromDb);
  } catch (err) {
    console.error('sbLoadRooms:', err);
    return [];
  }
}

async function sbFetchRoom(slug) {
  try {
    const { data, error } = await sb.from('rooms')
      .select('*').eq('slug', slug).eq('status', 'active').single();
    if (error || !data) return null;
    return roomFromDb(data);
  } catch { return null; }
}

async function sbCreateRoom(slug, title, locked) {
  const { data, error } = await sb.from('rooms').insert({
    slug,
    title:           title || null,
    locked,
    audience_mode:   false,
    host_nickname:   state.user.nickname,
    host_session_id: state.user.sessionId,
    host_accent:     myAccent(),
    status:          'active',
    member_count:    1,
  }).select().single();
  if (error) throw error;
  return data;
}

async function sbUpdateRoom(slug, updates) {
  try {
    const { error } = await sb.from('rooms')
      .update(updates)
      .eq('slug', slug)
      .eq('host_session_id', state.user.sessionId);
    if (error) throw error;
  } catch (err) { console.error('sbUpdateRoom:', err); }
}

async function sbEndRoom(slug, roomId) {
  // Mark ended (so everyone gets the "host ended" notice) then wipe the chat —
  // nothing lingers in the DB once a room closes.
  try {
    const { error } = await sb.from('rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('slug', slug)
      .eq('host_session_id', state.user.sessionId);
    if (error) throw error;
  } catch (err) { console.error('sbEndRoom:', err); }
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
      .order('created_at', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map(m => ({
      nick: m.nickname,
      body: m.body,
      time: new Date(m.created_at).getTime(),
      sessionId: m.session_id,
    }));
  } catch (err) { console.error('sbLoadMessages:', err); return []; }
}

async function sbSendMessage(roomId, body) {
  try {
    const { error } = await sb.from('room_messages').insert({
      room_id:    roomId,
      nickname:   state.user.nickname,
      session_id: state.user.sessionId,
      body,
    });
    if (error) throw error;
  } catch (err) { console.error('sbSendMessage:', err); }
}

async function sbCheckBan(roomId, sessionId, nickname) {
  try {
    const { data } = await sb.from('room_bans')
      .select('id')
      .or(roomId ? `room_id.eq.${roomId},room_id.is.null` : 'room_id.is.null')
      .or(`value.eq.${sessionId},value.eq.${nickname.toLowerCase()}`)
      .eq('is_active', true)
      .limit(1);
    return data && data.length > 0;
  } catch { return false; }
}

async function sbAddBan(roomId, type, value) {
  try {
    const { error } = await sb.from('room_bans').insert({
      room_id:   roomId || null,
      type,
      value:     value.toLowerCase(),
      is_active: true,
    });
    if (error) throw error;
  } catch (err) { console.error('sbAddBan:', err); }
}

function sbWatchRooms(onChange) {
  return sb.channel('lobby:rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, onChange)
    .subscribe();
}

function sbWatchMessages(roomId, onMsg) {
  return sb.channel(`chat:${roomId}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'room_messages',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      const m = payload.new;
      if (m.hidden) return;
      if (m.session_id === state.user.sessionId) return; // already shown optimistically
      onMsg({ nick: m.nickname, body: m.body, time: new Date(m.created_at).getTime() });
    })
    .subscribe();
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
          sbUpdateRoom(state.room.slug, { member_count: state.participants.length }).catch(() => {});
        }
      }, 2000);
    }
  });

  channel.on('broadcast', { event: 'room:update' }, ({ payload }) => {
    if (!payload || state.view !== 'room') return;
    if (typeof payload.title !== 'undefined') {
      state.room.title = payload.title || null;
      updateTopbar();
    }
    if (typeof payload.locked !== 'undefined') {
      state.room.locked = payload.locked;
      updateTopbar();
      updateDock();
    }
    if (typeof payload.audience !== 'undefined') {
      state.room.audience = payload.audience;
      updateDock();
      // Enforce audience mode via LK — mute/unmute our own mic track
      const isMe = (p) => p.sessionId === state.user.sessionId;
      const self = state.participants.find(isMe);
      if (self && self.role !== 'host') {
        if (payload.audience && state.media.micOn) {
          setMicMuted(true); // host put us in audience — mute (device stays live)
        }
        const micBtn = document.getElementById('btn-mic');
        if (micBtn) micBtn.classList.toggle('audience-locked', payload.audience);
      }
      const msg = payload.audience
        ? 'Audience mode on — only the host can speak'
        : 'Audience mode off — everyone can speak';
      appendSystemMessage(msg, 'action');
      renderParticipants();
    }
  });

  // Ephemeral chat image — broadcast only, never written to the database.
  channel.on('broadcast', { event: 'chat:image' }, ({ payload }) => {
    if (!payload || state.view !== 'room') return;
    if (payload.sessionId === state.user.sessionId) return; // already shown optimistically
    appendImageMessage(payload.nick, payload.src, payload.time || Date.now());
  });

  // Targeted moderation — a host muting/kicking one person.
  channel.on('broadcast', { event: 'user:mute' }, ({ payload }) => {
    if (!payload || payload.sessionId !== state.user.sessionId) return;
    if (state.user.role === 'host') return;
    state.media.serverMuted = !!payload.muted;
    setMicMuted(payload.muted, payload.muted ? 'A host muted you.' : null);
    sbTrackPresence({ serverMuted: !!payload.muted });
  });

  channel.on('broadcast', { event: 'user:kick' }, ({ payload }) => {
    if (!payload || payload.sessionId !== state.user.sessionId) return;
    showBanner('You were removed from this room.', 'Back to lobby', () => leaveRoom(), 'error');
    setTimeout(() => { if (state.view === 'room') leaveRoom(); }, 1800);
  });

  channel.subscribe(async (status) => {
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
  return state._sbPresenceChan?.send({ type: 'broadcast', event, payload }).catch(() => {});
}

async function sbCleanupChannels() {
  clearTimeout(_memberCountTimer);
  const toRemove = [];
  if (state._sbPresenceChan)    toRemove.push(state._sbPresenceChan);
  if (state._sbChatSub)         toRemove.push(state._sbChatSub);
  if (state._sbRoomStatusSub)   toRemove.push(state._sbRoomStatusSub);
  state._sbPresenceChan = null;
  state._sbChatSub      = null;
  state._sbRoomStatusSub = null;
  for (const ch of toRemove) {
    try { await sb.removeChannel(ch); } catch {}
  }
}

// ── § LIVEKIT ─────────────────────────────────────────────────────

async function fetchLkToken(slug) {
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
      role:      state.user.role,
    }),
  });
  if (!res.ok) throw new Error(`token fetch ${res.status}`);
  return res.json(); // { token, lkUrl }
}

async function lkConnect(slug) {
  if (state._lkRoom) return;
  lkSetStatusDot('lk-connecting');
  try {
    const { token, lkUrl } = await fetchLkToken(slug);
    const { Room, RoomEvent } = await ensureLk();

    const room = new Room({ adaptiveStream: true, dynacast: true });
    room
      .on(RoomEvent.TrackSubscribed,          lkOnTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed,        lkOnTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged,    lkOnActiveSpeakers)
      .on(RoomEvent.ConnectionStateChanged,   lkOnConnectionState)
      .on(RoomEvent.Disconnected,             lkOnDisconnected)
      .on(RoomEvent.ConnectionQualityChanged, lkOnQualityChanged);

    await room.connect(lkUrl || LIVEKIT_WS_URL, token);
    state._lkRoom = room;

    // If the user had the mic on before LK connected (or before a reconnect),
    // bring it back automatically.
    if (state.media.micOn) await setMic(true, { silent: true });
  } catch (err) {
    console.error('LK connect failed:', err);
    lkSetStatusDot('lk-error');
  }
}

async function lkDisconnect() {
  if (!state._lkRoom) return;
  const room = state._lkRoom;
  state._lkRoom = null; // clear first so handlers bail early
  lkCleanLocalTracks();
  document.querySelectorAll('.lk-audio').forEach(el => el.remove());
  hideScreenShareArea();
  try { await room.disconnect(); } catch {}
}

function lkCleanLocalTracks() {
  if (state._localMicTrack)    { state._localMicTrack.stop();    state._localMicTrack    = null; }
  if (state._localCamTrack)    { state._localCamTrack.stop();    state._localCamTrack    = null; }
  if (state._localScreenTrack) { state._localScreenTrack.stop(); state._localScreenTrack = null; }
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

function lkOnQualityChanged(quality, participant) {
  const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(participant.identity)}"]`);
  if (!card) return;
  let badge = card.querySelector('.p-quality');
  if (!badge) {
    const avatar = card.querySelector('.p-avatar');
    if (avatar) {
      badge = document.createElement('div');
      badge.className = 'p-quality';
      badge.innerHTML = '<div class="p-quality-bar"></div><div class="p-quality-bar"></div><div class="p-quality-bar"></div>';
      avatar.appendChild(badge);
    }
  }
  if (badge) {
    badge.className = `p-quality ${quality}`;
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
    micBanner();
  } else if (CS && connState === CS.Disconnected) {
    lkSetStatusDot('lk-error');
  } else {
    lkSetStatusDot('lk-connecting');
  }
}

let _lkReconnectTimer = null;
function lkOnDisconnected() {
  if (state.view !== 'room') return; // intentional or stale
  state._lkRoom = null;
  document.querySelectorAll('.lk-audio').forEach(el => el.remove());
  hideScreenShareArea();
  // Device/tracks are gone; keep micOn as intent so reconnect restores it.
  state.media.micReady = false; state.media.cameraOn = false; state.media.screenOn = false;
  updateMicBtn();
  updateDock();
  lkSetStatusDot('lk-reconnecting');

  // Auto-retry once after 2s
  clearTimeout(_lkReconnectTimer);
  showBanner('Reconnecting…', '', null, 'warning');
  _lkReconnectTimer = setTimeout(async () => {
    if (state.room && !state._lkRoom && state.view === 'room') {
      await lkConnect(state.room.slug);
      if (!state._lkRoom) {
        lkSetStatusDot('lk-error');
        showBanner('Voice connection lost.', 'Rejoin', () => { if (state.room) lkConnect(state.room.slug); });
      }
    }
  }, 2000);
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
  wrap.innerHTML = '';
  wrap.appendChild(video);
  addFullscreenBtn(wrap, video);
  card.classList.add('has-video');
}

// Fullscreen toggle for any video tile (works on desktop + iOS Safari).
function goFullscreen(video) {
  if (!video) return;
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (video.requestFullscreen)            video.requestFullscreen();
  else if (video.webkitEnterFullscreen)   video.webkitEnterFullscreen();   // iOS Safari
  else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
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

function hideParticipantVideo(identity) {
  const card = document.querySelector(`.participant-card[data-sid="${CSS.escape(identity)}"]`);
  if (!card) return;
  card.querySelector('.p-video-wrap')?.remove();
  card.classList.remove('has-video');
}

function showScreenShareVideo(track, participant) {
  const area = document.getElementById('screenshare-area');
  if (!area) return;
  area.hidden = false;
  const name = participant.name || participant.identity || 'someone';
  area.innerHTML = `<div class="ss-label">${escHtml(name)} is sharing their screen</div>`;
  const video = track.attach();
  video.autoplay = true; video.playsInline = true; video.muted = true;
  area.appendChild(video);
  addFullscreenBtn(area, video);
}

function hideScreenShareArea() {
  const area = document.getElementById('screenshare-area');
  if (area) { area.hidden = true; area.innerHTML = ''; }
}

// Re-attach local video preview after participant grid is re-rendered by presence sync
function reattachLocalVideo() {
  if (state.media.cameraOn && state._localCamTrack) {
    showParticipantVideo(state._localCamTrack, state.user.sessionId);
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
  const grid   = document.getElementById('rooms-grid');
  const empty  = document.getElementById('empty-state');
  const nickEl = document.getElementById('lobby-nick-display');
  const createBtn = document.getElementById('btn-create');

  if (state.user.nickname && nickEl) nickEl.textContent = state.user.nickname;

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
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        const room = state.rooms.find(r => r.slug === slug);
        if (!room) return;
        if (room.locked && room.host !== state.user.nickname &&
            room.host_session_id !== state.user.sessionId) return;
        requireNickname(() => joinRoom(slug));
      });
    });
  }
}

function renderRoomCard(room) {
  const isYours = room.host_session_id === state.user.sessionId;
  const title = room.title ? escHtml(room.title) : `@${escHtml(room.host)}`;

  return `<div class="room-card${room.locked ? ' locked' : ''}${isYours ? ' yours' : ''}"
               data-slug="${escHtml(room.slug)}"
               role="button" tabindex="${room.locked && !isYours ? '-1' : '0'}"
               aria-label="${title}, ${room.member_count} participant${room.member_count !== 1 ? 's' : ''}${room.locked ? ', locked' : ''}">
    <div class="card-avatar" style="background:${room.hostAccent}">${avatarInner(room.host, room.hostAccent, '')}</div>
    <div class="card-name">
      ${title}${isYours ? ' <span class="yours-tag">(yours)</span>' : ''}
    </div>
    <div class="card-meta">
      <span class="count">${ICON.people} ${room.member_count}</span>
      ${room.locked ? `<span class="badge badge-locked">${ICON.lock} locked</span>` : ''}
    </div>
    <div class="card-join">${room.locked && !isYours ? 'locked' : 'join'}</div>
  </div>`;
}

// ── § TRANSITIONS ─────────────────────────────────────────────────
async function doShowLobby() {
  await lkDisconnect();
  await sbCleanupChannels();

  state.view = 'lobby';
  state.room = null;
  state.participants = [];
  state.chat = [];
  state.media = { micOn: false, micReady: false, serverMuted: false, deafened: false, cameraOn: false, screenOn: false, _preDeafenMicOn: false };
  state.ui.settingsOpen = false;
  stopMicTest();
  state.user.role = 'guest';
  state.user.ghost = false;
  state.kickedSessionIds = new Set();
  state._lastMsgTime = 0;

  document.getElementById('view-room').hidden = true;
  document.getElementById('view-lobby').hidden = false;
  document.getElementById('settings-panel').hidden = true;
  document.getElementById('user-menu').hidden = true;

  _msgBurst.length = 0; // reset chat cooldown between sessions

  state.rooms = await sbLoadRooms();
  renderLobby();

  // Subscribe to room list changes (once; stays alive)
  if (!_sbRoomListSub) {
    _sbRoomListSub = sbWatchRooms(async () => {
      if (state.view !== 'lobby') return;
      state.rooms = await sbLoadRooms();
      renderLobby();
    });
  }
}

async function joinRoom(slug) {
  let room = state.rooms.find(r => r.slug === slug);
  if (!room) room = await sbFetchRoom(slug);
  if (!room) return;

  // Ban check
  const banned = await sbCheckBan(room.id, state.user.sessionId, state.user.nickname);
  if (banned) {
    showLobbyBanner('You are banned from this room.');
    return;
  }

  // Re-fetch to get the latest locked state
  if (room.id) {
    const fresh = await sbFetchRoom(slug);
    if (fresh) room = fresh;
  }

  if (room.locked && room.host_session_id !== state.user.sessionId) {
    showLobbyBanner('This room is locked.');
    return;
  }

  state.user.role = room.host_session_id === state.user.sessionId ? 'host' : 'guest';

  await enterRoom(room, true);
}

async function enterRoom(room, pushNav) {
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

  // Load message history
  state.chat = await sbLoadMessages(room.id);

  // Presence: join channel and broadcast self
  state._sbPresenceChan = sbJoinPresence(room.slug);

  // Chat real-time subscription
  state._sbChatSub = sbWatchMessages(room.id, (msg) => {
    state.chat.push(msg);
    appendMessage(msg.nick, msg.body, msg.time, false);
  });

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
          if (updated.audience_mode && state.media.micOn) setMicMuted(true);
          const micBtn = document.getElementById('btn-mic');
          if (micBtn) micBtn.classList.toggle('audience-locked', !!updated.audience_mode);
          appendSystemMessage(
            updated.audience_mode
              ? 'Audience mode on — only the host can speak'
              : 'Audience mode off — everyone can speak',
            'action'
          );
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

  // Connect to LiveKit (non-blocking)
  if (room.id) lkConnect(room.slug);
}

async function leaveRoom() {
  if (!state.room) { doShowLobby(); return; }

  appendSystemMessage(`${state.user.nickname} left`, 'leave');

  if (state.room.id && state.user.role === 'host') {
    await sbEndRoom(state.room.slug, state.room.id);
  }

  await doShowLobby();
  history.replaceState({ view: 'lobby' }, '', location.pathname);
}

// "Start a room" creates instantly — no modal. The title defaults to the host's
// name and can be edited inline from the topbar afterwards.
async function createRoom() {
  const title  = state.user.nickname; // default title = your name
  const slug   = generateSlug(`${title}-${Math.floor(Math.random() * 900) + 100}`);
  const accent = myAccent();
  let roomId = null;
  try {
    const data = await sbCreateRoom(slug, title, false);
    roomId = data?.id;
  } catch (err) {
    console.error('Failed to create room:', err);
    showLobbyBanner('Could not create room. Try again.');
    return;
  }

  const room = {
    id:              roomId,
    slug,
    title:           title || null,
    host:            state.user.nickname,
    host_session_id: state.user.sessionId,
    hostAccent:      accent,
    member_count:    1,
    locked:          false,
    audience_mode:   false,
    audience:        false,
    startedAt:       Date.now(),
  };

  state.user.role = 'host';
  await enterRoom(room, true);
}

// Host edits the title inline. Debounced write to the DB + live broadcast.
let _titleSaveTimer = null;
function onTitleEdit(value) {
  if (state.user.role !== 'host' || !state.room) return;
  const title = value.trim().slice(0, 48);
  state.room.title = title || null;
  const r = state.rooms.find(x => x.slug === state.room.slug);
  if (r) r.title = state.room.title;
  broadcastToRoom('room:update', { title: state.room.title || '' });
  clearTimeout(_titleSaveTimer);
  _titleSaveTimer = setTimeout(() => {
    if (state.room?.slug) sbUpdateRoom(state.room.slug, { title: state.room.title });
  }, 600);
}

// ── § RENDER / ROOM ───────────────────────────────────────────────
function renderRoom() {
  document.getElementById('view-lobby').hidden = true;
  document.getElementById('view-room').hidden  = false;
  updateTopbar();
  renderParticipants();
  renderChat(state.chat);
  updateDock();
  setActivePanel(state.ui.activeTab);
}

function updateTopbar() {
  const room   = state.room;
  const isHost = state.user.role === 'host';

  // Host @name sits beside the title field.
  const hostEl = document.getElementById('topbar-host');
  if (hostEl) hostEl.textContent = `@${room.host || ''}`;

  // The title is editable for the host (an inline field), read-only for guests.
  // Don't stomp the value while the host is actively typing.
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) {
    titleEl.readOnly = !isHost;
    titleEl.classList.toggle('is-host', isHost);
    if (document.activeElement !== titleEl) titleEl.value = room.title || '';
    titleEl.placeholder = isHost ? 'add a title' : 'untitled room';
  }

  document.getElementById('topbar-locked-badge').hidden = !room.locked;
  const audBadge = document.getElementById('topbar-audience-badge');
  if (audBadge) audBadge.hidden = !room.audience;
  const ghostBadge = document.getElementById('topbar-ghost-badge');
  if (ghostBadge) ghostBadge.hidden = !state.user.ghost;

  document.getElementById('topbar-count').innerHTML = `${ICON.people} ${state.participants.length}`;
  document.getElementById('participant-count').textContent = state.participants.length;
}

function renderParticipants() {
  const grid   = document.getElementById('participant-grid');
  const hintEl = document.getElementById('room-hint');
  const isHost = state.user.role === 'host';

  const visible = state.participants.filter(p => !p.isGhost);
  grid.innerHTML = visible.map(p => renderParticipantCard(p, isHost)).join('');

  if (isHost) {
    grid.querySelectorAll('.participant-card.host-can-act').forEach(card => {
      const nick = card.dataset.nick;

      // Quick-mute button
      card.querySelector('.p-mute-btn')?.addEventListener('click', e => {
        e.stopPropagation();
        const p = state.participants.find(x => x.nickname === nick);
        if (p) handleDirectMute(p);
      });

      card.addEventListener('contextmenu', e => {
        e.preventDefault();
        const p = state.participants.find(x => x.nickname === nick);
        if (p) openUserMenu(p, e.clientX, e.clientY);
      });
      let pressTimer;
      card.addEventListener('pointerdown', e => {
        if (e.target.closest('.p-mute-btn')) return;
        pressTimer = setTimeout(() => {
          const p = state.participants.find(x => x.nickname === nick);
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
  reattachLocalVideo();
}

function renderParticipantCard(p, isHost) {
  const isYou  = p.sessionId ? p.sessionId === state.user.sessionId
    : p.nickname === state.user.nickname;
  const canAct = isHost && !isYou;

  const badgeHtml = [
    p.role === 'host'     ? `<span class="badge badge-host">host</span>`      : '',
    p.role === 'audience' ? `<span class="badge badge-audience">audience</span>` : '',
    p.serverMuted         ? `<span class="badge badge-muted">muted</span>`    : '',
    p.sharing === 'cam'   ? `<span class="p-sharing-label">${ICON.cam} cam</span>`    : '',
    p.sharing === 'screen'? `<span class="p-sharing-label">${ICON.screen} screen</span>` : '',
  ].filter(Boolean).join('');

  const speakLevelStyle = p.speaking ? ` style="--speak-level:0.5"` : '';

  return `<div class="participant-card${isYou ? ' is-you' : ''}${p.speaking ? ' speaking' : ''}${canAct ? ' host-can-act' : ''}"
               data-nick="${escHtml(p.nickname)}"
               data-sid="${escHtml(p.sessionId || '')}"${speakLevelStyle}
               ${canAct ? 'title="Right-click to moderate"' : ''}>
    ${canAct ? `<button class="p-mute-btn${p.serverMuted ? ' is-muted' : ''}" data-nick="${escHtml(p.nickname)}" title="${p.serverMuted ? 'Unmute' : 'Mute'}" aria-label="${p.serverMuted ? 'Unmute' : 'Mute'} ${escHtml(p.nickname)}">${p.serverMuted ? ICON.mic : ICON.micOff}</button>` : ''}
    <div class="p-avatar${p.avatar ? ' has-photo' : ''}" style="background:${p.accent}">
      ${avatarInner(p.nickname, p.accent, p.avatar)}
      ${p.muted || p.serverMuted ? '<div class="p-mic-off" title="Muted"></div>' : ''}
    </div>
    <div class="p-name">
      ${escHtml(p.nickname)}${isYou ? ' <span class="you-tag">(you)</span>' : ''}
    </div>
    ${badgeHtml ? `<div class="p-badges">${badgeHtml}</div>` : ''}
  </div>`;
}

function renderChat(messages) {
  const el = document.getElementById('chat-messages');
  el.innerHTML = '';
  messages.forEach(m => {
    if (m.sys) appendSystemMessage(m.body, m.kind);
    else appendMessage(m.nick, m.body, m.time, false);
  });
  el.scrollTop = el.scrollHeight;
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
  btn.classList.toggle('mic-muted', !state.media.micOn);
  btn.setAttribute('aria-pressed', state.media.micOn ? 'true' : 'false');
  btn.setAttribute('aria-label', state.media.micOn ? 'Mic on' : 'Mic off');
}

function updateDockBtnState(id, active) {
  const btn = document.getElementById(id);
  if (btn) btn.setAttribute('aria-pressed', active ? 'true' : 'false');
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
  const swatch = (val, bg, label, selected) =>
    `<button type="button" class="color-swatch${selected ? ' selected' : ''}" role="radio"
       aria-checked="${selected ? 'true' : 'false'}" data-color="${escHtml(val)}"
       style="--sw:${bg}" title="${label}" aria-label="${label} color"></button>`;
  // First chip = auto (a stable hash of the name); then the palette.
  const autoBg = accentForNick(state.user.nickname || 'a');
  let html = swatch('', autoBg, 'auto', !_setupColor);
  html += ACCENT_COLORS.map(c => swatch(c, c, c, _setupColor === c)).join('');
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

function showLobbyBanner(msg) {
  // Temporary: use browser alert for now (lobby has no banner element)
  // Phase 4 admin UI will add a proper toast system
  const div = document.createElement('div');
  div.className = 'lobby-toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
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
  // No LiveKit yet (connecting / offline): record intent, sync UI + presence.
  if (!state._lkRoom) {
    state.media.micOn = on;
    updateMicBtn();
    _syncMicPresence();
    if (!opts.silent) micBanner();
    return;
  }
  try {
    await state._lkRoom.localParticipant.setMicrophoneEnabled(on, {
      echoCancellation: true,
      noiseSuppression: state.settings.noiseSuppression,
      autoGainControl:  true,
      deviceId: state.settings.micDeviceId !== 'default' ? state.settings.micDeviceId : undefined,
    });
    state.media.micOn = on;
    if (on) state.media.micReady = true; // device now live for the rest of the session
    state._localMicTrack = state._lkRoom.localParticipant.getTrackPublication?.(_lk?.Track?.Source?.Microphone)?.track || state._localMicTrack;
    if (!opts.silent) { if (on) hideBanner(); else micBanner(); }
  } catch (err) {
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

function handleMicError(err) {
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
  if (micBlockedByAudience()) { showBanner('Audience mode is on — only the host can speak.', '', null, 'info'); return; }
  if (!state.media.micReady) showBanner('You’re muted — tap the mic to talk.', 'Unmute', () => toggleMic(), 'info');
  else hideBanner();
}

function toggleMic() {
  if (micBlockedByAudience() && !state.media.micOn) { micBanner(); return; }
  setMic(!state.media.micOn);
}

// Forced mute/unmute from a host or audience mode — host is immune.
async function setMicMuted(muted, reason) {
  if (state.user.role === 'host') return;
  await setMic(!muted, { silent: true });
  if (muted && reason) showBanner(reason, 'OK', hideBanner, 'warning');
  else if (!muted) hideBanner();
}

function toggleDeafen() {
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

async function toggleCamera() {
  if (!state._lkRoom) {
    state.media.cameraOn = !state.media.cameraOn;
    updateDockBtnState('btn-camera', state.media.cameraOn);
    _syncSharingPresence();
    return;
  }

  if (!state.media.cameraOn) {
    const { createLocalVideoTrack } = await ensureLk();
    try {
      // Build constraints — if no explicit device selected, let browser pick any camera
      const camConstraints = {};
      if (state.settings.cameraDeviceId && state.settings.cameraDeviceId !== 'default') {
        camConstraints.deviceId = { exact: state.settings.cameraDeviceId };
      }
      let track;
      try {
        track = await createLocalVideoTrack(camConstraints);
      } catch (firstErr) {
        // If exact deviceId failed or no camera found, try without any constraints (picks first available)
        if (Object.keys(camConstraints).length > 0 || firstErr.name === 'NotFoundError') {
          track = await createLocalVideoTrack({});
        } else {
          throw firstErr;
        }
      }
      await state._lkRoom.localParticipant.publishTrack(track);
      state._localCamTrack = track;
      state.media.cameraOn = true;
      showParticipantVideo(track, state.user.sessionId);
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showBanner('Camera access denied.', 'OK', hideBanner);
      } else if (err.name === 'NotFoundError') {
        showBanner('No camera found. Connect a camera or enable Continuity Camera on your iPhone.', 'OK', hideBanner);
      } else {
        showBanner('Could not start camera.', 'Retry', toggleCamera);
      }
    }
  } else {
    if (state._localCamTrack) {
      await state._lkRoom.localParticipant.unpublishTrack(state._localCamTrack);
      state._localCamTrack.stop();
      state._localCamTrack = null;
    }
    state.media.cameraOn = false;
    hideParticipantVideo(state.user.sessionId);
  }

  updateDockBtnState('btn-camera', state.media.cameraOn);
  _syncSharingPresence();
}

async function toggleScreen() {
  if (!state._lkRoom) {
    state.media.screenOn = !state.media.screenOn;
    updateDockBtnState('btn-screen', state.media.screenOn);
    _syncSharingPresence();
    appendSystemMessage(
      state.media.screenOn
        ? `${state.user.nickname} started sharing their screen`
        : `${state.user.nickname} stopped sharing their screen`,
      'action'
    );
    return;
  }

  if (!state.media.screenOn) {
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
      state.media.screenOn = true;

      showScreenShareVideo(videoTrack, { name: state.user.nickname, identity: state.user.sessionId });
      appendSystemMessage(`${state.user.nickname} started sharing their screen`, 'action');

      // Browser stop-sharing button (native UI)
      videoTrack.mediaStreamTrack.addEventListener('ended', () => {
        if (state.media.screenOn) toggleScreen();
      }, { once: true });
    } catch (err) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        showBanner('Could not share screen.', 'OK', hideBanner);
      }
    }
  } else {
    if (state._localScreenTrack) {
      await state._lkRoom.localParticipant.unpublishTrack(state._localScreenTrack);
      state._localScreenTrack.stop();
      state._localScreenTrack = null;
    }
    state.media.screenOn = false;
    hideScreenShareArea();
    appendSystemMessage(`${state.user.nickname} stopped sharing their screen`, 'action');
  }

  updateDockBtnState('btn-screen', state.media.screenOn);
  _syncSharingPresence();
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
    if (mics.length >= 1) {
      micSel.innerHTML = mics.map(d =>
        `<option value="${escHtml(d.deviceId)}">${escHtml(d.label || `Microphone ${d.deviceId.slice(0,4)}`)}</option>`
      ).join('');
      micSel.value = state.settings.micDeviceId;
    }
    if (speakers.length >= 1) {
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
async function toggleLock() {
  if (!state.room) return;
  state.room.locked = !state.room.locked;

  updateDock();
  updateTopbar();

  appendSystemMessage(
    state.room.locked ? 'Room locked by host' : 'Room unlocked by host', 'action'
  );

  broadcastToRoom('room:update', { locked: state.room.locked });
  await sbUpdateRoom(state.room.slug, { locked: state.room.locked });

  // postgres_changes subscription in sbWatchCurrentRoom notifies all participants

  const r = state.rooms.find(x => x.slug === state.room.slug);
  if (r) r.locked = state.room.locked;
}

async function toggleAudience() {
  if (!state.room) return;
  state.room.audience = !state.room.audience;

  appendSystemMessage(
    state.room.audience
      ? 'Audience mode on — only the host can speak'
      : 'Audience mode off — everyone can speak',
    'action'
  );

  broadcastToRoom('room:update', { audience: state.room.audience });
  await sbUpdateRoom(state.room.slug, { audience_mode: state.room.audience });
  updateTopbar();
  updateDock();
  renderParticipants();
}

async function toggleGhost() {
  state.user.ghost = !state.user.ghost;
  updateDock();
  updateTopbar(); // ghost badge

  // Truly hide from others by leaving presence; you stay connected to audio + chat.
  // The presence sync handler re-adds you to your own list, so you still see yourself.
  if (state.user.ghost) {
    try { await state._sbPresenceChan?.untrack(); } catch {}
  } else {
    await sbTrackPresence({});
  }

  appendSystemMessage(
    state.user.ghost ? 'You went ghost — hidden from the list' : 'You are visible again', 'action'
  );
}

// ── § CHAT ────────────────────────────────────────────────────────
const _msgBurst = []; // rolling timestamps of recent sends

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

  const wait = chatCooldownMs();
  if (wait > 0) { showChatCooldown(wait); return; }
  hideChatCooldown();

  _msgBurst.push(Date.now());
  state._lastMsgTime = Date.now();

  input.value = '';
  const msg = { nick: state.user.nickname, body, time: Date.now() };
  state.chat.push(msg);
  appendMessage(msg.nick, msg.body, msg.time, true); // optimistic

  if (state.room?.id) {
    await sbSendMessage(state.room.id, body);
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

// The sender's chosen name color, when we know it (self always; others via presence).
function nickColor(nick) {
  if (nick === state.user.nickname) return myAccent();
  return state.participants.find(x => x.nickname === nick)?.accent || '';
}

function appendMessage(nick, body, time, isNewMsg) {
  const el  = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const isYou = nick === state.user.nickname;
  const color = nickColor(nick);
  const styleAttr = color ? ` style="color:${escHtml(color)}"` : '';
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <div class="chat-msg-body">${escHtml(body)}</div>
  `;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

// Image message — rendered as a thumbnail that opens a fullscreen viewer.
// Images are ephemeral: broadcast over realtime, never written to the DB.
function appendImageMessage(nick, src, time) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const isYou = nick === state.user.nickname;
  const color = nickColor(nick);
  const styleAttr = color ? ` style="color:${escHtml(color)}"` : '';
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}"${styleAttr}>${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <img class="chat-msg-img" src="${escHtml(src)}" alt="image from ${escHtml(nick)}">
  `;
  el.appendChild(div);
  div.querySelector('.chat-msg-img')?.addEventListener('click', () => openImageViewer(src));
  el.scrollTop = el.scrollHeight;
}

async function sendChatImage(file) {
  if (!file) return;
  if (!state.room) return;
  const wait = chatCooldownMs();
  if (wait > 0) { showChatCooldown(wait); return; }
  let src;
  try {
    src = await fileToDataUrl(file, 720, 0.6); // cap longest edge; keep payload small
  } catch {
    return; // not a readable image — bail quietly
  }
  _msgBurst.push(Date.now());
  appendImageMessage(state.user.nickname, src, Date.now()); // optimistic
  broadcastToRoom('chat:image', {
    nick: state.user.nickname, src, time: Date.now(), sessionId: state.user.sessionId,
  });
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
  el.scrollTop = el.scrollHeight;
}

// ── § USER MENU ───────────────────────────────────────────────────
let _menuTarget = null;

function openUserMenu(participant, x, y) {
  _menuTarget = participant;
  const menu = document.getElementById('user-menu');
  menu.hidden = false;
  menu.style.left = `${Math.min(x, window.innerWidth  - 160)}px`;
  menu.style.top  = `${Math.min(y, window.innerHeight - 160)}px`;
  menu.querySelector('[data-action="mute"]').textContent = participant.serverMuted ? 'unmute' : 'mute';
}

function closeUserMenu() {
  document.getElementById('user-menu').hidden = true;
  _menuTarget = null;
}

function handleDirectMute(p) {
  p.serverMuted = !p.serverMuted;
  broadcastToRoom('user:mute', { sessionId: p.sessionId, muted: p.serverMuted });
  appendSystemMessage(
    p.serverMuted ? `Host muted ${p.nickname}` : `Host unmuted ${p.nickname}`, 'action'
  );
  renderParticipants();
}

async function handleUserAction(action) {
  const p = _menuTarget;
  closeUserMenu();
  if (!p) return;

  switch (action) {
    case 'mute':
      p.serverMuted = !p.serverMuted;
      broadcastToRoom('user:mute', { sessionId: p.sessionId, muted: p.serverMuted });
      appendSystemMessage(
        p.serverMuted ? `Host muted ${p.nickname}` : `Host unmuted ${p.nickname}`, 'action'
      );
      renderParticipants();
      break;

    case 'kick':
      if (p.sessionId) {
        state.kickedSessionIds.add(p.sessionId);
        broadcastToRoom('user:kick', { sessionId: p.sessionId });
      }
      state.participants = state.participants.filter(x => x.nickname !== p.nickname);
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was kicked`, 'leave');
      renderParticipants();
      updateTopbar();
      break;

    case 'ban':
      if (p.sessionId) {
        state.kickedSessionIds.add(p.sessionId);
        broadcastToRoom('user:kick', { sessionId: p.sessionId });
      }
      state.participants = state.participants.filter(x => x.nickname !== p.nickname);
      state.bans.push({ nickname: p.nickname, sessionId: p.sessionId || '', type: 'nickname' });
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was banned`, 'leave');
      if (state.room?.id) {
        sbAddBan(state.room.id, 'nickname', p.nickname).catch(console.error);
        if (p.sessionId) sbAddBan(state.room.id, 'session', p.sessionId).catch(console.error);
      }
      renderParticipants();
      updateTopbar();
      break;

    case 'promote':
      p.role = 'host';
      state.user.role = 'guest';
      if (state.room) state.room.host = p.nickname;
      appendSystemMessage(`${p.nickname} is now the host`, 'action');
      updateDock();
      renderParticipants();
      break;
  }
}

// ── § MOBILE TABS ─────────────────────────────────────────────────
function setActivePanel(tab) {
  state.ui.activeTab = tab;
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.dataset.active = panel.dataset.panel === tab ? 'true' : 'false';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
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
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (_) {}
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
  loadIdentity();

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
      _setupAvatar = await fileToDataUrl(file, 128, 0.78); // small square-ish photo
      renderSetupAvatar();
    } catch {
      const errEl = document.getElementById('nickname-error');
      errEl.textContent = "couldn't read that image.";
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

  document.getElementById('modal-overlay').addEventListener('click', closeModals);

  // ── Inline room title (host) ──
  const titleInput = document.getElementById('topbar-title');
  titleInput.addEventListener('input', e => onTitleEdit(e.target.value));
  titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') titleInput.blur(); });

  // ── Room controls ──
  document.getElementById('btn-back').addEventListener('click', leaveRoom);
  document.getElementById('btn-leave').addEventListener('click', leaveRoom);
  document.getElementById('btn-mic').addEventListener('click', toggleMic);
  document.getElementById('btn-deafen').addEventListener('click', toggleDeafen);
  document.getElementById('btn-camera').addEventListener('click', toggleCamera);
  document.getElementById('btn-screen').addEventListener('click', toggleScreen);
  document.getElementById('btn-settings').addEventListener('click', toggleSettings);

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
    document.getElementById('panel-chat').style.display = state.ui.chatHidden ? 'none' : '';
    document.getElementById('btn-toggle-chat').textContent = state.ui.chatHidden ? 'show chat' : 'hide chat';
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActivePanel(btn.dataset.tab));
  });

  // ── Host controls ──
  document.getElementById('btn-lock').addEventListener('click', toggleLock);
  document.getElementById('btn-audience').addEventListener('click', toggleAudience);
  document.getElementById('btn-ghost').addEventListener('click', toggleGhost);

  // ── Chat ──
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
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

  // Image viewer
  document.getElementById('img-viewer').addEventListener('click', closeImageViewer);

  // ── Settings ──
  document.getElementById('sel-mic').addEventListener('change', e => {
    state.settings.micDeviceId = e.target.value;
  });
  document.getElementById('sel-speaker').addEventListener('change', e => {
    state.settings.speakerDeviceId = e.target.value;
  });
  document.getElementById('sel-camera')?.addEventListener('change', e => {
    state.settings.cameraDeviceId = e.target.value;
  });
  document.getElementById('chk-noise').addEventListener('change', e => {
    state.settings.noiseSuppression = e.target.checked;
    applyNoiseSuppression(); // re-acquire so it takes effect mid-call
  });
  document.getElementById('chk-joinsound').addEventListener('change', e => {
    state.settings.joinSound = e.target.checked;
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
    if (e.key === 'Escape') { closeUserMenu(); closeSettings(); closeModals(); closeImageViewer(); }
    if (state.view === 'room' && !e.target.matches('input, textarea, select')) {
      if (e.key === 'm' || e.key === 'M') toggleMic();
      if (e.key === 'd' || e.key === 'D') toggleDeafen();
    }
  });

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
}

init();
