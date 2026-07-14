const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
const ADMIN_PASSCODE_HASH = 'ce157a63c5af6bc69d076f5cc7acd1c18a8b44933f907e682f24914a63e9939e';
const SOCIAL_CARD_VIDEO_BUCKET = 'social-card-videos';
const SOCIAL_CARD_VIDEO_KEYS = ['snapchat', 'instagram', 'kofi'];
const MAX_SOCIAL_CARD_VIDEO_BYTES = 20 * 1024 * 1024;
const SOCIAL_CARD_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/x-m4v']);
const socialVideoObjectUrls = new Map();
const socialVideoSelectedFiles = new Map();
const socialVideoPickerTimers = new Map();
const socialVideoPendingInputs = new Map();
const SOCIAL_VIDEO_PICKER_SESSION_KEY = 'doll_social_video_picker_pending';

async function hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const WISHLIST_VIEW_MODES = ['grid', 'list', 'masonry'];
const DEFAULT_LINK_SETTINGS = {
    snapchat_url: 'https://www.snapchat.com/add/dumidoll',
    snapchat_enabled: true,
    snapchat_card_video_url: '',
    snapchat_card_video_path: '',
    instagram_url: 'https://www.instagram.com/pawswirl',
    instagram_enabled: true,
    instagram_card_video_url: '',
    instagram_card_video_path: '',
    kofi_url: 'https://ko-fi.com/edoll',
    kofi_enabled: true,
    kofi_card_video_url: '',
    kofi_card_video_path: '',
    throne_url: 'https://throne.com/edoll',
    throne_enabled: true,
    throne_checkout_mode: 'mockup',
    wishlist_view_mode: 'masonry',
    latest_note_enabled: false,
    latest_note_title: 'latest note',
    latest_note_body: '',
    maintenance_enabled: false,
    maintenance_title: 'site update in progress',
    maintenance_message: 'Please check back soon.',
    maintenance_eta: '',
    drawings_enabled: true,
    questions_enabled: true,
    rooms_enabled: true,
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

let autoSaveTimer = null;
let settingsDraftDirty = false;
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
    wishlistItems: [],
    wishlistItemsAvailable: true,
    wishlistSyncedAt: null,
    wishlistSearch: '',
    linkSettings: { ...DEFAULT_LINK_SETTINGS },
    linkSettingsAvailable: true
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
    refresh: document.getElementById('refresh-admin'),
    logout: document.getElementById('logout-admin'),
    pendingDrawings: document.getElementById('pending-drawings-list'),
    publishedDrawings: document.getElementById('published-drawings-list'),
    pendingQuestions: document.getElementById('pending-questions-list'),
    publishedQuestions: document.getElementById('published-questions-list'),
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
    kofiUrlPreview: document.getElementById('kofi-url-preview'),
    throneEnabled: document.getElementById('throne-enabled'),
    throneUrl: document.getElementById('throne-url'),
    throneState: document.getElementById('throne-state'),
    throneCheckoutMode: document.getElementById('throne-checkout-mode'),
    wishlistViewMode: document.getElementById('wishlist-view-mode'),
    wishlistItemsList: document.getElementById('wishlist-items-list'),
    wishlistSyncStatus: document.getElementById('wishlist-sync-status'),
    wishlistSyncNow: document.getElementById('wishlist-sync-now'),
    wishlistFeatureAll: document.getElementById('wishlist-feature-all'),
    wishlistUnfeatureAll: document.getElementById('wishlist-unfeature-all'),
    wishlistSearch: document.getElementById('wishlist-search'),
    wishlistFeaturedWarning: document.getElementById('wishlist-featured-warning'),
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
    roomsMasterEnabled: document.getElementById('rooms-master-enabled'),
    roomsMasterState: document.getElementById('rooms-master-state'),
    roomsDisabledBanner: document.getElementById('rooms-disabled-banner'),
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
    const activeLinks = ['snapchat', 'instagram', 'kofi', 'throne']
        .filter(key => state.linkSettings[`${key}_enabled`] !== false).length;
    if (els.reviewTabCount) els.reviewTabCount.textContent = String(pendingDrawings + pendingQuestions);
    if (els.publishedTabCount) els.publishedTabCount.textContent = String(publishedDrawings + publishedQuestions);
    if (els.linksTabCount) els.linksTabCount.textContent = `${activeLinks}/4`;

    els.stats.innerHTML = `
        <div class="admin-stat"><strong>${pendingDrawings + pendingQuestions}</strong><span>waiting review</span></div>
        <div class="admin-stat"><strong>${publishedDrawings + publishedQuestions}</strong><span>published posts</span></div>
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

function normalizeLinkSettings(value) {
    const settings = value && typeof value === 'object' ? value : {};
    return {
        snapchat_url: String(settings.snapchat_url || DEFAULT_LINK_SETTINGS.snapchat_url),
        snapchat_enabled: settings.snapchat_enabled !== false,
        snapchat_card_video_url: String(settings.snapchat_card_video_url || ''),
        snapchat_card_video_path: String(settings.snapchat_card_video_path || ''),
        instagram_url: String(settings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url),
        instagram_enabled: settings.instagram_enabled !== false,
        instagram_card_video_url: String(settings.instagram_card_video_url || ''),
        instagram_card_video_path: String(settings.instagram_card_video_path || ''),
        kofi_url: String(settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url),
        kofi_enabled: settings.kofi_enabled !== false,
        kofi_card_video_url: String(settings.kofi_card_video_url || ''),
        kofi_card_video_path: String(settings.kofi_card_video_path || ''),
        throne_url: String(settings.throne_url || DEFAULT_LINK_SETTINGS.throne_url),
        throne_enabled: settings.throne_enabled !== false,
        throne_checkout_mode: settings.throne_checkout_mode === 'widget' ? 'widget' : 'mockup',
        wishlist_view_mode: WISHLIST_VIEW_MODES.includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry',
        latest_note_enabled: settings.latest_note_enabled === true,
        latest_note_title: String(settings.latest_note_title || DEFAULT_LINK_SETTINGS.latest_note_title),
        latest_note_body: String(settings.latest_note_body || ''),
        maintenance_enabled: settings.maintenance_enabled === true,
        maintenance_title: String(settings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title),
        maintenance_message: String(settings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message),
        maintenance_eta: String(settings.maintenance_eta || ''),
        drawings_enabled: settings.drawings_enabled !== false,
        questions_enabled: settings.questions_enabled !== false,
        rooms_enabled: settings.rooms_enabled !== false,
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
    renderAllSocialVideoControls();
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
    if (els.kofiUrlPreview) els.kofiUrlPreview.textContent = settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url;
    if (els.throneEnabled) els.throneEnabled.checked = settings.throne_enabled !== false;
    if (els.throneUrl) els.throneUrl.value = settings.throne_url || '';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.throneCheckoutMode) els.throneCheckoutMode.value = settings.throne_checkout_mode === 'widget' ? 'widget' : 'mockup';
    if (els.wishlistViewMode) els.wishlistViewMode.value = WISHLIST_VIEW_MODES.includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry';
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
    if (els.roomsMasterEnabled) els.roomsMasterEnabled.checked = settings.rooms_enabled !== false;
    if (els.roomsMasterState) els.roomsMasterState.textContent = settings.rooms_enabled !== false ? 'enabled' : 'disabled';
    els.roomsDisabledBanner?.classList.toggle('hidden', settings.rooms_enabled !== false);
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
        snapchat_card_video_url: state.linkSettings.snapchat_card_video_url || '',
        snapchat_card_video_path: state.linkSettings.snapchat_card_video_path || '',
        instagram_url: els.instagramUrl?.value.trim() || state.linkSettings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url,
        instagram_enabled: els.instagramEnabled?.checked !== false,
        instagram_card_video_url: state.linkSettings.instagram_card_video_url || '',
        instagram_card_video_path: state.linkSettings.instagram_card_video_path || '',
        kofi_url: els.kofiUrl?.value.trim() || state.linkSettings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url,
        kofi_enabled: els.kofiEnabled?.checked !== false,
        kofi_card_video_url: state.linkSettings.kofi_card_video_url || '',
        kofi_card_video_path: state.linkSettings.kofi_card_video_path || '',
        throne_url: els.throneUrl?.value.trim() || state.linkSettings.throne_url || DEFAULT_LINK_SETTINGS.throne_url,
        throne_enabled: els.throneEnabled?.checked !== false,
        throne_checkout_mode: els.throneCheckoutMode?.value === 'widget' ? 'widget' : 'mockup',
        wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
        latest_note_enabled: els.latestNoteEnabled?.checked === true,
        latest_note_title: els.latestNoteTitle?.value.trim() || DEFAULT_LINK_SETTINGS.latest_note_title,
        latest_note_body: els.latestNoteBody?.value.trim() || '',
        maintenance_enabled: els.maintenanceEnabled?.checked === true,
        maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
        maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
        maintenance_eta: els.maintenanceEta?.value.trim() || '',
        drawings_enabled: els.drawingsEnabled?.checked !== false,
        questions_enabled: els.questionsEnabled?.checked !== false,
        rooms_enabled: els.roomsMasterEnabled?.checked !== false,
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
    if (els.kofiUrlPreview) els.kofiUrlPreview.textContent = settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url;
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.latestNoteState) els.latestNoteState.textContent = settings.latest_note_enabled === true ? 'visible' : 'hidden';
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.submissionsState) els.submissionsState.textContent = getSubmissionsStateLabel(settings);
    if (els.roomsMasterState) els.roomsMasterState.textContent = settings.rooms_enabled !== false ? 'enabled' : 'disabled';
    els.roomsDisabledBanner?.classList.toggle('hidden', settings.rooms_enabled !== false);
    if (els.seoPreviewTitle) els.seoPreviewTitle.textContent = settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
    if (els.seoPreviewDescription) els.seoPreviewDescription.textContent = settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
    if (els.seoTitleCount) els.seoTitleCount.textContent = `${settings.seo_title.length}/70`;
    if (els.seoDescriptionCount) els.seoDescriptionCount.textContent = `${settings.seo_description.length}/180`;
    if (els.siteTaglineCount) els.siteTaglineCount.textContent = `${settings.site_tagline.length}/120`;
    if (els.seoState) els.seoState.textContent = settingsDraftDirty ? 'editing' : 'ready';
    ['snapchat', 'instagram', 'kofi', 'throne', 'latest-note', 'maintenance', 'submissions'].forEach(key => {
        const settingKey = key.replace('-', '_');
        let disabled = settings[`${settingKey}_enabled`] === false;
        if (key === 'submissions') {
            disabled = settings.drawings_enabled === false && settings.questions_enabled === false;
        }
        document.querySelector(`[data-link-card="${key}"]`)?.classList.toggle('is-disabled', disabled);
    });
    document.querySelector('[data-link-card="rooms-master"]')?.classList.toggle('is-disabled', settings.rooms_enabled === false);
    renderStaticSeoStatus(settings);
}

function renderLinkPreview() {
    const settings = getDraftLinkSettings();
    syncLinkDraftLabels(settings);
}

function getSocialVideoControl(key) {
    return document.querySelector(`[data-social-video="${key}"]`);
}

function getSocialVideoSettingKey(key, suffix) {
    return `${key}_card_video_${suffix}`;
}

function setSocialVideoStatus(key, message, tone = '') {
    const status = getSocialVideoControl(key)?.querySelector('[data-video-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', tone === 'error');
    status.classList.toggle('is-ready', tone === 'ready');
    status.classList.toggle('is-waiting', tone === 'waiting');
}

function revokeSocialVideoObjectUrl(key) {
    const objectUrl = socialVideoObjectUrls.get(key);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    socialVideoObjectUrls.delete(key);
}

function formatUploadSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function getSocialVideoFileExtension(file) {
    const namedExtension = String(file?.name || '').split('.').pop().toLowerCase();
    if (namedExtension === 'mp4' || namedExtension === 'webm') return namedExtension;
    // M4V is the same MPEG-4 family and is a common iPhone export. Store it
    // with an .mp4 extension/content type so the public video element gets
    // the broadly-supported MIME type it expects.
    if (namedExtension === 'm4v' || file?.type === 'video/x-m4v') return 'mp4';
    if (file?.type === 'video/webm') return 'webm';
    if (file?.type === 'video/mp4') return 'mp4';
    return '';
}

function validateSocialVideoFile(file) {
    if (!file) throw new Error('Choose a video first.');
    const extension = getSocialVideoFileExtension(file);
    const supportedType = SOCIAL_CARD_VIDEO_TYPES.has(file.type) || Boolean(extension);
    const name = String(file.name || '').toLowerCase();
    const isQuickTime = file.type === 'video/quicktime' || name.endsWith('.mov');
    if (!supportedType && isQuickTime) {
        throw new Error('iPhone selected a MOV. Export it as MP4 or M4V first so it plays for everyone.');
    }
    if (!supportedType) throw new Error('Use an MP4, M4V, or WebM video.');
    if (file.size > MAX_SOCIAL_CARD_VIDEO_BYTES) {
        throw new Error(`${formatUploadSize(file.size)} is too large — use a video 20 MB or smaller.`);
    }
    return extension;
}

function setSocialVideoBusy(key, busy, message = '') {
    const control = getSocialVideoControl(key);
    if (!control) return;
    const fileInput = control.querySelector('[data-video-file]');
    const uploadButton = control.querySelector('[data-video-upload]');
    const removeButton = control.querySelector('[data-video-remove]');
    const hasSavedVideo = Boolean(state.linkSettings[getSocialVideoSettingKey(key, 'url')]);
    const hasSelectedFile = socialVideoSelectedFiles.has(key);
    control.classList.toggle('is-busy', busy);
    if (fileInput) fileInput.disabled = busy;
    if (uploadButton) uploadButton.disabled = busy || !hasSelectedFile;
    if (removeButton) removeButton.disabled = busy || !hasSavedVideo;
    if (message) setSocialVideoStatus(key, message);
}

function renderSocialVideoControl(key) {
    const control = getSocialVideoControl(key);
    if (!control) return;
    const fileInput = control.querySelector('[data-video-file]');
    const preview = control.querySelector('[data-video-preview]');
    const uploadButton = control.querySelector('[data-video-upload]');
    const removeButton = control.querySelector('[data-video-remove]');
    const pickerLabel = control.querySelector('.admin-video-picker > span');
    const savedUrl = String(state.linkSettings[getSocialVideoSettingKey(key, 'url')] || '');
    const selectedFile = socialVideoSelectedFiles.get(key) || null;
    const hasLocalPreview = socialVideoObjectUrls.has(key);

    if (preview && !hasLocalPreview) {
        if (preview.dataset.source !== savedUrl) {
            preview.pause();
            preview.removeAttribute('src');
            preview.dataset.source = savedUrl;
            if (savedUrl) {
                preview.src = savedUrl;
                preview.load();
            }
        }
        preview.hidden = !savedUrl;
    }

    if (!hasLocalPreview && !selectedFile) {
        setSocialVideoStatus(key, savedUrl ? 'video live' : 'no video');
    }
    if (pickerLabel) pickerLabel.textContent = selectedFile || savedUrl ? 'choose another' : 'choose video';
    if (uploadButton) uploadButton.disabled = !selectedFile;
    if (removeButton) removeButton.disabled = !savedUrl;
}

function renderAllSocialVideoControls() {
    SOCIAL_CARD_VIDEO_KEYS.forEach(renderSocialVideoControl);
}

function clearSocialVideoPickerTimer(key) {
    const timer = socialVideoPickerTimers.get(key);
    if (timer) window.clearTimeout(timer);
    socialVideoPickerTimers.delete(key);
}

function rememberSocialVideoPicker(key) {
    try {
        sessionStorage.setItem(SOCIAL_VIDEO_PICKER_SESSION_KEY, JSON.stringify({ key, openedAt: Date.now() }));
    } catch (error) {
        // Diagnostics only; the picker still works if storage is unavailable.
    }
}

function forgetSocialVideoPicker() {
    try {
        sessionStorage.removeItem(SOCIAL_VIDEO_PICKER_SESSION_KEY);
    } catch (error) {
        // Diagnostics only.
    }
}

function reportInterruptedSocialVideoPicker() {
    let pending = null;
    try {
        pending = JSON.parse(sessionStorage.getItem(SOCIAL_VIDEO_PICKER_SESSION_KEY) || 'null');
    } catch (error) {
        pending = null;
    }
    forgetSocialVideoPicker();
    if (!pending || !SOCIAL_CARD_VIDEO_KEYS.includes(pending.key)) return;
    if (!Number.isFinite(pending.openedAt) || Date.now() - pending.openedAt > 10 * 60 * 1000) return;
    setSocialVideoStatus(
        pending.key,
        'Safari returned or reloaded without a file. Use a short MP4/M4V under 20 MB and tap Add or Done after selecting it.',
        'error'
    );
}

function handleSocialVideoSelection(key, inputOverride = null, { reportEmpty = false } = {}) {
    const control = getSocialVideoControl(key);
    const fileInput = inputOverride || control?.querySelector('[data-video-file]');
    const preview = control?.querySelector('[data-video-preview]');
    const file = fileInput?.files?.[0];
    clearSocialVideoPickerTimer(key);
    if (file) {
        socialVideoPendingInputs.delete(key);
        forgetSocialVideoPicker();
    }
    if (file && socialVideoSelectedFiles.get(key) === file) return true;

    if (!file) {
        if (reportEmpty) {
            socialVideoPendingInputs.delete(key);
            forgetSocialVideoPicker();
            const pickerLabel = control?.querySelector('.admin-video-picker > span');
            if (pickerLabel) pickerLabel.textContent = 'choose again';
            setSocialVideoStatus(
                key,
                'iPhone returned no file. Select the video, wait for it to load, then tap Add or Done.',
                'error'
            );
        }
        return false;
    }

    revokeSocialVideoObjectUrl(key);
    try {
        validateSocialVideoFile(file);
    } catch (error) {
        socialVideoSelectedFiles.delete(key);
        fileInput.value = '';
        renderSocialVideoControl(key);
        const pickerLabel = control?.querySelector('.admin-video-picker > span');
        if (pickerLabel) pickerLabel.textContent = 'choose another';
        setSocialVideoStatus(key, error.message || 'Video cannot be used.', 'error');
        return false;
    }

    // Commit the valid selection to the UI before asking Safari to build a
    // local video preview. Some iPhone/iCloud files cannot preview locally
    // even though the file itself is perfectly uploadable.
    socialVideoSelectedFiles.set(key, file);
    const uploadButton = control?.querySelector('[data-video-upload]');
    if (uploadButton) uploadButton.disabled = false;
    const pickerLabel = control?.querySelector('.admin-video-picker > span');
    if (pickerLabel) pickerLabel.textContent = 'choose another';
    setSocialVideoStatus(key, `${file.name || 'video'} · ${formatUploadSize(file.size)} ready — tap upload`, 'ready');

    try {
        const objectUrl = URL.createObjectURL(file);
        socialVideoObjectUrls.set(key, objectUrl);
        if (preview) {
            preview.pause();
            preview.dataset.source = objectUrl;
            preview.src = objectUrl;
            preview.hidden = false;
            preview.load();
        }
    } catch (error) {
        // Selection and upload stay available; only the optional local
        // preview failed.
    }
    return true;
}

function beginSocialVideoPicker(key, fileInput) {
    clearSocialVideoPickerTimer(key);
    socialVideoPendingInputs.set(key, fileInput);
    rememberSocialVideoPicker(key);
    const control = getSocialVideoControl(key);
    const pickerLabel = control?.querySelector('.admin-video-picker > span');
    if (pickerLabel) pickerLabel.textContent = 'waiting for Add…';
    setSocialVideoStatus(
        key,
        'Photo picker opened — choose the video, then tap Add or Done.',
        'waiting'
    );

    // iOS occasionally resumes the page without dispatching the normal
    // file-input change event after a Photos/iCloud preview. Timers are
    // suspended while the native picker owns the screen, so this runs after
    // Safari returns and inspects the input directly as a fallback.
    const timer = window.setTimeout(() => {
        socialVideoPickerTimers.delete(key);
        if (fileInput?.files?.[0]) {
            handleSocialVideoSelection(key, fileInput);
            return;
        }
        const currentLabel = getSocialVideoControl(key)?.querySelector('.admin-video-picker > span');
        if (currentLabel) currentLabel.textContent = 'choose again';
        setSocialVideoStatus(
            key,
            'No video came back from Photos. Playing it only previews it — tap Add or Done to attach it.',
            'error'
        );
    }, 1200);
    socialVideoPickerTimers.set(key, timer);
}

function cancelSocialVideoPicker(key) {
    clearSocialVideoPickerTimer(key);
    socialVideoPendingInputs.delete(key);
    forgetSocialVideoPicker();
    const pickerLabel = getSocialVideoControl(key)?.querySelector('.admin-video-picker > span');
    if (pickerLabel) pickerLabel.textContent = 'choose video';
    setSocialVideoStatus(key, 'Video picker closed without selecting a file.', 'error');
}

function inspectPendingSocialVideoPickers() {
    window.setTimeout(() => {
        socialVideoPendingInputs.forEach((fileInput, key) => {
            if (fileInput?.files?.[0]) handleSocialVideoSelection(key, fileInput);
        });
    }, 350);
}

function socialVideoStorageError(error) {
    const message = String(error?.message || error || 'Video upload failed.');
    if (/bucket.*not found|not found.*bucket|row-level security|policy/i.test(message)) {
        return 'Run social-card-videos.sql in Supabase first.';
    }
    return message;
}

async function uploadSocialCardVideo(key) {
    if (!SOCIAL_CARD_VIDEO_KEYS.includes(key)) return;
    const control = getSocialVideoControl(key);
    const fileInput = control?.querySelector('[data-video-file]');
    const file = socialVideoSelectedFiles.get(key) || fileInput?.files?.[0];
    let extension;
    try {
        extension = validateSocialVideoFile(file);
    } catch (error) {
        setSocialVideoStatus(key, error.message || 'Video cannot be used.', 'error');
        return;
    }

    const urlKey = getSocialVideoSettingKey(key, 'url');
    const pathKey = getSocialVideoSettingKey(key, 'path');
    const previousUrl = state.linkSettings[urlKey] || '';
    const previousPath = state.linkSettings[pathKey] || '';
    const uniquePart = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const storagePath = `cards/${key}-${Date.now()}-${uniquePart}.${extension}`;
    setSocialVideoBusy(key, true, 'uploading...');

    try {
        const { error: uploadError } = await adminClient.storage
            .from(SOCIAL_CARD_VIDEO_BUCKET)
            .upload(storagePath, file, {
                cacheControl: '31536000',
                contentType: extension === 'webm' ? 'video/webm' : 'video/mp4',
                upsert: false
            });
        if (uploadError) throw uploadError;

        const { data: publicData } = adminClient.storage
            .from(SOCIAL_CARD_VIDEO_BUCKET)
            .getPublicUrl(storagePath);
        const publicUrl = publicData?.publicUrl || '';
        if (!publicUrl) throw new Error('Could not create the public video URL.');

        state.linkSettings[urlKey] = publicUrl;
        state.linkSettings[pathKey] = storagePath;
        settingsDraftDirty = true;
        const saved = await saveLinkSettingsNow();
        if (!saved) {
            state.linkSettings[urlKey] = previousUrl;
            state.linkSettings[pathKey] = previousPath;
            await adminClient.storage.from(SOCIAL_CARD_VIDEO_BUCKET).remove([storagePath]);
            throw new Error('Video uploaded, but its card setting could not be saved.');
        }

        if (previousPath && previousPath !== storagePath) {
            adminClient.storage.from(SOCIAL_CARD_VIDEO_BUCKET).remove([previousPath])
                .then(({ error }) => { if (error) console.warn('Old social video cleanup failed:', error); });
        }
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        if (fileInput) fileInput.value = '';
        renderSocialVideoControl(key);
        setSocialVideoStatus(key, 'video live ✓');
    } catch (error) {
        setSocialVideoStatus(key, socialVideoStorageError(error), 'error');
    } finally {
        setSocialVideoBusy(key, false);
    }
}

async function removeSocialCardVideo(key) {
    if (!SOCIAL_CARD_VIDEO_KEYS.includes(key)) return;
    const urlKey = getSocialVideoSettingKey(key, 'url');
    const pathKey = getSocialVideoSettingKey(key, 'path');
    const previousUrl = state.linkSettings[urlKey] || '';
    const previousPath = state.linkSettings[pathKey] || '';
    if (!previousUrl) return;
    if (!window.confirm(`Remove the ${key} card background video?`)) return;

    setSocialVideoBusy(key, true, 'removing...');
    state.linkSettings[urlKey] = '';
    state.linkSettings[pathKey] = '';
    settingsDraftDirty = true;

    try {
        const saved = await saveLinkSettingsNow();
        if (!saved) {
            state.linkSettings[urlKey] = previousUrl;
            state.linkSettings[pathKey] = previousPath;
            throw new Error('Could not save the empty video setting.');
        }
        if (previousPath) {
            const { error: removeError } = await adminClient.storage
                .from(SOCIAL_CARD_VIDEO_BUCKET)
                .remove([previousPath]);
            if (removeError) console.warn('Social video file cleanup failed:', removeError);
        }
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        const fileInput = getSocialVideoControl(key)?.querySelector('[data-video-file]');
        if (fileInput) fileInput.value = '';
        renderSocialVideoControl(key);
        setSocialVideoStatus(key, 'removed ✓');
    } catch (error) {
        setSocialVideoStatus(key, socialVideoStorageError(error), 'error');
    } finally {
        setSocialVideoBusy(key, false);
    }
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
    renderLinkSettings({ preserveDraft: preserveDrafts });
    renderWishlistItems();
}

const WISHLIST_FEATURED_CAP = 20;
const WISHLIST_NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const WISHLIST_POSITION_ACTIONS = new Set([
    'feature-wishlist-item', 'unfeature-wishlist-item',
    'move-wishlist-item-up', 'move-wishlist-item-down',
]);
// feature/unfeature/move all compute their next `position` from the
// in-memory state.wishlistItems snapshot, then write it and reload. Without
// this lock, clicking a second wishlist action before the first one's reload
// lands reads the same stale positions twice, so both writes can land on the
// same position — the second one silently overwrites/collides with the
// first instead of appending after it, which reads as "featuring stopped
// doing anything" even though nothing errored.
let wishlistActionBusy = false;

function formatWishlistPrice(cents) {
    const value = Number(cents);
    return Number.isFinite(value) && value > 0 ? `$${(value / 100).toFixed(2)}` : '';
}

function timeAgo(isoString) {
    if (!isoString) return 'never';
    const ms = Date.now() - new Date(isoString).getTime();
    if (ms < 0 || Number.isNaN(ms)) return 'just now';
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function renderWishlistSyncStatus() {
    if (els.wishlistSyncStatus) {
        els.wishlistSyncStatus.textContent = `last synced: ${timeAgo(state.wishlistSyncedAt)}`;
    }
}

function getVisibleWishlistItems() {
    const query = state.wishlistSearch.trim().toLowerCase();
    return query
        ? state.wishlistItems.filter(item => (item.name || '').toLowerCase().includes(query))
        : state.wishlistItems;
}

function renderWishlistItems() {
    const container = els.wishlistItemsList;
    if (!container) return;

    renderWishlistSyncStatus();

    if (!state.wishlistItemsAvailable) {
        container.innerHTML = emptyMessage('wishlist_items table not set up yet');
        return;
    }
    if (!state.wishlistItems.length) {
        container.innerHTML = emptyMessage('nothing synced yet — hit "sync now"');
        return;
    }

    const featuredCount = state.wishlistItems.filter(item => item.featured).length;
    if (els.wishlistFeaturedWarning) {
        els.wishlistFeaturedWarning.textContent = featuredCount > WISHLIST_FEATURED_CAP
            ? `${featuredCount} items featured — only the first ${WISHLIST_FEATURED_CAP} by position show on the site.`
            : '';
    }

    const visible = getVisibleWishlistItems();

    if (!visible.length) {
        container.innerHTML = emptyMessage('no items match your search');
        return;
    }

    const featuredIds = state.wishlistItems.filter(item => item.featured).map(item => item.throne_item_id);

    container.innerHTML = visible.map(item => {
        const featuredIndex = featuredIds.indexOf(item.throne_item_id);
        const isNew = item.first_synced_at && (Date.now() - new Date(item.first_synced_at).getTime()) < WISHLIST_NEW_WINDOW_MS;
        return `
        <article class="admin-card${item.featured ? ' is-featured' : ''}${item.is_available ? '' : ' is-unavailable'}" data-id="${escapeHtml(item.throne_item_id)}">
            <img src="${escapeHtml(item.image_url || '')}" alt="">
            <div class="admin-card-body">
                <div class="admin-card-title-row">
                    <strong>${escapeHtml(item.name || '')}</strong>
                    <span>${escapeHtml(formatWishlistPrice(item.price_cents))}</span>
                </div>
                <p class="admin-tool-note">
                    ${item.is_available ? 'available' : 'sold out / removed'} · qty ${escapeHtml(String(item.quantity ?? 0))}${isNew ? ' · new' : ''}
                </p>
            </div>
            <div class="admin-actions">
                ${item.featured ? `
                    <button data-action="move-wishlist-item-up" ${featuredIndex <= 0 ? 'disabled' : ''} aria-label="move up">&uarr;</button>
                    <button data-action="move-wishlist-item-down" ${featuredIndex === featuredIds.length - 1 ? 'disabled' : ''} aria-label="move down">&darr;</button>
                ` : ''}
                <button data-action="${item.featured ? 'unfeature-wishlist-item' : 'feature-wishlist-item'}">${item.featured ? 'unfeature' : 'feature'}</button>
            </div>
        </article>
    `; }).join('');
}

async function syncWishlistNow() {
    if (!els.wishlistSyncNow) return;
    els.wishlistSyncNow.disabled = true;
    setStatus(els.adminStatus, 'syncing wishlist...');

    try {
        const { data: { session } } = await adminClient.auth.getSession();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/throne-wishlist-sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session?.access_token || SUPABASE_ANON_KEY}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `sync ${res.status}`);
        setStatus(els.adminStatus, body.synced === false
            ? 'sync already ran recently'
            : `synced ${body.count ?? 0} items (${body.markedUnavailable ?? 0} newly unavailable)`);
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, `sync failed: ${error.message}`);
    } finally {
        els.wishlistSyncNow.disabled = false;
    }
}

async function featureAllWishlistItems() {
    if (!els.wishlistFeatureAll) return;
    const targets = getVisibleWishlistItems().filter(item => !item.featured);
    if (!targets.length) {
        setStatus(els.adminStatus, 'nothing to feature');
        return;
    }
    if (!window.confirm(`Feature ${targets.length} item${targets.length === 1 ? '' : 's'}? They'll go live on the site (only the first ${WISHLIST_FEATURED_CAP} by position show).`)) return;
    if (wishlistActionBusy) return;
    wishlistActionBusy = true;

    els.wishlistFeatureAll.disabled = true;
    setStatus(els.adminStatus, 'featuring...');
    try {
        let nextPosition = state.wishlistItems.reduce((max, item) => item.featured ? Math.max(max, item.position ?? 0) : max, -1) + 1;
        const results = await Promise.all(targets.map(item =>
            adminClient.from('wishlist_items').update({ featured: true, position: nextPosition++ }).eq('throne_item_id', item.throne_item_id)
        ));
        const failed = results.find(result => result.error);
        if (failed) throw failed.error;
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'could not feature items');
    } finally {
        els.wishlistFeatureAll.disabled = false;
        wishlistActionBusy = false;
    }
}

async function unfeatureAllWishlistItems() {
    if (!els.wishlistUnfeatureAll) return;
    const targets = getVisibleWishlistItems().filter(item => item.featured);
    if (!targets.length) {
        setStatus(els.adminStatus, 'nothing to unfeature');
        return;
    }
    if (!window.confirm(`Unfeature ${targets.length} item${targets.length === 1 ? '' : 's'}? They'll disappear from the site grid immediately.`)) return;
    if (wishlistActionBusy) return;
    wishlistActionBusy = true;

    els.wishlistUnfeatureAll.disabled = true;
    setStatus(els.adminStatus, 'unfeaturing...');
    try {
        const results = await Promise.all(targets.map(item =>
            adminClient.from('wishlist_items').update({ featured: false }).eq('throne_item_id', item.throne_item_id)
        ));
        const failed = results.find(result => result.error);
        if (failed) throw failed.error;
        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'could not unfeature items');
    } finally {
        els.wishlistUnfeatureAll.disabled = false;
        wishlistActionBusy = false;
    }
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

    const [drawingsResult, questionsResult, linkSettingsResult, wishlistItemsResult, wishlistSyncResult] = await Promise.all([
        adminClient.from('drawings').select('*').order('created_at', { ascending: false }),
        adminClient.from('questions').select('*').order('created_at', { ascending: false }),
        adminClient.from('site_settings').select('value').eq('id', 'links').maybeSingle(),
        adminClient.from('wishlist_items').select('*').order('featured', { ascending: false }).order('position').order('name'),
        adminClient.from('wishlist_sync_state').select('last_synced_at').eq('id', true).maybeSingle()
    ]);

    if (drawingsResult.error) throw drawingsResult.error;
    if (questionsResult.error) throw questionsResult.error;
    if (linkSettingsResult.error && linkSettingsResult.error.code !== '42P01' && linkSettingsResult.error.code !== 'PGRST116') throw linkSettingsResult.error;
    if (wishlistItemsResult.error && wishlistItemsResult.error.code !== '42P01') throw wishlistItemsResult.error;

    state.drawings = drawingsResult.data || [];
    state.questions = questionsResult.data || [];
    state.wishlistItemsAvailable = !wishlistItemsResult.error;
    state.wishlistItems = wishlistItemsResult.data || [];
    state.wishlistSyncedAt = wishlistSyncResult.data?.last_synced_at || null;
    state.linkSettingsAvailable = !linkSettingsResult.error || linkSettingsResult.error.code === 'PGRST116';
    state.linkSettings = normalizeLinkSettings(linkSettingsResult.data?.value);
    renderAll({ preserveDrafts });
    reportInterruptedSocialVideoPicker();
    setStatus(els.adminStatus, '');
}

function confirmDangerAction(message) {
    return window.confirm(message);
}

async function openDashboard() {
    showPanel(els.dashboardPanel);
    try {
        await loadAdminData({ preserveDrafts: false });
        checkStaticSeoStatus().catch(() => renderStaticSeoStatus());
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not load admin data.');
    }
    window.roomsLockdownStatus?.().catch(err => console.error('rooms lockdown status:', err));
}

async function handleLogin(e) {
    e.preventDefault();
    setStatus(els.loginStatus, 'checking...');

    const email = els.email.value.trim();
    const password = els.password.value;

    const { error } = await adminClient.auth.signInWithPassword({ email, password });

    if (error) {
        setStatus(els.loginStatus, error.message || 'Login failed.');
        return;
    }

    if (!(await ensureAdminSession())) {
        setStatus(els.loginStatus, 'This login is not allowed here.');
        return;
    }

    // Same credentials sign into the rooms project too, so one login covers both.
    // Don't let a rooms-project hiccup block the main dashboard from opening.
    try {
        await window.roomsSignIn(email, password);
    } catch (err) {
        console.error('rooms login failed:', err);
    }

    els.password.value = '';
    await openDashboard();
}

async function runAction(button) {
    const card = button.closest('.admin-card');
    const id = card?.dataset.id;
    const action = button.dataset.action;
    if (!id || !action) return;

    const isWishlistPositionAction = WISHLIST_POSITION_ACTIONS.has(action);
    if (isWishlistPositionAction) {
        if (wishlistActionBusy) return;
        wishlistActionBusy = true;
    }

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

        if (action === 'feature-wishlist-item' || action === 'unfeature-wishlist-item') {
            const featured = action === 'feature-wishlist-item';
            const update = { featured };
            if (featured) {
                update.position = state.wishlistItems.reduce((max, item) => item.featured ? Math.max(max, item.position ?? 0) : max, -1) + 1;
            }
            const { error } = await adminClient.from('wishlist_items').update(update).eq('throne_item_id', id);
            if (error) throw error;
        }

        if (action === 'move-wishlist-item-up' || action === 'move-wishlist-item-down') {
            const featuredItems = state.wishlistItems.filter(item => item.featured);
            const index = featuredItems.findIndex(item => item.throne_item_id === id);
            const neighborIndex = action === 'move-wishlist-item-up' ? index - 1 : index + 1;
            const current = featuredItems[index];
            const neighbor = featuredItems[neighborIndex];
            if (current && neighbor) {
                const { error: err1 } = await adminClient.from('wishlist_items').update({ position: neighbor.position }).eq('throne_item_id', current.throne_item_id);
                if (err1) throw err1;
                const { error: err2 } = await adminClient.from('wishlist_items').update({ position: current.position }).eq('throne_item_id', neighbor.throne_item_id);
                if (err2) throw err2;
            }
        }

        await loadAdminData();
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Could not save.');
    } finally {
        button.disabled = false;
        if (isWishlistPositionAction) wishlistActionBusy = false;
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
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    let nextSettings;
    try {
        nextSettings = {
            snapchat_url: cleanUrl(els.snapchatUrl?.value || state.linkSettings.snapchat_url, 'Snapchat'),
            snapchat_enabled: els.snapchatEnabled?.checked !== false,
            snapchat_card_video_url: String(state.linkSettings.snapchat_card_video_url || ''),
            snapchat_card_video_path: String(state.linkSettings.snapchat_card_video_path || ''),
            instagram_url: cleanUrl(els.instagramUrl?.value || state.linkSettings.instagram_url, 'Instagram'),
            instagram_enabled: els.instagramEnabled?.checked !== false,
            instagram_card_video_url: String(state.linkSettings.instagram_card_video_url || ''),
            instagram_card_video_path: String(state.linkSettings.instagram_card_video_path || ''),
            kofi_url: cleanUrl(els.kofiUrl?.value || state.linkSettings.kofi_url, 'Ko-fi'),
            kofi_enabled: els.kofiEnabled?.checked !== false,
            kofi_card_video_url: String(state.linkSettings.kofi_card_video_url || ''),
            kofi_card_video_path: String(state.linkSettings.kofi_card_video_path || ''),
            throne_url: cleanUrl(els.throneUrl?.value || state.linkSettings.throne_url, 'Throne'),
            throne_enabled: els.throneEnabled?.checked !== false,
            throne_checkout_mode: els.throneCheckoutMode?.value === 'widget' ? 'widget' : 'mockup',
            wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
            latest_note_enabled: els.latestNoteEnabled?.checked === true,
            latest_note_title: els.latestNoteTitle?.value.trim() || DEFAULT_LINK_SETTINGS.latest_note_title,
            latest_note_body: els.latestNoteBody?.value.trim() || '',
            maintenance_enabled: els.maintenanceEnabled?.checked === true,
            maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
            maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
            maintenance_eta: els.maintenanceEta?.value.trim() || '',
            drawings_enabled: els.drawingsEnabled?.checked !== false,
            questions_enabled: els.questionsEnabled?.checked !== false,
            rooms_enabled: els.roomsMasterEnabled?.checked !== false,
            seo_title: els.seoTitle?.value.trim() || DEFAULT_LINK_SETTINGS.seo_title,
            seo_description: els.seoDescription?.value.trim() || DEFAULT_LINK_SETTINGS.seo_description,
            site_tagline: els.siteTagline?.value.trim() || DEFAULT_LINK_SETTINGS.site_tagline
        };
    } catch (error) {
        setStatus(els.adminStatus, error.message || 'Check the links.');
        return false;
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
        return false;
    }

    state.linkSettings = nextSettings;
    settingsDraftDirty = JSON.stringify(getDraftLinkSettings()) !== savedSettingsKey;
    syncLinkDraftLabels();
    renderLinkPreview();
    setStatus(els.adminStatus, 'saved ✓');
    setTimeout(() => {
        if (els.adminStatus?.textContent === 'saved ✓') setStatus(els.adminStatus, '');
    }, 2000);
    return true;
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveLinkSettingsNow, 700);
}

function resetLinkSettings() {
    const existingVideos = Object.fromEntries(
        SOCIAL_CARD_VIDEO_KEYS.flatMap(key => [
            [getSocialVideoSettingKey(key, 'url'), state.linkSettings[getSocialVideoSettingKey(key, 'url')] || ''],
            [getSocialVideoSettingKey(key, 'path'), state.linkSettings[getSocialVideoSettingKey(key, 'path')] || '']
        ])
    );
    state.linkSettings = { ...DEFAULT_LINK_SETTINGS, ...existingVideos };
    renderLinkSettings();
    settingsDraftDirty = true;
    scheduleAutoSave();
}

async function handleRoomsMasterToggle(event) {
    const checkbox = event.currentTarget;
    const enabled = checkbox.checked;
    const confirmed = window.confirm(enabled
        ? 'Enable Rooms again? The note pull and public Rooms page will become available.'
        : 'Fully disable Rooms? The note pull will stop, public Rooms visits will go to 404, and active rooms will be closed.');

    if (!confirmed) {
        checkbox.checked = !enabled;
        renderLinkPreview();
        return;
    }

    checkbox.disabled = true;
    settingsDraftDirty = true;
    renderLinkPreview();
    const saved = await saveLinkSettingsNow();

    if (!saved) {
        checkbox.checked = !enabled;
        renderLinkPreview();
        checkbox.disabled = false;
        return;
    }

    if (!enabled && typeof window.roomsForceCloseAll === 'function') {
        try {
            const result = await window.roomsForceCloseAll();
            setStatus(els.adminStatus, `rooms disabled · closed ${result?.closedCount || 0} active`);
        } catch (error) {
            setStatus(els.adminStatus, 'rooms disabled · active-room cleanup needs attention');
        }
    }

    checkbox.disabled = false;
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
            label: 'rooms page',
            run: async () => {
                const response = await fetch('../rooms/index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('id="view-lobby"');
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
        if (button.dataset.panel === 'rooms-panel') {
            window.initRoomsPanel?.();
        }
    });
}

async function init() {
    els.passcodeForm.addEventListener('submit', async e => {
        e.preventDefault();
        const entered = await hashPin(els.passcode.value.trim());
        if (entered !== ADMIN_PASSCODE_HASH) {
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
        SOCIAL_CARD_VIDEO_KEYS.forEach(revokeSocialVideoObjectUrl);
        socialVideoSelectedFiles.clear();
        await adminClient.auth.signOut();
        await window.roomsSignOut?.().catch(err => console.error('rooms signOut:', err));
        sessionStorage.removeItem('doll_admin_gate');
        showPanel(els.gatePanel);
    });

    document.querySelectorAll('.admin-list').forEach(list => {
        list.addEventListener('click', e => {
            const button = e.target.closest('button[data-action]');
            if (button) runAction(button);
        });
    });

    els.wishlistSyncNow?.addEventListener('click', syncWishlistNow);
    els.wishlistFeatureAll?.addEventListener('click', featureAllWishlistItems);
    els.wishlistUnfeatureAll?.addEventListener('click', unfeatureAllWishlistItems);
    els.wishlistSearch?.addEventListener('input', () => {
        state.wishlistSearch = els.wishlistSearch.value || '';
        renderWishlistItems();
    });
    els.linkSettingsForm?.addEventListener('submit', e => e.preventDefault());
    els.linkSettingsReset?.addEventListener('click', resetLinkSettings);
    els.roomsMasterEnabled?.addEventListener('change', event => {
        event.stopPropagation();
        handleRoomsMasterToggle(event);
    });
    SOCIAL_CARD_VIDEO_KEYS.forEach(key => {
        const control = getSocialVideoControl(key);
        const fileInput = control?.querySelector('[data-video-file]');
        fileInput?.addEventListener('click', () => beginSocialVideoPicker(key, fileInput));
        fileInput?.addEventListener('cancel', () => cancelSocialVideoPicker(key));
        control?.querySelector('[data-video-upload]')?.addEventListener('click', () => {
            uploadSocialCardVideo(key);
        });
        control?.querySelector('[data-video-remove]')?.addEventListener('click', () => {
            removeSocialCardVideo(key);
        });
    });
    // Capture-phase delegation is more reliable than a label-local listener
    // for iOS' native Photos picker, and it keeps working if a card control is
    // ever re-rendered later.
    document.addEventListener('change', event => {
        const fileInput = event.target instanceof Element
            ? event.target.closest('[data-video-file]')
            : null;
        if (!fileInput) return;
        const key = fileInput.closest('[data-social-video]')?.dataset.socialVideo;
        if (!SOCIAL_CARD_VIDEO_KEYS.includes(key)) return;
        handleSocialVideoSelection(key, fileInput, { reportEmpty: true });
    }, true);
    window.addEventListener('focus', inspectPendingSocialVideoPickers);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) inspectPendingSocialVideoPickers();
    });
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
        els.throneCheckoutMode,
        els.wishlistViewMode,
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
        await window.roomsRestoreSession?.().catch(err => console.error('rooms session restore:', err));
        await openDashboard();
    } else {
        showPanel(els.loginPanel);
    }
}

init();
