// Rooms uses its existing, separate Supabase project. All hooks consumed by
// admin.js are retained; view generations prevent late responses repainting it.
const ROOMS_URL = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const ROOMS_ANON = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const ROOMS_ADMIN_UID = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4';
const ROOMS_FN_URL = `${ROOMS_URL}/functions/v1/admin-rooms`;
async function roomsFetchWithDeadline(input, options = {}) {
    const controller = new AbortController(), signal = options.signal;
    const abort = () => controller.abort();
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
    let timer;
    try {
        return await Promise.race([
            (async () => { const response = await fetch(input, { ...options, signal: controller.signal }); await response.clone().arrayBuffer(); return response; })(),
            new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('The connection timed out. Refresh before trying the action again.')); }, 20000); })
        ]);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
const roomsClient = window.supabase.createClient(ROOMS_URL, ROOMS_ANON, {
    global: { fetch: roomsFetchWithDeadline }, auth: { persistSession: true, autoRefreshToken: true }
});
let roomsPanelLoaded = false, roomsVisible = false, roomsViewGeneration = 0, roomsSessionGeneration = 0;
let roomsListGeneration = 0, roomsInspectGeneration = 0, roomsBansGeneration = 0, roomsLockdownGeneration = 0;
let roomsInspectSlug = '', roomsRetry = null, roomsLoading = 0, roomsFailure = '';
const roomsMutations = new Set();
window.roomsHasPendingActions = () => roomsMutations.size > 0;
const roomsElement = id => document.getElementById(id);
const roomsCurrent = generation => generation === roomsViewGeneration && roomsVisible;
function updateRoomsStatus() {
    const status = roomsElement('rooms-status');
    if (status) status.textContent = roomsFailure || (roomsLoading ? 'Loading…' : '');
    const retry = roomsElement('rooms-retry');
    if (retry) retry.hidden = !roomsRetry;
}
function clearRoomsError() { roomsFailure = ''; roomsRetry = null; updateRoomsStatus(); }
function roomsError(error, retry) {
    roomsFailure = error?.message || 'Couldn’t load Rooms.'; roomsRetry = retry;
    appendLog('err', roomsFailure); updateRoomsStatus();
}
roomsElement('rooms-retry').addEventListener('click', () => { const retry = roomsRetry; clearRoomsError(); retry?.(); });
async function ensureRoomsAdminSession() {
    const { data, error } = await roomsClient.auth.getUser();
    if (error || !data.user) return false;
    if (data.user.id !== ROOMS_ADMIN_UID) { await roomsClient.auth.signOut(); return false; }
    return true;
}
window.roomsSignIn = async (email, password) => {
    const { error } = await roomsClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!(await ensureRoomsAdminSession())) { await roomsClient.auth.signOut(); throw new Error('Rooms login not allowed for this account.'); }
};
window.roomsRestoreSession = ensureRoomsAdminSession;
window.roomsSignOut = async () => {
    roomsSessionGeneration++; roomsViewGeneration++; roomsInspectGeneration++;
    roomsPanelLoaded = roomsVisible = false; roomsInspectSlug = ''; roomsLoading = 0;
    clearRoomsError(); await roomsClient.auth.signOut();
};
window.roomsPanelVisibilityChanged = visible => {
    if (roomsVisible === visible) return;
    roomsVisible = visible; roomsViewGeneration++; roomsInspectGeneration++;
    roomsPanelLoaded = false; roomsLoading = 0; clearRoomsError();
};
window.roomsLockdownStatus = loadLockdown;
window.initRoomsPanel = () => {
    if (roomsPanelLoaded) return;
    roomsPanelLoaded = true; roomsVisible = true;
    void loadRecent(); void loadBans(); void loadLockdown();
};
async function callAdmin(body) {
    const { data: { session }, error } = await withAdminDeadline(roomsClient.auth.getSession());
    if (error) throw error;
    if (!session) throw new Error('Your Rooms session expired. Log in again.');
    const response = await roomsFetchWithDeadline(ROOMS_FN_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || `Rooms request failed (${response.status}).`);
    return data;
}
async function readRooms(request, apply, retry, isCurrent = () => true) {
    const generation = roomsViewGeneration;
    roomsLoading++; updateRoomsStatus();
    try {
        const data = await callAdmin(request);
        if (!roomsCurrent(generation) || !isCurrent()) return null;
        apply(data); return data;
    } catch (error) {
        if (roomsCurrent(generation) && isCurrent()) roomsError(error, retry);
        return null;
    } finally {
        if (generation === roomsViewGeneration) { roomsLoading = Math.max(0, roomsLoading - 1); updateRoomsStatus(); }
    }
}
async function mutateRooms(button, body, success, { propagate = false } = {}) {
    const key = `${body.action}:${body.roomSlug || body.banId || body.identity || body.value || ''}`;
    if (roomsMutations.has(key)) return null;
    roomsMutations.add(key);
    if (button) button.disabled = true;
    const generation = roomsViewGeneration, session = roomsSessionGeneration;
    if (roomsCurrent(generation)) clearRoomsError();
    try {
        const data = await callAdmin(body);
        if (roomsCurrent(generation) && session === roomsSessionGeneration) await success?.(data);
        return data;
    } catch (error) {
        // A timeout can occur after the server committed. Retry reloads state,
        // never silently repeats a destructive operation.
        if (roomsCurrent(generation) && session === roomsSessionGeneration) roomsError(error, refreshRooms);
        if (propagate) throw error;
        return null;
    } finally { roomsMutations.delete(key); if (button?.isConnected) button.disabled = false; }
}
function refreshRooms() { void loadRecent(); void loadBans(); void loadLockdown(); }
window.roomsForceCloseAll = () => mutateRooms(roomsElement('btn-force-close-all'), { action: 'force-close-all' }, data => {
    appendLog('ok', `Closed ${data.closedCount || 0} rooms.`); void loadRecent();
}, { propagate: true });
function appendLog(kind, text) {
    roomsElement('log-wrap')?.classList.remove('hidden');
    const out = roomsElement('log-output'); if (!out) return;
    const line = document.createElement('span'); line.className = `log-${kind}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}\n`; out.append(line);
    // Bound history so a long moderation session does not grow the DOM forever.
    while (out.childElementCount > 100) out.firstElementChild.remove();
    out.scrollTop = out.scrollHeight;
}
function renderLockdownState(locked) {
    roomsElement('lockdown-toggle').checked = locked;
    roomsElement('lockdown-state').textContent = locked ? 'On' : 'Off';
    roomsElement('lockdown-banner').classList.toggle('hidden', !locked);
}
async function loadLockdown() {
    const session = roomsSessionGeneration, request = ++roomsLockdownGeneration;
    try {
        const { data, error } = await withAdminDeadline(roomsClient.from('app_settings').select('rooms_locked').eq('id', 'global').single());
        if (error) throw error;
        if (session === roomsSessionGeneration && request === roomsLockdownGeneration) renderLockdownState(data?.rooms_locked === true);
    } catch (error) { if (roomsVisible && session === roomsSessionGeneration && request === roomsLockdownGeneration) roomsError(error, loadLockdown); }
}
roomsElement('lockdown-toggle').addEventListener('change', async event => {
    event.stopPropagation();
    const checkbox = event.currentTarget, locked = checkbox.checked;
    if (!confirm(locked ? 'Turn on Rooms lockdown? Only you will be able to create or join rooms.' : 'Turn off Rooms lockdown? Everyone can create and join rooms again.')) { checkbox.checked = !locked; return; }
    roomsLockdownGeneration++;
    const result = await mutateRooms(checkbox, { action: 'set-lockdown', locked }, data => { renderLockdownState(data.rooms_locked); appendLog('ok', `Lockdown ${data.rooms_locked ? 'enabled' : 'disabled'}.`); });
    if (!result) checkbox.checked = !locked;
});
roomsElement('btn-force-close-all').addEventListener('click', () => {
    if (confirm('Force-close every active room? This disconnects everyone currently in a call.')) void window.roomsForceCloseAll().catch(() => {});
});
function renderTable(rooms, stale = false) {
    roomsElement('btn-list-recent').setAttribute('aria-pressed', String(!stale));
    roomsElement('btn-list-stale').setAttribute('aria-pressed', String(stale));
    const tbody = roomsElement('rooms-tbody'); tbody.replaceChildren();
    roomsElement('table-wrap').classList.remove('hidden'); roomsElement('inspect-wrap').classList.add('hidden');
    roomsInspectSlug = ''; roomsInspectGeneration++;
    if (!rooms.length) { tbody.innerHTML = '<tr><td colspan="6">No rooms found.</td></tr>'; return; }
    rooms.forEach(room => {
        const minutes = Math.max(0, Math.round((Date.now() - new Date(room.created_at)) / 60000));
        const stale = room.status === 'active' && minutes > 180;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><button type="button" class="slug-link" data-inspect-room="${esc(room.slug)}">${esc(room.slug)}</button></td><td data-label="Status"><span class="badge badge-${stale ? 'stale' : room.status === 'active' ? 'active' : 'ended'}">${stale ? 'stale' : esc(room.status)}</span></td><td data-label="Members">${esc(room.member_count)}</td><td data-label="Host">${esc(room.host_nickname || '—')}</td><td data-label="Age">${Number.isFinite(minutes) ? minutes + 'm' : '—'}</td><td>${room.status === 'active' ? `<button type="button" class="danger admin-icon-button" data-slug="${esc(room.slug)}" data-action="force-close-row" aria-label="Close room ${esc(room.slug)}" title="Close room"><svg aria-hidden="true"><use href="#admin-i-power"></use></svg></button>` : ''}</td>`;
        tr.querySelector('[data-inspect-room]').addEventListener('click', () => void inspectRoom(room.slug)); tbody.append(tr);
    });
}
async function loadRecent(stale = false) {
    const request = ++roomsListGeneration;
    return readRooms({ action: stale ? 'list-stale' : 'list-recent' }, data => { renderTable((stale ? data.stale : data.rooms) || [], stale); }, () => void loadRecent(stale), () => request === roomsListGeneration);
}
roomsElement('btn-list-recent').addEventListener('click', () => { clearRoomsError(); void loadRecent(); });
roomsElement('btn-list-stale').addEventListener('click', () => { clearRoomsError(); void loadRecent(true); });
roomsElement('btn-cleanup').addEventListener('click', event => {
    const button = event.currentTarget;
    if (!confirm('Close all stale rooms and remove their orphaned messages?')) return;
    void mutateRooms(button, { action: 'cleanup' }, data => {
        appendLog('ok', `Closed ${data.closedCount || 0} stale rooms. Removed ${data.msgsPurged || 0} orphaned messages.`);
        if (data.msgPurgeError) appendLog('warn', String(data.msgPurgeError));
        void loadRecent();
    });
});
async function inspectRoom(slug) {
    const request = ++roomsInspectGeneration; roomsListGeneration++;
    return readRooms({ action: 'inspect', roomSlug: slug }, data => {
        const room = data.room;
        if (!room) throw new Error('This room is no longer available.');
        roomsInspectSlug = slug;
        roomsElement('table-wrap').classList.add('hidden'); roomsElement('inspect-wrap').classList.remove('hidden');
        const close = roomsElement('btn-force-close'); close.dataset.slug = room.slug; close.classList.toggle('hidden', room.status !== 'active');
        roomsElement('inspect-detail').innerHTML = `<h2>${esc(room.slug)}</h2>${kv('Status', room.status)}${kv('Title', room.title || '—')}${kv('Host', room.host_nickname)}${kv('Members', room.member_count)}${kv('Locked', room.locked)}${kv('Audience', room.audience_mode)}${kv('Created', room.created_at)}${kv('Ended', room.ended_at || '—')}${kv('Messages', data.msgCount)}${kv('Active bans', data.banCount)}`;
        roomsElement('participants-out').textContent = room.status === 'active' ? 'Loading participants…' : 'This room has ended.';
        if (room.status === 'active') void loadParticipants(slug, request);
    }, () => void inspectRoom(slug), () => request === roomsInspectGeneration);
}
async function loadParticipants(slug, request = roomsInspectGeneration) {
    return readRooms({ action: 'list-participants', roomSlug: slug }, data => renderParticipants(slug, data.participants || []), () => void loadParticipants(slug, request), () => request === roomsInspectGeneration && roomsInspectSlug === slug);
}
function renderParticipants(slug, participants) {
    const out = roomsElement('participants-out');
    if (!participants.length) { out.textContent = 'No one connected.'; return; }
    out.innerHTML = participants.map(person => `<div class="participant-row"><span>${esc(person.name || 'Unknown')} <small>(${esc(person.identity)})</small></span><button type="button" class="danger admin-icon-button" data-identity="${esc(person.identity)}" aria-label="Remove ${esc(person.name || person.identity)} from ${esc(slug)}" title="Remove participant"><svg aria-hidden="true"><use href="#admin-i-user-remove"></use></svg></button></div>`).join('');
    out.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
        const identity = button.dataset.identity;
        if (!confirm(`Remove ${identity} from room “${slug}”?`)) return;
        const request = roomsInspectGeneration;
        void mutateRooms(button, { action: 'remove-participant', roomSlug: slug, identity }, () => {
            if (request !== roomsInspectGeneration || roomsInspectSlug !== slug) return;
            button.closest('.participant-row')?.remove(); appendLog('ok', `Removed ${identity} from ${slug}.`);
            if (!out.querySelector('.participant-row')) out.textContent = 'No one connected.';
        });
    }));
}
roomsElement('btn-force-close').addEventListener('click', event => {
    const button = event.currentTarget, slug = button.dataset.slug, request = roomsInspectGeneration;
    if (!confirm(`Close room “${slug}”? Everyone in this room will be disconnected.`)) return;
    void mutateRooms(button, { action: 'force-close', roomSlug: slug }, data => {
        appendLog('ok', data.note || `Closed ${slug}.`);
        if (request === roomsInspectGeneration && button.dataset.slug === slug) { button.classList.add('hidden'); void inspectRoom(slug); }
    });
});
roomsElement('btn-back').addEventListener('click', () => { roomsInspectGeneration++; roomsInspectSlug = ''; roomsElement('inspect-wrap').classList.add('hidden'); roomsElement('table-wrap').classList.remove('hidden'); });
roomsElement('rooms-tbody').addEventListener('click', event => {
    const button = event.target.closest('[data-action="force-close-row"]'); if (!button) return;
    const slug = button.dataset.slug;
    if (!confirm(`Close room “${slug}”? Everyone in this room will be disconnected.`)) return;
    void mutateRooms(button, { action: 'force-close', roomSlug: slug }, () => { appendLog('ok', `Closed ${slug}.`); void loadRecent(); });
});
function renderBans(bans) {
    const tbody = roomsElement('bans-tbody');
    tbody.innerHTML = bans.length ? bans.map(ban => `<tr><td>${esc(ban.type)}</td><td>${esc(ban.value)}</td><td>${esc(new Date(ban.created_at).toLocaleDateString())}</td><td><button type="button" class="danger admin-icon-button" data-ban-id="${esc(ban.id)}" aria-label="Remove ban on ${esc(ban.value)}" title="Remove ban"><svg aria-hidden="true"><use href="#admin-i-trash"></use></svg></button></td></tr>`).join('') : '<tr><td colspan="4">No global bans.</td></tr>';
    tbody.querySelectorAll('[data-ban-id]').forEach(button => button.addEventListener('click', () => {
        const ban = bans.find(item => String(item.id) === button.dataset.banId);
        if (!ban || !confirm(`Remove global ban on ${ban.value}?`)) return;
        void mutateRooms(button, { action: 'remove-ban', banId: ban.id }, () => { appendLog('ok', `Removed ban on ${ban.value}.`); void loadBans(); });
    }));
}
async function loadBans() {
    const request = ++roomsBansGeneration;
    return readRooms({ action: 'list-bans' }, data => renderBans(data.bans || []), loadBans, () => request === roomsBansGeneration);
}
roomsElement('ban-add-form').addEventListener('submit', event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('button'), type = roomsElement('ban-type').value, value = roomsElement('ban-value').value.trim();
    if (!value) { roomsElement('ban-value').focus(); return; }
    if (!confirm(`Ban ${type} “${value}” from all rooms?`)) return;
    void mutateRooms(button, { action: 'add-ban', type, value }, () => {
        appendLog('ok', `Banned ${type}: ${value}.`);
        if (roomsElement('ban-value').value.trim() === value) roomsElement('ban-value').value = '';
        void loadBans();
    });
});
function esc(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function kv(key, value) { return `<div class="detail-kv"><span class="detail-key">${esc(key)}</span><span>${esc(value)}</span></div>`; }
