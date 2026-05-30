const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
const ADMIN_PASSCODE = '7769';

const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

const state = {
    drawings: [],
    questions: []
};

const els = {
    gatePanel: document.getElementById('gate-panel'),
    loginPanel: document.getElementById('login-panel'),
    dashboardPanel: document.getElementById('dashboard-panel'),
    passcodeForm: document.getElementById('admin-passcode-form'),
    passcode: document.getElementById('admin-passcode'),
    gateStatus: document.getElementById('gate-status'),
    loginForm: document.getElementById('admin-login-form'),
    email: document.getElementById('admin-email'),
    password: document.getElementById('admin-password'),
    loginStatus: document.getElementById('login-status'),
    adminStatus: document.getElementById('admin-status'),
    stats: document.getElementById('admin-stats'),
    tabs: document.getElementById('admin-tabs'),
    refresh: document.getElementById('refresh-admin'),
    logout: document.getElementById('logout-admin'),
    pendingDrawings: document.getElementById('pending-drawings-list'),
    publishedDrawings: document.getElementById('published-drawings-list'),
    pendingQuestions: document.getElementById('pending-questions-list'),
    publishedQuestions: document.getElementById('published-questions-list')
};

function showPanel(panel) {
    [els.gatePanel, els.loginPanel, els.dashboardPanel].forEach(el => el.classList.add('hidden'));
    panel.classList.remove('hidden');
}

function setStatus(element, message) {
    if (element) element.textContent = message || '';
}

function hasGateAccess() {
    return sessionStorage.getItem('doll_admin_gate') === 'open';
}

function hasAnswer(question) {
    return Boolean(question.answer && question.answer.trim());
}

function formatDate(value) {
    if (!value) return 'unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderMeta(item) {
    return `
        <div class="admin-meta">
            <span>${escapeHtml(formatDate(item.created_at))}</span>
            <span>ip: ${escapeHtml(item.ip_address || 'unknown')}</span>
            <span>id: ${escapeHtml(item.id)}</span>
        </div>
    `;
}

function renderStats() {
    const pendingDrawings = state.drawings.filter(item => !item.approved).length;
    const publishedDrawings = state.drawings.filter(item => item.approved).length;
    const pendingQuestions = state.questions.filter(item => !hasAnswer(item)).length;
    const publishedQuestions = state.questions.filter(hasAnswer).length;

    els.stats.innerHTML = `
        <div class="admin-stat"><strong>${pendingDrawings}</strong><span>pending doods</span></div>
        <div class="admin-stat"><strong>${pendingQuestions}</strong><span>pending asks</span></div>
        <div class="admin-stat"><strong>${publishedDrawings}</strong><span>posted doods</span></div>
        <div class="admin-stat"><strong>${publishedQuestions}</strong><span>answered asks</span></div>
    `;
}

function emptyMessage(text) {
    return `<div class="admin-empty">${text}</div>`;
}

function renderDrawings(list, container, published) {
    if (!list.length) {
        container.innerHTML = emptyMessage(published ? 'no posted doods' : 'nothing waiting');
        return;
    }

    container.innerHTML = list.map(item => `
        <article class="admin-card" data-id="${escapeHtml(item.id)}">
            <label class="admin-select">
                <input type="checkbox" data-select-id="${escapeHtml(item.id)}">
                <span></span>
            </label>
            <img src="data:image/png;base64,${item.imageData}" alt="">
            ${renderMeta(item)}
            <div class="admin-actions">
                ${published
                    ? '<span class="admin-pill">approved</span>'
                    : '<button data-action="approve-drawing">approve</button>'}
                <button class="danger" data-action="delete-drawing">delete</button>
            </div>
        </article>
    `).join('');
}

function renderQuestions(list, container, published) {
    if (!list.length) {
        container.innerHTML = emptyMessage(published ? 'no answered asks' : 'no asks waiting');
        return;
    }

    container.innerHTML = list.map(item => `
        <article class="admin-card" data-id="${escapeHtml(item.id)}">
            <p class="admin-question">${escapeHtml(item.question)}</p>
            ${renderMeta(item)}
            <textarea data-answer-for="${escapeHtml(item.id)}" placeholder="reply">${escapeHtml(item.answer || '')}</textarea>
            <div class="admin-actions">
                <button data-action="save-question">${published ? 'save edit' : 'save reply'}</button>
                <span class="admin-pill">${published ? 'published if filled' : 'blank stays unpublished'}</span>
                <button class="danger" data-action="delete-question">delete</button>
            </div>
        </article>
    `).join('');
}

function renderAll() {
    renderStats();
    renderDrawings(state.drawings.filter(item => !item.approved), els.pendingDrawings, false);
    renderDrawings(state.drawings.filter(item => item.approved), els.publishedDrawings, true);
    renderQuestions(state.questions.filter(item => !hasAnswer(item)), els.pendingQuestions, false);
    renderQuestions(state.questions.filter(hasAnswer), els.publishedQuestions, true);
}

async function ensureAdminSession() {
    const { data, error } = await adminClient.auth.getUser();
    if (error || !data.user) return false;

    if (data.user.id !== ADMIN_UID) {
        await adminClient.auth.signOut();
        return false;
    }

    return true;
}

async function loadAdminData() {
    setStatus(els.adminStatus, 'loading...');

    const [drawingsResult, questionsResult] = await Promise.all([
        adminClient.from('drawings').select('*').order('created_at', { ascending: false }),
        adminClient.from('questions').select('*').order('created_at', { ascending: false })
    ]);

    if (drawingsResult.error) throw drawingsResult.error;
    if (questionsResult.error) throw questionsResult.error;

    state.drawings = drawingsResult.data || [];
    state.questions = questionsResult.data || [];
    renderAll();
    setStatus(els.adminStatus, '');
}

async function openDashboard() {
    showPanel(els.dashboardPanel);
    try {
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not load admin data.');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    setStatus(els.loginStatus, 'checking...');

    const { error } = await adminClient.auth.signInWithPassword({
        email: els.email.value.trim(),
        password: els.password.value
    });

    if (error) {
        setStatus(els.loginStatus, error.message || 'Login failed.');
        return;
    }

    if (!(await ensureAdminSession())) {
        setStatus(els.loginStatus, 'This login is not allowed here.');
        return;
    }

    els.password.value = '';
    await openDashboard();
}

async function runAction(button) {
    const card = button.closest('.admin-card');
    const id = card?.dataset.id;
    const action = button.dataset.action;
    if (!id || !action) return;

    button.disabled = true;
    setStatus(els.adminStatus, 'saving...');

    try {
        if (action === 'approve-drawing') {
            const { error } = await adminClient.from('drawings').update({ approved: true }).eq('id', id);
            if (error) throw error;
        }

        if (action === 'delete-drawing') {
            const { error } = await adminClient.from('drawings').delete().eq('id', id);
            if (error) throw error;
        }

        if (action === 'save-question') {
            const answer = card.querySelector('textarea')?.value.trim() || null;
            const { error } = await adminClient.from('questions').update({ answer }).eq('id', id);
            if (error) throw error;
        }

        if (action === 'delete-question') {
            const { error } = await adminClient.from('questions').delete().eq('id', id);
            if (error) throw error;
        }

        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not save.');
    } finally {
        button.disabled = false;
    }
}

function getSelectedIds(listId) {
    const list = document.getElementById(listId);
    if (!list) return [];
    return Array.from(list.querySelectorAll('input[data-select-id]:checked'))
        .map(input => input.dataset.selectId)
        .filter(Boolean);
}

function setListSelected(listId, selected) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.querySelectorAll('input[data-select-id]').forEach(input => {
        input.checked = selected;
    });
}

async function runBulkAction(button) {
    const action = button.dataset.bulkAction;
    const listId = button.dataset.list;
    if (!action || !listId) return;

    if (action === 'select') {
        const selectedCount = getSelectedIds(listId).length;
        const totalCount = document.getElementById(listId)?.querySelectorAll('input[data-select-id]').length || 0;
        setListSelected(listId, selectedCount !== totalCount);
        return;
    }

    const ids = getSelectedIds(listId);
    if (!ids.length) {
        setStatus(els.adminStatus, 'select doods first');
        return;
    }

    button.disabled = true;
    setStatus(els.adminStatus, `${action} ${ids.length}...`);

    try {
        if (action === 'approve') {
            const { error } = await adminClient.from('drawings').update({ approved: true }).in('id', ids);
            if (error) throw error;
        }

        if (action === 'delete') {
            const { error } = await adminClient.from('drawings').delete().in('id', ids);
            if (error) throw error;
        }

        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Bulk action failed.');
    } finally {
        button.disabled = false;
    }
}

function initTabs() {
    els.tabs.addEventListener('click', e => {
        const button = e.target.closest('button[data-panel]');
        if (!button) return;

        document.querySelectorAll('.admin-tabs button').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.admin-panel').forEach(panel => panel.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.panel)?.classList.add('active');
    });
}

async function init() {
    els.passcodeForm.addEventListener('submit', e => {
        e.preventDefault();
        if (els.passcode.value.trim() !== ADMIN_PASSCODE) {
            setStatus(els.gateStatus, 'nope');
            els.passcode.select();
            return;
        }

        sessionStorage.setItem('doll_admin_gate', 'open');
        showPanel(els.loginPanel);
        els.email.focus();
    });

    els.loginForm.addEventListener('submit', handleLogin);
    els.refresh.addEventListener('click', loadAdminData);
    els.logout.addEventListener('click', async () => {
        await adminClient.auth.signOut();
        sessionStorage.removeItem('doll_admin_gate');
        showPanel(els.gatePanel);
    });

    document.querySelectorAll('.admin-list').forEach(list => {
        list.addEventListener('click', e => {
            const button = e.target.closest('button[data-action]');
            if (button) runAction(button);
        });
    });

    document.querySelectorAll('.admin-bulk-bar').forEach(bar => {
        bar.addEventListener('click', e => {
            const button = e.target.closest('button[data-bulk-action]');
            if (button) runBulkAction(button);
        });
    });

    initTabs();

    if (!hasGateAccess()) {
        showPanel(els.gatePanel);
        return;
    }

    if (await ensureAdminSession()) {
        await openDashboard();
    } else {
        showPanel(els.loginPanel);
    }
}

init();
