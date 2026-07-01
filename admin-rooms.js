// doll.gg /admin — rooms panel (separate Supabase project: karogcjefsnnrvlxlgpf)
// Auth is orchestrated by admin.js (shared passcode gate + login form); this file
// only owns the rooms-specific Supabase client and the rooms-panel UI/actions.
// Exposes window.roomsSignIn / roomsRestoreSession / roomsSignOut / roomsLockdownStatus /
// initRoomsPanel as hooks admin.js calls during its own auth lifecycle.

const ROOMS_URL       = 'https://karogcjefsnnrvlxlgpf.supabase.co';
const ROOMS_ANON      = 'sb_publishable_z2jS9qvQUvkSXVspdi2U5w_dFGM_rG-';
const ROOMS_ADMIN_UID = '9ea1a89e-5a00-4b91-b98c-d69a5e383df4';
const ROOMS_FN_URL    = `${ROOMS_URL}/functions/v1/admin-rooms`;

const roomsClient = window.supabase.createClient(ROOMS_URL, ROOMS_ANON, {
  auth: { persistSession: true, autoRefreshToken: true },
});

async function ensureRoomsAdminSession() {
  const { data, error } = await roomsClient.auth.getUser();
  if (error || !data.user) return false;
  if (data.user.id !== ROOMS_ADMIN_UID) {
    await roomsClient.auth.signOut();
    return false;
  }
  return true;
}

// ── Hooks called by admin.js ────────────────────────────────────────

window.roomsSignIn = async function roomsSignIn(email, password) {
  const { error } = await roomsClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!(await ensureRoomsAdminSession())) {
    await roomsClient.auth.signOut();
    throw new Error('rooms login not allowed for this account');
  }
};

window.roomsRestoreSession = async function roomsRestoreSession() {
  return ensureRoomsAdminSession();
};

window.roomsSignOut = async function roomsSignOut() {
  await roomsClient.auth.signOut();
  roomsPanelLoaded = false;
};

window.roomsLockdownStatus = async function roomsLockdownStatus() {
  await loadLockdown();
};

let roomsPanelLoaded = false;
window.initRoomsPanel = function initRoomsPanel() {
  if (roomsPanelLoaded) return;
  roomsPanelLoaded = true;
  loadRecent();
  loadBans();
};

// ── Edge Function calls ──────────────────────────────────────────
// Auth: pass the Supabase session JWT — verified server-side by the Edge Function.
async function callAdmin(body) {
  const statusEl = document.getElementById('rooms-status');
  if (statusEl) statusEl.textContent = 'loading…';
  try {
    const { data: { session } } = await roomsClient.auth.getSession();
    if (!session) throw new Error('not logged in');
    const res = await fetch(ROOMS_FN_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (statusEl) statusEl.textContent = '';
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (statusEl) statusEl.textContent = '';
    appendLog('err', String(err));
    throw err;
  }
}

// ── Log ──────────────────────────────────────────────────────────
function appendLog(kind, text) {
  document.getElementById('log-wrap')?.classList.remove('hidden');
  const out = document.getElementById('log-output');
  if (!out) return;
  const line = document.createElement('span');
  line.className = `log-${kind}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${text}\n`;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

// ── Lockdown ─────────────────────────────────────────────────────
function renderLockdownState(locked) {
  document.getElementById('lockdown-toggle').checked = locked;
  document.getElementById('lockdown-state').textContent = locked ? 'on' : 'off';
  document.getElementById('lockdown-banner')?.classList.toggle('hidden', !locked);
}

async function loadLockdown() {
  const { data, error } = await roomsClient.from('app_settings')
    .select('rooms_locked').eq('id', 'global').single();
  if (error) { appendLog('err', `loadLockdown: ${error.message}`); return; }
  renderLockdownState(data?.rooms_locked === true);
}

document.getElementById('lockdown-toggle').addEventListener('change', async (e) => {
  const locked = e.currentTarget.checked;
  const msg = locked
    ? 'Turn ON rooms lockdown? No one but you will be able to create or join rooms until you turn it back off.'
    : 'Turn OFF rooms lockdown? Rooms will work normally again for everyone.';
  if (!confirm(msg)) { e.currentTarget.checked = !locked; return; }
  try {
    const data = await callAdmin({ action: 'set-lockdown', locked });
    renderLockdownState(data.rooms_locked);
    appendLog('ok', `lockdown ${data.rooms_locked ? 'enabled' : 'disabled'}`);
  } catch {
    e.currentTarget.checked = !locked; // revert on failure
  }
});

document.getElementById('btn-force-close-all').addEventListener('click', async () => {
  if (!confirm('Force-close EVERY active room right now? This disconnects all current calls.')) return;
  const data = await callAdmin({ action: 'force-close-all' }).catch(() => null);
  if (data) {
    appendLog('ok', `closed ${data.closedCount} rooms: ${data.closed.join(', ') || 'none'}`);
    loadRecent();
  }
});

// ── Room table ───────────────────────────────────────────────────
function renderTable(rooms) {
  const tbody = document.getElementById('rooms-tbody');
  tbody.innerHTML = '';
  document.getElementById('table-wrap').classList.remove('hidden');
  document.getElementById('inspect-wrap').classList.add('hidden');

  if (!rooms.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="opacity:.5;padding:16px 0">no rooms found</td></tr>';
    return;
  }
  for (const r of rooms) {
    const ageMin  = Math.round((Date.now() - new Date(r.created_at)) / 60000);
    const isStale = r.status === 'active' && ageMin > 180;
    const badge = r.status === 'active'
      ? `<span class="badge ${isStale ? 'badge-stale' : 'badge-active'}">${isStale ? 'stale' : 'active'}</span>`
      : `<span class="badge badge-ended">ended</span>`;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="slug-link">${esc(r.slug)}</span></td>
      <td>${badge}</td>
      <td>${r.member_count}</td>
      <td>${esc(r.host_nickname || '—')}</td>
      <td title="${esc(r.created_at)}">${ageMin}m ago</td>
      <td>${r.status === 'active'
        ? `<button class="danger" style="padding:3px 10px;font-size:11px" data-slug="${esc(r.slug)}" data-action="force-close-row">force-close</button>`
        : ''}</td>
    `;
    tr.querySelector('.slug-link').addEventListener('click', () => inspectRoom(r.slug));
    tbody.appendChild(tr);
  }
}

async function loadRecent() {
  const data = await callAdmin({ action: 'list-recent' }).catch(() => null);
  if (data) { renderTable(data.rooms || []); appendLog('ok', `${data.rooms?.length ?? 0} rooms loaded`); }
}

document.getElementById('btn-list-recent').addEventListener('click', loadRecent);

document.getElementById('btn-list-stale').addEventListener('click', async () => {
  const data = await callAdmin({ action: 'list-stale' }).catch(() => null);
  if (data) { renderTable(data.stale || []); appendLog('ok', `${data.stale?.length ?? 0} stale (>${data.staleHours}h)`); }
});

document.getElementById('btn-cleanup').addEventListener('click', async () => {
  if (!confirm('Force-close all stale rooms and purge orphaned messages?')) return;
  const data = await callAdmin({ action: 'cleanup' }).catch(() => null);
  if (!data) return;
  appendLog('ok', `closed ${data.closedCount} rooms: ${data.closed.join(', ') || 'none'}`);
  appendLog('ok', `purged ${data.msgsPurged} orphaned messages`);
  if (data.msgPurgeError) appendLog('warn', `msg purge: ${data.msgPurgeError}`);
});

// ── Inspect ──────────────────────────────────────────────────────
async function inspectRoom(slug) {
  const data = await callAdmin({ action: 'inspect', roomSlug: slug }).catch(() => null);
  if (!data) return;
  const r = data.room;
  document.getElementById('table-wrap').classList.add('hidden');
  document.getElementById('inspect-wrap').classList.remove('hidden');
  const closeBtn = document.getElementById('btn-force-close');
  closeBtn.dataset.slug = r.slug;
  closeBtn.classList.toggle('hidden', r.status === 'ended');
  document.getElementById('inspect-detail').innerHTML = `
    <h2>${esc(r.slug)}</h2>
    ${kv('status', r.status)}${kv('title', r.title || '—')}${kv('host', r.host_nickname)}
    ${kv('members', r.member_count)}${kv('locked', r.locked)}${kv('audience_mode', r.audience_mode)}
    ${kv('created', r.created_at)}${kv('ended', r.ended_at || '—')}
    ${kv('messages', data.msgCount)}${kv('active bans', data.banCount)}
  `;
  appendLog('ok', `inspected ${slug}`);

  const partsOut = document.getElementById('participants-out');
  if (r.status !== 'active') {
    partsOut.innerHTML = '<span style="opacity:.5">room has ended</span>';
  } else {
    partsOut.innerHTML = '<span style="opacity:.5">loading…</span>';
    const pdata = await callAdmin({ action: 'list-participants', roomSlug: slug }).catch(() => null);
    renderParticipants(slug, pdata?.participants || []);
  }
}

function renderParticipants(slug, participants) {
  const partsOut = document.getElementById('participants-out');
  if (!participants.length) {
    partsOut.innerHTML = '<span style="opacity:.5">no one connected</span>';
    return;
  }
  partsOut.innerHTML = participants.map(p => `
    <div class="participant-row">
      <span>${esc(p.name || '?')} <span style="opacity:.4">(${esc(p.identity)})</span></span>
      <button class="danger" style="padding:3px 10px;font-size:11px" data-identity="${esc(p.identity)}">kick</button>
    </div>
  `).join('');
  partsOut.querySelectorAll('button[data-identity]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const identity = btn.dataset.identity;
      if (!confirm(`Remove this participant from "${slug}"?`)) return;
      await callAdmin({ action: 'remove-participant', roomSlug: slug, identity }).catch(() => null);
      appendLog('ok', `removed ${identity} from ${slug}`);
      btn.closest('.participant-row')?.remove();
    });
  });
}

document.getElementById('btn-force-close').addEventListener('click', async (e) => {
  const slug = e.currentTarget.dataset.slug;
  if (!confirm(`Force-close "${slug}"? This ends the room for everyone inside.`)) return;
  const data = await callAdmin({ action: 'force-close', roomSlug: slug }).catch(() => null);
  if (data) {
    appendLog('ok', data.note ? `${slug}: ${data.note}` : `${slug} force-closed`);
    e.currentTarget.classList.add('hidden');
  }
});

document.getElementById('btn-back').addEventListener('click', () => {
  document.getElementById('inspect-wrap').classList.add('hidden');
  document.getElementById('table-wrap').classList.remove('hidden');
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action="force-close-row"]');
  if (!btn) return;
  const slug = btn.dataset.slug;
  if (!confirm(`Force-close "${slug}"?`)) return;
  const data = await callAdmin({ action: 'force-close', roomSlug: slug }).catch(() => null);
  if (data) {
    appendLog('ok', `${slug} closed`);
    btn.disabled = true;
    btn.textContent = 'closed';
    const row = btn.closest('tr');
    if (row) {
      const statusCell = row.querySelector('td:nth-child(2)');
      if (statusCell) statusCell.innerHTML = '<span class="badge badge-ended">ended</span>';
    }
  }
});

// ── Global bans ──────────────────────────────────────────────────
function renderBans(bans) {
  const tbody = document.getElementById('bans-tbody');
  tbody.innerHTML = '';
  if (!bans.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="opacity:.5;padding:12px 0">no global bans</td></tr>';
    return;
  }
  for (const b of bans) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${esc(b.type)}</td>
      <td>${esc(b.value)}</td>
      <td title="${esc(b.created_at)}">${new Date(b.created_at).toLocaleDateString()}</td>
      <td><button class="danger" style="padding:3px 10px;font-size:11px" data-ban-id="${esc(b.id)}">remove</button></td>
    `;
    tr.querySelector('button').addEventListener('click', async () => {
      if (!confirm(`Remove global ban on ${b.value}?`)) return;
      await callAdmin({ action: 'remove-ban', banId: b.id }).catch(() => null);
      appendLog('ok', `removed ban on ${b.value}`);
      loadBans();
    });
    tbody.appendChild(tr);
  }
}

async function loadBans() {
  const data = await callAdmin({ action: 'list-bans' }).catch(() => null);
  if (data) renderBans(data.bans || []);
}

document.getElementById('ban-add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const type  = document.getElementById('ban-type').value;
  const value = document.getElementById('ban-value').value.trim();
  if (!value) return;
  const data = await callAdmin({ action: 'add-ban', type, value }).catch(() => null);
  if (data) {
    appendLog('ok', `banned ${type}: ${value}`);
    document.getElementById('ban-value').value = '';
    loadBans();
  }
});

// ── Util ─────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function kv(k, v) {
  return `<div class="detail-kv"><span class="detail-key">${k}</span><span>${esc(v)}</span></div>`;
}
