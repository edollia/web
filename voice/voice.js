// ════════════════════════════════════════════════════════════════
//  voice.js — doll.gg /voice rooms — Phase 3 (LiveKit audio/video)
//  OFFLINE mode: works with seed data when SUPABASE_ANON is empty.
// ════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// LiveKit is loaded lazily when a user first enters a room.
// Keeping it out of the static import list means a CDN hiccup
// or browser incompatibility can't prevent the lobby from loading.
let _lk = null;
async function ensureLk() {
  if (!_lk) _lk = await import('https://esm.sh/livekit-client@2');
  return _lk;
}

// ── § CONFIG ─────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const SUPABASE_ANON = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const LIVEKIT_WS_URL = 'wss://pawsweb-z0kamke4.livekit.cloud'; // public WS URL only — secret stays server-side

// Force offline mode on localhost so local testing always works with seed data
const OFFLINE = !SUPABASE_ANON ||
  location.hostname === '127.0.0.1' ||
  location.hostname === 'localhost';
const sb = OFFLINE ? null : createClient(SUPABASE_URL, SUPABASE_ANON, {
  realtime: { params: { eventsPerSecond: 10 } },
});

const ACCENT_COLORS = [
  '#f08ab5', '#c4a0d4', '#7ab8d4', '#8ec4a0', '#d4b07a',
  '#a07ad4', '#7ab4d4', '#d47aaa', '#70b8a0', '#c4a070',
];

const ADJECTIVES = ['soft','rosy','velvet','hazy','lunar','dewy','misty','coral','dusty','silky'];
const NOUNS      = ['echo','bloom','drift','glow','mist','haze','petal','wisp','veil','lace'];

// ── § SEED DATA (offline fallback) ───────────────────────────────
const SEED_ROOMS = [
  { id: null, slug: 'sakura', title: null, host: 'sakura', host_session_id: '',
    hostAccent: '#f08ab5', member_count: 3, locked: false, audience_mode: false,
    startedAt: Date.now() - 18 * 60000 },
  { id: null, slug: 'dusk', title: 'late night vibes', host: 'dusk', host_session_id: '',
    hostAccent: '#c4a0d4', member_count: 1, locked: true, audience_mode: false,
    startedAt: Date.now() - 42 * 60000 },
  { id: null, slug: 'mochi', title: null, host: 'mochi', host_session_id: '',
    hostAccent: '#8ec4a0', member_count: 5, locked: false, audience_mode: false,
    startedAt: Date.now() - 7 * 60000 },
];

const SEED_PARTICIPANTS = {
  sakura: [
    { nickname: 'sakura', role: 'host',     muted: false, serverMuted: false, sharing: null,     accent: '#f08ab5', sessionId: 's1' },
    { nickname: 'luna',   role: 'speaker',  muted: true,  serverMuted: false, sharing: null,     accent: '#c4a0d4', sessionId: 's2' },
    { nickname: 'pixel',  role: 'speaker',  muted: false, serverMuted: false, sharing: 'cam',    accent: '#8ec4a0', sessionId: 's3' },
  ],
  dusk: [
    { nickname: 'dusk',   role: 'host',     muted: false, serverMuted: false, sharing: null,     accent: '#c4a0d4', sessionId: 'd1' },
  ],
  mochi: [
    { nickname: 'mochi',  role: 'host',     muted: false, serverMuted: false, sharing: null,     accent: '#8ec4a0', sessionId: 'm1' },
    { nickname: 'yuki',   role: 'speaker',  muted: false, serverMuted: false, sharing: null,     accent: '#7ab8d4', sessionId: 'm2' },
    { nickname: 'mimi',   role: 'speaker',  muted: true,  serverMuted: false, sharing: null,     accent: '#f08ab5', sessionId: 'm3' },
    { nickname: 'kira',   role: 'speaker',  muted: false, serverMuted: false, sharing: 'screen', accent: '#d4b07a', sessionId: 'm4' },
    { nickname: 'remy',   role: 'audience', muted: true,  serverMuted: false, sharing: null,     accent: '#a07ad4', sessionId: 'm5' },
  ],
};

const SEED_CHAT = {
  sakura: [
    { nick: 'sakura', body: 'hey everyone 🌸',           time: Date.now() - 900000 },
    { nick: 'luna',   body: 'hi!! just got here',         time: Date.now() - 840000 },
    { nick: 'pixel',  body: 'love the vibes tonight',     time: Date.now() - 720000 },
    { nick: 'sakura', body: 'turning camera on for a sec',time: Date.now() - 600000 },
    { nick: 'luna',   body: 'omg your setup is so cute',  time: Date.now() - 540000 },
  ],
  mochi: [
    { nick: 'mochi',  body: 'study room open!',           time: Date.now() - 3000000 },
    { nick: 'yuki',   body: 'thanks for hosting 🙏',      time: Date.now() - 2700000 },
    { nick: 'kira',   body: 'sharing my screen now',      time: Date.now() - 1200000 },
    { nick: 'mochi',  body: 'nice, what are you working on?', time: Date.now() - 900000 },
    { nick: 'kira',   body: 'typescript stuff lol',       time: Date.now() - 600000 },
  ],
  dusk: [],
};

// ── § STATE ───────────────────────────────────────────────────────
const state = {
  view: 'lobby',
  user: { nickname: '', sessionId: '', role: 'guest', ghost: false },
  rooms: [],
  room: null,
  participants: [],
  chat: [],
  media: { micOn: false, deafened: false, cameraOn: false, screenOn: false, _preDeafenMicOn: false },
  settings: {
    micDeviceId: 'default', speakerDeviceId: 'default', cameraDeviceId: 'default',
    noiseSuppression: true, joinSound: true,
  },
  ui: { settingsOpen: false, chatHidden: false, activeTab: 'participants' },
  bans: [],
  _simTimer: null,
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
function loadIdentity() {
  const nick = localStorage.getItem('dg_voice_nick');
  const sid  = localStorage.getItem('dg_voice_sid') || crypto.randomUUID();
  localStorage.setItem('dg_voice_sid', sid);
  state.user.sessionId = sid;
  if (nick) state.user.nickname = nick;
  // admin flag: set via localStorage.setItem('dollgg_role', 'admin') in console
  if (localStorage.getItem('dollgg_role') === 'admin') state.user.isAdmin = true;
}

function saveNickname(nick) {
  const clean = nick.trim().replace(/\s+/g, '_').slice(0, 24);
  state.user.nickname = clean;
  localStorage.setItem('dg_voice_nick', clean);
}

function accentForNick(nick) {
  let h = 0;
  for (let i = 0; i < nick.length; i++) h = (h * 31 + nick.charCodeAt(i)) >>> 0;
  return ACCENT_COLORS[h % ACCENT_COLORS.length];
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
    mutedAll:        false,
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
    sessionId:   p.sessionId,
    speaking:    existing?.speaking || false,
  };
}

// ── § SUPABASE ────────────────────────────────────────────────────

async function sbLoadRooms() {
  if (OFFLINE) return SEED_ROOMS.map(r => ({ ...r }));
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
  if (OFFLINE) return SEED_ROOMS.find(r => r.slug === slug) || null;
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
    host_accent:     accentForNick(state.user.nickname),
    status:          'active',
    member_count:    1,
  }).select().single();
  if (error) throw error;
  return data;
}

async function sbUpdateRoom(slug, updates) {
  if (OFFLINE) return;
  try {
    const { error } = await sb.from('rooms')
      .update(updates)
      .eq('slug', slug)
      .eq('host_session_id', state.user.sessionId);
    if (error) throw error;
  } catch (err) { console.error('sbUpdateRoom:', err); }
}

async function sbEndRoom(slug) {
  if (OFFLINE) return;
  try {
    const { error } = await sb.from('rooms')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('slug', slug)
      .eq('host_session_id', state.user.sessionId);
    if (error) throw error;
  } catch (err) { console.error('sbEndRoom:', err); }
}

async function sbLoadMessages(roomId, limit = 50) {
  if (OFFLINE) return [];
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
  if (OFFLINE) return;
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
  if (OFFLINE) return state.bans.some(b =>
    b.nickname === nickname || b.sessionId === sessionId
  );
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
  if (OFFLINE) return;
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
  if (OFFLINE) return null;
  return sb.channel('lobby:rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, onChange)
    .subscribe();
}

function sbWatchMessages(roomId, onMsg) {
  if (OFFLINE) return null;
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
  if (OFFLINE || !roomId) return null;
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

function sbJoinPresence(slug) {
  if (OFFLINE) return null;
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
        accent: accentForNick(state.user.nickname), sessionId: state.user.sessionId, speaking: false,
      };
      state.participants.unshift(selfEntry);
    }

    if (state.view === 'room') {
      renderParticipants();
      updateTopbar();
    }

    // Host keeps member_count in DB eventually-consistent
    if (state.user.role === 'host' && state.room?.slug) {
      sbUpdateRoom(state.room.slug, { member_count: state.participants.length })
        .catch(() => {});
    }
  });

  channel.on('broadcast', { event: 'room:update' }, ({ payload }) => {
    if (!payload || state.view !== 'room') return;
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
          // host put us in audience — disable mic
          toggleMic();
        }
        const micBtn = document.getElementById('btn-mic');
        if (micBtn) micBtn.classList.toggle('audience-locked', payload.audience);
      }
      const msg = payload.audience
        ? 'Audience mode ON — only host can speak'
        : 'Audience mode OFF — everyone can speak';
      appendSystemMessage(msg, 'action');
      renderParticipants();
    }
    if (typeof payload.mutedAll !== 'undefined') {
      state.room.mutedAll = payload.mutedAll;
      if (payload.mutedAll) {
        const self = state.participants.find(p => p.sessionId === state.user.sessionId);
        if (self && self.role !== 'host' && state.media.micOn) toggleMic();
        showBanner('Host muted everyone.', 'OK', hideBanner);
      } else {
        hideBanner();
      }
    }
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
    serverMuted: false,
    sharing:     state.media.cameraOn ? 'cam' : (state.media.screenOn ? 'screen' : null),
    accent:      accentForNick(state.user.nickname),
    sessionId:   state.user.sessionId,
  };
}

async function sbTrackPresence(updates) {
  if (!state._sbPresenceChan) return;
  try {
    await state._sbPresenceChan.track({ ...buildPresencePayload(), ...updates });
  } catch (err) { console.error('sbTrackPresence:', err); }
}

async function sbCleanupChannels() {
  if (!sb) return;
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
  if (OFFLINE || state._lkRoom) return;
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
    stopSpeakingSimulation(); // LiveKit drives speaking from here

    // If user enabled mic before LK connected, publish it now
    if (state.media.micOn) {
      const { createLocalAudioTrack } = await ensureLk();
      try {
        const track = await createLocalAudioTrack({
          echoCancellation: true, noiseSuppression: state.settings.noiseSuppression, autoGainControl: true,
        });
        await room.localParticipant.publishTrack(track);
        state._localMicTrack = track;
      } catch {}
    }
  } catch (err) {
    console.error('LK connect failed:', err);
    // speaking simulation remains as fallback
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
  const Track = _lk?.Track;
  if (!Track || track.kind === Track.Kind.Audio) {
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
  const Track = _lk?.Track;
  track.detach().forEach(el => el.remove());
  if (Track && publication.source === Track.Source.ScreenShare) {
    hideScreenShareArea();
  } else if (!Track || track.kind === Track.Kind.Video) {
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
  const dot = document.getElementById('lk-status-dot');
  if (dot) dot.className = `lk-status-dot ${cls}`;
}

function lkOnConnectionState(connState) {
  const CS = _lk?.ConnectionState;
  if (CS && connState === CS.Reconnecting) {
    lkSetStatusDot('lk-reconnecting');
    showBanner('Reconnecting to voice…', '', () => {});
  } else if (CS && connState === CS.Connected) {
    lkSetStatusDot('lk-connected');
    if (state.media.micOn) hideBanner();
    else showBanner('Microphone is off.', 'Enable mic', toggleMic);
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
  state.media.micOn = false; state.media.cameraOn = false; state.media.screenOn = false;
  updateMicBtn();
  updateDock();
  lkSetStatusDot('lk-reconnecting');
  startSpeakingSimulation();

  // Auto-retry once after 2s
  clearTimeout(_lkReconnectTimer);
  showBanner('Reconnecting…', '', () => {});
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
  card.classList.add('has-video');
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

  if (state.user.nickname && nickEl) nickEl.textContent = state.user.nickname;

  if (state.rooms.length === 0) {
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
  const isYours = room.host_session_id === state.user.sessionId ||
    (OFFLINE && room.host === state.user.nickname);
  const title = room.title ? escHtml(room.title) : `@${escHtml(room.host)}`;

  return `<div class="room-card${room.locked ? ' locked' : ''}${isYours ? ' yours' : ''}"
               data-slug="${escHtml(room.slug)}"
               role="button" tabindex="${room.locked && !isYours ? '-1' : '0'}"
               aria-label="${title}, ${room.member_count} participant${room.member_count !== 1 ? 's' : ''}${room.locked ? ', locked' : ''}">
    <div class="card-avatar" style="background:${room.hostAccent}">${room.host[0].toUpperCase()}</div>
    <div class="card-name">
      ${title}${isYours ? ' <span class="yours-tag">(yours)</span>' : ''}
    </div>
    <div class="card-meta">
      <span class="count">👥 ${room.member_count}</span>
      ${room.locked ? `<span class="badge badge-locked">🔒 locked</span>` : ''}
    </div>
    <div class="card-join">${room.locked && !isYours ? 'locked' : 'join'}</div>
  </div>`;
}

// ── § TRANSITIONS ─────────────────────────────────────────────────
async function doShowLobby() {
  stopSpeakingSimulation();
  await lkDisconnect();
  await sbCleanupChannels();

  state.view = 'lobby';
  state.room = null;
  state.participants = [];
  state.chat = [];
  state.media = { micOn: false, deafened: false, cameraOn: false, screenOn: false, _preDeafenMicOn: false };
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

  state.rooms = await sbLoadRooms();
  renderLobby();

  // Subscribe to room list changes (once; stays alive)
  if (!_sbRoomListSub && !OFFLINE) {
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

  // Re-fetch locked state
  if (!OFFLINE && room.id) {
    const fresh = await sbFetchRoom(slug);
    if (fresh) room = fresh;
  }

  if (room.locked && room.host_session_id !== state.user.sessionId &&
      !(OFFLINE && room.host === state.user.nickname)) {
    showLobbyBanner('This room is locked.');
    return;
  }

  const isHost = room.host_session_id === state.user.sessionId ||
    (OFFLINE && room.host === state.user.nickname);
  state.user.role = isHost ? 'host' : 'guest';

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

  if (!OFFLINE && room.id) {
    // Pre-populate self so first render has participant + correct badge immediately
    state.participants = [{
      nickname: state.user.nickname, role: state.user.role,
      muted: true, serverMuted: false, sharing: null,
      accent: accentForNick(state.user.nickname), sessionId: state.user.sessionId, speaking: false,
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

    // Watch for room ended or updated (host toggled lock/audience/etc.)
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
          // Non-host: enforce audience mode on our mic track
          if (state.user.role !== 'host' && updated.audience_mode !== wasAudience) {
            if (updated.audience_mode && state.media.micOn) toggleMic();
            const micBtn = document.getElementById('btn-mic');
            if (micBtn) micBtn.classList.toggle('audience-locked', !!updated.audience_mode);
            appendSystemMessage(
              updated.audience_mode
                ? 'Audience mode ON — only host can speak'
                : 'Audience mode OFF — everyone can speak',
              'action'
            );
          }
        }
        updateTopbar();
        updateDock();
      }
    );
  } else {
    // Offline mode: seed data
    const seedParts = SEED_PARTICIPANTS[room.slug] || [];
    state.participants = seedParts.map(p => ({ ...p }));
    const alreadyIn = state.participants.some(p => p.nickname === state.user.nickname);
    if (!alreadyIn) {
      state.participants.unshift({
        nickname: state.user.nickname, role: state.user.role,
        muted: true, serverMuted: false, sharing: null,
        accent: accentForNick(state.user.nickname), sessionId: state.user.sessionId,
      });
      room.member_count = state.participants.length;
    }
    state.chat = (SEED_CHAT[room.slug] || []).map(m => ({ ...m }));
  }

  renderRoom();
  startSpeakingSimulation(); // LK will stop this once connected; sim is fallback
  showBanner('Microphone is off.', 'Enable mic', () => toggleMic());

  setTimeout(() => appendSystemMessage(`${state.user.nickname} joined`, 'join'), 200);
  if (state.settings.joinSound) playJoinSound();

  // Connect to LiveKit (non-blocking; sim keeps running until LK confirms)
  if (!OFFLINE && room.id) lkConnect(room.slug);
}

async function leaveRoom() {
  if (!state.room) { doShowLobby(); return; }

  appendSystemMessage(`${state.user.nickname} left`, 'leave');
  stopSpeakingSimulation();

  if (!OFFLINE && state.room.id) {
    if (state.user.role === 'host') await sbEndRoom(state.room.slug);
  } else if (OFFLINE) {
    const idx = state.rooms.findIndex(r => r.slug === state.room.slug);
    if (idx !== -1) {
      if (state.user.role === 'host') {
        state.rooms.splice(idx, 1);
      } else {
        state.rooms[idx].member_count = Math.max(0, state.rooms[idx].member_count - 1);
      }
    }
  }

  await doShowLobby();
  history.replaceState({ view: 'lobby' }, '', location.pathname);
}

async function createRoom(title, locked) {
  const slug   = generateSlug(title);
  const accent = accentForNick(state.user.nickname);
  let roomId   = null;

  if (!OFFLINE) {
    try {
      const data = await sbCreateRoom(slug, title, locked);
      roomId = data?.id;
    } catch (err) {
      console.error('Failed to create room:', err);
      showLobbyBanner('Could not create room. Try again.');
      return;
    }
  }

  const room = {
    id:              roomId,
    slug,
    title:           title || null,
    host:            state.user.nickname,
    host_session_id: state.user.sessionId,
    hostAccent:      accent,
    member_count:    1,
    locked,
    audience_mode:   false,
    audience:        false,
    mutedAll:        false,
    startedAt:       Date.now(),
  };

  if (OFFLINE) {
    state.rooms.unshift(room);
    SEED_PARTICIPANTS[slug] = [];
    SEED_CHAT[slug] = [];
  }

  state.user.role = 'host';
  await enterRoom(room, true);
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
  const room  = state.room;
  const label = room.title ? room.title : `@${room.slug}`;
  document.getElementById('topbar-name').textContent = label;
  document.getElementById('topbar-locked-badge').hidden = !room.locked;
  document.getElementById('topbar-count').textContent = `👥 ${state.participants.length}`;
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
  document.getElementById('topbar-count').textContent = `👥 ${state.participants.length}`;
  reattachLocalVideo();
}

function renderParticipantCard(p, isHost) {
  const isYou  = p.sessionId ? p.sessionId === state.user.sessionId
    : p.nickname === state.user.nickname;
  const canAct = isHost && !isYou;

  const badgeHtml = [
    p.role === 'host'     ? `<span class="badge badge-host">host</span>`      : '',
    p.role === 'audience' ? `<span class="badge badge-muted">audience</span>` : '',
    p.serverMuted         ? `<span class="badge badge-muted">muted</span>`    : '',
    p.sharing === 'cam'   ? `<span class="p-sharing-label">📹 cam</span>`     : '',
    p.sharing === 'screen'? `<span class="p-sharing-label">🖥 screen</span>`  : '',
  ].filter(Boolean).join('');

  const speakLevelStyle = p.speaking ? ` style="--speak-level:0.5"` : '';

  return `<div class="participant-card${isYou ? ' is-you' : ''}${p.speaking ? ' speaking' : ''}${canAct ? ' host-can-act' : ''}"
               data-nick="${escHtml(p.nickname)}"
               data-sid="${escHtml(p.sessionId || '')}"${speakLevelStyle}
               ${canAct ? 'title="Right-click to moderate"' : ''}>
    ${canAct ? `<button class="p-mute-btn${p.serverMuted ? ' is-muted' : ''}" data-nick="${escHtml(p.nickname)}" title="${p.serverMuted ? 'Unmute' : 'Mute'}">${p.serverMuted ? '🔈' : '🔇'}</button>` : ''}
    <div class="p-avatar" style="background:${p.accent}">
      ${p.nickname[0].toUpperCase()}
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
  document.querySelectorAll('.admin-ctrl').forEach(el => { el.hidden = !(isHost && isAdmin); });

  const roleBadge = document.getElementById('dock-role-badge');
  roleBadge.hidden = state.user.role === 'guest';
  if (!roleBadge.hidden) roleBadge.textContent = state.user.role;

  const lockBtn  = document.getElementById('btn-lock');
  const muteBtn  = document.getElementById('btn-muteall');
  const audBtn   = document.getElementById('btn-audience');
  if (lockBtn)  lockBtn.textContent  = state.room?.locked     ? 'unlock'    : 'lock';
  if (muteBtn)  muteBtn.textContent  = state.room?.mutedAll   ? 'unmute all': 'mute all';
  if (audBtn)   audBtn.textContent   = state.room?.audience   ? 'speakers'  : 'audience';

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

// ── § MODALS ──────────────────────────────────────────────────────
function requireNickname(then) {
  if (state.user.nickname) { then(); return; }
  showNicknameModal(then);
}

function showNicknameModal(onComplete) {
  state._pendingAction = onComplete;
  showOverlay();
  document.getElementById('modal-nickname').hidden = false;
  document.getElementById('input-nickname').value  = '';
  document.getElementById('nickname-error').hidden = true;
  document.getElementById('input-nickname').focus();
}

function showCreateModal() {
  showOverlay();
  document.getElementById('modal-create').hidden = false;
  document.getElementById('input-room-title').value = '';
  document.getElementById('chk-room-locked').checked = false;
  document.getElementById('input-room-title').focus();
}

function closeModals() {
  document.getElementById('modal-overlay').hidden = true;
  document.getElementById('modal-nickname').hidden = true;
  document.getElementById('modal-create').hidden   = true;
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
  if (self) { self.muted = !state.media.micOn; if (OFFLINE) renderParticipants(); }
}

function _syncSharingPresence() {
  const sharing = state.media.cameraOn ? 'cam' : (state.media.screenOn ? 'screen' : null);
  sbTrackPresence({ sharing });
  const self = state.participants.find(p =>
    p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname
  );
  if (self) { self.sharing = sharing; if (OFFLINE) renderParticipants(); }
}

async function toggleMic() {
  if (!state._lkRoom) {
    // LK not yet connected (or offline): toggle presence only
    state.media.micOn = !state.media.micOn;
    if (state.media.micOn) hideBanner();
    else showBanner('Microphone is off.', 'Enable mic', toggleMic);
    updateMicBtn();
    _syncMicPresence();
    return;
  }

  if (!state.media.micOn) {
    const { createLocalAudioTrack } = await ensureLk();
    try {
      const track = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: state.settings.noiseSuppression,
        autoGainControl:  true,
        deviceId: state.settings.micDeviceId !== 'default' ? state.settings.micDeviceId : undefined,
      });
      await state._lkRoom.localParticipant.publishTrack(track);
      state._localMicTrack = track;
      state.media.micOn = true;
      hideBanner();
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        showBanner('Microphone access denied.', 'OK', hideBanner);
      } else if (err.name === 'NotFoundError') {
        showBanner('No microphone found.', 'Settings', openSettings);
      } else {
        showBanner('Could not start microphone.', 'Retry', toggleMic);
      }
    }
  } else {
    if (state._localMicTrack) {
      await state._lkRoom.localParticipant.unpublishTrack(state._localMicTrack);
      state._localMicTrack.stop();
      state._localMicTrack = null;
    }
    state.media.micOn = false;
    showBanner('Microphone is off.', 'Enable mic', toggleMic);
  }

  updateMicBtn();
  _syncMicPresence();
}

function toggleDeafen() {
  // Deafen = mute all incoming audio for yourself only. Does NOT touch your mic.
  state.media.deafened = !state.media.deafened;
  document.querySelectorAll('.lk-audio').forEach(el => { el.muted = state.media.deafened; });
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
function showBanner(text, actionText, actionFn) {
  const banner   = document.getElementById('room-banner');
  const textEl   = document.getElementById('banner-text');
  const actionEl = document.getElementById('banner-action-btn');
  textEl.textContent = text;
  actionEl.textContent = actionText || '';
  actionEl.style.display = actionText ? '' : 'none';
  actionEl.onclick = actionFn ? () => actionFn() : null;
  banner.classList.add('banner-visible');
}

function hideBanner() {
  document.getElementById('room-banner').classList.remove('banner-visible');
}

// ── § SETTINGS ────────────────────────────────────────────────────
let _micTestStream = null, _micTestRaf = null;

async function startMicTest() {
  try {
    _micTestStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(_micTestStream);
    const analyser = ctx.createAnalyser();
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

  document.getElementById('btn-lock').textContent = state.room.locked ? 'unlock' : 'lock';
  document.getElementById('topbar-locked-badge').hidden = !state.room.locked;

  appendSystemMessage(
    state.room.locked ? 'Room locked by host' : 'Room unlocked by host', 'action'
  );

  await sbUpdateRoom(state.room.slug, { locked: state.room.locked });

  // postgres_changes subscription in sbWatchCurrentRoom notifies all participants

  const r = state.rooms.find(x => x.slug === state.room.slug);
  if (r) r.locked = state.room.locked;
}

async function toggleMuteAll() {
  if (!state.room) return;
  state.room.mutedAll = !state.room.mutedAll;

  document.getElementById('btn-muteall').textContent = state.room.mutedAll ? 'unmute all' : 'mute all';

  if (state.room.mutedAll) {
    state.participants.forEach(p => {
      if (p.sessionId !== state.user.sessionId && p.nickname !== state.user.nickname)
        p.serverMuted = true;
    });
    appendSystemMessage('Host muted everyone', 'action');
  } else {
    state.participants.forEach(p => { p.serverMuted = false; });
    appendSystemMessage('Host unmuted everyone', 'action');
  }

  // Persist mute state so it survives reconnects
  sbUpdateRoom(state.room.slug, { /* member_count only; mute is presence-driven */ }).catch(() => {});

  if (OFFLINE) renderParticipants();
}

function toggleAudience() {
  if (!state.room) return;
  state.room.audience = !state.room.audience;

  document.getElementById('btn-audience').textContent = state.room.audience ? 'end stage' : 'audience';

  state.participants.forEach(p => {
    const isMe = p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname;
    if (!isMe) p.role = state.room.audience ? 'audience' : 'speaker';
  });

  appendSystemMessage(
    state.room.audience
      ? 'Audience mode ON — only host can speak'
      : 'Audience mode OFF — everyone can speak',
    'action'
  );

  // Persist to DB so postgres_changes notifies all participants
  await sbUpdateRoom(state.room.slug, { audience_mode: state.room.audience });

  if (OFFLINE) renderParticipants();
}

function toggleGhost() {
  state.user.ghost = !state.user.ghost;
  document.getElementById('btn-ghost').textContent = state.user.ghost ? 'unghost' : 'go ghost';

  const self = state.participants.find(p =>
    p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname
  );
  if (self) self.isGhost = state.user.ghost;

  renderParticipants();
  appendSystemMessage(
    state.user.ghost ? 'You are now a ghost (invisible to others)' : 'You are visible again', 'action'
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
  if (wait > 0) {
    const orig = input.placeholder;
    input.placeholder = `slow down… ${Math.ceil(wait / 1000)}s`;
    input.disabled = true;
    setTimeout(() => { input.placeholder = orig; input.disabled = false; input.focus(); }, wait);
    return;
  }

  _msgBurst.push(Date.now());
  state._lastMsgTime = Date.now();

  input.value = '';
  const msg = { nick: state.user.nickname, body, time: Date.now() };
  state.chat.push(msg);
  appendMessage(msg.nick, msg.body, msg.time, true); // optimistic

  if (!OFFLINE && state.room?.id) {
    await sbSendMessage(state.room.id, body);
  }
}

function appendMessage(nick, body, time, isNewMsg) {
  const el  = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  const isYou = nick === state.user.nickname;
  div.innerHTML = `
    <div class="chat-msg-header">
      <span class="chat-msg-nick${isYou ? ' is-you' : ''}">${escHtml(nick)}</span>
      <span class="chat-msg-time">${formatTime(time)}</span>
    </div>
    <div class="chat-msg-body">${escHtml(body)}</div>
  `;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
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
      appendSystemMessage(
        p.serverMuted ? `Host muted ${p.nickname}` : `Host unmuted ${p.nickname}`, 'action'
      );
      if (OFFLINE) renderParticipants();
      break;

    case 'kick':
      if (p.sessionId) state.kickedSessionIds.add(p.sessionId);
      state.participants = state.participants.filter(x => x.nickname !== p.nickname);
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was kicked`, 'leave');
      renderParticipants();
      updateTopbar();
      break;

    case 'ban':
      if (p.sessionId) state.kickedSessionIds.add(p.sessionId);
      state.participants = state.participants.filter(x => x.nickname !== p.nickname);
      state.bans.push({ nickname: p.nickname, sessionId: p.sessionId || '', type: 'nickname' });
      state.room.member_count = state.participants.length;
      appendSystemMessage(`${p.nickname} was banned`, 'leave');
      if (!OFFLINE && state.room?.id) {
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
      if (OFFLINE) renderParticipants();
      break;
  }
}

// ── § SPEAKING SIMULATION ─────────────────────────────────────────
function startSpeakingSimulation() {
  stopSpeakingSimulation();

  function tick() {
    if (state.view !== 'room' || !state.room) return;
    const eligible = state.participants.filter(p => {
      const isMe = p.sessionId ? p.sessionId === state.user.sessionId : p.nickname === state.user.nickname;
      return !isMe && !p.muted && !p.serverMuted;
    });
    if (eligible.length === 0) return;

    state.participants.forEach(p => { p.speaking = false; });
    const count = Math.floor(Math.random() * 3);
    for (let i = 0; i < count && i < eligible.length; i++) {
      eligible[Math.floor(Math.random() * eligible.length)].speaking = true;
    }

    document.querySelectorAll('.participant-card').forEach(card => {
      const nick = card.dataset.nick;
      const p    = state.participants.find(x => x.nickname === nick);
      if (p) {
        card.classList.toggle('speaking', !!p.speaking);
        card.querySelector('.p-avatar')?.classList.toggle('speaking-anim', !!p.speaking);
      }
    });
  }

  state._simTimer = setInterval(tick, 2000 + Math.random() * 1500);
}

function stopSpeakingSimulation() {
  if (state._simTimer) { clearInterval(state._simTimer); state._simTimer = null; }
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

  // ── Lobby events ──
  document.getElementById('btn-create').addEventListener('click', () => {
    requireNickname(() => showCreateModal());
  });
  document.getElementById('btn-create-empty')?.addEventListener('click', () => {
    requireNickname(() => showCreateModal());
  });
  document.getElementById('btn-change-nick')?.addEventListener('click', () => {
    showNicknameModal(() => renderLobby());
  });

  // ── Nickname modal ──
  document.getElementById('btn-nickname-confirm').addEventListener('click', () => {
    const val = document.getElementById('input-nickname').value.trim();
    if (!val || val.length < 2) {
      const errEl = document.getElementById('nickname-error');
      errEl.textContent = 'please enter at least 2 characters.';
      errEl.hidden = false;
      return;
    }
    saveNickname(val);
    const pendingFn = state._pendingAction; // capture before closeModals clears it
    closeModals();
    renderLobby();
    if (pendingFn) pendingFn();
  });
  document.getElementById('input-nickname').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-nickname-confirm').click();
  });

  // ── Create modal ──
  document.getElementById('btn-create-confirm').addEventListener('click', () => {
    const title  = document.getElementById('input-room-title').value.trim();
    const locked = document.getElementById('chk-room-locked').checked;
    closeModals();
    createRoom(title, locked);
  });
  document.getElementById('btn-create-cancel').addEventListener('click', closeModals);
  document.getElementById('input-room-title').addEventListener('keydown', e => {
    if (e.key === 'Enter')  document.getElementById('btn-create-confirm').click();
    if (e.key === 'Escape') closeModals();
  });
  document.getElementById('modal-overlay').addEventListener('click', closeModals);

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
  document.getElementById('btn-muteall').addEventListener('click', toggleMuteAll);
  document.getElementById('btn-audience').addEventListener('click', toggleAudience);
  document.getElementById('btn-ghost').addEventListener('click', toggleGhost);

  // ── Chat ──
  document.getElementById('btn-send').addEventListener('click', sendMessage);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });

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
    if (e.key === 'Escape') { closeUserMenu(); closeSettings(); closeModals(); }
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
