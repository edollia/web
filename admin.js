const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
const ADMIN_PASSCODE = '7769';
const DEFAULT_LINK_SETTINGS = {
    snapchat_url: 'https://www.snapchat.com/add/dumidoll',
    snapchat_enabled: true,
    instagram_url: 'https://www.instagram.com/pawswirl',
    instagram_enabled: true,
    kofi_url: 'https://ko-fi.com/edoll',
    kofi_enabled: true,
    throne_url: 'https://throne.com/edoll',
    throne_enabled: true,
    latest_note_enabled: false,
    latest_note_title: 'latest note',
    latest_note_body: '',
    maintenance_enabled: false,
    maintenance_title: 'site update in progress',
    maintenance_message: 'Please check back soon.',
    maintenance_eta: '',
    drawings_enabled: true,
    questions_enabled: true,
    seo_title: 'Lia | doll.gg',
    seo_description: "Lia's little space for messages, posts, socials and more.",
    site_tagline: "Lia's little space for messages, posts, socials and more."
};

const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

let adminChatChannel = null;
let adminChatPollTimer = null;
let chatPollInFlight = false;
let autoSaveTimer = null;
let settingsDraftDirty = false;
let chatSettingsDraftDirty = false;
let staticSeoSnapshot = null;
let staticSeoCheckFailed = false;

const ADMIN_TIME_ZONE = 'America/Los_Angeles';
const adminDateFormatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZone: ADMIN_TIME_ZONE,
    timeZoneName: 'short'
});

const state = {
    drawings: [],
    questions: [],
    streamMessages: [],
    streamBans: [],
    linkSettings: { ...DEFAULT_LINK_SETTINGS },
    linkSettingsAvailable: true,
    chatSettings: {
        chat_enabled: true,
        slow_mode_seconds: 5,
        blocked_words: []
    }
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
    reviewTabCount: document.getElementById('review-tab-count'),
    publishedTabCount: document.getElementById('published-tab-count'),
    linksTabCount: document.getElementById('links-tab-count'),
    chatTabCount: document.getElementById('chat-tab-count'),
    refresh: document.getElementById('refresh-admin'),
    logout: document.getElementById('logout-admin'),
    pendingDrawings: document.getElementById('pending-drawings-list'),
    publishedDrawings: document.getElementById('published-drawings-list'),
    pendingQuestions: document.getElementById('pending-questions-list'),
    publishedQuestions: document.getElementById('published-questions-list'),
    streamChat: document.getElementById('stream-chat-list'),
    streamBans: document.getElementById('stream-ban-list'),
    chatPauseToggle: document.getElementById('chat-pause-toggle'),
    chatFilter: document.getElementById('chat-filter'),
    chatVisibilityFilter: document.getElementById('chat-visibility-filter'),
    chatSettingsForm: document.getElementById('chat-settings-form'),
    chatSlowMode: document.getElementById('chat-slow-mode'),
    chatBlockedWords: document.getElementById('chat-blocked-words'),
    chatBanForm: document.getElementById('chat-ban-form'),
    chatBanType: document.getElementById('chat-ban-type'),
    chatBanValue: document.getElementById('chat-ban-value'),
    chatBanNote: document.getElementById('chat-ban-note'),
    linkSettingsForm: document.getElementById('link-settings-form'),
    linkSettingsReset: document.getElementById('link-settings-reset'),
    snapchatEnabled: document.getElementById('snapchat-enabled'),
    snapchatUrl: document.getElementById('snapchat-url'),
    snapchatState: document.getElementById('snapchat-state'),
    instagramEnabled: document.getElementById('instagram-enabled'),
    instagramUrl: document.getElementById('instagram-url'),
    instagramState: document.getElementById('instagram-state'),
    kofiEnabled: document.getElementById('kofi-enabled'),
    kofiUrl: document.getElementById('kofi-url'),
    kofiState: document.getElementById('kofi-state'),
    throneEnabled: document.getElementById('throne-enabled'),
    throneUrl: document.getElementById('throne-url'),
    throneState: document.getElementById('throne-state'),
    latestNoteEnabled: document.getElementById('latest-note-enabled'),
    latestNoteTitle: document.getElementById('latest-note-title'),
    latestNoteBody: document.getElementById('latest-note-body-input'),
    latestNoteState: document.getElementById('latest-note-state'),
    maintenanceEnabled: document.getElementById('maintenance-enabled'),
    maintenanceTitle: document.getElementById('maintenance-title'),
    maintenanceMessage: document.getElementById('maintenance-message'),
    maintenanceEta: document.getElementById('maintenance-eta'),
    maintenanceState: document.getElementById('maintenance-state'),
    drawingsEnabled: document.getElementById('drawings-enabled'),
    questionsEnabled: document.getElementById('questions-enabled'),
    submissionsState: document.getElementById('submissions-state'),
    seoTitle: document.getElementById('seo-title'),
    seoDescription: document.getElementById('seo-description'),
    siteTagline: document.getElementById('site-tagline'),
    seoState: document.getElementById('seo-state'),
    seoPreviewTitle: document.getElementById('seo-preview-title'),
    seoPreviewDescription: document.getElementById('seo-preview-description'),
    seoTitleCount: document.getElementById('seo-title-count'),
    seoDescriptionCount: document.getElementById('seo-description-count'),
    siteTaglineCount: document.getElementById('site-tagline-count'),
    staticSeoState: document.getElementById('static-seo-state'),
    staticSeoCheck: document.getElementById('static-seo-check'),
    staticSeoRows: document.getElementById('static-seo-checks'),
    healthState: document.getElementById('health-state'),
    healthCheck: document.getElementById('admin-health-check'),
    runHealthCheck: document.getElementById('run-health-check')
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

function parseAdminDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = parseAdminDate(value);
    return date ? adminDateFormatter.format(date) : String(value || 'unknown date');
}

function formatRelativeDate(value) {
    const date = parseAdminDate(value);
    if (!date) return 'unknown';
    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absSeconds = Math.abs(seconds);
    if (absSeconds < 45) return 'just now';

    const units = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hr', 3600],
        ['min', 60]
    ];
    const match = units.find(([, size]) => absSeconds >= size) || ['sec', 1];
    const amount = Math.round(absSeconds / match[1]);
    const suffix = amount === 1 ? match[0] : `${match[0]}s`;
    return seconds < 0 ? `${amount} ${suffix} ago` : `in ${amount} ${suffix}`;
}

function renderTimestamp(value, compact = false) {
    const date = parseAdminDate(value);
    if (!date) {
        return `<span class="admin-time admin-time-unknown">${escapeHtml(String(value || 'unknown date'))}</span>`;
    }
    const absolute = formatDate(value);
    return `
        <time class="admin-time ${compact ? 'compact' : ''}" datetime="${escapeHtml(date.toISOString())}" title="${escapeHtml(date.toISOString())}">
            <strong>${escapeHtml(formatRelativeDate(value))}</strong>
            <span>${escapeHtml(absolute)}</span>
        </time>
    `;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getDrawingSrc(imageData) {
    const cleanData = String(imageData || '').replace(/\s/g, '');
    if (!cleanData || !/^[A-Za-z0-9+/=]+$/.test(cleanData)) return '';
    return `data:image/png;base64,${cleanData}`;
}

function renderMeta(item) {
    return `
        <div class="admin-meta">
            ${renderTimestamp(item.created_at)}
            <span>ip: ${escapeHtml(item.ip_address || 'unknown')}</span>
            <span>id: ${escapeHtml(item.id)}</span>
        </div>
    `;
}

function renderShortMeta(item) {
    return `
        <div class="admin-meta compact">
            ${renderTimestamp(item.created_at, true)}
            <span>ip: ${escapeHtml(item.ip_address || 'unknown')}</span>
        </div>
    `;
}

function renderStats() {
    const pendingDrawings = state.drawings.filter(item => !item.approved).length;
    const publishedDrawings = state.drawings.filter(item => item.approved).length;
    const pendingQuestions = state.questions.filter(item => !hasAnswer(item)).length;
    const publishedQuestions = state.questions.filter(hasAnswer).length;
    const visibleChat = state.streamMessages.filter(item => !item.is_hidden).length;
    const hiddenChat = state.streamMessages.filter(item => item.is_hidden).length;
    const activeLinks = ['snapchat', 'instagram', 'kofi', 'throne']
        .filter(key => state.linkSettings[`${key}_enabled`] !== false).length;
    if (els.reviewTabCount) els.reviewTabCount.textContent = String(pendingDrawings + pendingQuestions);
    if (els.publishedTabCount) els.publishedTabCount.textContent = String(publishedDrawings + publishedQuestions);
    if (els.linksTabCount) els.linksTabCount.textContent = `${activeLinks}/4`;
    if (els.chatTabCount) els.chatTabCount.textContent = String(visibleChat + hiddenChat);

    els.stats.innerHTML = `
        <div class="admin-stat"><strong>${pendingDrawings + pendingQuestions}</strong><span>waiting review</span></div>
        <div class="admin-stat"><strong>${publishedDrawings + publishedQuestions}</strong><span>published posts</span></div>
        <div class="admin-stat"><strong>${visibleChat + hiddenChat}</strong><span>chat messages</span></div>
        <div class="admin-stat"><strong>${state.chatSettings.chat_enabled === false ? 'off' : 'on'}</strong><span>chat status</span></div>
        <div class="admin-stat"><strong>${activeLinks}/4</strong><span>public links</span></div>
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
            <img src="${getDrawingSrc(item.imageData)}" alt="">
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
        <article class="admin-card admin-question-card" data-id="${escapeHtml(item.id)}">
            <p class="admin-question">${escapeHtml(item.question)}</p>
            ${renderShortMeta(item)}
            <textarea data-answer-for="${escapeHtml(item.id)}" placeholder="reply">${escapeHtml(item.answer || '')}</textarea>
            <div class="admin-actions">
                <button data-action="save-question">${published ? 'save edit' : 'save reply'}</button>
                <button class="danger" data-action="delete-question">delete</button>
            </div>
        </article>
    `).join('');
}

function renderChatMessages() {
    if (!els.streamChat) return;
    const query = String(els.chatFilter?.value || '').trim().toLowerCase();
    const visibility = els.chatVisibilityFilter?.value || 'all';
    const messages = state.streamMessages.filter(item => {
        const matchesVisibility = visibility === 'all'
            || (visibility === 'hidden' ? item.is_hidden : !item.is_hidden);
        if (!matchesVisibility) return false;
        if (!query) return true;
        return [
            item.nickname,
            item.message,
            item.ip_address,
            item.id
        ].some(value => String(value || '').toLowerCase().includes(query));
    });
    if (!messages.length) {
        els.streamChat.innerHTML = emptyMessage(state.streamMessages.length ? 'no matching chat' : 'no stream chat yet');
        return;
    }

    els.streamChat.innerHTML = messages.map(item => `
        <article class="admin-card admin-chat-card ${item.is_hidden ? 'is-hidden-chat' : ''}" data-id="${escapeHtml(item.id)}">
            <div class="admin-chat-message">
                <strong>${escapeHtml(item.nickname || 'guest')}</strong>
                <p>${escapeHtml(item.message || '')}</p>
            </div>
            ${renderMeta(item)}
            <div class="admin-actions">
                <span class="admin-pill">${item.is_hidden ? 'hidden' : 'visible'}</span>
                <button class="soft" data-action="${item.is_hidden ? 'show-chat' : 'hide-chat'}">${item.is_hidden ? 'show' : 'hide'}</button>
                <button class="soft" data-action="ban-chat-user">ban user</button>
                <button class="danger" data-action="delete-chat">delete</button>
            </div>
        </article>
    `).join('');
}

function renderChatSettings({ preserveDraft = false } = {}) {
    if (els.chatPauseToggle) {
        const paused = state.chatSettings.chat_enabled === false;
        els.chatPauseToggle.textContent = paused ? 'resume chat' : 'pause chat';
        els.chatPauseToggle.classList.toggle('danger', !paused);
        els.chatPauseToggle.classList.toggle('soft', paused);
        els.chatPauseToggle.classList.toggle('emergency', !paused);
    }
    if (preserveDraft && chatSettingsDraftDirty) return;
    if (els.chatSlowMode) {
        els.chatSlowMode.value = String(state.chatSettings.slow_mode_seconds ?? 5);
    }
    if (els.chatBlockedWords) {
        els.chatBlockedWords.value = (state.chatSettings.blocked_words || []).join('\n');
    }
    chatSettingsDraftDirty = false;
}

function renderBans() {
    if (!els.streamBans) return;
    if (!state.streamBans.length) {
        els.streamBans.innerHTML = emptyMessage('no bans');
        return;
    }

    els.streamBans.innerHTML = state.streamBans.map(item => `
        <article class="admin-ban-row" data-id="${escapeHtml(item.id)}">
            <div>
                <strong>${escapeHtml(item.ban_type)}: ${escapeHtml(item.ban_value)}</strong>
                <span>${escapeHtml(item.note || 'no note')}</span>
                ${renderTimestamp(item.created_at, true)}
            </div>
            <button class="soft" data-ban-action="unban">remove</button>
        </article>
    `).join('');
}

function normalizeLinkSettings(value) {
    const settings = value && typeof value === 'object' ? value : {};
    return {
        snapchat_url: String(settings.snapchat_url || DEFAULT_LINK_SETTINGS.snapchat_url),
        snapchat_enabled: settings.snapchat_enabled !== false,
        instagram_url: String(settings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url),
        instagram_enabled: settings.instagram_enabled !== false,
        kofi_url: String(settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url),
        kofi_enabled: settings.kofi_enabled !== false,
        throne_url: String(settings.throne_url || DEFAULT_LINK_SETTINGS.throne_url),
        throne_enabled: settings.throne_enabled !== false,
        latest_note_enabled: settings.latest_note_enabled === true,
        latest_note_title: String(settings.latest_note_title || DEFAULT_LINK_SETTINGS.latest_note_title),
        latest_note_body: String(settings.latest_note_body || ''),
        maintenance_enabled: settings.maintenance_enabled === true,
        maintenance_title: String(settings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title),
        maintenance_message: String(settings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message),
        maintenance_eta: String(settings.maintenance_eta || ''),
        drawings_enabled: settings.drawings_enabled !== false,
        questions_enabled: settings.questions_enabled !== false,
        seo_title: String(settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title),
        seo_description: String(settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description),
        site_tagline: String(settings.site_tagline || DEFAULT_LINK_SETTINGS.site_tagline)
    };
}

function renderLinkSettings({ preserveDraft = false } = {}) {
    const settings = state.linkSettings;
    if (els.linkSettingsForm) {
        els.linkSettingsForm.classList.toggle('settings-unavailable', !state.linkSettingsAvailable);
    }
    if (preserveDraft && settingsDraftDirty) {
        renderLinkPreview();
        return;
    }
    if (els.snapchatEnabled) els.snapchatEnabled.checked = settings.snapchat_enabled !== false;
    if (els.snapchatUrl) els.snapchatUrl.value = settings.snapchat_url || '';
    if (els.snapchatState) els.snapchatState.textContent = settings.snapchat_enabled !== false ? 'visible' : 'hidden';
    if (els.instagramEnabled) els.instagramEnabled.checked = settings.instagram_enabled !== false;
    if (els.instagramUrl) els.instagramUrl.value = settings.instagram_url || '';
    if (els.instagramState) els.instagramState.textContent = settings.instagram_enabled !== false ? 'visible' : 'hidden';
    if (els.kofiEnabled) els.kofiEnabled.checked = settings.kofi_enabled !== false;
    if (els.kofiUrl) els.kofiUrl.value = settings.kofi_url || '';
    if (els.kofiState) els.kofiState.textContent = settings.kofi_enabled !== false ? 'visible' : 'hidden';
    if (els.throneEnabled) els.throneEnabled.checked = settings.throne_enabled !== false;
    if (els.throneUrl) els.throneUrl.value = settings.throne_url || '';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.latestNoteEnabled) els.latestNoteEnabled.checked = settings.latest_note_enabled === true;
    if (els.latestNoteTitle) els.latestNoteTitle.value = settings.latest_note_title || '';
    if (els.latestNoteBody) els.latestNoteBody.value = settings.latest_note_body || '';
    if (els.latestNoteState) els.latestNoteState.textContent = settings.latest_note_enabled === true ? 'visible' : 'hidden';
    if (els.maintenanceEnabled) els.maintenanceEnabled.checked = settings.maintenance_enabled === true;
    if (els.maintenanceTitle) els.maintenanceTitle.value = settings.maintenance_title || '';
    if (els.maintenanceMessage) els.maintenanceMessage.value = settings.maintenance_message || '';
    if (els.maintenanceEta) els.maintenanceEta.value = settings.maintenance_eta || '';
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.drawingsEnabled) els.drawingsEnabled.checked = settings.drawings_enabled !== false;
    if (els.questionsEnabled) els.questionsEnabled.checked = settings.questions_enabled !== false;
    if (els.submissionsState) els.submissionsState.textContent = getSubmissionsStateLabel(settings);
    if (els.seoTitle) els.seoTitle.value = settings.seo_title || '';
    if (els.seoDescription) els.seoDescription.value = settings.seo_description || '';
    if (els.siteTagline) els.siteTagline.value = settings.site_tagline || '';
    if (els.seoState) els.seoState.textContent = 'ready';
    settingsDraftDirty = false;
    renderLinkPreview();
}

function getDraftLinkSettings() {
    return {
        snapchat_url: els.snapchatUrl?.value.trim() || state.linkSettings.snapchat_url || DEFAULT_LINK_SETTINGS.snapchat_url,
        snapchat_enabled: els.snapchatEnabled?.checked !== false,
        instagram_url: els.instagramUrl?.value.trim() || state.linkSettings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url,
        instagram_enabled: els.instagramEnabled?.checked !== false,
        kofi_url: els.kofiUrl?.value.trim() || state.linkSettings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url,
        kofi_enabled: els.kofiEnabled?.checked !== false,
        throne_url: els.throneUrl?.value.trim() || state.linkSettings.throne_url || DEFAULT_LINK_SETTINGS.throne_url,
        throne_enabled: els.throneEnabled?.checked !== false,
        latest_note_enabled: els.latestNoteEnabled?.checked === true,
        latest_note_title: els.latestNoteTitle?.value.trim() || DEFAULT_LINK_SETTINGS.latest_note_title,
        latest_note_body: els.latestNoteBody?.value.trim() || '',
        maintenance_enabled: els.maintenanceEnabled?.checked === true,
        maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
        maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
        maintenance_eta: els.maintenanceEta?.value.trim() || '',
        drawings_enabled: els.drawingsEnabled?.checked !== false,
        questions_enabled: els.questionsEnabled?.checked !== false,
        seo_title: els.seoTitle?.value.trim() || DEFAULT_LINK_SETTINGS.seo_title,
        seo_description: els.seoDescription?.value.trim() || DEFAULT_LINK_SETTINGS.seo_description,
        site_tagline: els.siteTagline?.value.trim() || DEFAULT_LINK_SETTINGS.site_tagline
    };
}

function getSubmissionsStateLabel(settings) {
    const doods = settings.drawings_enabled !== false;
    const asks = settings.questions_enabled !== false;
    if (doods && asks) return 'open';
    if (!doods && !asks) return 'paused';
    return doods ? 'asks paused' : 'doods paused';
}

function syncLinkDraftLabels(settings = getDraftLinkSettings()) {
    if (els.snapchatState) els.snapchatState.textContent = settings.snapchat_enabled !== false ? 'visible' : 'hidden';
    if (els.instagramState) els.instagramState.textContent = settings.instagram_enabled !== false ? 'visible' : 'hidden';
    if (els.kofiState) els.kofiState.textContent = settings.kofi_enabled !== false ? 'visible' : 'hidden';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.latestNoteState) els.latestNoteState.textContent = settings.latest_note_enabled === true ? 'visible' : 'hidden';
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.submissionsState) els.submissionsState.textContent = getSubmissionsStateLabel(settings);
    if (els.seoPreviewTitle) els.seoPreviewTitle.textContent = settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
    if (els.seoPreviewDescription) els.seoPreviewDescription.textContent = settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
    if (els.seoTitleCount) els.seoTitleCount.textContent = `${settings.seo_title.length}/70`;
    if (els.seoDescriptionCount) els.seoDescriptionCount.textContent = `${settings.seo_description.length}/180`;
    if (els.siteTaglineCount) els.siteTaglineCount.textContent = `${settings.site_tagline.length}/120`;
    if (els.seoState) els.seoState.textContent = settingsDraftDirty ? 'editing' : 'ready';
    ['snapchat', 'instagram', 'kofi', 'throne', 'latest-note', 'maintenance', 'submissions'].forEach(key => {
        const settingKey = key.replace('-', '_');
        const disabled = key === 'submissions'
            ? settings.drawings_enabled === false && settings.questions_enabled === false
            : settings[`${settingKey}_enabled`] === false;
        document.querySelector(`[data-link-card="${key}"]`)?.classList.toggle('is-disabled', disabled);
    });
    renderStaticSeoStatus(settings);
}

function renderLinkPreview() {
    const settings = getDraftLinkSettings();
    syncLinkDraftLabels(settings);
}

function openPublicLinkPreview(key) {
    const settings = getDraftLinkSettings();
    const url = settings[`${key}_url`];
    if (!url) {
        setStatus(els.adminStatus, 'no destination set');
        return;
    }

    try {
        window.open(new URL(url).href, '_blank', 'noopener,noreferrer');
    } catch (error) {
        setStatus(els.adminStatus, `${key} link is not a valid URL`);
    }
}

function renderStaticSeoStatus(settings = getDraftLinkSettings()) {
    if (!els.staticSeoRows) return;
    if (!staticSeoSnapshot) {
        if (els.staticSeoState) els.staticSeoState.textContent = staticSeoCheckFailed ? 'check failed' : 'not checked';
        els.staticSeoRows.innerHTML = `
            <div class="admin-health-row ${staticSeoCheckFailed ? 'is-bad' : 'is-pending'}">
                <span>static title</span>
                <strong>${staticSeoCheckFailed ? 'fix' : 'check'}</strong>
            </div>
            <div class="admin-health-row ${staticSeoCheckFailed ? 'is-bad' : 'is-pending'}">
                <span>static description</span>
                <strong>${staticSeoCheckFailed ? 'fix' : 'check'}</strong>
            </div>
        `;
        return;
    }

    const rows = [
        ['static title', staticSeoSnapshot.title, settings.seo_title],
        ['static description', staticSeoSnapshot.description, settings.seo_description],
        ['schema title', staticSeoSnapshot.structuredTitle, settings.seo_title],
        ['schema description', staticSeoSnapshot.structuredDescription, settings.seo_description]
    ];
    const allMatch = rows.every(([, actual, expected]) => actual === expected);
    if (els.staticSeoState) els.staticSeoState.textContent = allMatch ? 'static matches' : 'dynamic only';
    els.staticSeoRows.innerHTML = rows.map(([label, actual, expected]) => {
        const ok = actual === expected;
        return `
            <div class="admin-health-row admin-static-row ${ok ? 'is-ok' : 'is-bad'}">
                <span>${escapeHtml(label)}</span>
                <strong>${ok ? 'ok' : 'fix'}</strong>
                <small>${escapeHtml(actual || 'missing')}</small>
            </div>
        `;
    }).join('');
}

async function checkStaticSeoStatus() {
    if (els.staticSeoState) els.staticSeoState.textContent = 'checking';
    try {
        staticSeoCheckFailed = false;
        const response = await fetch('../index.html', { cache: 'no-store' });
        const text = await response.text();
        if (!response.ok) throw new Error('index.html could not load');
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const structuredText = doc.getElementById('site-structured-data')?.textContent || '';
        let structuredTitle = '';
        let structuredDescription = '';
        try {
            const data = JSON.parse(structuredText);
            const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
            const pageNode = graph.find(node => node['@type'] === 'WebPage' || node['@type'] === 'ProfilePage') || {};
            structuredTitle = String(pageNode.name || '');
            structuredDescription = String(pageNode.description || '');
        } catch (error) {
            structuredTitle = '';
            structuredDescription = '';
        }
        staticSeoSnapshot = {
            title: doc.querySelector('title')?.textContent.trim() || '',
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            structuredTitle,
            structuredDescription
        };
    } catch (error) {
        staticSeoSnapshot = null;
        staticSeoCheckFailed = true;
        if (els.staticSeoState) els.staticSeoState.textContent = 'check failed';
    }
    renderStaticSeoStatus();
}

function renderAll({ preserveDrafts = false } = {}) {
    renderStats();
    renderDrawings(state.drawings.filter(item => !item.approved), els.pendingDrawings, false);
    renderDrawings(state.drawings.filter(item => item.approved), els.publishedDrawings, true);
    renderQuestions(state.questions.filter(item => !hasAnswer(item)), els.pendingQuestions, false);
    renderQuestions(state.questions.filter(hasAnswer), els.publishedQuestions, true);
    renderChatMessages();
    renderChatSettings({ preserveDraft: preserveDrafts });
    renderBans();
    renderLinkSettings({ preserveDraft: preserveDrafts });
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

async function loadAdminData({ preserveDrafts = true } = {}) {
    setStatus(els.adminStatus, 'loading...');

    const [drawingsResult, questionsResult, chatResult, bansResult, settingsResult, linkSettingsResult] = await Promise.all([
        adminClient.from('drawings').select('*').order('created_at', { ascending: false }),
        adminClient.from('questions').select('*').order('created_at', { ascending: false }),
        adminClient.from('stream_messages').select('*').order('created_at', { ascending: false }).limit(120),
        adminClient.from('stream_chat_bans').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        adminClient.from('stream_chat_settings').select('*').eq('id', true).maybeSingle(),
        adminClient.from('site_settings').select('value').eq('id', 'links').maybeSingle()
    ]);

    if (drawingsResult.error) throw drawingsResult.error;
    if (questionsResult.error) throw questionsResult.error;
    if (chatResult.error && chatResult.error.code !== '42P01') throw chatResult.error;
    if (bansResult.error && bansResult.error.code !== '42P01') throw bansResult.error;
    if (settingsResult.error && settingsResult.error.code !== '42P01' && settingsResult.error.code !== 'PGRST116') throw settingsResult.error;
    if (linkSettingsResult.error && linkSettingsResult.error.code !== '42P01' && linkSettingsResult.error.code !== 'PGRST116') throw linkSettingsResult.error;

    state.drawings = drawingsResult.data || [];
    state.questions = questionsResult.data || [];
    state.streamMessages = chatResult.data || [];
    state.streamBans = bansResult.data || [];
    if (settingsResult.data) {
        state.chatSettings = {
            chat_enabled: settingsResult.data.chat_enabled !== false,
            slow_mode_seconds: Number(settingsResult.data.slow_mode_seconds ?? 5),
            blocked_words: Array.isArray(settingsResult.data.blocked_words) ? settingsResult.data.blocked_words : []
        };
    }
    state.linkSettingsAvailable = !linkSettingsResult.error || linkSettingsResult.error.code === 'PGRST116';
    state.linkSettings = normalizeLinkSettings(linkSettingsResult.data?.value);
    renderAll({ preserveDrafts });
    setStatus(els.adminStatus, '');
}

async function loadStreamChatOnly() {
    if (chatPollInFlight) return;
    chatPollInFlight = true;

    try {
        const { data, error } = await adminClient
            .from('stream_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(120);
        if (error) {
            if (error.code !== '42P01') throw error;
            return;
        }
        state.streamMessages = data || [];
        renderStats();
        renderChatMessages();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not refresh chat.');
    } finally {
        chatPollInFlight = false;
    }
}

function getItemById(collection, id) {
    return collection.find(item => item.id === id) || null;
}

function confirmDangerAction(message) {
    return window.confirm(message);
}

async function addChatBan(type, value, note) {
    const cleanType = type === 'nickname' ? 'nickname' : 'ip';
    const cleanValue = String(value || '').trim();
    if (!cleanValue) throw new Error('ban value is missing');

    const payload = {
        ban_type: cleanType,
        ban_value: cleanType === 'nickname' ? cleanValue.toLowerCase() : cleanValue,
        note: String(note || '').trim() || null,
        is_active: true
    };
    const { error } = await adminClient.from('stream_chat_bans').insert(payload);
    if (error) throw error;
}

async function openDashboard() {
    showPanel(els.dashboardPanel);
    try {
        await loadAdminData({ preserveDrafts: false });
        startAdminRealtime();
        startAdminChatPolling();
        checkStaticSeoStatus().catch(() => renderStaticSeoStatus());
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not load admin data.');
    }
}

function startAdminChatPolling() {
    window.clearInterval(adminChatPollTimer);
    adminChatPollTimer = window.setInterval(() => {
        if (document.hidden || !document.getElementById('chat-panel')?.classList.contains('active')) {
            return;
        }
        loadStreamChatOnly();
    }, 1500);
}

function startAdminRealtime() {
    if (adminChatChannel) return;

    adminChatChannel = adminClient
        .channel('doll_admin_stream_chat')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'stream_messages'
        }, () => {
            loadStreamChatOnly().catch(error => {
                setStatus(els.adminStatus, error.message || 'Could not refresh chat.');
            });
        })
        .subscribe();
}

async function stopAdminRealtime() {
    window.clearInterval(adminChatPollTimer);
    adminChatPollTimer = null;
    if (!adminChatChannel) return;
    await adminClient.removeChannel(adminChatChannel);
    adminChatChannel = null;
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

        if (action === 'hide-chat' || action === 'show-chat') {
            const { error } = await adminClient
                .from('stream_messages')
                .update({ is_hidden: action === 'hide-chat' })
                .eq('id', id);
            if (error) throw error;
        }

        if (action === 'delete-chat') {
            const { error } = await adminClient.from('stream_messages').delete().eq('id', id);
            if (error) throw error;
        }

        if (action === 'ban-chat-ip' || action === 'ban-chat-user') {
            const item = getItemById(state.streamMessages, id);
            await addChatBan('ip', item?.ip_address, `${item?.nickname || 'unknown'} from message ${id}`);
        }

        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not save.');
    } finally {
        button.disabled = false;
    }
}

async function runChatAction(button) {
    const action = button.dataset.chatAction;
    if (!action) return;

    if (action === 'refresh') {
        await loadStreamChatOnly();
        return;
    }

    if (action === 'clear-visible' && !confirmDangerAction('Hide every visible chat message?')) return;
    if (action === 'delete-all' && !confirmDangerAction('Delete every chat message? This cannot be undone.')) return;

    button.disabled = true;
    setStatus(els.adminStatus, 'saving chat...');
    try {
        if (action === 'clear-visible') {
            const { error } = await adminClient
                .from('stream_messages')
                .update({ is_hidden: true })
                .eq('is_hidden', false);
            if (error) throw error;
        }

        if (action === 'delete-all') {
            const { error } = await adminClient
                .from('stream_messages')
                .delete()
                .not('id', 'is', null);
            if (error) throw error;
        }

        if (action === 'toggle-pause') {
            const nextEnabled = state.chatSettings.chat_enabled === false;
            const { error } = await adminClient
                .from('stream_chat_settings')
                .upsert({
                    id: true,
                    chat_enabled: nextEnabled,
                    slow_mode_seconds: Number(state.chatSettings.slow_mode_seconds ?? 5),
                    blocked_words: state.chatSettings.blocked_words || [],
                    updated_at: new Date().toISOString()
                });
            if (error) throw error;
        }

        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Chat action failed.');
    } finally {
        button.disabled = false;
    }
}

async function saveChatSettings(event) {
    event.preventDefault();
    const slowMode = Math.max(0, Math.min(120, Number(els.chatSlowMode?.value || 0)));
    const blockedWords = String(els.chatBlockedWords?.value || '')
        .split(/[\n,]+/)
        .map(word => word.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 80);

    setStatus(els.adminStatus, 'saving rules...');
    const { error } = await adminClient
        .from('stream_chat_settings')
        .upsert({
            id: true,
            chat_enabled: state.chatSettings.chat_enabled !== false,
            slow_mode_seconds: slowMode,
            blocked_words: blockedWords,
            updated_at: new Date().toISOString()
        });

    if (error) {
        setStatus(els.adminStatus, error.message || 'Could not save rules.');
        return;
    }

    chatSettingsDraftDirty = false;
    await loadAdminData({ preserveDrafts: false });
}

async function saveChatBan(event) {
    event.preventDefault();
    setStatus(els.adminStatus, 'adding ban...');

    try {
        await addChatBan(els.chatBanType?.value, els.chatBanValue?.value, els.chatBanNote?.value);
        if (els.chatBanValue) els.chatBanValue.value = '';
        if (els.chatBanNote) els.chatBanNote.value = '';
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not add ban.');
    }
}

function cleanUrl(value, label) {
    const cleanValue = String(value || '').trim();
    if (!cleanValue) throw new Error(`${label} link is missing`);
    try {
        return new URL(cleanValue).href;
    } catch (error) {
        throw new Error(`${label} link is not a valid URL`);
    }
}

async function saveLinkSettingsNow() {
    let nextSettings;
    try {
        nextSettings = {
            snapchat_url: cleanUrl(els.snapchatUrl?.value || state.linkSettings.snapchat_url, 'Snapchat'),
            snapchat_enabled: els.snapchatEnabled?.checked !== false,
            instagram_url: cleanUrl(els.instagramUrl?.value || state.linkSettings.instagram_url, 'Instagram'),
            instagram_enabled: els.instagramEnabled?.checked !== false,
            kofi_url: cleanUrl(els.kofiUrl?.value || state.linkSettings.kofi_url, 'Ko-fi'),
            kofi_enabled: els.kofiEnabled?.checked !== false,
            throne_url: cleanUrl(els.throneUrl?.value || state.linkSettings.throne_url, 'Throne'),
            throne_enabled: els.throneEnabled?.checked !== false,
            latest_note_enabled: els.latestNoteEnabled?.checked === true,
            latest_note_title: els.latestNoteTitle?.value.trim() || DEFAULT_LINK_SETTINGS.latest_note_title,
            latest_note_body: els.latestNoteBody?.value.trim() || '',
            maintenance_enabled: els.maintenanceEnabled?.checked === true,
            maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
            maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
            maintenance_eta: els.maintenanceEta?.value.trim() || '',
            drawings_enabled: els.drawingsEnabled?.checked !== false,
            questions_enabled: els.questionsEnabled?.checked !== false,
            seo_title: els.seoTitle?.value.trim() || DEFAULT_LINK_SETTINGS.seo_title,
            seo_description: els.seoDescription?.value.trim() || DEFAULT_LINK_SETTINGS.seo_description,
            site_tagline: els.siteTagline?.value.trim() || DEFAULT_LINK_SETTINGS.site_tagline
        };
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Check the links.');
        return;
    }
    const savedSettingsKey = JSON.stringify(nextSettings);
    if (els.seoState) els.seoState.textContent = 'saving';

    const { error } = await adminClient
        .from('site_settings')
        .upsert({
            id: 'links',
            value: nextSettings,
            updated_at: new Date().toISOString()
        });

    if (error) {
        if (els.seoState) els.seoState.textContent = 'error';
        setStatus(els.adminStatus, error.code === '42P01'
            ? 'Install site_settings.sql in Supabase first.'
            : (error.message || 'Could not save links.'));
        return;
    }

    state.linkSettings = nextSettings;
    settingsDraftDirty = JSON.stringify(getDraftLinkSettings()) !== savedSettingsKey;
    syncLinkDraftLabels();
    renderLinkPreview();
    setStatus(els.adminStatus, 'saved ✓');
    setTimeout(() => {
        if (els.adminStatus?.textContent === 'saved ✓') setStatus(els.adminStatus, '');
    }, 2000);
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveLinkSettingsNow, 700);
}

function resetLinkSettings() {
    state.linkSettings = { ...DEFAULT_LINK_SETTINGS };
    renderLinkSettings();
    settingsDraftDirty = true;
    scheduleAutoSave();
}

async function runSiteHealthCheck() {
    if (!els.healthCheck) return;
    const checks = [
        {
            label: 'settings table',
            run: async () => state.linkSettingsAvailable
        },
        {
            label: 'front page',
            run: async () => {
                const response = await fetch('../index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('site-structured-data');
            }
        },
        {
            label: 'sitemap',
            run: async () => (await fetch('../sitemap.xml', { cache: 'no-store' })).ok
        },
        {
            label: 'robots',
            run: async () => {
                const response = await fetch('../robots.txt', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('Sitemap: https://doll.gg/sitemap.xml');
            }
        },
        {
            label: 'admin noindex',
            run: async () => {
                const response = await fetch('./index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('noindex');
            }
        },
        {
            label: 'favicon',
            run: async () => (await fetch('../favicon.png', { method: 'HEAD', cache: 'no-store' })).ok
        },
        {
            label: 'share image',
            run: async () => (await fetch('../screenshotbackground.png', { method: 'HEAD', cache: 'no-store' })).ok
        }
    ];

    if (els.healthState) els.healthState.textContent = 'checking';
    els.healthCheck.innerHTML = checks.map(check => `
        <div class="admin-health-row is-pending">
            <span>${escapeHtml(check.label)}</span>
            <strong>...</strong>
        </div>
    `).join('');

    const rows = Array.from(els.healthCheck.querySelectorAll('.admin-health-row'));
    let passed = 0;
    for (let index = 0; index < checks.length; index += 1) {
        let ok = false;
        try {
            ok = await checks[index].run();
        } catch (error) {
            ok = false;
        }
        rows[index]?.classList.toggle('is-pending', false);
        rows[index]?.classList.toggle('is-ok', ok);
        rows[index]?.classList.toggle('is-bad', !ok);
        const result = rows[index]?.querySelector('strong');
        if (result) result.textContent = ok ? 'ok' : 'fix';
        if (ok) passed += 1;
    }

    if (els.healthState) els.healthState.textContent = `${passed}/${checks.length}`;
}

async function runBanAction(button) {
    const row = button.closest('.admin-ban-row');
    const id = row?.dataset.id;
    if (!id) return;

    button.disabled = true;
    setStatus(els.adminStatus, 'removing ban...');
    try {
        const { error } = await adminClient
            .from('stream_chat_bans')
            .update({ is_active: false })
            .eq('id', id);
        if (error) throw error;
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not remove ban.');
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

    if (action === 'delete-all-pending-drawings') {
        const pendingIds = state.drawings
            .filter(item => !item.approved)
            .map(item => item.id)
            .filter(Boolean);
        if (!pendingIds.length) {
            setStatus(els.adminStatus, 'no waiting doods');
            return;
        }
        if (!confirmDangerAction(`Delete ${pendingIds.length} waiting doods? This cannot be undone.`)) return;

        button.disabled = true;
        setStatus(els.adminStatus, `deleting ${pendingIds.length} waiting doods...`);
        try {
            const { error } = await adminClient.from('drawings').delete().in('id', pendingIds);
            if (error) throw error;
            await loadAdminData();
        } catch (error) {
            setStatus(els.adminStatus, error.message || 'Could not clear waiting doods.');
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'delete-all-pending-questions') {
        const pendingIds = state.questions
            .filter(item => !hasAnswer(item))
            .map(item => item.id)
            .filter(Boolean);
        if (!pendingIds.length) {
            setStatus(els.adminStatus, 'no waiting asks');
            return;
        }
        if (!confirmDangerAction(`Delete ${pendingIds.length} waiting asks? This cannot be undone.`)) return;

        button.disabled = true;
        setStatus(els.adminStatus, `deleting ${pendingIds.length} waiting asks...`);
        try {
            const { error } = await adminClient.from('questions').delete().in('id', pendingIds);
            if (error) throw error;
            await loadAdminData();
        } catch (error) {
            setStatus(els.adminStatus, error.message || 'Could not clear waiting asks.');
        } finally {
            button.disabled = false;
        }
        return;
    }

    if (action === 'select') {
        const selectedCount = getSelectedIds(listId).length;
        const totalCount = document.getElementById(listId)?.querySelectorAll('input[data-select-id]').length || 0;
        setListSelected(listId, selectedCount !== totalCount);
        return;
    }

    const ids = getSelectedIds(listId);
    if (!ids.length) {
        setStatus(els.adminStatus, 'select items first');
        return;
    }
    if (action === 'delete' && !confirmDangerAction(`Delete ${ids.length} selected doods? This cannot be undone.`)) return;

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
        if (button.dataset.panel === 'chat-panel') {
            loadStreamChatOnly();
        }
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
        await stopAdminRealtime();
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

    document.querySelectorAll('[data-chat-action]').forEach(button => {
        button.addEventListener('click', () => runChatAction(button));
    });

    els.chatSettingsForm?.addEventListener('submit', saveChatSettings);
    [els.chatSlowMode, els.chatBlockedWords].forEach(input => {
        input?.addEventListener('input', () => { chatSettingsDraftDirty = true; });
    });
    els.chatFilter?.addEventListener('input', renderChatMessages);
    els.chatVisibilityFilter?.addEventListener('change', renderChatMessages);
    els.chatBanForm?.addEventListener('submit', saveChatBan);
    els.linkSettingsForm?.addEventListener('submit', e => e.preventDefault());
    els.linkSettingsReset?.addEventListener('click', resetLinkSettings);
    els.runHealthCheck?.addEventListener('click', runSiteHealthCheck);
    els.staticSeoCheck?.addEventListener('click', checkStaticSeoStatus);
    document.querySelectorAll('[data-link-open]').forEach(button => {
        button.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            openPublicLinkPreview(button.dataset.linkOpen);
        });
    });
    document.querySelectorAll('.admin-switch').forEach(toggle => {
        toggle.addEventListener('click', e => e.stopPropagation());
        toggle.addEventListener('keydown', e => e.stopPropagation());
        toggle.addEventListener('change', () => {
            settingsDraftDirty = true;
            renderLinkPreview();
            scheduleAutoSave();
        });
    });
    [
        els.snapchatUrl,
        els.instagramUrl,
        els.kofiUrl,
        els.throneUrl,
        els.latestNoteTitle,
        els.latestNoteBody,
        els.maintenanceTitle,
        els.maintenanceMessage,
        els.maintenanceEta,
        els.seoTitle,
        els.seoDescription,
        els.siteTagline
    ].forEach(input => {
        input?.addEventListener('input', () => {
            settingsDraftDirty = true;
            renderLinkPreview();
            scheduleAutoSave();
        });
    });
    els.streamBans?.addEventListener('click', e => {
        const button = e.target.closest('button[data-ban-action]');
        if (button) runBanAction(button);
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
