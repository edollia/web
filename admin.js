const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
const ADMIN_PASSCODE_HASH = 'ce157a63c5af6bc69d076f5cc7acd1c18a8b44933f907e682f24914a63e9939e';
const SOCIAL_CARD_VIDEO_BUCKET = 'social-card-videos';
const DEFAULT_SOCIAL_CARD_ORDER = ['snapchat', 'instagram', 'kofi', 'telegram', 'x', 'tiktok', 'twitch', 'discord', 'onlyfans', 'spotify'];
const SOCIAL_CARD_KEYS = [...DEFAULT_SOCIAL_CARD_ORDER];
const SOCIAL_CARD_VIDEO_KEYS = [...SOCIAL_CARD_KEYS];
const SOCIAL_CARD_MEDIA_CONFIG = window.DOLL_SOCIAL_CARD_MEDIA || Object.freeze({
    mode: 'github',
    localVideos: Object.freeze({})
});
const SOCIAL_CARD_VIDEO_SOURCE_MODE = SOCIAL_CARD_MEDIA_CONFIG.mode === 'supabase'
    ? 'supabase'
    : 'github';
const SOCIAL_CARD_VIDEO_HOSTING_PAUSED = SOCIAL_CARD_VIDEO_SOURCE_MODE !== 'supabase';
const LOCAL_SOCIAL_CARD_VIDEOS = SOCIAL_CARD_MEDIA_CONFIG.localVideos || {};
const SOCIAL_USERNAME_URL_BUILDERS = Object.freeze({
    snapchat: username => `https://www.snapchat.com/add/${encodeURIComponent(username)}`,
    instagram: username => `https://www.instagram.com/${encodeURIComponent(username)}`,
    kofi: username => `https://ko-fi.com/${encodeURIComponent(username)}`,
    telegram: username => `https://t.me/${encodeURIComponent(username)}`,
    x: username => `https://x.com/${encodeURIComponent(username)}`,
    tiktok: username => `https://www.tiktok.com/@${encodeURIComponent(username)}`,
    twitch: username => `https://www.twitch.tv/${encodeURIComponent(username)}`,
    onlyfans: username => `https://onlyfans.com/${encodeURIComponent(username)}`,
    spotify: username => `https://open.spotify.com/user/${encodeURIComponent(username)}`
});
const MAX_SOCIAL_CARD_VIDEO_BYTES = 20 * 1024 * 1024;
const SOCIAL_CARD_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/x-m4v', 'video/quicktime', 'image/gif']);
const socialVideoObjectUrls = new Map();
const socialVideoSelectedFiles = new Map();
const socialVideoPickerTimers = new Map();
const socialVideoPendingInputs = new Map();
const SOCIAL_VIDEO_PICKER_SESSION_KEY = 'doll_social_video_picker_pending';
const SOCIAL_VIDEO_CLEANUP_STORAGE_KEY = 'doll_social_video_cleanup_pending_v1';
const PUBLIC_SITE_SETTINGS_CACHE_KEY = 'doll_public_site_settings_v1';

function cachePublicSiteSettings(settings) {
    try {
        localStorage.setItem(PUBLIC_SITE_SETTINGS_CACHE_KEY, JSON.stringify(settings));
    } catch (error) {
        // The public page still has a complete static fallback if storage is unavailable.
    }
}

async function hashPin(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
const WISHLIST_VIEW_MODES = ['grid', 'list', 'masonry'];
const DEFAULT_LINK_SETTINGS = {
    snapchat_url: 'https://www.snapchat.com/add/dumidoll',
    snapchat_username: 'dumidoll',
    snapchat_enabled: true,
    snapchat_card_video_url: '',
    snapchat_card_video_path: '',
    instagram_url: 'https://www.instagram.com/pawswirl',
    instagram_username: 'pawswirl',
    instagram_enabled: true,
    instagram_card_video_url: '',
    instagram_card_video_path: '',
    kofi_url: 'https://ko-fi.com/edoll',
    kofi_username: 'edoll',
    kofi_enabled: true,
    kofi_card_video_url: '',
    kofi_card_video_path: '',
    telegram_url: 'https://t.me/wuufles',
    telegram_username: 'wuufles',
    telegram_enabled: true,
    telegram_card_video_url: '',
    telegram_card_video_path: '',
    x_url: 'https://x.com/pawswirl',
    x_username: 'pawswirl',
    x_enabled: false,
    x_card_video_url: '',
    x_card_video_path: '',
    tiktok_url: 'https://www.tiktok.com/@pawswirl',
    tiktok_username: 'pawswirl',
    tiktok_enabled: false,
    tiktok_card_video_url: '',
    tiktok_card_video_path: '',
    twitch_url: 'https://www.twitch.tv/pawswirl',
    twitch_username: 'pawswirl',
    twitch_enabled: false,
    twitch_card_video_url: '',
    twitch_card_video_path: '',
    discord_url: 'https://discord.com/',
    discord_username: 'pawswirl',
    discord_enabled: false,
    discord_card_video_url: '',
    discord_card_video_path: '',
    onlyfans_url: 'https://onlyfans.com/pawswirl',
    onlyfans_username: 'pawswirl',
    onlyfans_enabled: false,
    onlyfans_card_video_url: '',
    onlyfans_card_video_path: '',
    spotify_url: 'https://open.spotify.com/user/pawswirl',
    spotify_username: 'pawswirl',
    spotify_enabled: false,
    spotify_card_video_url: '',
    spotify_card_video_path: '',
    social_card_order: [...DEFAULT_SOCIAL_CARD_ORDER],
    throne_url: 'https://throne.com/edoll',
    throne_enabled: true,
    throne_checkout_mode: 'mockup',
    wishlist_view_mode: 'masonry',
    homepage_note_text: '\n\n\nhiii\nuhhh umm yea\nThese are my only socials\n',
    homepage_note_font_size: 15.75,
    maintenance_enabled: false,
    maintenance_title: 'site update in progress',
    maintenance_message: 'Please check back soon.',
    maintenance_eta: '',
    entrance_mode: 'bubbles',
    drawings_enabled: true,
    questions_enabled: true,
    rooms_enabled: false,
    seo_title: 'Lia ⋆౨ৎ˚⟡',
    seo_description: "Lia's little space",
    site_tagline: "Lia's little space."
};

const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
});

let autoSaveTimer = null;
let settingsDraftDirty = false;
let settingsSaveTail = Promise.resolve();
let settingsSavePending = 0;
let settingsSaveRevision = 0;
let latestSettingsSaveRequest = 0;
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
const ADMIN_FUTURE_DATE_TOLERANCE_MS = 2 * 60 * 1000;

const state = {
    adminListItems: {},
    adminListTotals: {},
    wishlistItemsAvailable: true,
    wishlistFeaturedCount: 0,
    wishlistFirstFeaturedId: '',
    wishlistLastFeaturedId: '',
    wishlistSyncedAt: null,
    wishlistSearch: '',
    wishlistLoadedSearch: '',
    linkSettings: { ...DEFAULT_LINK_SETTINGS },
    linkSettingsAvailable: true
};

const ADMIN_LIST_PAGINATION = Object.freeze({
    'pending-drawings-list': { pageSize: 12, label: 'waiting doods', selectable: true },
    'published-drawings-list': { pageSize: 12, label: 'posted doods', selectable: true },
    'pending-questions-list': { pageSize: 10, label: 'waiting asks' },
    'published-questions-list': { pageSize: 10, label: 'answered asks' },
    'wishlist-items-list': { pageSize: 20, label: 'wishlist items' }
});
const adminListPages = new Map(Object.keys(ADMIN_LIST_PAGINATION).map(listId => [listId, 1]));
const adminListCommittedPages = new Map(Object.keys(ADMIN_LIST_PAGINATION).map(listId => [listId, 1]));
const adminListSelections = new Map(
    Object.entries(ADMIN_LIST_PAGINATION)
        .filter(([, config]) => config.selectable)
        .map(([listId]) => [listId, { ids: new Set(), snapshotCutoff: '' }])
);
const adminQuestionDrafts = new Map();
const adminListLoadTokens = new Map();
const adminListErrors = new Map();
let wishlistSearchTimer = null;
let adminFullLoadGeneration = 0;
let submissionMutationBusy = false;
let linkSettingsHydrated = false;

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
    snapchatUsername: document.getElementById('snapchat-username'),
    snapchatState: document.getElementById('snapchat-state'),
    instagramEnabled: document.getElementById('instagram-enabled'),
    instagramUrl: document.getElementById('instagram-url'),
    instagramUsername: document.getElementById('instagram-username'),
    instagramState: document.getElementById('instagram-state'),
    kofiEnabled: document.getElementById('kofi-enabled'),
    kofiUrl: document.getElementById('kofi-url'),
    kofiUsername: document.getElementById('kofi-username'),
    kofiState: document.getElementById('kofi-state'),
    kofiUrlPreview: document.getElementById('kofi-url-preview'),
    telegramEnabled: document.getElementById('telegram-enabled'),
    telegramUrl: document.getElementById('telegram-url'),
    telegramUsername: document.getElementById('telegram-username'),
    telegramState: document.getElementById('telegram-state'),
    xEnabled: document.getElementById('x-enabled'),
    xUrl: document.getElementById('x-url'),
    xUsername: document.getElementById('x-username'),
    xState: document.getElementById('x-state'),
    tiktokEnabled: document.getElementById('tiktok-enabled'),
    tiktokUrl: document.getElementById('tiktok-url'),
    tiktokUsername: document.getElementById('tiktok-username'),
    tiktokState: document.getElementById('tiktok-state'),
    twitchEnabled: document.getElementById('twitch-enabled'),
    twitchUrl: document.getElementById('twitch-url'),
    twitchUsername: document.getElementById('twitch-username'),
    twitchState: document.getElementById('twitch-state'),
    discordEnabled: document.getElementById('discord-enabled'),
    discordUrl: document.getElementById('discord-url'),
    discordUsername: document.getElementById('discord-username'),
    discordState: document.getElementById('discord-state'),
    onlyfansEnabled: document.getElementById('onlyfans-enabled'),
    onlyfansUrl: document.getElementById('onlyfans-url'),
    onlyfansUsername: document.getElementById('onlyfans-username'),
    onlyfansState: document.getElementById('onlyfans-state'),
    spotifyEnabled: document.getElementById('spotify-enabled'),
    spotifyUrl: document.getElementById('spotify-url'),
    spotifyUsername: document.getElementById('spotify-username'),
    spotifyState: document.getElementById('spotify-state'),
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
    homepageNoteText: document.getElementById('homepage-note-text-input'),
    homepageNoteState: document.getElementById('homepage-note-state'),
    homepageNoteCount: document.getElementById('homepage-note-count'),
    maintenanceEnabled: document.getElementById('maintenance-enabled'),
    maintenanceTitle: document.getElementById('maintenance-title'),
    maintenanceMessage: document.getElementById('maintenance-message'),
    maintenanceEta: document.getElementById('maintenance-eta'),
    maintenanceState: document.getElementById('maintenance-state'),
    entranceMode: document.getElementById('entrance-mode'),
    entranceModeState: document.getElementById('entrance-mode-state'),
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

function parseAdminDate(value) {
    if (!value) return null;
    // The legacy questions/drawings columns return a PostgreSQL timestamp
    // without a zone (for example 2026-07-17T13:49:10.104303). Supabase's
    // server value is UTC, but browsers otherwise interpret it as the
    // device's local time, producing different/future dates across devices.
    const raw = String(value).trim();
    const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(raw)
        ? `${raw}Z`
        : raw;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
    const date = parseAdminDate(value);
    return date ? adminDateFormatter.format(date) : String(value || 'unknown date');
}

function formatRelativeDate(value) {
    const date = parseAdminDate(value);
    if (!date) return 'unknown';
    const differenceMs = date.getTime() - Date.now();
    if (differenceMs > ADMIN_FUTURE_DATE_TOLERANCE_MS) return 'check timestamp';
    const seconds = Math.round(Math.min(0, differenceMs) / 1000);
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
    const pendingDrawings = state.adminListTotals['pending-drawings-list'] || 0;
    const publishedDrawings = state.adminListTotals['published-drawings-list'] || 0;
    const pendingQuestions = state.adminListTotals['pending-questions-list'] || 0;
    const publishedQuestions = state.adminListTotals['published-questions-list'] || 0;
    const publicLinkKeys = [...SOCIAL_CARD_KEYS, 'throne'];
    const activeLinks = publicLinkKeys
        .filter(key => state.linkSettings[`${key}_enabled`] !== false).length;
    if (els.reviewTabCount) els.reviewTabCount.textContent = String(pendingDrawings + pendingQuestions);
    if (els.publishedTabCount) els.publishedTabCount.textContent = String(publishedDrawings + publishedQuestions);
    if (els.linksTabCount) els.linksTabCount.textContent = `${activeLinks}/${publicLinkKeys.length}`;

    els.stats.innerHTML = `
        <div class="admin-stat"><strong>${pendingDrawings + pendingQuestions}</strong><span>waiting review</span></div>
        <div class="admin-stat"><strong>${publishedDrawings + publishedQuestions}</strong><span>published posts</span></div>
        <div class="admin-stat"><strong>${activeLinks}/${publicLinkKeys.length}</strong><span>public links</span></div>
    `;
}

function emptyMessage(text) {
    return `<div class="admin-empty">${text}</div>`;
}

function getAdminListItems(listId) {
    return state.adminListItems[listId] || [];
}

function ensureAdminPagination(container) {
    const listId = container?.id;
    const config = ADMIN_LIST_PAGINATION[listId];
    if (!container || !config) return null;

    let controls = document.getElementById(`${listId}-pagination`);
    if (controls) return controls;

    controls = document.createElement('nav');
    controls.id = `${listId}-pagination`;
    controls.className = 'admin-pagination';
    controls.setAttribute('aria-label', `${config.label} pages`);
    controls.hidden = true;
    controls.innerHTML = `
        <button type="button" class="soft" data-page-step="-1" aria-label="previous ${escapeHtml(config.label)} page">&larr;</button>
        <span aria-live="polite"></span>
        <button type="button" class="soft" data-page-step="1" aria-label="next ${escapeHtml(config.label)} page">&rarr;</button>
    `;
    container.insertAdjacentElement('afterend', controls);
    controls.addEventListener('click', async event => {
        const button = event.target.closest('button[data-page-step]');
        if (!button || button.disabled) return;
        const step = Number(button.dataset.pageStep);
        if (!Number.isFinite(step)) return;
        adminListPages.set(listId, (adminListPages.get(listId) || 1) + step);
        await loadAdminList(listId);
    });
    return controls;
}

function paginateAdminList(list, container) {
    const listId = container?.id;
    const config = ADMIN_LIST_PAGINATION[listId];
    if (!config) return list;

    const controls = ensureAdminPagination(container);
    const totalItems = state.adminListTotals[listId] || 0;
    const totalPages = Math.max(1, Math.ceil(totalItems / config.pageSize));
    const requestedPage = adminListPages.get(listId) || 1;
    const currentPage = Math.max(1, Math.min(requestedPage, totalPages));
    const start = (currentPage - 1) * config.pageSize;
    const end = Math.min(start + config.pageSize, totalItems);
    adminListPages.set(listId, currentPage);

    if (controls) {
        controls.hidden = totalPages <= 1;
        const previous = controls.querySelector('[data-page-step="-1"]');
        const next = controls.querySelector('[data-page-step="1"]');
        const status = controls.querySelector('span');
        if (previous) previous.disabled = currentPage <= 1;
        if (next) next.disabled = currentPage >= totalPages;
        if (status) {
            status.textContent = totalItems
                ? `${start + 1}–${end} of ${totalItems} · page ${currentPage}/${totalPages}`
                : '';
        }
    }

    return list;
}

function renderAdminListById(listId) {
    if (listId === 'pending-drawings-list') {
        renderDrawings(getAdminListItems(listId), els.pendingDrawings, false);
        return;
    }
    if (listId === 'published-drawings-list') {
        renderDrawings(getAdminListItems(listId), els.publishedDrawings, true);
        return;
    }
    if (listId === 'pending-questions-list') {
        renderQuestions(getAdminListItems(listId), els.pendingQuestions, false);
        return;
    }
    if (listId === 'published-questions-list') {
        renderQuestions(getAdminListItems(listId), els.publishedQuestions, true);
        return;
    }
    if (listId === 'wishlist-items-list') renderWishlistItems();
}

function isAdminListItemSelected(listId, id) {
    const selection = adminListSelections.get(listId);
    if (!selection) return false;
    return selection.ids.has(String(id));
}

function renderDrawings(list, container, published) {
    const pageItems = paginateAdminList(list, container);
    if (!(state.adminListTotals[container.id] || 0)) {
        container.innerHTML = emptyMessage(published ? 'no posted doods' : 'nothing waiting');
        return;
    }

    container.innerHTML = pageItems.map(item => `
        <article class="admin-card" data-id="${escapeHtml(item.id)}">
            <label class="admin-select">
                <input type="checkbox" data-select-id="${escapeHtml(item.id)}"${isAdminListItemSelected(container.id, item.id) ? ' checked' : ''}>
                <span></span>
            </label>
            <img src="${getDrawingSrc(item.imageData)}" alt="" loading="lazy" decoding="async">
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
    const pageItems = paginateAdminList(list, container);
    if (!(state.adminListTotals[container.id] || 0)) {
        container.innerHTML = emptyMessage(published ? 'no answered asks' : 'no asks waiting');
        return;
    }

    container.innerHTML = pageItems.map(item => `
        <article class="admin-card admin-question-card" data-id="${escapeHtml(item.id)}">
            <p class="admin-question">${escapeHtml(item.question)}</p>
            ${renderShortMeta(item)}
            <textarea data-answer-for="${escapeHtml(item.id)}" placeholder="reply">${escapeHtml(adminQuestionDrafts.has(String(item.id)) ? adminQuestionDrafts.get(String(item.id)) : (item.answer || ''))}</textarea>
            <div class="admin-actions">
                <button data-action="save-question">${published ? 'save edit' : 'save reply'}</button>
                <button class="danger" data-action="delete-question">delete</button>
            </div>
        </article>
    `).join('');
}

function normalizeSocialCardOrder(value) {
    const requested = Array.isArray(value) ? value : [];
    const valid = requested.filter((key, index) =>
        SOCIAL_CARD_KEYS.includes(key) && requested.indexOf(key) === index
    );
    return [...valid, ...SOCIAL_CARD_KEYS.filter(key => !valid.includes(key))];
}

function normalizeSocialUsername(value) {
    return String(value ?? '').trim().replace(/^@+/, '').slice(0, 80);
}

function readSocialUsernameSetting(settings, key) {
    const settingKey = `${key}_username`;
    return Object.prototype.hasOwnProperty.call(settings, settingKey)
        ? normalizeSocialUsername(settings[settingKey])
        : DEFAULT_LINK_SETTINGS[settingKey];
}

function readBooleanSetting(settings, key) {
    return Object.prototype.hasOwnProperty.call(settings, key)
        && typeof settings[key] === 'boolean'
        ? settings[key]
        : DEFAULT_LINK_SETTINGS[key];
}

function getDraftSocialUsername(key, input) {
    if (input) return normalizeSocialUsername(input.value);
    return readSocialUsernameSetting(state.linkSettings, key);
}

function getSocialUsernameControls() {
    return [
        { key: 'snapchat', username: els.snapchatUsername, url: els.snapchatUrl },
        { key: 'instagram', username: els.instagramUsername, url: els.instagramUrl },
        { key: 'kofi', username: els.kofiUsername, url: els.kofiUrl },
        { key: 'telegram', username: els.telegramUsername, url: els.telegramUrl },
        { key: 'x', username: els.xUsername, url: els.xUrl },
        { key: 'tiktok', username: els.tiktokUsername, url: els.tiktokUrl },
        { key: 'twitch', username: els.twitchUsername, url: els.twitchUrl },
        { key: 'discord', username: els.discordUsername, url: els.discordUrl },
        { key: 'onlyfans', username: els.onlyfansUsername, url: els.onlyfansUrl },
        { key: 'spotify', username: els.spotifyUsername, url: els.spotifyUrl }
    ];
}

function syncSocialUrlFromUsername(key, usernameInput, urlInput) {
    const username = normalizeSocialUsername(usernameInput?.value);
    const buildUrl = SOCIAL_USERNAME_URL_BUILDERS[key];
    if (!username || !buildUrl || !urlInput) return false;
    const nextUrl = buildUrl(username);
    if (urlInput.value === nextUrl) return false;
    urlInput.value = nextUrl;
    return true;
}

function normalizeLinkSettings(value) {
    const settings = value && typeof value === 'object' ? value : {};
    return {
        snapchat_url: String(settings.snapchat_url || DEFAULT_LINK_SETTINGS.snapchat_url),
        snapchat_username: readSocialUsernameSetting(settings, 'snapchat'),
        snapchat_enabled: readBooleanSetting(settings, 'snapchat_enabled'),
        snapchat_card_video_url: String(settings.snapchat_card_video_url || ''),
        snapchat_card_video_path: String(settings.snapchat_card_video_path || ''),
        instagram_url: String(settings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url),
        instagram_username: readSocialUsernameSetting(settings, 'instagram'),
        instagram_enabled: readBooleanSetting(settings, 'instagram_enabled'),
        instagram_card_video_url: String(settings.instagram_card_video_url || ''),
        instagram_card_video_path: String(settings.instagram_card_video_path || ''),
        kofi_url: String(settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url),
        kofi_username: readSocialUsernameSetting(settings, 'kofi'),
        kofi_enabled: readBooleanSetting(settings, 'kofi_enabled'),
        kofi_card_video_url: String(settings.kofi_card_video_url || ''),
        kofi_card_video_path: String(settings.kofi_card_video_path || ''),
        telegram_url: String(settings.telegram_url || DEFAULT_LINK_SETTINGS.telegram_url),
        telegram_username: readSocialUsernameSetting(settings, 'telegram'),
        telegram_enabled: readBooleanSetting(settings, 'telegram_enabled'),
        telegram_card_video_url: String(settings.telegram_card_video_url || ''),
        telegram_card_video_path: String(settings.telegram_card_video_path || ''),
        x_url: String(settings.x_url || DEFAULT_LINK_SETTINGS.x_url),
        x_username: readSocialUsernameSetting(settings, 'x'),
        x_enabled: readBooleanSetting(settings, 'x_enabled'),
        x_card_video_url: String(settings.x_card_video_url || ''),
        x_card_video_path: String(settings.x_card_video_path || ''),
        tiktok_url: String(settings.tiktok_url || DEFAULT_LINK_SETTINGS.tiktok_url),
        tiktok_username: readSocialUsernameSetting(settings, 'tiktok'),
        tiktok_enabled: readBooleanSetting(settings, 'tiktok_enabled'),
        tiktok_card_video_url: String(settings.tiktok_card_video_url || ''),
        tiktok_card_video_path: String(settings.tiktok_card_video_path || ''),
        twitch_url: String(settings.twitch_url || DEFAULT_LINK_SETTINGS.twitch_url),
        twitch_username: readSocialUsernameSetting(settings, 'twitch'),
        twitch_enabled: readBooleanSetting(settings, 'twitch_enabled'),
        twitch_card_video_url: String(settings.twitch_card_video_url || ''),
        twitch_card_video_path: String(settings.twitch_card_video_path || ''),
        discord_url: String(settings.discord_url || DEFAULT_LINK_SETTINGS.discord_url),
        discord_username: readSocialUsernameSetting(settings, 'discord'),
        discord_enabled: readBooleanSetting(settings, 'discord_enabled'),
        discord_card_video_url: String(settings.discord_card_video_url || ''),
        discord_card_video_path: String(settings.discord_card_video_path || ''),
        onlyfans_url: String(settings.onlyfans_url || DEFAULT_LINK_SETTINGS.onlyfans_url),
        onlyfans_username: readSocialUsernameSetting(settings, 'onlyfans'),
        onlyfans_enabled: readBooleanSetting(settings, 'onlyfans_enabled'),
        onlyfans_card_video_url: String(settings.onlyfans_card_video_url || ''),
        onlyfans_card_video_path: String(settings.onlyfans_card_video_path || ''),
        spotify_url: String(settings.spotify_url || DEFAULT_LINK_SETTINGS.spotify_url),
        spotify_username: readSocialUsernameSetting(settings, 'spotify'),
        spotify_enabled: readBooleanSetting(settings, 'spotify_enabled'),
        spotify_card_video_url: String(settings.spotify_card_video_url || ''),
        spotify_card_video_path: String(settings.spotify_card_video_path || ''),
        social_card_order: normalizeSocialCardOrder(settings.social_card_order),
        throne_url: String(settings.throne_url || DEFAULT_LINK_SETTINGS.throne_url),
        throne_enabled: readBooleanSetting(settings, 'throne_enabled'),
        throne_checkout_mode: settings.throne_checkout_mode === 'widget' ? 'widget' : 'mockup',
        wishlist_view_mode: WISHLIST_VIEW_MODES.includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry',
        homepage_note_text: String(settings.homepage_note_text || '').slice(0, 220),
        homepage_note_font_size: Math.min(17, Math.max(9, Number(settings.homepage_note_font_size) || DEFAULT_LINK_SETTINGS.homepage_note_font_size)),
        maintenance_enabled: readBooleanSetting(settings, 'maintenance_enabled'),
        maintenance_title: String(settings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title),
        maintenance_message: String(settings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message),
        maintenance_eta: String(settings.maintenance_eta || ''),
        entrance_mode: ['paw', 'bubbles'].includes(settings.entrance_mode)
            ? settings.entrance_mode
            : DEFAULT_LINK_SETTINGS.entrance_mode,
        drawings_enabled: readBooleanSetting(settings, 'drawings_enabled'),
        questions_enabled: readBooleanSetting(settings, 'questions_enabled'),
        rooms_enabled: readBooleanSetting(settings, 'rooms_enabled'),
        seo_title: String(settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title),
        seo_description: String(settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description),
        site_tagline: String(settings.site_tagline || DEFAULT_LINK_SETTINGS.site_tagline)
    };
}

function ensureSocialOrderControls() {
    SOCIAL_CARD_KEYS.forEach(key => {
        const card = document.querySelector(`[data-link-card="${key}"]`);
        const actions = card?.querySelector('.admin-link-card-actions');
        if (!actions || actions.querySelector('.admin-social-order-controls')) return;
        card.classList.add('has-social-order');
        const controls = document.createElement('span');
        controls.className = 'admin-social-order-controls';
        controls.innerHTML = `
            <button class="admin-social-move" type="button" data-social-move="up" data-social-key="${key}" aria-label="Move ${key} card up">↑</button>
            <span class="admin-social-position" aria-label="Card position"></span>
            <button class="admin-social-move" type="button" data-social-move="down" data-social-key="${key}" aria-label="Move ${key} card down">↓</button>
        `;
        actions.prepend(controls);
    });
}

function applyAdminSocialCardOrder(settings = state.linkSettings) {
    ensureSocialOrderControls();
    const order = normalizeSocialCardOrder(settings.social_card_order);
    const grid = document.querySelector('#links-panel .admin-link-grid');
    const throneCard = grid?.querySelector('[data-link-card="throne"]');
    if (!grid) return;

    order.forEach(key => {
        const card = grid.querySelector(`[data-link-card="${key}"]`);
        if (card) grid.insertBefore(card, throneCard || null);
    });

    order.forEach((key, index) => {
        const card = grid.querySelector(`[data-link-card="${key}"]`);
        const position = card?.querySelector('.admin-social-position');
        const up = card?.querySelector('[data-social-move="up"]');
        const down = card?.querySelector('[data-social-move="down"]');
        if (position) position.textContent = `${index + 1}·${order.length}`;
        if (up) up.disabled = index === 0;
        if (down) down.disabled = index === order.length - 1;
    });
}

function moveSocialCard(key, direction) {
    if (!linkSettingsHydrated) {
        setStatus(els.adminStatus, 'Saved site settings are still loading.');
        return;
    }
    const order = normalizeSocialCardOrder(state.linkSettings.social_card_order);
    const currentIndex = order.indexOf(key);
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];
    state.linkSettings.social_card_order = order;
    settingsDraftDirty = true;
    applyAdminSocialCardOrder(state.linkSettings);
    renderLinkPreview();
    scheduleAutoSave();
}

function setLinkSettingsHydrated(ready) {
    linkSettingsHydrated = Boolean(ready);
    if (!els.linkSettingsForm) return;
    els.linkSettingsForm.classList.toggle('settings-hydrating', !linkSettingsHydrated);
    els.linkSettingsForm.toggleAttribute('inert', !linkSettingsHydrated);
    els.linkSettingsForm.setAttribute('aria-busy', linkSettingsHydrated ? 'false' : 'true');
}

function renderLinkSettings({ preserveDraft = false } = {}) {
    const settings = state.linkSettings;
    if (els.linkSettingsForm) {
        els.linkSettingsForm.classList.toggle('settings-unavailable', !state.linkSettingsAvailable);
    }
    applyAdminSocialCardOrder(settings);
    renderAllSocialVideoControls();
    if (preserveDraft && (settingsDraftDirty || settingsSavePending > 0)) {
        renderLinkPreview();
        return;
    }
    if (els.snapchatEnabled) els.snapchatEnabled.checked = settings.snapchat_enabled !== false;
    if (els.snapchatUrl) els.snapchatUrl.value = settings.snapchat_url || '';
    if (els.snapchatUsername) els.snapchatUsername.value = settings.snapchat_username ?? '';
    if (els.snapchatState) els.snapchatState.textContent = settings.snapchat_enabled !== false ? 'visible' : 'hidden';
    if (els.instagramEnabled) els.instagramEnabled.checked = settings.instagram_enabled !== false;
    if (els.instagramUrl) els.instagramUrl.value = settings.instagram_url || '';
    if (els.instagramUsername) els.instagramUsername.value = settings.instagram_username ?? '';
    if (els.instagramState) els.instagramState.textContent = settings.instagram_enabled !== false ? 'visible' : 'hidden';
    if (els.kofiEnabled) els.kofiEnabled.checked = settings.kofi_enabled !== false;
    if (els.kofiUrl) els.kofiUrl.value = settings.kofi_url || '';
    if (els.kofiUsername) els.kofiUsername.value = settings.kofi_username ?? '';
    if (els.kofiState) els.kofiState.textContent = settings.kofi_enabled !== false ? 'visible' : 'hidden';
    if (els.kofiUrlPreview) els.kofiUrlPreview.textContent = settings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url;
    if (els.telegramEnabled) els.telegramEnabled.checked = settings.telegram_enabled !== false;
    if (els.telegramUrl) els.telegramUrl.value = settings.telegram_url || '';
    if (els.telegramUsername) els.telegramUsername.value = settings.telegram_username ?? '';
    if (els.telegramState) els.telegramState.textContent = settings.telegram_enabled !== false ? 'visible' : 'hidden';
    if (els.xEnabled) els.xEnabled.checked = settings.x_enabled !== false;
    if (els.xUrl) els.xUrl.value = settings.x_url || '';
    if (els.xUsername) els.xUsername.value = settings.x_username ?? '';
    if (els.xState) els.xState.textContent = settings.x_enabled !== false ? 'visible' : 'hidden';
    if (els.tiktokEnabled) els.tiktokEnabled.checked = settings.tiktok_enabled !== false;
    if (els.tiktokUrl) els.tiktokUrl.value = settings.tiktok_url || '';
    if (els.tiktokUsername) els.tiktokUsername.value = settings.tiktok_username ?? '';
    if (els.tiktokState) els.tiktokState.textContent = settings.tiktok_enabled !== false ? 'visible' : 'hidden';
    if (els.twitchEnabled) els.twitchEnabled.checked = settings.twitch_enabled !== false;
    if (els.twitchUrl) els.twitchUrl.value = settings.twitch_url || '';
    if (els.twitchUsername) els.twitchUsername.value = settings.twitch_username ?? '';
    if (els.twitchState) els.twitchState.textContent = settings.twitch_enabled !== false ? 'visible' : 'hidden';
    if (els.discordEnabled) els.discordEnabled.checked = settings.discord_enabled !== false;
    if (els.discordUrl) els.discordUrl.value = settings.discord_url || '';
    if (els.discordUsername) els.discordUsername.value = settings.discord_username ?? '';
    if (els.discordState) els.discordState.textContent = settings.discord_enabled !== false ? 'visible' : 'hidden';
    if (els.onlyfansEnabled) els.onlyfansEnabled.checked = settings.onlyfans_enabled !== false;
    if (els.onlyfansUrl) els.onlyfansUrl.value = settings.onlyfans_url || '';
    if (els.onlyfansUsername) els.onlyfansUsername.value = settings.onlyfans_username ?? '';
    if (els.onlyfansState) els.onlyfansState.textContent = settings.onlyfans_enabled !== false ? 'visible' : 'hidden';
    if (els.spotifyEnabled) els.spotifyEnabled.checked = settings.spotify_enabled !== false;
    if (els.spotifyUrl) els.spotifyUrl.value = settings.spotify_url || '';
    if (els.spotifyUsername) els.spotifyUsername.value = settings.spotify_username ?? '';
    if (els.spotifyState) els.spotifyState.textContent = settings.spotify_enabled !== false ? 'visible' : 'hidden';
    if (els.throneEnabled) els.throneEnabled.checked = settings.throne_enabled !== false;
    if (els.throneUrl) els.throneUrl.value = settings.throne_url || '';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.throneCheckoutMode) els.throneCheckoutMode.value = settings.throne_checkout_mode === 'widget' ? 'widget' : 'mockup';
    if (els.wishlistViewMode) els.wishlistViewMode.value = WISHLIST_VIEW_MODES.includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry';
    if (els.homepageNoteText) els.homepageNoteText.value = settings.homepage_note_text || '';
    if (els.maintenanceEnabled) els.maintenanceEnabled.checked = settings.maintenance_enabled === true;
    if (els.maintenanceTitle) els.maintenanceTitle.value = settings.maintenance_title || '';
    if (els.maintenanceMessage) els.maintenanceMessage.value = settings.maintenance_message || '';
    if (els.maintenanceEta) els.maintenanceEta.value = settings.maintenance_eta || '';
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.entranceMode) els.entranceMode.value = settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw';
    if (els.entranceModeState) els.entranceModeState.textContent = settings.entrance_mode === 'bubbles' ? 'pop bubbles' : 'paw press';
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
        snapchat_username: getDraftSocialUsername('snapchat', els.snapchatUsername),
        snapchat_enabled: els.snapchatEnabled?.checked !== false,
        snapchat_card_video_url: state.linkSettings.snapchat_card_video_url || '',
        snapchat_card_video_path: state.linkSettings.snapchat_card_video_path || '',
        instagram_url: els.instagramUrl?.value.trim() || state.linkSettings.instagram_url || DEFAULT_LINK_SETTINGS.instagram_url,
        instagram_username: getDraftSocialUsername('instagram', els.instagramUsername),
        instagram_enabled: els.instagramEnabled?.checked !== false,
        instagram_card_video_url: state.linkSettings.instagram_card_video_url || '',
        instagram_card_video_path: state.linkSettings.instagram_card_video_path || '',
        kofi_url: els.kofiUrl?.value.trim() || state.linkSettings.kofi_url || DEFAULT_LINK_SETTINGS.kofi_url,
        kofi_username: getDraftSocialUsername('kofi', els.kofiUsername),
        kofi_enabled: els.kofiEnabled?.checked !== false,
        kofi_card_video_url: state.linkSettings.kofi_card_video_url || '',
        kofi_card_video_path: state.linkSettings.kofi_card_video_path || '',
        telegram_url: els.telegramUrl?.value.trim() || state.linkSettings.telegram_url || DEFAULT_LINK_SETTINGS.telegram_url,
        telegram_username: getDraftSocialUsername('telegram', els.telegramUsername),
        telegram_enabled: els.telegramEnabled?.checked !== false,
        telegram_card_video_url: state.linkSettings.telegram_card_video_url || '',
        telegram_card_video_path: state.linkSettings.telegram_card_video_path || '',
        x_url: els.xUrl?.value.trim() || state.linkSettings.x_url || DEFAULT_LINK_SETTINGS.x_url,
        x_username: getDraftSocialUsername('x', els.xUsername),
        x_enabled: els.xEnabled?.checked !== false,
        x_card_video_url: state.linkSettings.x_card_video_url || '',
        x_card_video_path: state.linkSettings.x_card_video_path || '',
        tiktok_url: els.tiktokUrl?.value.trim() || state.linkSettings.tiktok_url || DEFAULT_LINK_SETTINGS.tiktok_url,
        tiktok_username: getDraftSocialUsername('tiktok', els.tiktokUsername),
        tiktok_enabled: els.tiktokEnabled?.checked !== false,
        tiktok_card_video_url: state.linkSettings.tiktok_card_video_url || '',
        tiktok_card_video_path: state.linkSettings.tiktok_card_video_path || '',
        twitch_url: els.twitchUrl?.value.trim() || state.linkSettings.twitch_url || DEFAULT_LINK_SETTINGS.twitch_url,
        twitch_username: getDraftSocialUsername('twitch', els.twitchUsername),
        twitch_enabled: els.twitchEnabled?.checked !== false,
        twitch_card_video_url: state.linkSettings.twitch_card_video_url || '',
        twitch_card_video_path: state.linkSettings.twitch_card_video_path || '',
        discord_url: els.discordUrl?.value.trim() || state.linkSettings.discord_url || DEFAULT_LINK_SETTINGS.discord_url,
        discord_username: getDraftSocialUsername('discord', els.discordUsername),
        discord_enabled: els.discordEnabled?.checked !== false,
        discord_card_video_url: state.linkSettings.discord_card_video_url || '',
        discord_card_video_path: state.linkSettings.discord_card_video_path || '',
        onlyfans_url: els.onlyfansUrl?.value.trim() || state.linkSettings.onlyfans_url || DEFAULT_LINK_SETTINGS.onlyfans_url,
        onlyfans_username: getDraftSocialUsername('onlyfans', els.onlyfansUsername),
        onlyfans_enabled: els.onlyfansEnabled?.checked !== false,
        onlyfans_card_video_url: state.linkSettings.onlyfans_card_video_url || '',
        onlyfans_card_video_path: state.linkSettings.onlyfans_card_video_path || '',
        spotify_url: els.spotifyUrl?.value.trim() || state.linkSettings.spotify_url || DEFAULT_LINK_SETTINGS.spotify_url,
        spotify_username: getDraftSocialUsername('spotify', els.spotifyUsername),
        spotify_enabled: els.spotifyEnabled?.checked !== false,
        spotify_card_video_url: state.linkSettings.spotify_card_video_url || '',
        spotify_card_video_path: state.linkSettings.spotify_card_video_path || '',
        social_card_order: normalizeSocialCardOrder(state.linkSettings.social_card_order),
        throne_url: els.throneUrl?.value.trim() || state.linkSettings.throne_url || DEFAULT_LINK_SETTINGS.throne_url,
        throne_enabled: els.throneEnabled?.checked !== false,
        throne_checkout_mode: els.throneCheckoutMode?.value === 'widget' ? 'widget' : 'mockup',
        wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
        homepage_note_text: (els.homepageNoteText?.value || '').slice(0, 220),
        homepage_note_font_size: Math.min(17, Math.max(9, Number(state.linkSettings.homepage_note_font_size) || DEFAULT_LINK_SETTINGS.homepage_note_font_size)),
        maintenance_enabled: els.maintenanceEnabled?.checked === true,
        maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
        maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
        maintenance_eta: els.maintenanceEta?.value.trim() || '',
        entrance_mode: els.entranceMode?.value === 'bubbles' ? 'bubbles' : 'paw',
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
    if (els.telegramState) els.telegramState.textContent = settings.telegram_enabled !== false ? 'visible' : 'hidden';
    if (els.xState) els.xState.textContent = settings.x_enabled !== false ? 'visible' : 'hidden';
    if (els.tiktokState) els.tiktokState.textContent = settings.tiktok_enabled !== false ? 'visible' : 'hidden';
    if (els.twitchState) els.twitchState.textContent = settings.twitch_enabled !== false ? 'visible' : 'hidden';
    if (els.discordState) els.discordState.textContent = settings.discord_enabled !== false ? 'visible' : 'hidden';
    if (els.onlyfansState) els.onlyfansState.textContent = settings.onlyfans_enabled !== false ? 'visible' : 'hidden';
    if (els.spotifyState) els.spotifyState.textContent = settings.spotify_enabled !== false ? 'visible' : 'hidden';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    const homepageNoteText = String(settings.homepage_note_text || '');
    if (els.homepageNoteState) els.homepageNoteState.textContent = homepageNoteText ? 'visible' : 'blank';
    if (els.homepageNoteCount) els.homepageNoteCount.textContent = `${homepageNoteText.length}/220`;
    document.querySelector('[data-link-card="homepage-note"]')?.classList.toggle('is-disabled', !homepageNoteText);
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.entranceModeState) els.entranceModeState.textContent = settings.entrance_mode === 'bubbles' ? 'pop bubbles' : 'paw press';
    if (els.submissionsState) els.submissionsState.textContent = getSubmissionsStateLabel(settings);
    if (els.roomsMasterState) els.roomsMasterState.textContent = settings.rooms_enabled !== false ? 'enabled' : 'disabled';
    els.roomsDisabledBanner?.classList.toggle('hidden', settings.rooms_enabled !== false);
    if (els.seoPreviewTitle) els.seoPreviewTitle.textContent = settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
    if (els.seoPreviewDescription) els.seoPreviewDescription.textContent = settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
    if (els.seoTitleCount) els.seoTitleCount.textContent = `${settings.seo_title.length}/70`;
    if (els.seoDescriptionCount) els.seoDescriptionCount.textContent = `${settings.seo_description.length}/180`;
    if (els.siteTaglineCount) els.siteTaglineCount.textContent = `${settings.site_tagline.length}/120`;
    if (els.seoState) els.seoState.textContent = settingsDraftDirty ? 'editing' : 'ready';
    [...SOCIAL_CARD_KEYS, 'throne', 'maintenance', 'submissions'].forEach(key => {
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
    status.classList.toggle('is-paused', tone === 'paused');
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
    if (['mp4', 'webm', 'mov', 'gif'].includes(namedExtension)) return namedExtension;
    // M4V is the same MPEG-4 family and is a common iPhone export. Store it
    // with an .mp4 extension/content type so the public video element gets
    // the broadly-supported MIME type it expects.
    if (namedExtension === 'm4v' || file?.type === 'video/x-m4v') return 'mp4';
    if (file?.type === 'video/webm') return 'webm';
    if (file?.type === 'video/quicktime') return 'mov';
    if (file?.type === 'image/gif') return 'gif';
    if (file?.type === 'video/mp4') return 'mp4';
    return '';
}

function isGifSocialMedia(value) {
    if (value instanceof File) {
        return value.type === 'image/gif' || String(value.name || '').toLowerCase().endsWith('.gif');
    }
    return /\.gif(?:$|[?#])/i.test(String(value || ''));
}

function getSocialMediaContentType(extension) {
    if (extension === 'gif') return 'image/gif';
    if (extension === 'mov') return 'video/quicktime';
    if (extension === 'webm') return 'video/webm';
    return 'video/mp4';
}

function validateSocialVideoFile(file) {
    if (!file) throw new Error('Choose a background file first.');
    const extension = getSocialVideoFileExtension(file);
    const supportedType = SOCIAL_CARD_VIDEO_TYPES.has(file.type) || Boolean(extension);
    if (!supportedType) throw new Error('Use an MP4, M4V, MOV, WebM, or GIF file.');
    if (file.size > MAX_SOCIAL_CARD_VIDEO_BYTES) {
        throw new Error(`${formatUploadSize(file.size)} is too large — use a background 20 MB or smaller.`);
    }
    return extension;
}

function setAdminSocialMediaPreview(control, source, useGif) {
    const videoPreview = control?.querySelector('[data-video-preview]');
    const imagePreview = control?.querySelector('[data-image-preview]');

    if (useGif) {
        if (videoPreview) {
            videoPreview.pause();
            videoPreview.removeAttribute('src');
            videoPreview.dataset.source = '';
            videoPreview.hidden = true;
            videoPreview.load();
        }
        if (imagePreview) {
            if (imagePreview.dataset.source !== source) {
                imagePreview.dataset.source = source;
                imagePreview.src = source;
            }
            imagePreview.hidden = !source;
        }
        return;
    }

    if (imagePreview) {
        imagePreview.removeAttribute('src');
        imagePreview.dataset.source = '';
        imagePreview.hidden = true;
    }
    if (!videoPreview) return;
    if (videoPreview.dataset.source !== source) {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.dataset.source = source;
        if (source) {
            videoPreview.src = source;
            videoPreview.load();
        }
    }
    videoPreview.hidden = !source;
}

function setSocialVideoBusy(key, busy, message = '') {
    const control = getSocialVideoControl(key);
    if (!control) return;
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        renderSocialVideoControl(key);
        return;
    }
    const fileInput = control.querySelector('[data-video-file]');
    const uploadButton = control.querySelector('[data-video-upload]');
    const removeButton = control.querySelector('[data-video-remove]');
    const hasSavedVideo = Boolean(
        state.linkSettings[getSocialVideoSettingKey(key, 'url')]
        || state.linkSettings[getSocialVideoSettingKey(key, 'path')]
    );
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
    const uploadButton = control.querySelector('[data-video-upload]');
    const removeButton = control.querySelector('[data-video-remove]');
    const pickerLabel = control.querySelector('.admin-video-picker > span');
    const savedUrl = String(state.linkSettings[getSocialVideoSettingKey(key, 'url')] || '');
    const savedPath = String(state.linkSettings[getSocialVideoSettingKey(key, 'path')] || '');
    const selectedFile = socialVideoSelectedFiles.get(key) || null;
    const hasLocalPreview = socialVideoObjectUrls.has(key);
    const note = control.querySelector('.admin-card-video-note');

    control.classList.toggle('is-hosting-paused', SOCIAL_CARD_VIDEO_HOSTING_PAUSED);
    control.setAttribute('aria-disabled', String(SOCIAL_CARD_VIDEO_HOSTING_PAUSED));
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        if (fileInput) {
            fileInput.value = '';
            fileInput.disabled = true;
        }
        if (uploadButton) uploadButton.disabled = true;
        if (removeButton) removeButton.disabled = true;
        if (pickerLabel) pickerLabel.textContent = 'paused';
        setAdminSocialMediaPreview(control, '', false);
        const localFile = String(LOCAL_SOCIAL_CARD_VIDEOS[key] || '');
        setSocialVideoStatus(
            key,
            localFile ? 'local GitHub file active' : 'local mode · no background file',
            'paused'
        );
        if (note) {
            note.textContent = localFile
                ? `repository file: ${localFile}`
                : 'Supabase media controls are paused; this card currently has no local video.';
        }
        return;
    }

    if (!hasLocalPreview) {
        setAdminSocialMediaPreview(control, savedUrl, isGifSocialMedia(savedUrl));
    }

    if (!hasLocalPreview && !selectedFile) {
        setSocialVideoStatus(key, savedUrl ? 'background live' : 'no background');
    }
    if (pickerLabel) pickerLabel.textContent = selectedFile || savedUrl ? 'choose another' : 'choose media';
    if (uploadButton) uploadButton.disabled = !selectedFile;
    if (removeButton) removeButton.disabled = !(savedUrl || savedPath);
}

function renderAllSocialVideoControls() {
    const pauseNotice = document.querySelector('.admin-social-hosting-pause');
    if (pauseNotice) pauseNotice.hidden = !SOCIAL_CARD_VIDEO_HOSTING_PAUSED;
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
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        forgetSocialVideoPicker();
        return;
    }
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
        'Safari returned or reloaded without a file. Choose a supported file under 20 MB and tap Add or Done after selecting it.',
        'error'
    );
}

function handleSocialVideoSelection(key, inputOverride = null, { reportEmpty = false } = {}) {
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) return false;
    const control = getSocialVideoControl(key);
    const fileInput = inputOverride || control?.querySelector('[data-video-file]');
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
                'iPhone returned no file. Select the media, wait for it to load, then tap Add or Done.',
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
        setSocialVideoStatus(key, error.message || 'Background cannot be used.', 'error');
        return false;
    }

    // Commit the valid selection to the UI before asking Safari to build a
    // local media preview. Some iPhone/iCloud files cannot preview locally
    // even though the file itself is perfectly uploadable.
    socialVideoSelectedFiles.set(key, file);
    const uploadButton = control?.querySelector('[data-video-upload]');
    if (uploadButton) uploadButton.disabled = false;
    const pickerLabel = control?.querySelector('.admin-video-picker > span');
    if (pickerLabel) pickerLabel.textContent = 'choose another';
    setSocialVideoStatus(key, `${file.name || 'media'} · ${formatUploadSize(file.size)} ready — tap upload`, 'ready');

    try {
        const objectUrl = URL.createObjectURL(file);
        socialVideoObjectUrls.set(key, objectUrl);
        setAdminSocialMediaPreview(control, objectUrl, isGifSocialMedia(file));
    } catch (error) {
        // Selection and upload stay available; only the optional local
        // preview failed.
    }
    return true;
}

function beginSocialVideoPicker(key, fileInput) {
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) return;
    clearSocialVideoPickerTimer(key);
    socialVideoPendingInputs.set(key, fileInput);
    rememberSocialVideoPicker(key);
    const control = getSocialVideoControl(key);
    const pickerLabel = control?.querySelector('.admin-video-picker > span');
    if (pickerLabel) pickerLabel.textContent = 'waiting for Add…';
    setSocialVideoStatus(
        key,
        'Photo picker opened — choose the media, then tap Add or Done.',
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
            'No media came back from Photos. Previewing it is not enough — tap Add or Done to attach it.',
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
    if (pickerLabel) pickerLabel.textContent = 'choose media';
    setSocialVideoStatus(key, 'Media picker closed without selecting a file.', 'error');
}

function inspectPendingSocialVideoPickers() {
    window.setTimeout(() => {
        socialVideoPendingInputs.forEach((fileInput, key) => {
            if (fileInput?.files?.[0]) handleSocialVideoSelection(key, fileInput);
        });
    }, 350);
}

function socialVideoStorageError(error) {
    const message = String(error?.message || error || 'Media upload failed.');
    if (/bucket.*not found|not found.*bucket|row-level security|policy/i.test(message)) {
        return 'Run social-card-videos.sql in Supabase first.';
    }
    return message;
}

function readPendingSocialVideoCleanup() {
    try {
        const value = JSON.parse(localStorage.getItem(SOCIAL_VIDEO_CLEANUP_STORAGE_KEY) || '[]');
        return Array.isArray(value)
            ? value.filter(path => typeof path === 'string' && path.startsWith('cards/') && path.length <= 300).slice(-40)
            : [];
    } catch (error) {
        return [];
    }
}

function writePendingSocialVideoCleanup(paths) {
    try {
        const uniquePaths = Array.from(new Set(paths)).slice(-40);
        if (uniquePaths.length) {
            localStorage.setItem(SOCIAL_VIDEO_CLEANUP_STORAGE_KEY, JSON.stringify(uniquePaths));
        } else {
            localStorage.removeItem(SOCIAL_VIDEO_CLEANUP_STORAGE_KEY);
        }
    } catch (error) {}
}

function rememberPendingSocialVideoCleanup(path) {
    if (!path) return;
    writePendingSocialVideoCleanup([...readPendingSocialVideoCleanup(), path]);
}

function forgetPendingSocialVideoCleanup(path) {
    if (!path) return;
    writePendingSocialVideoCleanup(readPendingSocialVideoCleanup().filter(item => item !== path));
}

async function removeSocialVideoStoragePath(path, { attempts = 3 } = {}) {
    if (!path) return { ok: true, error: null };
    let lastError = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            const { error } = await adminClient.storage
                .from(SOCIAL_CARD_VIDEO_BUCKET)
                .remove([path]);
            if (!error) {
                forgetPendingSocialVideoCleanup(path);
                return { ok: true, error: null };
            }
            lastError = error;
        } catch (error) {
            lastError = error;
        }
        if (attempt < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
        }
    }
    rememberPendingSocialVideoCleanup(path);
    return { ok: false, error: lastError };
}

async function retryPendingSocialVideoCleanup() {
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) return;
    const pendingPaths = readPendingSocialVideoCleanup();
    for (const path of pendingPaths) {
        await removeSocialVideoStoragePath(path, { attempts: 1 });
    }
}

async function uploadSocialCardVideo(key) {
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        renderSocialVideoControl(key);
        return;
    }
    if (!SOCIAL_CARD_VIDEO_KEYS.includes(key)) return;
    const control = getSocialVideoControl(key);
    const fileInput = control?.querySelector('[data-video-file]');
    const file = socialVideoSelectedFiles.get(key) || fileInput?.files?.[0];
    let extension;
    try {
        extension = validateSocialVideoFile(file);
    } catch (error) {
        setSocialVideoStatus(key, error.message || 'Background cannot be used.', 'error');
        return;
    }

    const urlKey = getSocialVideoSettingKey(key, 'url');
    const pathKey = getSocialVideoSettingKey(key, 'path');
    const previousPath = state.linkSettings[pathKey] || '';
    const uniquePart = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    const storagePath = `cards/${key}-${Date.now()}-${uniquePart}.${extension}`;
    setSocialVideoBusy(key, true, 'uploading...');

    try {
        const { error: uploadError } = await adminClient.storage
            .from(SOCIAL_CARD_VIDEO_BUCKET)
            .upload(storagePath, file, {
                cacheControl: '31536000',
                contentType: getSocialMediaContentType(extension),
                upsert: false
            });
        if (uploadError) throw uploadError;

        const { data: publicData } = adminClient.storage
            .from(SOCIAL_CARD_VIDEO_BUCKET)
            .getPublicUrl(storagePath);
        const publicUrl = publicData?.publicUrl || '';
        if (!publicUrl) throw new Error('Could not create the public media URL.');

        settingsDraftDirty = true;
        const saved = await saveLinkSettingsNow({
            overrides: {
                [urlKey]: publicUrl,
                [pathKey]: storagePath
            },
            onCommitted: () => {
                state.linkSettings[urlKey] = publicUrl;
                state.linkSettings[pathKey] = storagePath;
            },
            onFailure: async () => {
                const cleanup = await removeSocialVideoStoragePath(storagePath);
                if (!cleanup.ok) console.warn('Failed upload cleanup:', cleanup.error);
            }
        });
        if (!saved) {
            throw new Error('Media uploaded, but its card setting could not be saved.');
        }

        const oldCleanup = previousPath && previousPath !== storagePath
            ? await removeSocialVideoStoragePath(previousPath)
            : { ok: true };
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        if (fileInput) fileInput.value = '';
        renderSocialVideoControl(key);
        setSocialVideoStatus(key, oldCleanup.ok
            ? 'background live ✓'
            : 'background live · old file cleanup will retry', oldCleanup.ok ? '' : 'error');
    } catch (error) {
        setSocialVideoStatus(key, socialVideoStorageError(error), 'error');
    } finally {
        setSocialVideoBusy(key, false);
    }
}

async function removeSocialCardVideo(key) {
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        renderSocialVideoControl(key);
        return;
    }
    if (!SOCIAL_CARD_VIDEO_KEYS.includes(key)) return;
    const urlKey = getSocialVideoSettingKey(key, 'url');
    const pathKey = getSocialVideoSettingKey(key, 'path');
    const previousUrl = state.linkSettings[urlKey] || '';
    const previousPath = state.linkSettings[pathKey] || '';
    if (!previousUrl && !previousPath) return;
    if (!window.confirm(`Remove the ${key} card background?`)) return;

    setSocialVideoBusy(key, true, 'removing...');
    settingsDraftDirty = true;

    try {
        const saved = await saveLinkSettingsNow({
            overrides: {
                [urlKey]: '',
                [pathKey]: ''
            },
            onCommitted: () => {
                state.linkSettings[urlKey] = '';
                state.linkSettings[pathKey] = '';
            }
        });
        if (!saved) {
            throw new Error('Could not save the empty background setting.');
        }
        const cleanup = previousPath
            ? await removeSocialVideoStoragePath(previousPath)
            : { ok: true };
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        const fileInput = getSocialVideoControl(key)?.querySelector('[data-video-file]');
        if (fileInput) fileInput.value = '';
        renderSocialVideoControl(key);
        setSocialVideoStatus(key, cleanup.ok
            ? 'removed ✓'
            : 'setting removed · file cleanup will retry', cleanup.ok ? '' : 'error');
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
        ['Open Graph title', staticSeoSnapshot.ogTitle, settings.seo_title],
        ['Open Graph description', staticSeoSnapshot.ogDescription, settings.seo_description],
        ['X card title', staticSeoSnapshot.twitterTitle, settings.seo_title],
        ['X card description', staticSeoSnapshot.twitterDescription, settings.seo_description],
        ['schema title', staticSeoSnapshot.structuredTitle, settings.seo_title],
        ['schema description', staticSeoSnapshot.structuredDescription, settings.seo_description],
        ['profile main entity', staticSeoSnapshot.profileMainEntity ? 'present' : 'missing', 'present'],
        ['profile modified date', staticSeoSnapshot.profileDateValid ? 'valid' : 'invalid', 'valid']
    ];
    const allMatch = rows.every(([, actual, expected]) => actual === expected);
    if (els.staticSeoState) els.staticSeoState.textContent = allMatch ? 'crawler copy matches' : 'GitHub publish needed';
    els.staticSeoRows.innerHTML = rows.map(([label, actual, expected]) => {
        const ok = actual === expected;
        return `
            <div class="admin-health-row admin-static-row ${ok ? 'is-ok' : 'is-bad'}">
                <span>${escapeHtml(label)}</span>
                <strong>${ok ? 'ok' : 'push'}</strong>
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
        let profileMainEntity = false;
        let profileDateValid = false;
        try {
            const data = JSON.parse(structuredText);
            const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
            const pageNode = graph.find(node => node['@type'] === 'WebPage' || node['@type'] === 'ProfilePage') || {};
            const profileNode = graph.find(node => node['@type'] === 'ProfilePage') || {};
            const profileDate = String(profileNode.dateModified || '');
            structuredTitle = String(pageNode.name || '');
            structuredDescription = String(pageNode.description || '');
            profileMainEntity = Boolean(profileNode.mainEntity && typeof profileNode.mainEntity === 'object');
            profileDateValid = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(profileDate)
                && !Number.isNaN(Date.parse(profileDate));
        } catch (error) {
            structuredTitle = '';
            structuredDescription = '';
            profileMainEntity = false;
            profileDateValid = false;
        }
        staticSeoSnapshot = {
            title: doc.querySelector('title')?.textContent.trim() || '',
            description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            ogTitle: doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
            ogDescription: doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
            twitterTitle: doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '',
            twitterDescription: doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '',
            structuredTitle,
            structuredDescription,
            profileMainEntity,
            profileDateValid
        };
    } catch (error) {
        staticSeoSnapshot = null;
        staticSeoCheckFailed = true;
        if (els.staticSeoState) els.staticSeoState.textContent = 'check failed';
    }
    renderStaticSeoStatus();
}

function renderAll({ preserveDrafts = false, listIds = Object.keys(ADMIN_LIST_PAGINATION) } = {}) {
    if (!preserveDrafts) adminQuestionDrafts.clear();
    renderStats();
    listIds.forEach(renderAdminListById);
    renderLinkSettings({ preserveDraft: preserveDrafts });
}

const WISHLIST_FEATURED_CAP = 30;
const WISHLIST_NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const WISHLIST_POSITION_ACTIONS = new Set([
    'feature-wishlist-item', 'unfeature-wishlist-item',
    'move-wishlist-item-up', 'move-wishlist-item-down',
]);
// Keep position-changing writes serialized. Their ordering data is fetched
// directly from Supabase immediately before each action so pagination never
// makes the calculation depend on an incomplete client-side page.
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

function renderWishlistItems() {
    const container = els.wishlistItemsList;
    if (!container) return;

    renderWishlistSyncStatus();

    if (!state.wishlistItemsAvailable) {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('wishlist_items table not set up yet');
        return;
    }
    const totalItems = state.adminListTotals['wishlist-items-list'] || 0;
    if (!totalItems && !state.wishlistSearch.trim()) {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('nothing synced yet — hit "sync now"');
        return;
    }

    const featuredCount = state.wishlistFeaturedCount || 0;
    if (els.wishlistFeaturedWarning) {
        els.wishlistFeaturedWarning.textContent = featuredCount > WISHLIST_FEATURED_CAP
            ? `${featuredCount} items featured — only the first ${WISHLIST_FEATURED_CAP} by position show on the site.`
            : '';
    }

    const visible = getAdminListItems('wishlist-items-list');

    if (!totalItems) {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('no items match your search');
        return;
    }

    const pageItems = paginateAdminList(visible, container);

    container.innerHTML = pageItems.map(item => {
        const isNew = item.first_synced_at && (Date.now() - new Date(item.first_synced_at).getTime()) < WISHLIST_NEW_WINDOW_MS;
        return `
        <article class="admin-card${item.featured ? ' is-featured' : ''}${item.is_available ? '' : ' is-unavailable'}" data-id="${escapeHtml(item.throne_item_id)}">
            <img src="${escapeHtml(item.image_url || '')}" alt="" loading="lazy" decoding="async">
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
                    <button data-action="move-wishlist-item-up" ${String(item.throne_item_id) === state.wishlistFirstFeaturedId ? 'disabled' : ''} aria-label="move up">&uarr;</button>
                    <button data-action="move-wishlist-item-down" ${String(item.throne_item_id) === state.wishlistLastFeaturedId ? 'disabled' : ''} aria-label="move down">&darr;</button>
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
        await refreshAdminListSet(['wishlist-items-list'], {
            refreshWishlistMeta: true,
            refreshWishlistSync: true
        });
    } catch (error) {
        setStatus(els.adminStatus, `sync failed: ${error.message}`);
    } finally {
        els.wishlistSyncNow.disabled = false;
    }
}

async function featureAllWishlistItems() {
    if (!els.wishlistFeatureAll) return;
    // Keep one stable search scope for the whole action. Typing a new search
    // while the count/confirmation is in flight must not change which rows
    // the already-confirmed action later mutates.
    const actionSearch = state.wishlistSearch;
    let countQuery = adminClient.from('wishlist_items')
        .select('throne_item_id', { count: 'exact', head: true })
        .eq('featured', false);
    countQuery = applyWishlistSearchFilter(countQuery, actionSearch);
    const countResult = await countQuery;
    if (countResult.error) {
        setStatus(els.adminStatus, countResult.error.message || 'could not count wishlist items');
        return;
    }
    const targetCount = countResult.count || 0;
    if (!targetCount) {
        setStatus(els.adminStatus, 'nothing to feature');
        return;
    }
    if (!window.confirm(`Feature ${targetCount} item${targetCount === 1 ? '' : 's'}? They'll go live on the site (only the first ${WISHLIST_FEATURED_CAP} by position show).`)) return;
    if (wishlistActionBusy) return;
    wishlistActionBusy = true;

    els.wishlistFeatureAll.disabled = true;
    setStatus(els.adminStatus, 'featuring...');
    let featuredCount = 0;
    try {
        const targets = [];
        const batchSize = 500;
        for (let start = 0; start < targetCount; start += batchSize) {
            let targetQuery = adminClient.from('wishlist_items')
                .select('throne_item_id')
                .eq('featured', false);
            targetQuery = applyWishlistSearchFilter(targetQuery, actionSearch);
            const targetResult = await targetQuery
                .order('position', { ascending: true })
                .order('name', { ascending: true })
                .order('throne_item_id', { ascending: true })
                .range(start, Math.min(start + batchSize - 1, targetCount - 1));
            if (targetResult.error) throw targetResult.error;
            targets.push(...(targetResult.data || []));
        }

        let nextPosition = await getNextWishlistPosition();
        const updateBatchSize = 12;
        for (let start = 0; start < targets.length; start += updateBatchSize) {
            const batch = targets.slice(start, start + updateBatchSize);
            const results = await Promise.all(batch.map(item =>
                adminClient.from('wishlist_items')
                    .update({ featured: true, position: nextPosition++ })
                    .eq('throne_item_id', item.throne_item_id)
                    .select('throne_item_id')
            ));
            featuredCount += results.reduce((count, result) => count + (result.error ? 0 : (result.data || []).length), 0);
            const failed = results.find(result => result.error);
            if (failed) throw failed.error;
        }
        await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
        setStatus(els.adminStatus, `${featuredCount} item${featuredCount === 1 ? '' : 's'} featured`);
    } catch (error) {
        let reloadFailed = false;
        try {
            await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
        } catch (reloadError) {
            reloadFailed = true;
        }
        if (featuredCount) {
            setStatus(els.adminStatus, `${featuredCount} of ${targetCount} featured before the error; ${reloadFailed ? 'refresh failed too.' : 'list refreshed.'}`);
        } else {
            setStatus(els.adminStatus, reloadFailed
                ? `${error.message || 'could not feature items'}; refresh failed too.`
                : (error.message || 'could not feature items'));
        }
    } finally {
        els.wishlistFeatureAll.disabled = false;
        wishlistActionBusy = false;
    }
}

async function unfeatureAllWishlistItems() {
    if (!els.wishlistUnfeatureAll) return;
    const actionSearch = state.wishlistSearch;
    let countQuery = adminClient.from('wishlist_items')
        .select('throne_item_id', { count: 'exact', head: true })
        .eq('featured', true);
    countQuery = applyWishlistSearchFilter(countQuery, actionSearch);
    const countResult = await countQuery;
    if (countResult.error) {
        setStatus(els.adminStatus, countResult.error.message || 'could not count wishlist items');
        return;
    }
    const targetCount = countResult.count || 0;
    if (!targetCount) {
        setStatus(els.adminStatus, 'nothing to unfeature');
        return;
    }
    if (!window.confirm(`Unfeature ${targetCount} item${targetCount === 1 ? '' : 's'}? They'll disappear from the site grid immediately.`)) return;
    if (wishlistActionBusy) return;
    wishlistActionBusy = true;

    els.wishlistUnfeatureAll.disabled = true;
    setStatus(els.adminStatus, 'unfeaturing...');
    let mutationCompleted = false;
    try {
        let updateQuery = adminClient.from('wishlist_items').update({ featured: false }).eq('featured', true);
        updateQuery = applyWishlistSearchFilter(updateQuery, actionSearch);
        const { error } = await updateQuery;
        if (error) throw error;
        mutationCompleted = true;
        await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
        setStatus(els.adminStatus, `${targetCount} item${targetCount === 1 ? '' : 's'} unfeatured`);
    } catch (error) {
        if (mutationCompleted) {
            let reloadFailed = false;
            try {
                await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
            } catch (reloadError) {
                reloadFailed = true;
            }
            setStatus(els.adminStatus, `${targetCount} unfeatured; ${reloadFailed ? 'refresh failed' : 'list refreshed'}`);
        } else {
            setStatus(els.adminStatus, error.message || 'could not unfeature items');
        }
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

const ADMIN_LIST_COLUMNS = Object.freeze({
    'pending-drawings-list': 'id,imageData,created_at,ip_address',
    'published-drawings-list': 'id,imageData,created_at,ip_address',
    'pending-questions-list': 'id,question,answer,created_at,ip_address',
    'published-questions-list': 'id,question,answer,created_at,ip_address',
    'wishlist-items-list': 'throne_item_id,name,price_cents,image_url,quantity,is_available,featured,position,first_synced_at'
});
const WHITESPACE_ONLY_ANSWER_PATTERN = '^[[:space:]]*$';
// Raw PostgREST logic strings reserve punctuation used by POSIX character
// classes. Double-quoting the value keeps the regex intact instead of
// letting the URL grammar treat its colons as filter syntax.
const QUOTED_WHITESPACE_ONLY_ANSWER_PATTERN = `"${WHITESPACE_ONLY_ANSWER_PATTERN}"`;
const PENDING_ANSWER_FILTER = `answer.is.null,answer.match.${QUOTED_WHITESPACE_ONLY_ANSWER_PATTERN}`;

function applyAdminListFilter(query, listId) {
    if (listId === 'pending-drawings-list') return query.or('approved.is.null,approved.eq.false');
    if (listId === 'published-drawings-list') return query.eq('approved', true);
    if (listId === 'pending-questions-list') return query.or(PENDING_ANSWER_FILTER);
    if (listId === 'published-questions-list') {
        return query
            .not('answer', 'is', null)
            .not('answer', 'match', WHITESPACE_ONLY_ANSWER_PATTERN);
    }
    return query;
}

function getWishlistSearchPattern(searchValue = state.wishlistSearch) {
    const search = String(searchValue || '').trim();
    if (!search) return '';
    return `%${search.replace(/[\\%_]/g, value => `\\${value}`)}%`;
}

function applyWishlistSearchFilter(query, searchValue = state.wishlistSearch) {
    const pattern = getWishlistSearchPattern(searchValue);
    if (!pattern) return query;
    // This is a direct query-builder filter, not a raw `.or()` expression.
    // Supabase encodes punctuation in the value; adding our own quotes would
    // make those quotes part of the ILIKE pattern and break normal searches.
    return query.ilike('name', pattern);
}

function buildAdminListQuery(listId, { wishlistSearch = state.wishlistSearch } = {}) {
    const columns = ADMIN_LIST_COLUMNS[listId];
    if (!columns) throw new Error(`Unknown admin list: ${listId}`);

    if (listId === 'wishlist-items-list') {
        let query = adminClient
            .from('wishlist_items')
            .select(columns, { count: 'exact' });
        query = applyWishlistSearchFilter(query, wishlistSearch);
        return query
            .order('featured', { ascending: false })
            .order('position', { ascending: true })
            .order('name', { ascending: true })
            .order('throne_item_id', { ascending: true });
    }

    const table = listId.includes('drawings') ? 'drawings' : 'questions';
    let query = adminClient.from(table).select(columns, { count: 'exact' });
    query = applyAdminListFilter(query, listId);
    return query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
}

async function fetchAdminListPage(listId) {
    const config = ADMIN_LIST_PAGINATION[listId];
    if (!config) throw new Error(`Unknown admin list: ${listId}`);

    const queryWishlistSearch = listId === 'wishlist-items-list' ? state.wishlistSearch : '';
    const runPage = page => {
        const start = (page - 1) * config.pageSize;
        return buildAdminListQuery(listId, { wishlistSearch: queryWishlistSearch })
            .range(start, start + config.pageSize - 1);
    };

    let page = Math.max(1, adminListPages.get(listId) || 1);
    let result = await runPage(page);
    if (result.error) {
        if (listId === 'wishlist-items-list' && result.error.code === '42P01') {
            return { items: [], total: 0, page: 1, wishlistSearch: queryWishlistSearch, available: false };
        }
        throw result.error;
    }

    let total = result.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / config.pageSize));
    const validPage = Math.min(page, totalPages);
    if (validPage !== page) {
        page = validPage;
        result = await runPage(page);
        if (result.error) throw result.error;
        total = result.count ?? total;
    }

    return {
        items: result.data || [],
        total,
        page,
        wishlistSearch: queryWishlistSearch,
        available: true
    };
}

function applyAdminListPage(listId, result) {
    state.adminListItems[listId] = result.items;
    state.adminListTotals[listId] = result.total;
    adminListPages.set(listId, result.page);
    adminListCommittedPages.set(listId, result.page);
    if (listId === 'wishlist-items-list') {
        state.wishlistItemsAvailable = result.available !== false;
        state.wishlistLoadedSearch = result.wishlistSearch || '';
    }
}

function setAdminListBusy(listId, busy) {
    const container = document.getElementById(listId);
    if (container) {
        container.setAttribute('aria-busy', busy ? 'true' : 'false');
        container.toggleAttribute('inert', busy);
        container.style.pointerEvents = busy ? 'none' : '';
    }
    const controls = ensureAdminPagination(container);
    document.querySelectorAll(`[data-list="${listId}"]`).forEach(button => {
        if (busy) {
            if (!button.disabled) button.dataset.adminBusyDisabled = 'true';
            button.disabled = true;
        } else if (button.dataset.adminBusyDisabled === 'true') {
            button.disabled = false;
            delete button.dataset.adminBusyDisabled;
        }
    });
    if (busy) {
        controls?.querySelectorAll('button').forEach(button => {
            button.disabled = true;
        });
    } else if (container) {
        paginateAdminList(getAdminListItems(listId), container);
    }
}

function setAdminListError(listId, message) {
    const cleanMessage = String(message || `Could not load ${ADMIN_LIST_PAGINATION[listId]?.label || 'items'}.`);
    adminListErrors.set(listId, cleanMessage);
    setStatus(els.adminStatus, cleanMessage);
}

function clearAdminListError(listId) {
    const previousError = adminListErrors.get(listId);
    adminListErrors.delete(listId);
    if (previousError && els.adminStatus?.textContent === previousError) {
        setStatus(els.adminStatus, '');
    }
}

function rollbackAdminListRequest(listId) {
    adminListPages.set(listId, adminListCommittedPages.get(listId) || 1);
    if (listId === 'wishlist-items-list') {
        state.wishlistSearch = state.wishlistLoadedSearch;
        if (els.wishlistSearch) els.wishlistSearch.value = state.wishlistLoadedSearch;
    }
    renderAdminListById(listId);
}

async function loadAdminList(listId) {
    const token = (adminListLoadTokens.get(listId) || 0) + 1;
    adminListLoadTokens.set(listId, token);
    setAdminListBusy(listId, true);
    try {
        const result = await fetchAdminListPage(listId);
        if (adminListLoadTokens.get(listId) !== token) return;
        applyAdminListPage(listId, result);
        clearAdminListError(listId);
        renderAdminListById(listId);
        renderStats();
    } catch (error) {
        if (adminListLoadTokens.get(listId) === token) {
            rollbackAdminListRequest(listId);
            setAdminListError(listId, error.message);
        }
    } finally {
        if (adminListLoadTokens.get(listId) === token) setAdminListBusy(listId, false);
    }
}

async function refreshAdminListSet(listIds, {
    refreshWishlistMeta = false,
    refreshWishlistSync = false
} = {}) {
    const uniqueListIds = Array.from(new Set(listIds)).filter(listId => ADMIN_LIST_PAGINATION[listId]);
    if (!uniqueListIds.length) return;

    // A targeted mutation refresh owns the affected dashboard state now.
    // Prevent an older manual/full refresh from later repainting shared
    // wishlist metadata with the snapshot it started before the mutation.
    adminFullLoadGeneration += 1;

    const requestTokens = new Map(uniqueListIds.map(listId => {
        const token = (adminListLoadTokens.get(listId) || 0) + 1;
        adminListLoadTokens.set(listId, token);
        setAdminListBusy(listId, true);
        return [listId, token];
    }));

    try {
        const [listResults, wishlistMetaResult, wishlistSyncResult] = await Promise.all([
            Promise.allSettled(uniqueListIds.map(fetchAdminListPage)),
            refreshWishlistMeta
                ? fetchWishlistFeatureMeta().then(value => ({ value }), error => ({ error }))
                : Promise.resolve(null),
            refreshWishlistSync
                ? adminClient.from('wishlist_sync_state')
                    .select('last_synced_at')
                    .eq('id', true)
                    .maybeSingle()
                : Promise.resolve(null)
        ]);
        let firstError = wishlistMetaResult?.error || wishlistSyncResult?.error || null;

        listResults.forEach((result, index) => {
            const listId = uniqueListIds[index];
            if (adminListLoadTokens.get(listId) !== requestTokens.get(listId)) return;
            if (result.status === 'fulfilled') {
                applyAdminListPage(listId, result.value);
                clearAdminListError(listId);
                renderAdminListById(listId);
                return;
            }
            firstError ||= result.reason;
            adminListErrors.set(
                listId,
                result.reason?.message || `Could not refresh ${ADMIN_LIST_PAGINATION[listId].label}.`
            );
        });

        if (wishlistMetaResult?.value) {
            state.wishlistItemsAvailable = wishlistMetaResult.value.available !== false
                && state.wishlistItemsAvailable;
            state.wishlistFeaturedCount = wishlistMetaResult.value.count;
            state.wishlistFirstFeaturedId = wishlistMetaResult.value.firstId;
            state.wishlistLastFeaturedId = wishlistMetaResult.value.lastId;
            if (uniqueListIds.includes('wishlist-items-list')) renderWishlistItems();
        }
        if (wishlistSyncResult && !wishlistSyncResult.error) {
            state.wishlistSyncedAt = wishlistSyncResult.data?.last_synced_at || null;
            renderWishlistSyncStatus();
        }
        renderStats();
        if (firstError) throw firstError;
    } finally {
        uniqueListIds.forEach(listId => {
            if (adminListLoadTokens.get(listId) === requestTokens.get(listId)) {
                setAdminListBusy(listId, false);
            }
        });
    }
}

async function fetchWishlistFeatureMeta() {
    const [countResult, firstResult, lastResult] = await Promise.all([
        adminClient.from('wishlist_items').select('throne_item_id', { count: 'exact', head: true }).eq('featured', true),
        adminClient.from('wishlist_items').select('throne_item_id').eq('featured', true)
            .order('position', { ascending: true }).order('name', { ascending: true })
            .order('throne_item_id', { ascending: true }).limit(1).maybeSingle(),
        adminClient.from('wishlist_items').select('throne_item_id').eq('featured', true)
            .order('position', { ascending: false }).order('name', { ascending: false })
            .order('throne_item_id', { ascending: false }).limit(1).maybeSingle()
    ]);
    const error = countResult.error || firstResult.error || lastResult.error;
    if (error) {
        if (error.code === '42P01') return { count: 0, firstId: '', lastId: '', available: false };
        throw error;
    }
    return {
        count: countResult.count || 0,
        firstId: String(firstResult.data?.throne_item_id || ''),
        lastId: String(lastResult.data?.throne_item_id || ''),
        available: true
    };
}

async function loadAdminData({ preserveDrafts = true } = {}) {
    const loadGeneration = ++adminFullLoadGeneration;
    const linkSettingsHydratedAtStart = linkSettingsHydrated;
    const settingsRevisionAtStart = settingsSaveRevision;
    const settingsWritePendingAtStart = settingsSavePending > 0;
    clearTimeout(wishlistSearchTimer);
    wishlistSearchTimer = null;
    const loadingMessage = 'loading...';
    setStatus(els.adminStatus, loadingMessage);

    const listIds = Object.keys(ADMIN_LIST_PAGINATION);
    const requestTokens = new Map(listIds.map(listId => {
        const token = (adminListLoadTokens.get(listId) || 0) + 1;
        adminListLoadTokens.set(listId, token);
        setAdminListBusy(listId, true);
        return [listId, token];
    }));

    try {
        const [listResults, linkSettingsResult, wishlistSyncResult, wishlistFeatureMeta] = await Promise.all([
            Promise.all(listIds.map(fetchAdminListPage)),
            adminClient.from('site_settings').select('value').eq('id', 'links').maybeSingle(),
            adminClient.from('wishlist_sync_state').select('last_synced_at').eq('id', true).maybeSingle(),
            fetchWishlistFeatureMeta()
        ]);

        // A newer refresh/action owns every shared dashboard field now. The
        // older request may finish, but it must not repaint settings, counts,
        // sync timestamps, or status with stale data.
        if (loadGeneration !== adminFullLoadGeneration) return;

        if (linkSettingsResult.error && linkSettingsResult.error.code !== '42P01' && linkSettingsResult.error.code !== 'PGRST116') throw linkSettingsResult.error;
        const renderedListIds = [];
        listResults.forEach((result, index) => {
            const listId = listIds[index];
            if (adminListLoadTokens.get(listId) !== requestTokens.get(listId)) return;
            applyAdminListPage(listId, result);
            clearAdminListError(listId);
            renderedListIds.push(listId);
        });
        state.wishlistItemsAvailable = wishlistFeatureMeta.available !== false
            && state.wishlistItemsAvailable;
        state.wishlistFeaturedCount = wishlistFeatureMeta.count;
        state.wishlistFirstFeaturedId = wishlistFeatureMeta.firstId;
        state.wishlistLastFeaturedId = wishlistFeatureMeta.lastId;
        state.wishlistSyncedAt = wishlistSyncResult.data?.last_synced_at || null;
        state.linkSettingsAvailable = !linkSettingsResult.error || linkSettingsResult.error.code === 'PGRST116';
        const preserveLiveLinkDraft = linkSettingsHydratedAtStart && preserveDrafts && (
            settingsDraftDirty
            || settingsWritePendingAtStart
            || settingsSavePending > 0
            || settingsSaveRevision !== settingsRevisionAtStart
        );
        if (linkSettingsResult.data?.value) {
            cachePublicSiteSettings(normalizeLinkSettings(linkSettingsResult.data.value));
        }
        if (!preserveLiveLinkDraft) {
            state.linkSettings = normalizeLinkSettings(linkSettingsResult.data?.value);
        }
        setLinkSettingsHydrated(state.linkSettingsAvailable);
        renderAll({ preserveDrafts, listIds: renderedListIds });
        reportInterruptedSocialVideoPicker();
        if (els.adminStatus?.textContent === loadingMessage) setStatus(els.adminStatus, '');
    } catch (error) {
        if (loadGeneration !== adminFullLoadGeneration) return;
        listIds.forEach(listId => {
            if (adminListLoadTokens.get(listId) !== requestTokens.get(listId)) return;
            rollbackAdminListRequest(listId);
            adminListErrors.set(listId, error.message || 'Could not refresh admin data.');
        });
        setStatus(els.adminStatus, error.message || 'Could not refresh admin data.');
        throw error;
    } finally {
        listIds.forEach(listId => {
            if (adminListLoadTokens.get(listId) === requestTokens.get(listId)) {
                setAdminListBusy(listId, false);
            }
        });
    }
}

function confirmDangerAction(message) {
    return window.confirm(message);
}

function formatAdminMutationError(error, fallback = 'Could not save.', entity = 'item') {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || error || '').trim();
    if (code === '23503' || /foreign key constraint/i.test(message)) {
        return entity === 'dood'
            ? 'This dood still has reactions attached, so Supabase blocked its deletion. Run drawing-delete-cascade.sql once.'
            : `This ${entity} still has linked database records, so Supabase blocked the action.`;
    }
    if (code === '42501' || /row-level security|permission denied|not authorized/i.test(message)) {
        return 'Your admin database permission was rejected. Sign out, sign back in, and retry.';
    }
    if (code === '57014' || /statement timeout|canceling statement/i.test(message)) {
        return 'Supabase timed out while finishing that action. The affected list was kept intact; retry once.';
    }
    if (/jwt.*expired|invalid.*jwt|session.*expired/i.test(message)) {
        return 'Your admin session expired. Sign out and sign back in.';
    }
    return message || fallback;
}

function getActionRefreshLists(action, sourceListId) {
    if (action === 'approve-drawing') {
        return ['pending-drawings-list', 'published-drawings-list'];
    }
    if (action === 'delete-drawing') {
        return sourceListId ? [sourceListId] : ['pending-drawings-list', 'published-drawings-list'];
    }
    if (action === 'save-question') {
        return ['pending-questions-list', 'published-questions-list'];
    }
    if (action === 'delete-question') {
        return sourceListId ? [sourceListId] : ['pending-questions-list', 'published-questions-list'];
    }
    if (WISHLIST_POSITION_ACTIONS.has(action)) return ['wishlist-items-list'];
    return [];
}

async function openDashboard() {
    setLinkSettingsHydrated(false);
    showPanel(els.dashboardPanel);
    try {
        await loadAdminData({ preserveDrafts: false });
        void retryPendingSocialVideoCleanup();
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

async function getNextWishlistPosition() {
    const { data, error } = await adminClient.from('wishlist_items')
        .select('position')
        .eq('featured', true)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    const currentMax = Number(data?.position);
    return Number.isFinite(currentMax) ? currentMax + 1 : 0;
}

async function getOrderedFeaturedWishlistItems() {
    const items = [];
    const batchSize = 500;
    for (let start = 0; ; start += batchSize) {
        const { data, error } = await adminClient.from('wishlist_items')
            .select('throne_item_id,position')
            .eq('featured', true)
            .order('position', { ascending: true })
            .order('name', { ascending: true })
            .order('throne_item_id', { ascending: true })
            .range(start, start + batchSize - 1);
        if (error) throw error;
        const batch = data || [];
        items.push(...batch);
        if (batch.length < batchSize) break;
    }
    return items;
}

async function runAction(button) {
    const card = button.closest('.admin-card');
    const id = card?.dataset.id;
    const action = button.dataset.action;
    if (!id || !action) return;

    const sourceListId = card.closest('.admin-list')?.id || '';
    const isSubmissionAction = action === 'approve-drawing'
        || action === 'delete-drawing'
        || action === 'save-question'
        || action === 'delete-question';
    if (isSubmissionAction) {
        if (submissionMutationBusy) {
            setStatus(els.adminStatus, 'Another moderation action is still finishing.');
            return;
        }
        submissionMutationBusy = true;
    }

    const isWishlistPositionAction = WISHLIST_POSITION_ACTIONS.has(action);
    if (isWishlistPositionAction) {
        if (wishlistActionBusy) {
            if (isSubmissionAction) submissionMutationBusy = false;
            return;
        }
        wishlistActionBusy = true;
    }

    button.disabled = true;
    setStatus(els.adminStatus, 'saving...');
    let mutationCompleted = false;
    let mutationLabel = 'saved';

    try {
        if (action === 'approve-drawing') {
            const { error } = await adminClient.from('drawings').update({ approved: true }).eq('id', id);
            if (error) throw error;
            mutationCompleted = true;
            mutationLabel = 'dood approved';
        }

        if (action === 'delete-drawing') {
            const { error } = await adminClient.from('drawings').delete().eq('id', id);
            if (error) throw error;
            mutationCompleted = true;
            mutationLabel = 'dood deleted';
        }

        if (action === 'save-question') {
            const answer = card.querySelector('textarea')?.value.trim() || null;
            const { error } = await adminClient.from('questions').update({ answer }).eq('id', id);
            if (error) throw error;
            adminQuestionDrafts.delete(String(id));
            mutationCompleted = true;
            mutationLabel = 'reply saved';
        }

        if (action === 'delete-question') {
            const { error } = await adminClient.from('questions').delete().eq('id', id);
            if (error) throw error;
            adminQuestionDrafts.delete(String(id));
            mutationCompleted = true;
            mutationLabel = 'ask deleted';
        }

        if (action === 'feature-wishlist-item' || action === 'unfeature-wishlist-item') {
            const featured = action === 'feature-wishlist-item';
            const update = { featured };
            if (featured) {
                update.position = await getNextWishlistPosition();
            }
            const { error } = await adminClient.from('wishlist_items').update(update).eq('throne_item_id', id);
            if (error) throw error;
            mutationCompleted = true;
            mutationLabel = featured ? 'item featured' : 'item unfeatured';
        }

        if (action === 'move-wishlist-item-up' || action === 'move-wishlist-item-down') {
            const featuredItems = await getOrderedFeaturedWishlistItems();
            const index = featuredItems.findIndex(item => item.throne_item_id === id);
            const neighborIndex = action === 'move-wishlist-item-up' ? index - 1 : index + 1;
            const current = featuredItems[index];
            const neighbor = featuredItems[neighborIndex];
            if (current && neighbor) {
                const { data: firstWrite, error: err1 } = await adminClient.from('wishlist_items')
                    .update({ position: neighbor.position })
                    .eq('throne_item_id', current.throne_item_id)
                    .select('throne_item_id')
                    .maybeSingle();
                if (err1 || !firstWrite) {
                    let reloadFailed = false;
                    try {
                        await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
                    } catch (reloadError) {
                        reloadFailed = true;
                    }
                    throw new Error(`${err1?.message || 'move failed before any change'}; ${reloadFailed ? 'refresh failed too' : 'list refreshed'}`);
                }
                const { data: secondWrite, error: err2 } = await adminClient.from('wishlist_items')
                    .update({ position: current.position })
                    .eq('throne_item_id', neighbor.throne_item_id)
                    .select('throne_item_id')
                    .maybeSingle();
                if (err2 || !secondWrite) {
                    const { data: rollbackWrite, error: rollbackError } = await adminClient.from('wishlist_items')
                        .update({ position: current.position })
                        .eq('throne_item_id', current.throne_item_id)
                        .select('throne_item_id')
                        .maybeSingle();
                    let reloadFailed = false;
                    try {
                        await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
                    } catch (reloadError) {
                        reloadFailed = true;
                    }
                    const recovery = rollbackError || !rollbackWrite
                        ? 'first half may still be saved'
                        : 'first half was rolled back';
                    throw new Error(`${err2?.message || 'move failed halfway'}; ${recovery}; ${reloadFailed ? 'refresh failed too' : 'list refreshed'}`);
                }
                mutationCompleted = true;
                mutationLabel = 'item moved';
            }
        }

        if (action === 'approve-drawing' || action === 'delete-drawing') {
            forgetAdminSelectionId(id);
        }
        const refreshLists = getActionRefreshLists(action, sourceListId);
        await refreshAdminListSet(refreshLists, {
            refreshWishlistMeta: isWishlistPositionAction
        });
        setStatus(els.adminStatus, `${mutationLabel} ✓`);
    } catch (error) {
        if (mutationCompleted) {
            let reloadFailed = false;
            try {
                await refreshAdminListSet(getActionRefreshLists(action, sourceListId), {
                    refreshWishlistMeta: isWishlistPositionAction
                });
            } catch (reloadError) {
                reloadFailed = true;
            }
            setStatus(els.adminStatus, `${mutationLabel}; ${reloadFailed ? 'refresh failed' : 'list refreshed'}`);
        } else {
            const entity = action.includes('drawing')
                ? 'dood'
                : (action.includes('question') ? 'ask' : 'item');
            setStatus(els.adminStatus, formatAdminMutationError(error, 'Could not save.', entity));
        }
    } finally {
        button.disabled = false;
        if (isWishlistPositionAction) wishlistActionBusy = false;
        if (isSubmissionAction) submissionMutationBusy = false;
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

function getLinkSettingsComparisonKey(settings) {
    const comparable = {};
    Object.keys(DEFAULT_LINK_SETTINGS).forEach(key => {
        let value = settings?.[key];
        if (key.endsWith('_url') && !key.includes('_card_video_')) {
            try { value = new URL(String(value || '').trim()).href; } catch (error) {}
        }
        comparable[key] = value;
    });
    return JSON.stringify(comparable);
}

async function persistLatestLinkSettings(requestId, { overrides = null, onCommitted = null } = {}) {
    if (!linkSettingsHydrated) {
        if (requestId === latestSettingsSaveRequest) {
            setStatus(els.adminStatus, 'Saved site settings are not ready yet. Refresh before editing.');
        }
        return false;
    }
    let nextSettings;
    try {
        nextSettings = {
            snapchat_url: cleanUrl(els.snapchatUrl?.value || state.linkSettings.snapchat_url, 'Snapchat'),
            snapchat_username: getDraftSocialUsername('snapchat', els.snapchatUsername),
            snapchat_enabled: els.snapchatEnabled?.checked !== false,
            snapchat_card_video_url: String(state.linkSettings.snapchat_card_video_url || ''),
            snapchat_card_video_path: String(state.linkSettings.snapchat_card_video_path || ''),
            instagram_url: cleanUrl(els.instagramUrl?.value || state.linkSettings.instagram_url, 'Instagram'),
            instagram_username: getDraftSocialUsername('instagram', els.instagramUsername),
            instagram_enabled: els.instagramEnabled?.checked !== false,
            instagram_card_video_url: String(state.linkSettings.instagram_card_video_url || ''),
            instagram_card_video_path: String(state.linkSettings.instagram_card_video_path || ''),
            kofi_url: cleanUrl(els.kofiUrl?.value || state.linkSettings.kofi_url, 'Ko-fi'),
            kofi_username: getDraftSocialUsername('kofi', els.kofiUsername),
            kofi_enabled: els.kofiEnabled?.checked !== false,
            kofi_card_video_url: String(state.linkSettings.kofi_card_video_url || ''),
            kofi_card_video_path: String(state.linkSettings.kofi_card_video_path || ''),
            telegram_url: cleanUrl(els.telegramUrl?.value || state.linkSettings.telegram_url, 'Telegram'),
            telegram_username: getDraftSocialUsername('telegram', els.telegramUsername),
            telegram_enabled: els.telegramEnabled?.checked !== false,
            telegram_card_video_url: String(state.linkSettings.telegram_card_video_url || ''),
            telegram_card_video_path: String(state.linkSettings.telegram_card_video_path || ''),
            x_url: cleanUrl(els.xUrl?.value || state.linkSettings.x_url, 'X'),
            x_username: getDraftSocialUsername('x', els.xUsername),
            x_enabled: els.xEnabled?.checked !== false,
            x_card_video_url: String(state.linkSettings.x_card_video_url || ''),
            x_card_video_path: String(state.linkSettings.x_card_video_path || ''),
            tiktok_url: cleanUrl(els.tiktokUrl?.value || state.linkSettings.tiktok_url, 'TikTok'),
            tiktok_username: getDraftSocialUsername('tiktok', els.tiktokUsername),
            tiktok_enabled: els.tiktokEnabled?.checked !== false,
            tiktok_card_video_url: String(state.linkSettings.tiktok_card_video_url || ''),
            tiktok_card_video_path: String(state.linkSettings.tiktok_card_video_path || ''),
            twitch_url: cleanUrl(els.twitchUrl?.value || state.linkSettings.twitch_url, 'Twitch'),
            twitch_username: getDraftSocialUsername('twitch', els.twitchUsername),
            twitch_enabled: els.twitchEnabled?.checked !== false,
            twitch_card_video_url: String(state.linkSettings.twitch_card_video_url || ''),
            twitch_card_video_path: String(state.linkSettings.twitch_card_video_path || ''),
            discord_url: cleanUrl(els.discordUrl?.value || state.linkSettings.discord_url, 'Discord'),
            discord_username: getDraftSocialUsername('discord', els.discordUsername),
            discord_enabled: els.discordEnabled?.checked !== false,
            discord_card_video_url: String(state.linkSettings.discord_card_video_url || ''),
            discord_card_video_path: String(state.linkSettings.discord_card_video_path || ''),
            onlyfans_url: cleanUrl(els.onlyfansUrl?.value || state.linkSettings.onlyfans_url, 'OnlyFans'),
            onlyfans_username: getDraftSocialUsername('onlyfans', els.onlyfansUsername),
            onlyfans_enabled: els.onlyfansEnabled?.checked !== false,
            onlyfans_card_video_url: String(state.linkSettings.onlyfans_card_video_url || ''),
            onlyfans_card_video_path: String(state.linkSettings.onlyfans_card_video_path || ''),
            spotify_url: cleanUrl(els.spotifyUrl?.value || state.linkSettings.spotify_url, 'Spotify'),
            spotify_username: getDraftSocialUsername('spotify', els.spotifyUsername),
            spotify_enabled: els.spotifyEnabled?.checked !== false,
            spotify_card_video_url: String(state.linkSettings.spotify_card_video_url || ''),
            spotify_card_video_path: String(state.linkSettings.spotify_card_video_path || ''),
            social_card_order: normalizeSocialCardOrder(state.linkSettings.social_card_order),
            throne_url: cleanUrl(els.throneUrl?.value || state.linkSettings.throne_url, 'Throne'),
            throne_enabled: els.throneEnabled?.checked !== false,
            throne_checkout_mode: els.throneCheckoutMode?.value === 'widget' ? 'widget' : 'mockup',
            wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
            homepage_note_text: (els.homepageNoteText?.value || '').slice(0, 220),
            homepage_note_font_size: Math.min(17, Math.max(9, Number(state.linkSettings.homepage_note_font_size) || DEFAULT_LINK_SETTINGS.homepage_note_font_size)),
            maintenance_enabled: els.maintenanceEnabled?.checked === true,
            maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
            maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
            maintenance_eta: els.maintenanceEta?.value.trim() || '',
            entrance_mode: els.entranceMode?.value === 'bubbles' ? 'bubbles' : 'paw',
            drawings_enabled: els.drawingsEnabled?.checked !== false,
            questions_enabled: els.questionsEnabled?.checked !== false,
            rooms_enabled: els.roomsMasterEnabled?.checked !== false,
            seo_title: els.seoTitle?.value.trim() || DEFAULT_LINK_SETTINGS.seo_title,
            seo_description: els.seoDescription?.value.trim() || DEFAULT_LINK_SETTINGS.seo_description,
            site_tagline: els.siteTagline?.value.trim() || DEFAULT_LINK_SETTINGS.site_tagline
        };
        if (overrides) Object.assign(nextSettings, overrides);
    } catch (error) {
        if (requestId === latestSettingsSaveRequest) {
            setStatus(els.adminStatus, error.message || 'Check the links.');
        }
        return false;
    }
    const savedSettingsKey = getLinkSettingsComparisonKey(nextSettings);
    if (requestId === latestSettingsSaveRequest && els.seoState) {
        els.seoState.textContent = 'saving';
    }

    const { error } = await adminClient
        .from('site_settings')
        .upsert({
            id: 'links',
            value: nextSettings,
            updated_at: new Date().toISOString()
        });

    if (error) {
        if (requestId === latestSettingsSaveRequest) {
            if (els.seoState) els.seoState.textContent = 'error';
            setStatus(els.adminStatus, error.code === '42P01'
                ? 'Install site_settings.sql in Supabase first.'
                : (error.message || 'Could not save links.'));
        }
        return false;
    }

    cachePublicSiteSettings(nextSettings);

    if (typeof onCommitted === 'function') {
        try { onCommitted(nextSettings); } catch (commitHookError) {
            console.warn('Saved settings could not be mirrored locally:', commitHookError);
        }
    }

    // A user can keep editing while this request is in flight. Never replace
    // those newer DOM/order/video values with the older saved snapshot.
    const currentDraftKey = getLinkSettingsComparisonKey(getDraftLinkSettings());
    const savedCurrentDraft = currentDraftKey === savedSettingsKey;
    if (savedCurrentDraft) state.linkSettings = nextSettings;
    settingsDraftDirty = !savedCurrentDraft;
    syncLinkDraftLabels();
    renderLinkPreview();
    if (requestId === latestSettingsSaveRequest) {
        if (els.seoState) els.seoState.textContent = settingsDraftDirty ? 'editing' : 'ready';
        if (!settingsDraftDirty) {
            setStatus(els.adminStatus, 'saved ✓');
            setTimeout(() => {
                if (els.adminStatus?.textContent === 'saved ✓') setStatus(els.adminStatus, '');
            }, 2000);
        }
    }
    return true;
}

function saveLinkSettingsNow({ overrides = null, onCommitted = null, onFailure = null } = {}) {
    // Clear the debounce at invocation time. Clearing it later, when this
    // queued task starts, could cancel a newer edit's timer.
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
    if (!linkSettingsHydrated) {
        setStatus(els.adminStatus, 'Saved site settings are not ready yet. Refresh before editing.');
        if (typeof onFailure !== 'function') return Promise.resolve(false);
        return Promise.resolve()
            .then(() => onFailure())
            .catch(error => {
                console.warn('Settings rollback cleanup failed:', error);
            })
            .then(() => false);
    }
    const requestId = ++settingsSaveRevision;
    latestSettingsSaveRequest = requestId;
    settingsSavePending += 1;
    const settingOverrides = overrides && typeof overrides === 'object'
        ? { ...overrides }
        : null;

    const run = settingsSaveTail.then(() => persistLatestLinkSettings(requestId, {
        overrides: settingOverrides,
        onCommitted
    }));
    const safeRun = run.catch(error => {
        if (requestId === latestSettingsSaveRequest) {
            if (els.seoState) els.seoState.textContent = 'error';
            setStatus(els.adminStatus, error?.message || 'Could not save links.');
        }
        return false;
    });
    const guardedRun = safeRun.then(async saved => {
        if (!saved && typeof onFailure === 'function') {
            try { await onFailure(); } catch (rollbackError) {
                console.warn('Settings rollback cleanup failed:', rollbackError);
            }
        }
        return saved;
    });
    // The queue always recovers, so one failed write cannot block the next.
    settingsSaveTail = guardedRun.then(() => undefined, () => undefined);
    return guardedRun.finally(() => {
        settingsSavePending = Math.max(0, settingsSavePending - 1);
    });
}

function scheduleAutoSave() {
    clearTimeout(autoSaveTimer);
    if (!linkSettingsHydrated) {
        autoSaveTimer = null;
        setStatus(els.adminStatus, 'Saved site settings are still loading.');
        return;
    }
    autoSaveTimer = setTimeout(saveLinkSettingsNow, 700);
}

function resetLinkSettings() {
    if (!linkSettingsHydrated) {
        setStatus(els.adminStatus, 'Saved site settings are still loading.');
        return;
    }
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
    if (!linkSettingsHydrated) {
        checkbox.checked = !enabled;
        setStatus(els.adminStatus, 'Saved site settings are still loading.');
        return;
    }
    const confirmed = window.confirm(enabled
        ? 'Enable Rooms again? The public Rooms page will become available.'
        : 'Fully disable Rooms? Public Rooms visits will go to 404, and active rooms will be closed. The homepage note will still peel independently.');

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
    const selection = adminListSelections.get(listId);
    if (selection) return Array.from(selection.ids);
    const list = document.getElementById(listId);
    if (!list) return [];
    return Array.from(list.querySelectorAll('input[data-select-id]:checked'))
        .map(input => input.dataset.selectId)
        .filter(Boolean);
}

function getAdminSelectionCount(listId) {
    const selection = adminListSelections.get(listId);
    if (!selection) return getSelectedIds(listId).length;
    return selection.ids.size;
}

function clearAdminListSelection(listId) {
    const selection = adminListSelections.get(listId);
    if (!selection) return;
    selection.ids.clear();
    selection.snapshotCutoff = '';
}

function forgetAdminSelectionId(id) {
    const cleanId = String(id);
    adminListSelections.forEach(selection => {
        selection.ids.delete(cleanId);
    });
}

function refreshVisibleListSelection(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    const selection = adminListSelections.get(listId);
    list.querySelectorAll('input[data-select-id]').forEach(input => {
        input.checked = Boolean(selection?.ids.has(String(input.dataset.selectId)));
    });
}

function getAdminListTable(listId) {
    if (listId.includes('drawings')) return 'drawings';
    if (listId.includes('questions')) return 'questions';
    throw new Error(`Unknown submission list: ${listId}`);
}

async function fetchAdminListSnapshot(listId) {
    const table = getAdminListTable(listId);
    // Freeze the result set at the start of the explicit action. Only IDs are
    // transferred, in bounded pages; rows created afterward cannot silently
    // join a later destructive mutation.
    let anchorQuery = adminClient.from(table)
        .select('id,created_at')
        .not('created_at', 'is', null);
    anchorQuery = applyAdminListFilter(anchorQuery, listId);
    const { data: anchor, error: anchorError } = await anchorQuery
        // Legacy submissions can have a NULL timestamp. PostgREST puts NULL
        // first for a descending sort unless told otherwise, which used to
        // turn the cutoff below into `.lte('created_at', null)` and produce
        // the intermittent SQL error shown by the dashboard.
        .order('created_at', { ascending: false, nullsFirst: false })
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (anchorError) throw anchorError;
    const cutoff = anchor?.created_at || '';
    const pageSize = 500;
    const selectedIds = new Set();

    async function collectSnapshotPartition({ undated = false } = {}) {
        if (!undated && !cutoff) return;
        let start = 0;
        let expectedTotal = null;
        while (expectedTotal === null || start < expectedTotal) {
            let query = adminClient.from(table)
                .select('id', { count: start === 0 ? 'exact' : undefined });
            // Keep timestamp and pending/answered predicates as independent
            // query-builder filters. Using a second raw `.or()` here would
            // collide with the existing pending-list `.or()` on PostgREST.
            query = undated
                ? query.is('created_at', null)
                : query.lte('created_at', cutoff);
            query = applyAdminListFilter(query, listId);
            const { data, error, count } = await query
                .order('id', { ascending: true })
                .range(start, start + pageSize - 1);
            if (error) throw error;
            if (expectedTotal === null) expectedTotal = count || 0;
            const batch = data || [];
            batch.forEach(item => selectedIds.add(String(item.id)));
            if (batch.length < pageSize) break;
            start += pageSize;
        }
    }

    // Dated rows are frozen at the newest timestamp seen when the action
    // started; legacy NULL rows are collected separately so they are never
    // fed to a timestamp comparison or omitted from "clear waiting."
    await collectSnapshotPartition();
    await collectSnapshotPartition({ undated: true });

    return { ids: Array.from(selectedIds), cutoff };
}

async function snapshotDrawingSelection(listId) {
    const selection = adminListSelections.get(listId);
    if (!selection) return 0;
    const snapshot = await fetchAdminListSnapshot(listId);
    selection.ids = new Set(snapshot.ids);
    selection.snapshotCutoff = snapshot.cutoff;
    refreshVisibleListSelection(listId);
    return snapshot.ids.length;
}

async function runDrawingBulkMutation(action, listId, ids) {
    const batchSize = 100;
    let changed = 0;
    for (let start = 0; start < ids.length; start += batchSize) {
        const batch = ids.slice(start, start + batchSize);
        let query = action === 'approve'
            ? adminClient.from('drawings').update({ approved: true })
            : adminClient.from('drawings').delete();
        query = applyAdminListFilter(query.in('id', batch), listId).select('id');
        const { data, error } = await query;
        if (error) {
            const bulkError = new Error(error.message || 'Bulk action failed.');
            bulkError.code = error.code;
            bulkError.completedCount = changed;
            throw bulkError;
        }
        (data || []).forEach(item => forgetAdminSelectionId(item.id));
        changed += (data || []).length;
    }
    return changed;
}

async function deleteAdminListSnapshot(listId, ids) {
    const table = getAdminListTable(listId);
    const batchSize = 100;
    let changed = 0;
    for (let start = 0; start < ids.length; start += batchSize) {
        const batch = ids.slice(start, start + batchSize);
        let query = adminClient.from(table).delete().in('id', batch);
        // If a dood was approved or an ask was answered after the snapshot,
        // leave it alone. The pending predicate is rechecked at delete time.
        query = applyAdminListFilter(query, listId).select('id');
        const { data, error } = await query;
        if (error) {
            const bulkError = new Error(error.message || 'Bulk delete failed.');
            bulkError.code = error.code;
            bulkError.completedCount = changed;
            throw bulkError;
        }
        (data || []).forEach(item => forgetAdminSelectionId(item.id));
        changed += (data || []).length;
    }
    return changed;
}

async function clearPendingAdminList(button, listId, noun) {
    if (submissionMutationBusy) {
        setStatus(els.adminStatus, 'Another moderation action is still finishing.');
        return;
    }
    submissionMutationBusy = true;
    const previousStatus = els.adminStatus?.textContent || '';
    let changed = 0;
    let deleteCompleted = false;
    button.disabled = true;
    setAdminListBusy(listId, true);
    setStatus(els.adminStatus, `checking waiting ${noun}...`);
    try {
        const snapshot = await fetchAdminListSnapshot(listId);
        const pendingCount = snapshot.ids.length;
        if (!pendingCount) {
            setStatus(els.adminStatus, `no waiting ${noun}`);
            return;
        }
        if (!confirmDangerAction(`Delete ${pendingCount} waiting ${noun}? This cannot be undone.`)) {
            setStatus(els.adminStatus, previousStatus);
            return;
        }

        setStatus(els.adminStatus, `deleting ${pendingCount} waiting ${noun}...`);
        changed = await deleteAdminListSnapshot(listId, snapshot.ids);
        deleteCompleted = true;
        clearAdminListSelection(listId);
        await refreshAdminListSet([listId]);
        setStatus(els.adminStatus, `${changed} waiting ${noun} deleted`);
    } catch (error) {
        const completed = Number(error.completedCount) || 0;
        if (deleteCompleted) {
            let reloadFailed = false;
            try { await refreshAdminListSet([listId]); } catch (reloadError) { reloadFailed = true; }
            setStatus(els.adminStatus, `${changed} waiting ${noun} deleted; ${reloadFailed ? 'refresh failed' : 'list refreshed'}`);
            return;
        }
        let reloadFailed = false;
        if (completed) {
            try { await refreshAdminListSet([listId]); } catch (reloadError) { reloadFailed = true; }
        }
        setStatus(els.adminStatus, completed
            ? `${completed} deleted before the error; ${reloadFailed ? 'refresh failed' : 'list refreshed'}`
            : formatAdminMutationError(
                error,
                `Could not clear waiting ${noun}.`,
                listId.includes('drawings') ? 'dood' : 'ask'
            ));
    } finally {
        setAdminListBusy(listId, false);
        button.disabled = false;
        submissionMutationBusy = false;
    }
}

async function runBulkAction(button) {
    const action = button.dataset.bulkAction;
    const listId = button.dataset.list;
    if (!action || !listId) return;

    if (action === 'delete-all-pending-drawings') {
        await clearPendingAdminList(button, 'pending-drawings-list', 'doods');
        return;
    }

    if (action === 'delete-all-pending-questions') {
        await clearPendingAdminList(button, 'pending-questions-list', 'asks');
        return;
    }

    if (action === 'select') {
        const selectedCount = getAdminSelectionCount(listId);
        const totalCount = state.adminListTotals[listId] || 0;
        if (selectedCount === totalCount && totalCount > 0) {
            clearAdminListSelection(listId);
            refreshVisibleListSelection(listId);
            return;
        }

        button.disabled = true;
        setAdminListBusy(listId, true);
        setStatus(els.adminStatus, 'selecting...');
        try {
            const snapshotCount = await snapshotDrawingSelection(listId);
            setStatus(els.adminStatus, snapshotCount ? `${snapshotCount} selected` : 'nothing to select');
        } catch (error) {
            setStatus(els.adminStatus, error.message || 'Could not select doods.');
        } finally {
            setAdminListBusy(listId, false);
            button.disabled = false;
        }
        return;
    }

    const ids = getSelectedIds(listId);
    const selectionCount = getAdminSelectionCount(listId);
    if (!selectionCount) {
        setStatus(els.adminStatus, 'select items first');
        return;
    }
    if (action === 'delete' && !confirmDangerAction(`Delete ${selectionCount} selected doods? This cannot be undone.`)) return;
    if (submissionMutationBusy) {
        setStatus(els.adminStatus, 'Another moderation action is still finishing.');
        return;
    }
    submissionMutationBusy = true;

    button.disabled = true;
    setStatus(els.adminStatus, `${action} ${selectionCount}...`);
    let changed = 0;
    let mutationCompleted = false;

    try {
        changed = await runDrawingBulkMutation(action, listId, ids);
        mutationCompleted = true;
        clearAdminListSelection(listId);
        const refreshLists = action === 'approve'
            ? ['pending-drawings-list', 'published-drawings-list']
            : [listId];
        await refreshAdminListSet(refreshLists);
        setStatus(els.adminStatus, `${changed} dood${changed === 1 ? '' : 's'} ${action === 'approve' ? 'approved' : 'deleted'}`);
    } catch (error) {
        const completed = mutationCompleted ? changed : (Number(error.completedCount) || 0);
        let reloadFailed = false;
        try {
            const refreshLists = action === 'approve'
                ? ['pending-drawings-list', 'published-drawings-list']
                : [listId];
            await refreshAdminListSet(refreshLists);
        } catch (reloadError) {
            reloadFailed = true;
        }
        if (mutationCompleted) {
            setStatus(
                els.adminStatus,
                `${changed} dood${changed === 1 ? '' : 's'} ${action === 'approve' ? 'approved' : 'deleted'}; ${reloadFailed ? 'refresh failed' : 'list refreshed'}`
            );
            return;
        }
        if (reloadFailed) {
            setStatus(els.adminStatus, `${completed} of ${selectionCount} changed before the error; refresh also failed.`);
            return;
        }
        setStatus(els.adminStatus, completed
            ? `${completed} of ${selectionCount} changed before the error; list refreshed.`
            : formatAdminMutationError(error, 'Bulk action failed.', 'dood'));
    } finally {
        button.disabled = false;
        submissionMutationBusy = false;
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
    els.refresh.addEventListener('click', () => {
        void loadAdminData().catch(error => {
            setStatus(els.adminStatus, error.message || 'Could not refresh admin data.');
        });
    });
    els.logout.addEventListener('click', async () => {
        clearTimeout(wishlistSearchTimer);
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
        list.addEventListener('change', event => {
            const input = event.target.closest('input[data-select-id]');
            if (!input) return;
            const selection = adminListSelections.get(list.id);
            if (!selection) return;
            const id = String(input.dataset.selectId);
            if (input.checked) {
                selection.ids.add(id);
            } else {
                selection.ids.delete(id);
            }
        });
        list.addEventListener('input', event => {
            const textarea = event.target.closest('textarea[data-answer-for]');
            if (!textarea) return;
            adminQuestionDrafts.set(String(textarea.dataset.answerFor), textarea.value);
        });
    });

    els.wishlistSyncNow?.addEventListener('click', syncWishlistNow);
    els.wishlistFeatureAll?.addEventListener('click', featureAllWishlistItems);
    els.wishlistUnfeatureAll?.addEventListener('click', unfeatureAllWishlistItems);
    els.wishlistSearch?.addEventListener('input', () => {
        state.wishlistSearch = els.wishlistSearch.value || '';
        adminListPages.set('wishlist-items-list', 1);
        adminListLoadTokens.set(
            'wishlist-items-list',
            (adminListLoadTokens.get('wishlist-items-list') || 0) + 1
        );
        setAdminListBusy('wishlist-items-list', true);
        clearTimeout(wishlistSearchTimer);
        wishlistSearchTimer = setTimeout(() => loadAdminList('wishlist-items-list'), 180);
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
    document.querySelector('#links-panel .admin-link-grid')?.addEventListener('click', event => {
        const button = event.target.closest('[data-social-move]');
        if (!button) return;
        event.preventDefault();
        event.stopPropagation();
        moveSocialCard(button.dataset.socialKey, button.dataset.socialMove);
    });
    document.querySelectorAll('.admin-switch').forEach(toggle => {
        toggle.addEventListener('click', e => e.stopPropagation());
        toggle.addEventListener('keydown', e => e.stopPropagation());
        // Rooms has a confirmed, immediate save path above. Registering this
        // generic debounce too would save twice (even after a cancelled toggle).
        if (els.roomsMasterEnabled && toggle.contains(els.roomsMasterEnabled)) return;
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
        els.telegramUrl,
        els.xUrl,
        els.tiktokUrl,
        els.twitchUrl,
        els.discordUrl,
        els.onlyfansUrl,
        els.spotifyUrl,
        els.throneUrl,
        els.throneCheckoutMode,
        els.wishlistViewMode,
        els.homepageNoteText,
        els.maintenanceTitle,
        els.maintenanceMessage,
        els.maintenanceEta,
        els.entranceMode,
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
    getSocialUsernameControls().forEach(({ key, username, url }) => {
        username?.addEventListener('input', () => {
            syncSocialUrlFromUsername(key, username, url);
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
