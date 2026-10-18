const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
const ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
const ADMIN_PASSCODE_HASH = 'ce157a63c5af6bc69d076f5cc7acd1c18a8b44933f907e682f24914a63e9939e';
const SOCIAL_CARD_VIDEO_BUCKET = 'social-card-videos';
const DEFAULT_SOCIAL_CARD_ORDER = ['snapchat', 'instagram', 'kofi', 'telegram', 'x', 'tiktok', 'twitch', 'discord', 'onlyfans', 'spotify', 'throne_link'];
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
    spotify: username => `https://open.spotify.com/user/${encodeURIComponent(username)}`,
    throne_link: username => `https://throne.com/${encodeURIComponent(username)}`
});
const MAX_SOCIAL_CARD_VIDEO_BYTES = 20 * 1024 * 1024;
const SOCIAL_CARD_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/x-m4v', 'video/quicktime', 'image/gif']);
const socialVideoObjectUrls = new Map();
const socialVideoSelectedFiles = new Map();
const socialVideoPickerTimers = new Map();
const socialVideoPendingInputs = new Map();
const SOCIAL_VIDEO_PICKER_SESSION_KEY = 'doll_social_video_picker_pending';
const SOCIAL_VIDEO_CLEANUP_STORAGE_KEY = 'doll_social_video_cleanup_pending_v1';
const DOLL_BUILD_ID = document.querySelector('meta[name="doll-build"]')?.content || '2026.07.19.1';
const PUBLIC_SITE_SETTINGS_CACHE_KEY = 'doll_public_site_settings_v2';
const LEGACY_PUBLIC_SITE_SETTINGS_CACHE_KEY = 'doll_public_site_settings_v1';
const PUBLIC_SITE_SETTINGS_CACHE_SCHEMA = 2;

function cachePublicSiteSettings(settings) {
    try {
        localStorage.removeItem(LEGACY_PUBLIC_SITE_SETTINGS_CACHE_KEY);
        localStorage.setItem(PUBLIC_SITE_SETTINGS_CACHE_KEY, JSON.stringify({
            schema: PUBLIC_SITE_SETTINGS_CACHE_SCHEMA,
            buildId: DOLL_BUILD_ID,
            savedAt: Date.now(),
            value: settings
        }));
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
    throne_link_url: 'https://throne.com/edoll',
    throne_link_username: 'edoll',
    throne_link_enabled: true,
    throne_link_card_video_url: '',
    throne_link_card_video_path: '',
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
    first_visit_tour_enabled: true,
    drawings_enabled: true,
    questions_enabled: true,
    rooms_enabled: false,
    seo_title: 'Lia ⋆౨ৎ˚⟡',
    seo_description: "The official doll.gg, Lia's little space.",
    site_tagline: "Lia's little space."
};

// Bound reads and writes, including their response bodies. Supabase passes
// its fetch calls through global.fetch; caller cancellation is preserved.
async function adminFetchWithDeadline(input, options = {}) {
    const controller = new AbortController();
    const signal = options.signal || (input instanceof Request ? input.signal : null);
    const relayAbort = () => controller.abort();
    if (signal?.aborted) relayAbort();
    else signal?.addEventListener('abort', relayAbort, { once: true });
    const timeoutMs = String(input?.url || input).includes('/storage/v1/') ? 120000 : 20000;
    let timer;
    const deadline = new Promise((_, reject) => {
        timer = setTimeout(() => {
            // Mark our deadline as cancellation so the SDK does not restart it.
            reject(new DOMException('The connection timed out. Refresh the affected list before retrying.', 'AbortError'));
            controller.abort();
        }, timeoutMs);
    });
    try {
        return await Promise.race([
            (async () => {
                const response = await fetch(input, { ...options, signal: controller.signal });
                await response.clone().arrayBuffer();
                return response;
            })(),
            deadline
        ]);
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', relayAbort);
    }
}

function withAdminDeadline(request, ms = 10000) {
    let timer;
    return Promise.race([
        Promise.resolve(request),
        new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('The connection timed out. Please try again.')), ms);
        })
    ]).finally(() => clearTimeout(timer));
}

const adminClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { fetch: adminFetchWithDeadline },
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
    wishlistFilter: 'all',
    wishlistLoadedFilter: 'all',
    wishlistSort: 'featured',
    wishlistLoadedSort: 'featured',
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
    throneLinkEnabled: document.getElementById('throne-link-enabled'),
    throneLinkUrl: document.getElementById('throne-link-url'),
    throneLinkUsername: document.getElementById('throne-link-username'),
    throneLinkState: document.getElementById('throne-link-state'),
    throneEnabled: document.getElementById('throne-enabled'),
    throneState: document.getElementById('throne-state'),
    wishlistViewMode: document.getElementById('wishlist-view-mode'),
    wishlistItemsList: document.getElementById('wishlist-items-list'),
    wishlistSyncStatus: document.getElementById('wishlist-sync-status'),
    wishlistSyncNow: document.getElementById('wishlist-sync-now'),
    wishlistFeatureAll: document.getElementById('wishlist-feature-all'),
    wishlistUnfeatureAll: document.getElementById('wishlist-unfeature-all'),
    wishlistSearch: document.getElementById('wishlist-search'),
    wishlistFilter: document.getElementById('wishlist-filter'),
    wishlistSort: document.getElementById('wishlist-sort'),
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
    firstVisitTourEnabled: document.getElementById('first-visit-tour-enabled'),
    firstVisitTourState: document.getElementById('first-visit-tour-state'),
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
    if (panel !== els.dashboardPanel) {
        document.dispatchEvent(new Event('admin-content-changing'));
        cancelAdminSearch();
        if (adminArrangeSnapshot) document.getElementById('admin-arrange-cancel')?.click();
        document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    }
    [els.gatePanel, els.loginPanel, els.dashboardPanel].forEach(el => el.classList.add('hidden'));
    panel.classList.remove('hidden');
}

function setStatus(element, message) {
    if (element) element.textContent = message || '';
}

let adminSettingsSaveError = false;
function updateAdminSaveState() {
    const indicator = document.getElementById('admin-save-state');
    if (!indicator) return;
    const tone = !state.linkSettingsAvailable ? 'unavailable' : adminSettingsSaveError ? 'error' : !linkSettingsHydrated ? 'loading' : settingsSavePending ? 'working' : settingsDraftDirty ? 'draft' : 'saved';
    const label = { error: "Couldn’t save", working: 'Saving', draft: 'Unsaved changes', saved: 'Saved', loading: 'Loading settings', unavailable: 'Settings unavailable' }[tone];
    indicator.dataset.tone = tone;
    indicator.querySelector('strong').textContent = label;
    indicator.title = label;
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

function adminIcon(name, className = 'admin-action-icon') {
    const safeName = String(name || '').replace(/[^a-z0-9-]/gi, '');
    const safeClass = String(className || '').replace(/[^a-z0-9 _-]/gi, '');
    return `<svg class="${safeClass}" aria-hidden="true"><use href="#admin-i-${safeName}"></use></svg>`;
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

function renderStats(linkSettings = state.linkSettings) {
    const pendingDrawings = state.adminListTotals['pending-drawings-list'] || 0;
    const publishedDrawings = state.adminListTotals['published-drawings-list'] || 0;
    const pendingQuestions = state.adminListTotals['pending-questions-list'] || 0;
    const publishedQuestions = state.adminListTotals['published-questions-list'] || 0;
    const publicLinkKeys = SOCIAL_CARD_KEYS;
    const activeLinks = publicLinkKeys
        .filter(key => linkSettings[`${key}_enabled`] !== false).length;
    if (els.reviewTabCount) els.reviewTabCount.textContent = String(pendingDrawings + pendingQuestions);
    if (els.publishedTabCount) els.publishedTabCount.textContent = String(publishedDrawings + publishedQuestions);
    if (els.linksTabCount) els.linksTabCount.textContent = `${activeLinks}/${publicLinkKeys.length}`;

    updateAdminLaneCounts(pendingDrawings, pendingQuestions, publishedDrawings, publishedQuestions);
    syncAdminNavigationLabels();
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
        <button type="button" class="soft" data-page-step="-1" aria-label="previous ${escapeHtml(config.label)} page">${adminIcon('arrow-left')}</button>
        <span aria-live="polite"></span>
        <button type="button" class="soft" data-page-step="1" aria-label="next ${escapeHtml(config.label)} page">${adminIcon('arrow-right')}</button>
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
    const totalItems = getAdminVisibleTotal(listId);
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
    document.dispatchEvent(new Event('admin-content-changing'));
    const pageItems = paginateAdminList(list, container);
    if (!getAdminVisibleTotal(container.id)) {
        container.innerHTML = emptyMessage(published ? 'no posted doods' : 'nothing waiting');
        if (!published) renderAdminSelectionPreview();
        return;
    }

    container.innerHTML = pageItems.map(item => `
        <article class="admin-card" data-id="${escapeHtml(item.id)}">
            <label class="admin-select">
                <input type="checkbox" aria-label="Select dood ${escapeHtml(String(item.id))}" data-select-id="${escapeHtml(item.id)}"${isAdminListItemSelected(container.id, item.id) ? ' checked' : ''}>
                <span></span>
            </label>
            <img src="${getDrawingSrc(item.imageData)}" alt="" loading="lazy" decoding="async">
            <footer class="admin-record-footer">
                <details class="admin-meta-details"><summary aria-label="Dood details" title="Dood details">${adminIcon('info')}<time>${escapeHtml(String(item.created_at || "Unknown date").slice(0, 10))}</time></summary>${renderMeta(item)}</details>
                <div class="admin-actions">
                    ${published ? '' : `<button type="button" class="admin-icon-button" data-action="approve-drawing" aria-label="Approve dood ${escapeHtml(String(item.id))}" title="Approve dood">${adminIcon('check')}</button>`}
                    <button type="button" class="admin-icon-button danger" data-action="delete-drawing" aria-label="Delete dood ${escapeHtml(String(item.id))}" title="Delete dood">${adminIcon('trash')}</button>
                </div>
            </footer>
        </article>
    `).join('');
    if (!published) renderAdminSelectionPreview(); else updateAdminPublishedSelection();
}

function renderAdminSelectionPreview() {
    const preview = document.getElementById('admin-selection-preview');
    if (!preview) return;
    const ids = new Set(getSelectedIds('pending-drawings-list'));
    const count = ids.size;
    const countLabel = preview.querySelector('[data-selection-count]');
    const output = preview.querySelector('[data-selection-items]');
    const actions = preview.querySelector('[data-selection-actions]');
    if (countLabel) countLabel.textContent = `${count} selected`;
    if (actions) actions.hidden = true;
    updateAdminSelectionBar(count);
    if (!output) return;
    if (!count) {
        output.innerHTML = '<p class="admin-tool-note">Choose doods to preview the exact bulk action set.</p>';
        return;
    }
    const visibleItems = getAdminListItems('pending-drawings-list').filter(item => ids.has(String(item.id))).slice(0, 6);
    const hiddenCount = Math.max(0, count - visibleItems.length);
    output.innerHTML = visibleItems.map(item => `
        <article class="admin-selection-item">
            <img src="${escapeHtml(getDrawingSrc(item.imageData))}" alt="">
            <span><strong>${escapeHtml(String(item.id))}</strong><small>ready for one bulk action</small></span>
            ${adminIcon('check')}
        </article>
    `).join('') + (hiddenCount ? `<p class="admin-tool-note">+ ${hiddenCount} selected on other pages</p>` : '');
}

function renderQuestions(list, container, published) {
    document.dispatchEvent(new Event('admin-content-changing'));
    const pageItems = paginateAdminList(list, container);
    if (!getAdminVisibleTotal(container.id)) {
        container.innerHTML = emptyMessage(published ? 'no answered asks' : 'no asks waiting');
        return;
    }

    container.innerHTML = pageItems.map(item => `
        <article class="admin-card admin-question-card" data-id="${escapeHtml(item.id)}">
            <p class="admin-question">${escapeHtml(item.question)}</p>
            <textarea aria-label="Reply to ask ${escapeHtml(String(item.id))}" data-answer-for="${escapeHtml(item.id)}" placeholder="reply">${escapeHtml(adminQuestionDrafts.has(String(item.id)) ? adminQuestionDrafts.get(String(item.id)) : (item.answer || ''))}</textarea>
            <footer class="admin-record-footer">
                <details class="admin-meta-details"><summary aria-label="Ask details" title="Ask details">${adminIcon('info')}<time>${escapeHtml(String(item.created_at || "Unknown date").slice(0, 10))}</time></summary>${renderShortMeta(item)}</details>
                <div class="admin-actions">
                    <button type="button" class="admin-icon-button" data-action="save-question" aria-label="${published ? 'Save reply' : 'Publish reply'} to ask ${escapeHtml(String(item.id))}" title="${published ? 'Save reply' : 'Publish reply'}">${adminIcon(published ? 'save' : 'send')}</button>
                    <button type="button" class="admin-icon-button danger" data-action="delete-question" aria-label="Delete ask ${escapeHtml(String(item.id))}" title="Delete ask">${adminIcon('trash')}</button>
                </div>
            </footer>
        </article>
    `).join('');
}

function getGifReplyUrlFromClipboard(clipboardData) {
    if (!clipboardData) return '';
    // Plain URLs already paste correctly into the textarea and are handled by
    // the public Giphy/Tenor/direct-image renderer. Only intervene when a GIF
    // keyboard supplies rich HTML without a usable text representation.
    if (/https?:\/\/\S+/i.test(clipboardData.getData('text/plain') || '')) return '';
    const html = clipboardData.getData('text/html') || '';
    if (!html) return '';
    const documentFragment = new DOMParser().parseFromString(html, 'text/html');
    const candidates = Array.from(documentFragment.querySelectorAll('a[href], img[src]'));
    for (const element of candidates) {
        const isImage = element.matches('img');
        const candidate = element.getAttribute(isImage ? 'src' : 'href');
        if (!candidate) continue;
        try {
            const url = new URL(candidate);
            if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
            const hostname = url.hostname.toLowerCase();
            const isKnownGifProvider = hostname === 'giphy.com'
                || hostname.endsWith('.giphy.com')
                || hostname === 'tenor.com'
                || hostname.endsWith('.tenor.com');
            const isDirectGifMedia = /\.(?:gif|webp)(?:$|[?#])/i.test(
                `${url.pathname}${url.search}${url.hash}`
            );
            if (isImage || isKnownGifProvider || isDirectGifMedia) return url.href;
        } catch (error) {}
    }
    return '';
}

function insertGifReplyUrl(textarea, url) {
    if (!textarea || !url) return;
    const start = Number.isInteger(textarea.selectionStart)
        ? textarea.selectionStart
        : textarea.value.length;
    const end = Number.isInteger(textarea.selectionEnd) ? textarea.selectionEnd : start;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const insertion = `${before && !/\s$/.test(before) ? ' ' : ''}${url}${after && !/^\s/.test(after) ? ' ' : ''}`;
    textarea.setRangeText(insertion, start, end, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

function normalizeSeoDescription(value) {
    const description = String(value || '').trim()
        .replace(/(?:&#39;|&#x27;|&apos;)/gi, "'");
    return !description
        || description === "Lia's little space"
        || description === "Lia's little space."
        || description === "The official doll.gg, Lia's little space"
        ? DEFAULT_LINK_SETTINGS.seo_description
        : description;
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
        { key: 'spotify', username: els.spotifyUsername, url: els.spotifyUrl },
        { key: 'throne_link', username: els.throneLinkUsername, url: els.throneLinkUrl }
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
        throne_link_url: String(settings.throne_link_url || DEFAULT_LINK_SETTINGS.throne_link_url),
        throne_link_username: readSocialUsernameSetting(settings, 'throne_link'),
        throne_link_enabled: readBooleanSetting(settings, 'throne_link_enabled'),
        throne_link_card_video_url: String(settings.throne_link_card_video_url || ''),
        throne_link_card_video_path: String(settings.throne_link_card_video_path || ''),
        social_card_order: normalizeSocialCardOrder(settings.social_card_order),
        throne_url: String(settings.throne_url || DEFAULT_LINK_SETTINGS.throne_url),
        throne_enabled: readBooleanSetting(settings, 'throne_enabled'),
        throne_checkout_mode: 'mockup',
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
        first_visit_tour_enabled: readBooleanSetting(settings, 'first_visit_tour_enabled'),
        drawings_enabled: readBooleanSetting(settings, 'drawings_enabled'),
        questions_enabled: readBooleanSetting(settings, 'questions_enabled'),
        rooms_enabled: readBooleanSetting(settings, 'rooms_enabled'),
        seo_title: String(settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title),
        seo_description: normalizeSeoDescription(settings.seo_description),
        site_tagline: String(settings.site_tagline || DEFAULT_LINK_SETTINGS.site_tagline)
    };
}

function ensureSocialOrderControls() {
    SOCIAL_CARD_KEYS.forEach(key => {
        const card = document.querySelector(`[data-link-card="${key}"]`);
        const actions = card?.querySelector('.admin-link-card-actions');
        if (!actions || actions.querySelector('.admin-social-order-controls')) return;
        const label = card.querySelector('summary strong')?.textContent?.trim() || key;
        card.classList.add('has-social-order');
        card.querySelector('summary').setAttribute('aria-haspopup', 'dialog');
        const subtitle = document.createElement('small'); subtitle.className = 'admin-social-subtitle';
        card.querySelector('.admin-link-card-title > div')?.append(subtitle);
        const controls = document.createElement('span');
        controls.className = 'admin-social-order-controls';
        controls.innerHTML = `
            <button class="admin-social-drag" type="button" data-social-drag="${key}" aria-label="Drag ${label} card to reorder" title="Drag to reorder">${adminIcon('drag')}</button>
            <button class="admin-social-edit admin-icon-button" type="button" data-social-edit="${key}" aria-label="Edit ${label} card" title="Edit ${label} card">${adminIcon('edit')}</button>
            <button class="admin-social-move" type="button" data-social-move="up" data-social-key="${key}" aria-label="Move ${label} card up">${adminIcon('arrow-up')}</button>
            <span class="admin-social-position" aria-label="Card position"></span>
            <button class="admin-social-move" type="button" data-social-move="down" data-social-key="${key}" aria-label="Move ${label} card down">${adminIcon('arrow-down')}</button>
        `;
        actions.prepend(controls);
        const open = actions.querySelector('[data-link-open]');
        if (open) { open.textContent = 'Open ' + label; card.querySelector('.admin-link-card-body')?.append(open); }
    });
}

function applyAdminSocialCardOrder(settings = state.linkSettings) {
    ensureSocialOrderControls();
    const order = normalizeSocialCardOrder(settings.social_card_order);
    const grid = document.querySelector('#links-panel .admin-link-grid');
    if (!grid) return;

    order.forEach(key => {
        const card = grid.querySelector(`[data-link-card="${key}"]`);
        if (card) grid.append(card);
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
    if (!linkSettingsHydrated) { setStatus(els.adminStatus, 'Saved site settings are still loading.'); return; }
    const order = normalizeSocialCardOrder(state.linkSettings.social_card_order);
    const current = order.indexOf(key), target = current + (direction === 'up' ? -1 : 1);
    if (current < 0 || target < 0 || target >= order.length) return;
    [order[current], order[target]] = [order[target], order[current]];
    commitSocialCardOrder(order);
    requestAnimationFrame(() => document.querySelector(`[data-social-key="${key}"][data-social-move="${direction}"]`)?.focus({ preventScroll: true }));
}
function commitSocialCardOrder(keys) {
    if (!linkSettingsHydrated) { setStatus(els.adminStatus, 'Saved site settings are still loading.'); return false; }
    const next = normalizeSocialCardOrder(keys), previous = normalizeSocialCardOrder(state.linkSettings.social_card_order);
    if (next.every((key, index) => key === previous[index])) return false;
    state.linkSettings.social_card_order = next;
    settingsDraftDirty = true; applyAdminSocialCardOrder(state.linkSettings); renderLinkPreview();
    setStatus(els.adminStatus, 'Saving link order…');
    void saveLinkSettingsNow({ overrides: { social_card_order: next }, onFailure: () => {
        const current = normalizeSocialCardOrder(state.linkSettings.social_card_order);
        if (!current.every((key, index) => key === next[index])) return;
        state.linkSettings.social_card_order = previous;
        applyAdminSocialCardOrder(state.linkSettings); renderLinkPreview();
        setStatus(els.adminStatus, 'Couldn’t save link order. The previous order was restored.');
    } });
    return true;
}

function setLinkSettingsHydrated(ready) {
    linkSettingsHydrated = Boolean(ready);
    updateAdminSaveState();
    if (!state.linkSettingsAvailable) setStatus(els.adminStatus, 'Settings are unavailable. Refresh the dashboard to try again.');
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
    if (els.throneLinkEnabled) els.throneLinkEnabled.checked = settings.throne_link_enabled !== false;
    if (els.throneLinkUrl) els.throneLinkUrl.value = settings.throne_link_url || '';
    if (els.throneLinkUsername) els.throneLinkUsername.value = settings.throne_link_username ?? '';
    if (els.throneLinkState) els.throneLinkState.textContent = settings.throne_link_enabled !== false ? 'visible' : 'hidden';
    if (els.throneEnabled) els.throneEnabled.checked = settings.throne_enabled !== false;
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    if (els.wishlistViewMode) els.wishlistViewMode.value = WISHLIST_VIEW_MODES.includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry';
    if (els.homepageNoteText) els.homepageNoteText.value = settings.homepage_note_text || '';
    if (els.maintenanceEnabled) els.maintenanceEnabled.checked = settings.maintenance_enabled === true;
    if (els.maintenanceTitle) els.maintenanceTitle.value = settings.maintenance_title || '';
    if (els.maintenanceMessage) els.maintenanceMessage.value = settings.maintenance_message || '';
    if (els.maintenanceEta) els.maintenanceEta.value = settings.maintenance_eta || '';
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.entranceMode) els.entranceMode.value = settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw';
    if (els.entranceModeState) els.entranceModeState.textContent = settings.entrance_mode === 'bubbles' ? 'pop bubbles' : 'paw press';
    const entrancePreview = document.getElementById('admin-entrance-preview');
    if (entrancePreview) {
        entrancePreview.dataset.mode = settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw';
        const label = entrancePreview.querySelector('strong');
        if (label) label.textContent = settings.entrance_mode === 'bubbles' ? 'pop the bubbles' : 'press the paw';
    }
    if (els.firstVisitTourEnabled) els.firstVisitTourEnabled.checked = settings.first_visit_tour_enabled !== false;
    if (els.firstVisitTourState) els.firstVisitTourState.textContent = settings.first_visit_tour_enabled !== false ? 'on' : 'off';
    document.querySelector('.admin-tour-preview')?.classList.toggle('is-disabled', settings.first_visit_tour_enabled === false);
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
        throne_link_url: els.throneLinkUrl?.value.trim() || state.linkSettings.throne_link_url || DEFAULT_LINK_SETTINGS.throne_link_url,
        throne_link_username: getDraftSocialUsername('throne_link', els.throneLinkUsername),
        throne_link_enabled: els.throneLinkEnabled?.checked !== false,
        throne_link_card_video_url: state.linkSettings.throne_link_card_video_url || '',
        throne_link_card_video_path: state.linkSettings.throne_link_card_video_path || '',
        social_card_order: normalizeSocialCardOrder(state.linkSettings.social_card_order),
        throne_url: state.linkSettings.throne_url || DEFAULT_LINK_SETTINGS.throne_url,
        throne_enabled: els.throneEnabled?.checked !== false,
        throne_checkout_mode: 'mockup',
        wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
        homepage_note_text: (els.homepageNoteText?.value || '').slice(0, 220),
        homepage_note_font_size: Math.min(17, Math.max(9, Number(state.linkSettings.homepage_note_font_size) || DEFAULT_LINK_SETTINGS.homepage_note_font_size)),
        maintenance_enabled: els.maintenanceEnabled?.checked === true,
        maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
        maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
        maintenance_eta: els.maintenanceEta?.value.trim() || '',
        entrance_mode: els.entranceMode?.value === 'bubbles' ? 'bubbles' : 'paw',
        first_visit_tour_enabled: els.firstVisitTourEnabled?.checked !== false,
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
    SOCIAL_CARD_KEYS.forEach(key => {
        const subtitle = document.querySelector(`[data-link-card="${key}"] .admin-social-subtitle`);
        if (subtitle) { const username = String(settings[`${key}_username`] || ''); subtitle.textContent = username ? '@' + username.replace(/^@/, '') : ''; }
    });
    const entrance = document.getElementById('admin-entrance-preview');
    if (entrance) { entrance.dataset.mode = settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw'; entrance.querySelector('strong').textContent = settings.entrance_mode === 'bubbles' ? 'Pop the bubbles' : 'Press the paw'; }
    document.querySelector('.admin-tour-preview')?.classList.toggle('is-disabled', settings.first_visit_tour_enabled === false);
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
    if (els.throneLinkState) els.throneLinkState.textContent = settings.throne_link_enabled !== false ? 'visible' : 'hidden';
    if (els.throneState) els.throneState.textContent = settings.throne_enabled !== false ? 'visible' : 'hidden';
    const homepageNoteText = String(settings.homepage_note_text || '');
    if (els.homepageNoteState) els.homepageNoteState.textContent = homepageNoteText ? 'visible' : 'blank';
    if (els.homepageNoteCount) els.homepageNoteCount.textContent = `${homepageNoteText.length}/220`;
    const notePreview = document.getElementById('admin-note-preview');
    if (notePreview) {
        notePreview.textContent = homepageNoteText || 'blank note stays hidden';
        notePreview.classList.toggle('is-blank', !homepageNoteText);
        notePreview.style.setProperty('--admin-note-font-size', `${settings.homepage_note_font_size || DEFAULT_LINK_SETTINGS.homepage_note_font_size}px`);
    }
    document.querySelector('[data-link-card="homepage-note"]')?.classList.toggle('is-disabled', !homepageNoteText);
    if (els.maintenanceState) els.maintenanceState.textContent = settings.maintenance_enabled === true ? 'on' : 'off';
    if (els.entranceModeState) els.entranceModeState.textContent = settings.entrance_mode === 'bubbles' ? 'pop bubbles' : 'paw press';
    if (els.firstVisitTourState) els.firstVisitTourState.textContent = settings.first_visit_tour_enabled !== false ? 'on' : 'off';
    if (els.submissionsState) els.submissionsState.textContent = getSubmissionsStateLabel(settings);
    if (els.roomsMasterState) els.roomsMasterState.textContent = settings.rooms_enabled !== false ? 'enabled' : 'disabled';
    els.roomsDisabledBanner?.classList.toggle('hidden', settings.rooms_enabled !== false);
    if (els.seoPreviewTitle) els.seoPreviewTitle.textContent = settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
    if (els.seoPreviewDescription) els.seoPreviewDescription.textContent = settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
    if (els.seoTitleCount) els.seoTitleCount.textContent = `${settings.seo_title.length}/70`;
    if (els.seoDescriptionCount) els.seoDescriptionCount.textContent = `${settings.seo_description.length}/180`;
    if (els.siteTaglineCount) els.siteTaglineCount.textContent = `${settings.site_tagline.length}/120`;
    if (els.seoState) els.seoState.textContent = settingsDraftDirty ? 'editing' : 'ready';
    [...SOCIAL_CARD_KEYS, 'wishes', 'maintenance', 'submissions'].forEach(key => {
        const settingKey = key === 'wishes' ? 'throne' : key.replace('-', '_');
        let disabled = settings[`${settingKey}_enabled`] === false;
        if (key === 'submissions') {
            disabled = settings.drawings_enabled === false && settings.questions_enabled === false;
        }
        document.querySelector(`[data-link-card="${key}"]`)?.classList.toggle('is-disabled', disabled);
    });
    document.querySelector('[data-link-card="rooms-master"]')?.classList.toggle('is-disabled', settings.rooms_enabled === false);
    renderStats(settings);
    renderStaticSeoStatus(settings);
}

function renderLinkPreview() {
    const settings = getDraftLinkSettings();
    syncLinkDraftLabels(settings);
    updateAdminSaveState();
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
    control.removeAttribute('aria-disabled');
    if (SOCIAL_CARD_VIDEO_HOSTING_PAUSED) {
        revokeSocialVideoObjectUrl(key);
        socialVideoSelectedFiles.delete(key);
        if (fileInput) {
            fileInput.value = '';
            fileInput.disabled = true;
        }
        if (uploadButton) uploadButton.disabled = true;
        if (removeButton) removeButton.disabled = true;
        control.querySelector('.admin-card-video-actions')?.setAttribute('hidden', '');
        const localFile = String(LOCAL_SOCIAL_CARD_VIDEOS[key] || '');
        const previewUrl = localFile ? new URL('../' + localFile, location.href).href : '';
        const video = control.querySelector('[data-video-preview]');
        if (video) {
            video.controls = true; video.autoplay = false; video.preload = 'none';
            const poster = SOCIAL_CARD_MEDIA_CONFIG.localPosters?.[key];
            if (poster) video.poster = new URL('../' + poster, location.href).href;
        }
        setAdminSocialMediaPreview(control, previewUrl, false);
        setSocialVideoStatus(
            key,
            localFile ? 'Current background' : 'No video background',
            'paused'
        );
        if (note) {
            note.textContent = localFile
                ? 'This background is stored with the website. Play to preview.'
                : key === 'throne_link'
                    ? 'The Throne icon is currently shown.'
                    : 'This card uses its icon. Backgrounds are managed in the website files.';
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
    if (els.staticSeoCheck?.disabled) return;
    if (els.staticSeoCheck) els.staticSeoCheck.disabled = true;
    if (els.staticSeoState) els.staticSeoState.textContent = 'checking';
    try {
        staticSeoCheckFailed = false;
        const response = await adminFetchWithDeadline('../index.html', { cache: 'no-store' });
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
    if (els.staticSeoCheck) els.staticSeoCheck.disabled = false;
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
const WISHLIST_FILTERS = new Set(['all', 'available', 'sold-out', 'new']);
const WISHLIST_SORTS = new Set(['featured', 'newest', 'name']);
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
        els.wishlistSyncStatus.textContent = `Synced ${timeAgo(state.wishlistSyncedAt)}`;
    }
}

function renderWishlistItems() {
    document.dispatchEvent(new Event('admin-content-changing'));
    const container = els.wishlistItemsList;
    if (!container) return;
    const expanded = new Set([...container.querySelectorAll('.admin-wish-info[open]')].map(details => details.closest('[data-id]').dataset.id));
    const editing = document.getElementById('wishlist-panel').classList.contains('is-public-order');
    ['wishlist-sync-now', 'wishlist-feature-all', 'wishlist-unfeature-all', 'wishlist-sort', 'wishlist-filter', 'wishlist-search', 'admin-wish-order'].forEach(id => {
        const control = document.getElementById(id); if (!control) return;
        if (!state.wishlistItemsAvailable && !control.disabled) { control.dataset.availabilityDisabled = 'true'; control.disabled = true; }
        else if (state.wishlistItemsAvailable && control.dataset.availabilityDisabled === 'true') { control.disabled = false; delete control.dataset.availabilityDisabled; }
    });

    renderWishlistSyncStatus();

    if (!state.wishlistItemsAvailable) {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('Wishes are unavailable. Refresh the dashboard to try again.');
        return;
    }
    const totalItems = getAdminVisibleTotal('wishlist-items-list');
    if (!totalItems && !adminExactFilters.has('wishlist-items-list') && !state.wishlistSearch.trim() && state.wishlistFilter === 'all') {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('nothing synced yet — hit "sync now"');
        return;
    }

    const featuredCount = state.wishlistFeaturedCount || 0;
    if (els.wishlistFeaturedWarning) {
        const notices = [];
        if (featuredCount > WISHLIST_FEATURED_CAP) notices.push(`${featuredCount} items featured — only the first ${WISHLIST_FEATURED_CAP} by position show on the site.`);
        if (state.wishlistSort !== 'featured') notices.push('Switch to “featured first” to drag or use ordering arrows.');
        els.wishlistFeaturedWarning.textContent = notices.join(' ');
    }

    const visible = getAdminListItems('wishlist-items-list');

    if (!totalItems) {
        paginateAdminList([], container);
        container.innerHTML = emptyMessage('no items match these wishlist filters');
        return;
    }

    const pageItems = paginateAdminList(visible, container);
    const canReorder = state.wishlistSort === 'featured' && !adminExactFilters.has('wishlist-items-list');

    container.innerHTML = pageItems.map(item => {
        const isNew = item.first_synced_at && (Date.now() - new Date(item.first_synced_at).getTime()) < WISHLIST_NEW_WINDOW_MS;
        if (editing && item.featured && canReorder) return `
        <article class="admin-card admin-wish-order-row is-featured${item.is_available ? '' : ' is-unavailable'}" data-id="${escapeHtml(item.throne_item_id)}">
            <button class="admin-wishlist-drag" type="button" aria-label="Drag ${escapeHtml(item.name || 'wishlist item')} to reorder" title="Drag to reorder">${adminIcon('drag')}</button>
            <details class="admin-wish-info"${expanded.has(String(item.throne_item_id)) ? ' open' : ''}>
                <summary aria-label="Details for ${escapeHtml(item.name || 'wish')}" title="${escapeHtml(item.name || 'Wish details')}">
                    <img src="${escapeHtml(item.image_url || '')}" alt="" loading="lazy" decoding="async">
                    <strong>${escapeHtml(item.name || '')}</strong>
                </summary>
                <div class="admin-wish-info-body">
                    <div><strong>${escapeHtml(formatWishlistPrice(item.price_cents))}</strong><p class="admin-tool-note">${item.is_available ? 'available' : 'sold out / removed'} · qty ${escapeHtml(String(item.quantity ?? 0))}${isNew ? ' · new' : ''}</p></div>
                    <button type="button" class="admin-icon-button admin-feature-toggle" data-action="unfeature-wishlist-item" aria-pressed="true" aria-label="Unfeature ${escapeHtml(item.name || 'wish')}" title="Remove from featured wishes">${adminIcon('star')}</button>
                </div>
            </details>
            <div class="admin-actions">
                <button type="button" data-action="move-wishlist-item-up" ${String(item.throne_item_id) === state.wishlistFirstFeaturedId ? 'disabled' : ''} aria-label="Move ${escapeHtml(item.name || 'wish')} up" title="Move up">${adminIcon('arrow-up')}</button>
                <button type="button" data-action="move-wishlist-item-down" ${String(item.throne_item_id) === state.wishlistLastFeaturedId ? 'disabled' : ''} aria-label="Move ${escapeHtml(item.name || 'wish')} down" title="Move down">${adminIcon('arrow-down')}</button>
            </div>
        </article>`;
        return `
        <article class="admin-card${item.featured ? ' is-featured' : ''}${item.is_available ? '' : ' is-unavailable'}" data-id="${escapeHtml(item.throne_item_id)}">
            ${item.featured && canReorder ? `<button class="admin-wishlist-drag" type="button" aria-label="Drag ${escapeHtml(item.name || 'wishlist item')} to reorder" title="Drag to reorder">${adminIcon('drag')}</button>` : ''}
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
                ${item.featured && canReorder ? `
                    <button type="button" data-action="move-wishlist-item-up" ${String(item.throne_item_id) === state.wishlistFirstFeaturedId ? 'disabled' : ''} aria-label="move up">${adminIcon('arrow-up')}</button>
                    <button type="button" data-action="move-wishlist-item-down" ${String(item.throne_item_id) === state.wishlistLastFeaturedId ? 'disabled' : ''} aria-label="move down">${adminIcon('arrow-down')}</button>
                ` : ''}
                <button type="button" class="admin-icon-button admin-feature-toggle" data-action="${item.featured ? 'unfeature-wishlist-item' : 'feature-wishlist-item'}" aria-pressed="${Boolean(item.featured)}" aria-label="${item.featured ? 'Unfeature' : 'Feature'} ${escapeHtml(item.name || 'wish')}" title="${item.featured ? 'Remove from featured wishes' : 'Feature on site'}">${adminIcon('star')}</button>
            </div>
        </article>
    `; }).join('');
}

async function syncWishlistNow() {
    if (!els.wishlistSyncNow) return;
    els.wishlistSyncNow.disabled = true;
    setStatus(els.adminStatus, 'syncing wishlist...');

    try {
        const { data: { session } } = await withAdminDeadline(adminClient.auth.getSession());
        const res = await adminFetchWithDeadline(`${SUPABASE_URL}/functions/v1/throne-wishlist-sync`, {
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
    const actionFilter = state.wishlistFilter;
    const actionNewCutoff = new Date(Date.now() - WISHLIST_NEW_WINDOW_MS).toISOString();
    let countQuery = adminClient.from('wishlist_items')
        .select('throne_item_id', { count: 'exact', head: true })
        .eq('featured', false);
    countQuery = applyWishlistScopeFilter(countQuery, { search: actionSearch, filter: actionFilter, newCutoff: actionNewCutoff });
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
            targetQuery = applyWishlistScopeFilter(targetQuery, { search: actionSearch, filter: actionFilter, newCutoff: actionNewCutoff });
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
    const actionFilter = state.wishlistFilter;
    const actionNewCutoff = new Date(Date.now() - WISHLIST_NEW_WINDOW_MS).toISOString();
    let countQuery = adminClient.from('wishlist_items')
        .select('throne_item_id', { count: 'exact', head: true })
        .eq('featured', true);
    countQuery = applyWishlistScopeFilter(countQuery, { search: actionSearch, filter: actionFilter, newCutoff: actionNewCutoff });
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
        updateQuery = applyWishlistScopeFilter(updateQuery, { search: actionSearch, filter: actionFilter, newCutoff: actionNewCutoff });
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

function applyWishlistScopeFilter(query, {
    search = state.wishlistSearch,
    filter = state.wishlistFilter,
    newCutoff = new Date(Date.now() - WISHLIST_NEW_WINDOW_MS).toISOString()
} = {}) {
    let scoped = applyWishlistSearchFilter(query, search);
    if (filter === 'available') scoped = scoped.eq('is_available', true);
    if (filter === 'sold-out') scoped = scoped.eq('is_available', false);
    if (filter === 'new') {
        scoped = scoped.gte('first_synced_at', newCutoff);
    }
    return scoped;
}

function buildAdminListQuery(listId, {
    wishlistSearch = state.wishlistSearch,
    wishlistFilter = state.wishlistFilter,
    wishlistSort = state.wishlistSort,
    ignoreExact = false
} = {}) {
    const columns = ADMIN_LIST_COLUMNS[listId];
    if (!columns) throw new Error(`Unknown admin list: ${listId}`);

    if (listId === 'wishlist-items-list') {
        let query = adminClient
            .from('wishlist_items')
            .select(columns, { count: 'exact' });
        const exact = !ignoreExact && adminExactFilters.get(listId);
        if (exact) query = query.eq('throne_item_id', exact.id);
        else query = applyWishlistScopeFilter(query, { search: wishlistSearch, filter: wishlistFilter });
        if (wishlistSort === 'newest') {
            return query
                .order('first_synced_at', { ascending: false, nullsFirst: false })
                .order('name', { ascending: true })
                .order('throne_item_id', { ascending: true });
        }
        if (wishlistSort === 'name') {
            return query
                .order('name', { ascending: true })
                .order('throne_item_id', { ascending: true });
        }
        return query
            .order('featured', { ascending: false })
            .order('position', { ascending: true })
            .order('name', { ascending: true })
            .order('throne_item_id', { ascending: true });
    }

    const table = listId.includes('drawings') ? 'drawings' : 'questions';
    let query = adminClient.from(table).select(columns, { count: 'exact' });
    query = applyAdminListFilter(query, listId);
    const exact = !ignoreExact && adminExactFilters.get(listId);
    if (exact) query = query.eq('id', exact.id);
    return query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
}

async function fetchAdminListPage(listId) {
    const config = ADMIN_LIST_PAGINATION[listId];
    if (!config) throw new Error(`Unknown admin list: ${listId}`);

    const queryWishlistSearch = listId === 'wishlist-items-list' ? state.wishlistSearch : '';
    const queryWishlistFilter = listId === 'wishlist-items-list' ? state.wishlistFilter : 'all';
    const queryWishlistSort = listId === 'wishlist-items-list' ? state.wishlistSort : 'featured';
    const runPage = page => {
        const start = (page - 1) * config.pageSize;
        return buildAdminListQuery(listId, {
            wishlistSearch: queryWishlistSearch,
            wishlistFilter: queryWishlistFilter,
            wishlistSort: queryWishlistSort
        })
            .range(start, start + config.pageSize - 1);
    };

    let page = Math.max(1, adminListPages.get(listId) || 1);
    let result = await runPage(page);
    if (result.error) {
        if (listId === 'wishlist-items-list' && result.error.code === '42P01') {
            return { items: [], total: 0, page: 1, wishlistSearch: queryWishlistSearch, wishlistFilter: queryWishlistFilter, wishlistSort: queryWishlistSort, available: false };
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

    let unfilteredTotal;
    if (adminExactFilters.has(listId)) {
        const countResult = await buildAdminListQuery(listId, { wishlistSearch: queryWishlistSearch, wishlistFilter: queryWishlistFilter, wishlistSort: queryWishlistSort, ignoreExact: true }).select(listId === 'wishlist-items-list' ? 'throne_item_id' : 'id', { count: 'exact', head: true });
        if (countResult.error) throw countResult.error;
        unfilteredTotal = countResult.count || 0;
    }
    return {
        items: result.data || [],
        unfilteredTotal,
        total,
        page,
        wishlistSearch: queryWishlistSearch,
        wishlistFilter: queryWishlistFilter,
        wishlistSort: queryWishlistSort,
        available: true
    };
}

function applyAdminListPage(listId, result) {
    state.adminListItems[listId] = result.items;
    if (adminExactFilters.has(listId)) {
        adminExactFilters.get(listId).total = result.total;
        if (result.unfilteredTotal !== undefined) state.adminListTotals[listId] = result.unfilteredTotal;
    }
    else state.adminListTotals[listId] = result.total;
    adminListPages.set(listId, result.page);
    adminListCommittedPages.set(listId, result.page);
    if (listId === 'wishlist-items-list') {
        state.wishlistItemsAvailable = result.available !== false;
        state.wishlistLoadedSearch = result.wishlistSearch || '';
        state.wishlistLoadedFilter = WISHLIST_FILTERS.has(result.wishlistFilter) ? result.wishlistFilter : 'all';
        state.wishlistLoadedSort = WISHLIST_SORTS.has(result.wishlistSort) ? result.wishlistSort : 'featured';
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
    let error = document.getElementById(`${listId}-error`);
    if (!error) {
        error = document.createElement('div'); error.id = `${listId}-error`; error.className = 'admin-list-error';
        error.innerHTML = '<span></span><button type="button" class="soft">Retry</button>';
        document.getElementById(listId).before(error);
        error.querySelector('button').addEventListener('click', () => void loadAdminList(listId));
    }
    error.querySelector('span').textContent = cleanMessage; error.hidden = false;
}

function clearAdminListError(listId) {
    const previousError = adminListErrors.get(listId);
    adminListErrors.delete(listId);
    const error = document.getElementById(`${listId}-error`); if (error) error.hidden = true;
    if (previousError && els.adminStatus?.textContent === previousError) {
        setStatus(els.adminStatus, '');
    }
}

function rollbackAdminListRequest(listId) {
    adminListPages.set(listId, adminListCommittedPages.get(listId) || 1);
    if (listId === 'wishlist-items-list') {
        state.wishlistSearch = state.wishlistLoadedSearch;
        state.wishlistFilter = state.wishlistLoadedFilter;
        state.wishlistSort = state.wishlistLoadedSort;
        if (els.wishlistSearch) els.wishlistSearch.value = state.wishlistLoadedSearch;
        if (els.wishlistFilter) els.wishlistFilter.value = state.wishlistLoadedFilter;
        if (els.wishlistSort) els.wishlistSort.value = state.wishlistLoadedSort;
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

let loginInFlight = false;
async function handleLogin(e) {
    e.preventDefault();
    if (loginInFlight) return;
    loginInFlight = true;
    const button = els.loginForm.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setStatus(els.loginStatus, 'checking...');
    const email = els.email.value.trim();
    const password = els.password.value;
    try {
        const { error } = await withAdminDeadline(adminClient.auth.signInWithPassword({ email, password }), 20000);
        if (error) throw error;
        if (!(await withAdminDeadline(ensureAdminSession()))) {
            setStatus(els.loginStatus, 'This login is not allowed here.');
            return;
        }
        // The secondary project must not strand the main dashboard.
        try {
            if (typeof window.roomsSignIn === 'function') {
                await withAdminDeadline(window.roomsSignIn(email, password), 5000);
            }
        } catch (error) {
            console.error('rooms login failed:', error);
        }
        els.password.value = '';
        await openDashboard();
    } catch (error) {
        setStatus(els.loginStatus, error.message || 'Login failed.');
    } finally {
        loginInFlight = false;
        if (button) button.disabled = false;
    }
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

async function swapWishlistItemPositions(current, neighbor) {
    const { data: firstWrite, error: firstError } = await adminClient.from('wishlist_items')
        .update({ position: neighbor.position })
        .eq('throne_item_id', current.throne_item_id)
        .select('throne_item_id')
        .maybeSingle();
    if (firstError || !firstWrite) {
        throw new Error(firstError?.message || 'move failed before any change');
    }

    const { data: secondWrite, error: secondError } = await adminClient.from('wishlist_items')
        .update({ position: current.position })
        .eq('throne_item_id', neighbor.throne_item_id)
        .select('throne_item_id')
        .maybeSingle();
    if (!secondError && secondWrite) return;

    const { data: rollbackWrite, error: rollbackError } = await adminClient.from('wishlist_items')
        .update({ position: current.position })
        .eq('throne_item_id', current.throne_item_id)
        .select('throne_item_id')
        .maybeSingle();
    const recovery = rollbackError || !rollbackWrite
        ? 'first half may still be saved'
        : 'first half was rolled back';
    throw new Error(`${secondError?.message || 'move failed halfway'}; ${recovery}`);
}

async function moveWishlistItemByDrag(sourceId, targetId, placeAfter = false) {
    if (wishlistActionBusy || !sourceId || !targetId || sourceId === targetId) return;
    wishlistActionBusy = true;
    let savedRows = 0;
    document.querySelectorAll('.admin-wishlist-drag').forEach(handle => { handle.disabled = true; });
    setStatus(els.adminStatus, 'saving wishlist order...');

    try {
        const items = await getOrderedFeaturedWishlistItems();
        const sourceIndex = items.findIndex(item => String(item.throne_item_id) === String(sourceId));
        const targetIndex = items.findIndex(item => String(item.throne_item_id) === String(targetId));
        if (sourceIndex < 0 || targetIndex < 0) throw new Error('The dragged item is no longer featured.');

        const ordered = items.filter(item => String(item.throne_item_id) !== String(sourceId));
        const insertionIndex = ordered.findIndex(item => String(item.throne_item_id) === String(targetId))
            + (placeAfter ? 1 : 0);
        ordered.splice(insertionIndex, 0, items[sourceIndex]);
        const finalIndex = ordered.findIndex(item => String(item.throne_item_id) === String(sourceId));

        // `position` carries no unique constraint, so the run can be renumbered
        // outright instead of walked one adjacent swap at a time. Dragging
        // across twenty rows is one pass of twenty writes now, not forty writes
        // over thirty-nine round trips.
        const ranked = items.every((item, index) =>
            index === 0 || Number(items[index - 1].position) < Number(item.position));
        const writes = [];
        if (ranked) {
            // Reuse the existing numbers for the slots that shifted; everything
            // outside the moved span keeps the position it already had.
            const spanStart = Math.min(sourceIndex, finalIndex);
            const spanEnd = Math.max(sourceIndex, finalIndex);
            for (let index = spanStart; index <= spanEnd; index += 1) {
                const slot = Number(items[index].position);
                const item = ordered[index];
                if (Number(item.position) !== slot) {
                    writes.push({ throne_item_id: item.throne_item_id, position: slot });
                }
            }
        } else {
            // Duplicate or gapped numbers (older syncs, "feature all" runs) can
            // not express an order on their own — renumber the whole run once.
            ordered.forEach((item, index) => {
                if (Number(item.position) !== index) {
                    writes.push({ throne_item_id: item.throne_item_id, position: index });
                }
            });
        }

        const batchSize = 12;
        for (let start = 0; start < writes.length; start += batchSize) {
            const batch = writes.slice(start, start + batchSize);
            const results = await Promise.all(batch.map(entry =>
                adminClient.from('wishlist_items')
                    .update({ position: entry.position })
                    .eq('throne_item_id', entry.throne_item_id)
                    .select('throne_item_id')
            ));
            savedRows += results.reduce((count, result) => count + (result.error ? 0 : (result.data || []).length), 0);
            const failed = results.find(result => result.error);
            if (failed) throw failed.error;
        }

        await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
        setStatus(els.adminStatus, writes.length ? 'wishlist order saved ✓' : 'wishlist order unchanged');
        return true;
    } catch (error) {
        let reloadFailed = false;
        try {
            await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
        } catch (reloadError) {
            reloadFailed = true;
        }
        const partial = savedRows ? `${savedRows} row${savedRows === 1 ? '' : 's'} moved before the error; ` : '';
        setStatus(els.adminStatus, `${partial}${formatAdminMutationError(error, 'Could not reorder wishlist.', 'item')} ${reloadFailed ? 'Refresh failed.' : 'List refreshed.'}`);
        return false;
    } finally {
        wishlistActionBusy = false;
        document.querySelectorAll('.admin-wishlist-drag').forEach(handle => { handle.disabled = false; });
    }
}

async function runAction(button) {
    const card = button.closest('.admin-card');
    const id = card?.dataset.id;
    const action = button.dataset.action;
    if (!id || !action || button.disabled) return;
    if (action === 'delete-drawing' || action === 'delete-question') {
        const noun = action === 'delete-drawing' ? 'dood' : 'ask';
        if (!confirmDangerAction(`Delete ${noun} ${id}? This cannot be undone.`)) return;
    }

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
                await swapWishlistItemPositions(current, neighbor);
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
            let recovery = '';
            if (isWishlistPositionAction) {
                try {
                    await refreshAdminListSet(['wishlist-items-list'], { refreshWishlistMeta: true });
                    recovery = ' List refreshed.';
                } catch (reloadError) {
                    recovery = ' Refresh failed.';
                }
            }
            setStatus(els.adminStatus, `${formatAdminMutationError(error, 'Could not save.', entity)}${recovery}`);
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
            snapchat_url: cleanUrl(els.snapchatUrl?.value ?? state.linkSettings.snapchat_url, 'Snapchat'),
            snapchat_username: getDraftSocialUsername('snapchat', els.snapchatUsername),
            snapchat_enabled: els.snapchatEnabled?.checked !== false,
            snapchat_card_video_url: String(state.linkSettings.snapchat_card_video_url || ''),
            snapchat_card_video_path: String(state.linkSettings.snapchat_card_video_path || ''),
            instagram_url: cleanUrl(els.instagramUrl?.value ?? state.linkSettings.instagram_url, 'Instagram'),
            instagram_username: getDraftSocialUsername('instagram', els.instagramUsername),
            instagram_enabled: els.instagramEnabled?.checked !== false,
            instagram_card_video_url: String(state.linkSettings.instagram_card_video_url || ''),
            instagram_card_video_path: String(state.linkSettings.instagram_card_video_path || ''),
            kofi_url: cleanUrl(els.kofiUrl?.value ?? state.linkSettings.kofi_url, 'Ko-fi'),
            kofi_username: getDraftSocialUsername('kofi', els.kofiUsername),
            kofi_enabled: els.kofiEnabled?.checked !== false,
            kofi_card_video_url: String(state.linkSettings.kofi_card_video_url || ''),
            kofi_card_video_path: String(state.linkSettings.kofi_card_video_path || ''),
            telegram_url: cleanUrl(els.telegramUrl?.value ?? state.linkSettings.telegram_url, 'Telegram'),
            telegram_username: getDraftSocialUsername('telegram', els.telegramUsername),
            telegram_enabled: els.telegramEnabled?.checked !== false,
            telegram_card_video_url: String(state.linkSettings.telegram_card_video_url || ''),
            telegram_card_video_path: String(state.linkSettings.telegram_card_video_path || ''),
            x_url: cleanUrl(els.xUrl?.value ?? state.linkSettings.x_url, 'X'),
            x_username: getDraftSocialUsername('x', els.xUsername),
            x_enabled: els.xEnabled?.checked !== false,
            x_card_video_url: String(state.linkSettings.x_card_video_url || ''),
            x_card_video_path: String(state.linkSettings.x_card_video_path || ''),
            tiktok_url: cleanUrl(els.tiktokUrl?.value ?? state.linkSettings.tiktok_url, 'TikTok'),
            tiktok_username: getDraftSocialUsername('tiktok', els.tiktokUsername),
            tiktok_enabled: els.tiktokEnabled?.checked !== false,
            tiktok_card_video_url: String(state.linkSettings.tiktok_card_video_url || ''),
            tiktok_card_video_path: String(state.linkSettings.tiktok_card_video_path || ''),
            twitch_url: cleanUrl(els.twitchUrl?.value ?? state.linkSettings.twitch_url, 'Twitch'),
            twitch_username: getDraftSocialUsername('twitch', els.twitchUsername),
            twitch_enabled: els.twitchEnabled?.checked !== false,
            twitch_card_video_url: String(state.linkSettings.twitch_card_video_url || ''),
            twitch_card_video_path: String(state.linkSettings.twitch_card_video_path || ''),
            discord_url: cleanUrl(els.discordUrl?.value ?? state.linkSettings.discord_url, 'Discord'),
            discord_username: getDraftSocialUsername('discord', els.discordUsername),
            discord_enabled: els.discordEnabled?.checked !== false,
            discord_card_video_url: String(state.linkSettings.discord_card_video_url || ''),
            discord_card_video_path: String(state.linkSettings.discord_card_video_path || ''),
            onlyfans_url: cleanUrl(els.onlyfansUrl?.value ?? state.linkSettings.onlyfans_url, 'OnlyFans'),
            onlyfans_username: getDraftSocialUsername('onlyfans', els.onlyfansUsername),
            onlyfans_enabled: els.onlyfansEnabled?.checked !== false,
            onlyfans_card_video_url: String(state.linkSettings.onlyfans_card_video_url || ''),
            onlyfans_card_video_path: String(state.linkSettings.onlyfans_card_video_path || ''),
            spotify_url: cleanUrl(els.spotifyUrl?.value ?? state.linkSettings.spotify_url, 'Spotify'),
            spotify_username: getDraftSocialUsername('spotify', els.spotifyUsername),
            spotify_enabled: els.spotifyEnabled?.checked !== false,
            spotify_card_video_url: String(state.linkSettings.spotify_card_video_url || ''),
            spotify_card_video_path: String(state.linkSettings.spotify_card_video_path || ''),
            throne_link_url: cleanUrl(els.throneLinkUrl?.value ?? state.linkSettings.throne_link_url, 'Throne link'),
            throne_link_username: getDraftSocialUsername('throne_link', els.throneLinkUsername),
            throne_link_enabled: els.throneLinkEnabled?.checked !== false,
            throne_link_card_video_url: String(state.linkSettings.throne_link_card_video_url || ''),
            throne_link_card_video_path: String(state.linkSettings.throne_link_card_video_path || ''),
            social_card_order: normalizeSocialCardOrder(state.linkSettings.social_card_order),
            throne_url: state.linkSettings.throne_url,
            throne_enabled: els.throneEnabled?.checked !== false,
            throne_checkout_mode: 'mockup',
            wishlist_view_mode: WISHLIST_VIEW_MODES.includes(els.wishlistViewMode?.value) ? els.wishlistViewMode.value : 'masonry',
            homepage_note_text: (els.homepageNoteText?.value || '').slice(0, 220),
            homepage_note_font_size: Math.min(17, Math.max(9, Number(state.linkSettings.homepage_note_font_size) || DEFAULT_LINK_SETTINGS.homepage_note_font_size)),
            maintenance_enabled: els.maintenanceEnabled?.checked === true,
            maintenance_title: els.maintenanceTitle?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_title,
            maintenance_message: els.maintenanceMessage?.value.trim() || DEFAULT_LINK_SETTINGS.maintenance_message,
            maintenance_eta: els.maintenanceEta?.value.trim() || '',
            entrance_mode: els.entranceMode?.value === 'bubbles' ? 'bubbles' : 'paw',
            first_visit_tour_enabled: els.firstVisitTourEnabled?.checked !== false,
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
            if (els.seoState) els.seoState.textContent = 'Couldn’t save';
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
    adminSettingsSaveError = false;
    updateAdminSaveState();
    const settingOverrides = overrides && typeof overrides === 'object'
        ? { ...overrides }
        : null;

    const run = settingsSaveTail.then(() => persistLatestLinkSettings(requestId, {
        overrides: settingOverrides,
        onCommitted
    }));
    const safeRun = run.catch(error => {
        if (requestId === latestSettingsSaveRequest) {
            if (els.seoState) els.seoState.textContent = 'Couldn’t save';
            setStatus(els.adminStatus, error?.message || 'Could not save links.');
        }
        return false;
    });
    const guardedRun = safeRun.then(async saved => {
        if (requestId === latestSettingsSaveRequest) adminSettingsSaveError = !saved;
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
        updateAdminSaveState();
    });
}

function scheduleAutoSave() {
    adminSettingsSaveError = false;
    updateAdminSaveState();
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
    if (!confirmDangerAction('Reset all link destinations, usernames, visibility, and link order to their defaults? Other site settings and backgrounds are kept.')) return;
    const next = { ...getDraftLinkSettings(), social_card_order: [...DEFAULT_SOCIAL_CARD_ORDER] };
    SOCIAL_CARD_KEYS.forEach(key => ['url', 'username', 'enabled'].forEach(field => {
        next[`${key}_${field}`] = DEFAULT_LINK_SETTINGS[`${key}_${field}`];
    }));
    state.linkSettings = next;
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
    if (!els.healthCheck || els.runHealthCheck?.disabled) return;
    if (els.runHealthCheck) els.runHealthCheck.disabled = true;
    const checks = [
        {
            label: 'settings table',
            run: async () => state.linkSettingsAvailable
        },
        {
            label: 'front page',
            run: async () => {
                const response = await adminFetchWithDeadline('../index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('site-structured-data');
            }
        },
        {
            label: 'rooms page',
            run: async () => {
                const response = await adminFetchWithDeadline('../rooms/index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('id="view-lobby"');
            }
        },
        {
            label: 'sitemap',
            run: async () => (await adminFetchWithDeadline('../sitemap.xml', { cache: 'no-store' })).ok
        },
        {
            label: 'robots',
            run: async () => {
                const response = await adminFetchWithDeadline('../robots.txt', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('Sitemap: https://doll.gg/sitemap.xml');
            }
        },
        {
            label: 'admin noindex',
            run: async () => {
                const response = await adminFetchWithDeadline('./index.html', { cache: 'no-store' });
                const text = await response.text();
                return response.ok && text.includes('noindex');
            }
        },
        {
            label: 'favicon',
            run: async () => (await adminFetchWithDeadline('../favicon.png', { method: 'HEAD', cache: 'no-store' })).ok
        },
        {
            label: 'share image',
            run: async () => (await adminFetchWithDeadline('../site-images/thumbnail-stripes.png?v=2026.10.17.7', { method: 'HEAD', cache: 'no-store' })).ok
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
    if (els.runHealthCheck) els.runHealthCheck.disabled = false;
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
    if (listId === 'pending-drawings-list') renderAdminSelectionPreview();
    if (listId === 'published-drawings-list') updateAdminPublishedSelection();
}

function forgetAdminSelectionId(id) {
    const cleanId = String(id);
    adminListSelections.forEach(selection => {
        selection.ids.delete(cleanId);
    });
    renderAdminSelectionPreview();
    updateAdminPublishedSelection();
}

function refreshVisibleListSelection(listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    const selection = adminListSelections.get(listId);
    list.querySelectorAll('input[data-select-id]').forEach(input => {
        input.checked = Boolean(selection?.ids.has(String(input.dataset.selectId)));
    });
    if (listId === 'pending-drawings-list') renderAdminSelectionPreview();
    if (listId === 'published-drawings-list') updateAdminPublishedSelection();
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

async function runDrawingBulkMutation(action, ids) {
    const batchSize = 100;
    let changed = 0;
    for (let start = 0; start < ids.length; start += batchSize) {
        const batch = ids.slice(start, start + batchSize);
        // The IDs came from a frozen, list-filtered snapshot (or from cards
        // rendered by that same filtered list). Keep the mutation identical
        // to the reliable one-card action: target rows by primary key only.
        // Re-applying `approved` to PATCH/DELETE requests made PostgREST build
        // an invalid mutation query even though the column exists and works
        // on normal SELECT requests.
        const query = action === 'approve'
            ? adminClient.from('drawings').update({ approved: true })
                .in('id', batch)
                .select('id')
            : adminClient.from('drawings').delete()
                .in('id', batch)
                .select('id');
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
        // `fetchAdminListSnapshot()` already restricted this explicit action
        // to the waiting list and froze its IDs before confirmation. Delete by
        // those IDs only, matching the proven one-card deletion path. Applying
        // `approved`/`answer` again to a DELETE request caused the dashboard's
        // misleading "column does not exist" failures on otherwise valid
        // live columns.
        const query = adminClient.from(table)
            .delete()
            .in('id', batch)
            .select('id');
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
    if (!action || !listId || button.disabled) return;

    if (action === 'delete-all-pending-drawings') {
        await clearPendingAdminList(button, 'pending-drawings-list', 'doods');
        return;
    }

    if (action === 'delete-all-pending-questions') {
        await clearPendingAdminList(button, 'pending-questions-list', 'asks');
        return;
    }

    if (action === 'select') {
        const exact = adminExactFilters.get(listId);
        if (exact) {
            const selection = adminListSelections.get(listId);
            if (!selection || !getAdminVisibleTotal(listId)) return;
            if (selection.ids.has(exact.id)) selection.ids.delete(exact.id); else selection.ids.add(exact.id);
            refreshVisibleListSelection(listId); return;
        }
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
        changed = await runDrawingBulkMutation(action, ids);
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

const ADMIN_PANEL_IDS = ['review-panel', 'links-panel', 'wishlist-panel', 'published-panel', 'site-panel', 'search-panel', 'rooms-panel'];
const ADMIN_PANEL_NAMES = { 'review-panel': 'Review', 'links-panel': 'Links', 'wishlist-panel': 'Wishes', 'published-panel': 'Published', 'site-panel': 'Site', 'search-panel': 'Search appearance', 'rooms-panel': 'Rooms' };
const ADMIN_PANEL_COMMANDS = [
    { panel: 'review-panel', target: '[data-admin-review-content="doods"]', lane: ['review', 'doods'], icon: 'review', title: 'waiting doods', description: 'select, preview, approve, delete, or clear', keywords: 'inbox bulk pending' },
    { panel: 'review-panel', target: '[data-admin-review-content="asks"]', lane: ['review', 'asks'], icon: 'question', title: 'waiting asks', description: 'reply, paste a GIF link, delete, or clear', keywords: 'inbox questions drafts pending' },
    { panel: 'published-panel', target: '[data-admin-published-content="doods"]', lane: ['published', 'doods'], icon: 'published', title: 'posted doods', description: 'select or remove public drawings', keywords: 'published bulk public' },
    { panel: 'published-panel', target: '[data-admin-published-content="asks"]', lane: ['published', 'asks'], icon: 'question', title: 'answered asks', description: 'edit or remove public answers', keywords: 'published replies public' },
    { panel: 'site-panel', target: '[data-link-card="maintenance"]', icon: 'power', title: 'update mode', description: 'headline, message, and return time', keywords: 'maintenance settings' },
    { panel: 'site-panel', target: '[data-link-card="entrance"]', icon: 'spark', title: 'site entrance', description: 'paw press or bubbles with preview', keywords: 'interaction settings' },
    { panel: 'site-panel', target: '[data-link-card="first-visit-tour"]', icon: 'eye', title: 'first-visit tour', description: 'preview the dood, ask, and links guide', keywords: 'onboarding settings' },
    { panel: 'site-panel', target: '[data-link-card="submissions"]', icon: 'edit', title: 'Submissions', description: 'independent dood and ask controls', keywords: 'submissions safety settings' },
    { panel: 'site-panel', target: '[data-link-card="homepage-note"]', icon: 'note', title: 'homepage paper note', description: 'edit and preview the fitted note', keywords: 'settings text' },
    { panel: 'links-panel', target: '.admin-link-grid', icon: 'drag', title: 'link card order', description: 'drag to arrange the cards in Links', keywords: 'snapchat instagram kofi telegram x tiktok twitch discord onlyfans spotify throne' },
    { panel: 'links-panel', target: '[data-link-card="snapchat"]', icon: 'media', title: 'social card media', description: 'preview the backgrounds currently on your site', keywords: 'video gif mov mp4 storage' },
    { panel: 'links-panel', target: '[data-link-card="throne_link"]', icon: 'wishlist', title: 'Throne link card', description: 'destination, username, visibility, and background', keywords: 'throne public links banner' },
    { panel: 'wishlist-panel', target: '[data-link-card="wishes"]', icon: 'wishlist', title: 'Wishes menu', description: 'Throne sync source, menu visibility, and layout', keywords: 'throne wishlist custom display' },
    { panel: 'wishlist-panel', target: '.admin-bulk-bar', icon: 'wishlist', title: 'featured wishes', description: 'sync, filter, feature, and drag public order', keywords: 'throne sold out new items' },
    { panel: 'search-panel', target: '.admin-search-editor', icon: 'search', title: 'search preview', description: 'rendered title, description, and tagline', keywords: 'seo google metadata' },
    { panel: 'search-panel', target: '#static-seo-checks', icon: 'search', title: 'Published search text', description: 'compare static, Open Graph, X, and schema copy', keywords: 'seo structured data github' },
    { panel: 'search-panel', target: '#admin-health-check', icon: 'check', title: 'site health checks', description: 'pages, sitemap, robots, icons, and noindex', keywords: 'status favicon share image' },
    { panel: 'rooms-panel', target: '#table-wrap', icon: 'rooms', title: 'Rooms operations', description: 'recent, stale, cleanup, inspect, and close', keywords: 'participants host livekit' },
    { panel: 'rooms-panel', target: '#bans-table-wrap', icon: 'lock', title: 'Rooms bans', description: 'session and nickname bans', keywords: 'block global safety' }
];

const ADMIN_NAV_ORDER_KEY = 'doll_admin_panel_order_v1';

function activateAdminPanel(panelId, { focusHeading = false, scrollToTop = false } = {}) {
    document.dispatchEvent(new Event('admin-content-changing'));
    const panel = document.getElementById(panelId);
    const button = els.tabs?.querySelector(`button[data-panel="${panelId}"]`);
    if (!panel || !button) return false;

    document.querySelectorAll('#admin-tabs button[data-panel]').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('active', active);
        if (active) tab.setAttribute('aria-current', 'page');
        else tab.removeAttribute('aria-current');
    });
    document.querySelectorAll('.admin-panel').forEach(candidate => {
        candidate.classList.toggle('active', candidate === panel);
    });

    const moreButton = document.getElementById('admin-mobile-more');
    moreButton?.classList.toggle('more-active', button.hasAttribute('data-mobile-hidden'));
    document.getElementById('admin-page-title').textContent = ADMIN_PANEL_NAMES[panelId];
    window.roomsPanelVisibilityChanged?.(panelId === 'rooms-panel');
    renderAdminMore();

    if (panelId === 'rooms-panel') window.initRoomsPanel?.();
    if (scrollToTop) window.scrollTo({ top: 0, behavior: 'instant' });
    if (focusHeading) {
        const heading = document.getElementById('admin-page-title');
        if (heading) {
            heading.tabIndex = -1;
            requestAnimationFrame(() => heading.focus({ preventScroll: true }));
        }
    }
    setupAdminHorizontalScroll();
    return true;
}

const adminExactFilters = new Map();
const adminSearch = { token: 0, timer: 0, controller: null, term: '', groups: {}, results: [], pages: {} };
const ADMIN_SEARCH_PAGE_SIZE = 8;
function getAdminVisibleTotal(listId) {
    return adminExactFilters.get(listId)?.total ?? state.adminListTotals[listId] ?? 0;
}
function adminSearchPattern(term) { return `%${term.replace(/[\\%_]/g, char => `\\${char}`)}%`; }
function adminPostgrestValue(value) { return '"' + value.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'; }
function adminDateBounds(day) {
    const format = new Intl.DateTimeFormat('en-CA', { timeZone: ADMIN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    const midnight = date => {
        const desired = Date.parse(date + 'T00:00:00Z'); let guess = desired;
        for (let i = 0; i < 3; i++) {
            const parts = Object.fromEntries(format.formatToParts(new Date(guess)).map(part => [part.type, part.value]));
            const actual = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
            guess += desired - actual;
        }
        return new Date(guess).toISOString();
    };
    const next = new Date(Date.parse(day + 'T00:00:00Z') + 86400000).toISOString().slice(0, 10);
    return [midnight(day), midnight(next)];
}
function getAdminToolCommands() {
    const commands = ADMIN_PANEL_COMMANDS.slice();
    const seen = new Set(commands.map(command => command.target));
    document.querySelectorAll('.admin-panel input[id]:not([type="file"]), .admin-panel textarea[id], .admin-panel select[id], #admin-card-inspector input[id]:not([type="file"]), #admin-card-inspector textarea[id], #admin-card-inspector select[id]').forEach(input => {
        const panel = input.closest('.admin-panel') || adminCardInspectorRestore?.placeholder?.closest('.admin-panel');
        if (!panel) return;
        const label = input.getAttribute('aria-label') || input.closest('label')?.querySelector(':scope > span')?.textContent.trim() || input.id.replaceAll('-', ' ');
        const target = '#' + input.id;
        if (seen.has(target)) return; seen.add(target);
        commands.push({ panel: panel.id, target, title: label, description: ADMIN_PANEL_NAMES[panel.id], keywords: input.id.replaceAll('-', ' '), icon: 'edit' });
    });
    return commands;
}
function getAdminLocalSearchResults(term) {
    const needle = term.toLowerCase();
    const tools = getAdminToolCommands().filter(command => `${command.title} ${command.description} ${command.keywords}`.toLowerCase().includes(needle)).slice(0, term ? 16 : 12).map(command => ({ ...command, kind: 'tool' }));
    const settings = getDraftLinkSettings();
    const links = term ? SOCIAL_CARD_KEYS.filter(key => `${key} ${settings[`${key}_username`]} ${settings[`${key}_url`]}`.toLowerCase().includes(needle)).map(key => ({ kind: 'tool', panel: 'links-panel', target: `[data-link-card="${key}"]`, title: document.querySelector(`[data-link-card="${key}"] summary strong`)?.textContent || key, description: settings[`${key}_username`] || settings[`${key}_url`], icon: 'links' })) : [];
    return { tools, links };
}
function renderAdminSearchResults() {
    const output = document.getElementById('admin-command-results');
    const local = getAdminLocalSearchResults(adminSearch.term);
    const groups = [{ name: 'Tools', rows: local.tools }, { name: 'Links', rows: local.links }];
    if (adminSearch.term) ['Doods', 'Asks', 'Wishes'].forEach(name => groups.push({ name, ...(adminSearch.groups[name] || { rows: [], loading: true }) }));
    adminSearch.results = [];
    output.innerHTML = groups.map(group => {
        if (!group.rows?.length && !group.loading && !group.error && !group.count) return '';
        const content = (group.rows || []).map(result => {
            const index = adminSearch.results.push(result) - 1;
            return `<button class="admin-command-result" type="button" data-search-result="${index}">${adminIcon(result.icon || 'search')}<span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.description || '')}</small></span>${adminIcon('arrow-right')}</button>`;
        }).join('');
        const page = adminSearch.pages[group.name] || 0;
        const paging = group.count > ADMIN_SEARCH_PAGE_SIZE ? `<div class="admin-pagination"><button type="button" class="soft" data-search-page="${group.name}" data-search-step="-1" ${page === 0 ? 'disabled' : ''} aria-label="Previous ${group.name} search results">${adminIcon('arrow-left')}</button><span>${page * ADMIN_SEARCH_PAGE_SIZE + 1}–${Math.min(group.count, (page + 1) * ADMIN_SEARCH_PAGE_SIZE)} of ${group.count}</span><button type="button" class="soft" data-search-page="${group.name}" data-search-step="1" ${(page + 1) * ADMIN_SEARCH_PAGE_SIZE >= group.count ? 'disabled' : ''} aria-label="Next ${group.name} search results">${adminIcon('arrow-right')}</button></div>` : '';
        return `<section aria-label="${group.name} results"><h3>${group.name}</h3>${content}${group.loading ? '<p class="admin-tool-note">Searching…</p>' : ''}${group.error ? `<p class="admin-tool-note">${escapeHtml(group.error)}</p><button type="button" class="soft" data-search-retry="${group.name}">Retry ${group.name.toLowerCase()}</button>` : ''}${paging}</section>`;
    }).join('');
    if (!output.textContent.trim()) output.innerHTML = '<p class="admin-command-empty">No matches. Try another search.</p>';
}
async function fetchAdminSearchGroup(name, term, signal) {
    const start = (adminSearch.pages[name] || 0) * ADMIN_SEARCH_PAGE_SIZE;
    let query;
    const exactId = /^(?:[0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(term);
    if (name === 'Doods') {
        query = adminClient.from('drawings').select('id,created_at,approved', { count: 'exact' });
        if (exactId) query = query.eq('id', term);
        else if (/^\d{4}-\d{2}-\d{2}$/.test(term) && !Number.isNaN(Date.parse(term)) && new Date(term + 'T00:00:00Z').toISOString().startsWith(term)) {
            const [from, to] = adminDateBounds(term); query = query.gte('created_at', from).lt('created_at', to);
        } else if (/^(?:pending|waiting)(?: doods?)?$/i.test(term)) query = query.or('approved.is.null,approved.eq.false');
        else if (/^(?:published|approved|posted)(?: doods?)?$/i.test(term)) query = query.eq('approved', true);
        else if (!/^doods?$/i.test(term)) return { rows: [], count: 0 };
    } else if (name === 'Asks') {
        query = adminClient.from('questions').select('id,question,answer,created_at', { count: 'exact' });
        if (exactId) query = query.eq('id', term);
        else { const value = adminPostgrestValue(adminSearchPattern(term)); query = query.or(`question.ilike.${value},answer.ilike.${value}`); }
    } else query = adminClient.from('wishlist_items').select('throne_item_id,name,featured', { count: 'exact' }).ilike('name', adminSearchPattern(term));
    query = name === 'Wishes' ? query.order('name').order('throne_item_id') : query.order('created_at', { ascending: false }).order('id', { ascending: false });
    if (typeof query.abortSignal === 'function') query = query.abortSignal(signal);
    const result = await withAdminDeadline(query.range(start, start + ADMIN_SEARCH_PAGE_SIZE - 1));
    if (result.error) throw result.error;
    return { count: result.count || 0, rows: (result.data || []).map(item => {
        if (name === 'Doods') return { kind: 'record', list: item.approved ? 'published-drawings-list' : 'pending-drawings-list', id: String(item.id), title: `Dood ${String(item.id).slice(0, 12)}`, description: `${item.approved ? 'Published' : 'Pending'} · ${formatAdminSearchDate(item.created_at)}`, icon: 'edit' };
        if (name === 'Asks') return { kind: 'record', list: String(item.answer || '').trim() ? 'published-questions-list' : 'pending-questions-list', id: String(item.id), title: String(item.question || 'Ask').slice(0, 160), description: String(item.answer || 'Waiting for a reply').slice(0, 160), icon: 'question' };
        return { kind: 'record', list: 'wishlist-items-list', id: String(item.throne_item_id), title: item.name || 'Wish', description: item.featured ? 'Featured' : 'Not featured', icon: 'wishlist' };
    }) };
}
function formatAdminSearchDate(value) { const date = parseAdminDate(value); return date && !Number.isNaN(date.getTime()) ? adminDateFormatter.format(date) : 'Unknown date'; }
function cancelAdminSearch() {
    clearTimeout(adminSearch.timer); adminSearch.controller?.abort(); adminSearch.controller = null; adminSearch.token += 1;
}
function renderAdminCommands(filter = '', onlyGroup = null) {
    cancelAdminSearch();
    const term = String(filter).trim().slice(0, 160);
    if (term !== adminSearch.term) { adminSearch.pages = {}; adminSearch.groups = {}; }
    adminSearch.term = term;
    const names = onlyGroup ? [...new Set([onlyGroup, ...Object.keys(adminSearch.groups).filter(name => adminSearch.groups[name].loading)])] : ['Doods', 'Asks', 'Wishes'];
    names.forEach(name => { adminSearch.groups[name] = { rows: [], loading: Boolean(term) }; });
    renderAdminSearchResults();
    if (!term) return;
    const token = adminSearch.token, controller = new AbortController(); adminSearch.controller = controller;
    adminSearch.timer = setTimeout(() => {
        names.forEach(async name => {
            try {
                const result = await fetchAdminSearchGroup(name, term, controller.signal);
                if (token === adminSearch.token && !controller.signal.aborted) adminSearch.groups[name] = result;
            } catch (error) {
                if (token !== adminSearch.token || controller.signal.aborted) return;
                adminSearch.groups[name] = { rows: [], error: error.message || 'Couldn’t search. Try again.' };
            }
            if (token === adminSearch.token && document.getElementById('admin-command-dialog').open) renderAdminSearchResults();
        });
    }, 200);
}
async function openAdminSearchResult(result) {
    document.getElementById('admin-command-dialog').close();
    if (result.kind === 'record') {
        const listId = result.list, panel = listId.startsWith('pending') ? 'review-panel' : listId.startsWith('published') ? 'published-panel' : 'wishlist-panel';
        const group = panel === 'review-panel' ? 'review' : 'published';
        if (panel !== 'wishlist-panel') setAdminLane(group, listId.includes('drawings') ? 'doods' : 'asks');
        const previous = adminExactFilters.get(listId);
        adminExactFilters.set(listId, { id: result.id, total: 0, previousPage: previous?.previousPage || adminListPages.get(listId) || 1 });
        adminListPages.set(listId, 1); renderAdminExactFilter(listId);
        activateAdminPanel(panel, { scrollToTop: true });
        await loadAdminList(listId);
        if (adminExactFilters.get(listId)?.id !== result.id || !document.getElementById(panel).classList.contains('active')) return;
        if (!getAdminVisibleTotal(listId)) setStatus(els.adminStatus, 'This item was removed or moved since the search. Clear the result or search again.');
        const card = document.getElementById(listId).querySelector(`[data-id="${CSS.escape(result.id)}"]`);
        if (card) { card.tabIndex = -1; card.focus({ preventScroll: true }); card.scrollIntoView({ block: 'center', behavior: 'instant' }); }
        return;
    }
    const inspector = document.getElementById('admin-card-inspector');
    if (inspector.open) { inspector.close(); restoreAdminCardInspector(); }
    if (result.lane) setAdminLane(...result.lane);
    activateAdminPanel(result.panel, { scrollToTop: true });
    const root = document.getElementById(result.panel);
    let target = root.querySelector(result.target);
    if (!target) return;
    const card = target.closest('#links-panel [data-link-card]');
    if (card && (target === card || target.closest('.admin-link-card-body'))) {
        openAdminCardInspector(card.dataset.linkCard, document.getElementById('admin-command-open'));
        target = result.target.startsWith('#') ? document.querySelector(result.target) : document.querySelector('#admin-card-inspector input');
    } else { let details = target.closest('details'); if (details) details.open = true; }
    if (target) { if (!target.matches('input, textarea, select, button')) target.tabIndex = -1; target.focus({ preventScroll: true }); target.scrollIntoView({ block: 'center', behavior: 'instant' }); }
}
function renderAdminExactFilter(listId) {
    const list = document.getElementById(listId); let bar = document.getElementById(`${listId}-exact`);
    if (!bar) {
        bar = document.createElement('div'); bar.className = 'admin-exact-filter'; bar.id = `${listId}-exact`;
        bar.innerHTML = '<span></span><button type="button">Clear result</button>'; list.before(bar);
        bar.querySelector('button').addEventListener('click', async () => {
            const exact = adminExactFilters.get(listId); if (!exact) return;
            adminExactFilters.delete(listId); adminListPages.set(listId, exact.previousPage); renderAdminExactFilter(listId);
            await loadAdminList(listId);
            document.getElementById(listId).tabIndex = -1; document.getElementById(listId).focus({ preventScroll: true });
        });
    }
    const exact = adminExactFilters.get(listId); bar.hidden = !exact;
    document.querySelectorAll(`[data-list="${listId}"][data-bulk-action="select"]`).forEach(button => { button.textContent = exact ? 'Select result' : 'Select all'; });
    bar.querySelector('span').textContent = exact ? `Search result · ${exact.id}` : '';
}
function initAdminCommandPalette() {
    const opener = document.getElementById('admin-command-open'), dialog = document.getElementById('admin-command-dialog'), input = document.getElementById('admin-command-input');
    const open = () => {
        if (els.dashboardPanel.classList.contains('hidden') || dialog.open) return;
        adminSearch.term = ''; adminSearch.groups = {}; adminSearch.pages = {}; input.value = '';
        dialog.showModal(); renderAdminCommands(''); input.focus();
    };
    opener.addEventListener('click', open);
    input.addEventListener('input', () => renderAdminCommands(input.value));
    input.addEventListener('keydown', event => {
        if (event.isComposing) return;
        if (event.key === 'Enter') { event.preventDefault(); dialog.querySelector('[data-search-result]')?.click(); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); dialog.querySelector('[data-search-result]')?.focus(); }
    });
    dialog.querySelector('form').addEventListener('submit', event => {
        if (event.submitter?.value === 'cancel') return;
        event.preventDefault(); dialog.querySelector('[data-search-result]')?.click();
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); }
        const button = event.target.closest('[data-search-result], [data-search-retry], [data-search-page]'); if (!button) return;
        if (button.dataset.searchResult !== undefined) { const result = adminSearch.results[Number(button.dataset.searchResult)]; if (result) void openAdminSearchResult(result).catch(error => setStatus(els.adminStatus, error.message || 'Couldn’t open result.')); }
        else if (button.dataset.searchRetry) renderAdminCommands(input.value, button.dataset.searchRetry);
        else { const group = button.dataset.searchPage; adminSearch.pages[group] = Math.max(0, (adminSearch.pages[group] || 0) + Number(button.dataset.searchStep)); renderAdminCommands(input.value, group); }
    });
    dialog.addEventListener('keydown', event => {
        if (!event.target.closest('[data-search-result]') || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        event.preventDefault(); const buttons = [...dialog.querySelectorAll('[data-search-result]')], index = buttons.indexOf(event.target);
        if (index === 0 && event.key === 'ArrowUp') input.focus(); else buttons[Math.min(buttons.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))]?.focus();
    });
    dialog.addEventListener('close', cancelAdminSearch);
    document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); open(); } });
}

function initAdminMobileMore() {
    const opener = document.getElementById('admin-mobile-more');
    const dialog = document.getElementById('admin-more-dialog');
    if (!opener || !dialog) return;
    opener.addEventListener('click', () => {
        if (!dialog.open) dialog.showModal();
    });
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
        const button = event.target.closest('[data-more-panel]');
        if (!button) return;
        dialog.close();
        activateAdminPanel(button.dataset.morePanel, { focusHeading: true, scrollToTop: true });
    });
}

function normalizeAdminNavOrder(value) {
    const allowed = ADMIN_PANEL_IDS;
    const input = Array.isArray(value) ? value : [];
    return [...new Set(input.filter(panel => allowed.includes(panel))), ...allowed.filter(panel => !input.includes(panel))];
}

const ADMIN_DRAG_SLOP = 4;
const ADMIN_DRAG_EDGE_ZONE = 60;
const ADMIN_DRAG_EDGE_SPEED = 16;
const ADMIN_DRAG_CLICK_GUARD_MS = 120;

function adminDragEdgeDelta(top, bottom, point) {
    const zone = Math.min(ADMIN_DRAG_EDGE_ZONE, (bottom - top) / 3);
    if (point < top + zone) return -Math.min(ADMIN_DRAG_EDGE_SPEED, Math.ceil((top + zone - point) / zone * ADMIN_DRAG_EDGE_SPEED));
    if (point > bottom - zone) return Math.min(ADMIN_DRAG_EDGE_SPEED, Math.ceil((point - bottom + zone) / zone * ADMIN_DRAG_EDGE_SPEED));
    return 0;
}

// One engine for workspace arrangement and public content order. Persistence
// stays with each caller. No gesture ever writes settings before release.
function createAdminDragSort({ container: containerRef, handleSelector, itemSelector,
    canDrag = () => true, canStart = () => true, onDragFinish = () => {}, onCommit = () => {} }) {
    const getContainer = () => typeof containerRef === 'function' ? containerRef() : containerRef;
    let pending = null, dragged = null, placeholder = null, pointerId = null;
    let x = 0, y = 0, startX = 0, startY = 0, offsetX = 0, offsetY = 0;
    let originalStyle = null, originalChildren = [], originalOrder = [], frame = 0, capture = null;
    let lastTime = 0, geometry = null;
    const animations = new Map();
    const items = container => [...container.children].filter(el => el.matches?.(itemSelector) && canDrag(el));

    function stopAnimations() { animations.forEach(animation => animation.cancel()); animations.clear(); }
    function scrollParent(element) {
        for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
            const css = getComputedStyle(parent);
            if (/(auto|scroll)/.test(css.overflowY) && parent.scrollHeight > parent.clientHeight + 1) return parent;
        }
        return null;
    }
    function detach() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', cancel);
        window.removeEventListener('blur', cancel);
        window.removeEventListener('resize', cancel);
        document.removeEventListener('visibilitychange', visibility);
        document.removeEventListener('admin-content-changing', cancel);
        document.removeEventListener('keydown', keydown, true);
        capture?.removeEventListener('lostpointercapture', lostCapture);
    }
    function finish(commit) {
        const container = getContainer(), item = dragged, id = pointerId;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        detach(); stopAnimations();
        const connected = item?.isConnected && container?.isConnected && item.parentElement === container;
        if (connected && placeholder?.isConnected) placeholder.replaceWith(item);
        else placeholder?.remove();
        if (item) {
            if (originalStyle === null) item.removeAttribute('style'); else item.setAttribute('style', originalStyle);
            item.classList.remove('dragging');
        }
        if (!commit && connected) originalChildren.forEach(node => { if (node.parentElement === container) container.appendChild(node); });
        const order = container ? items(container) : [];
        const previousOrder = originalOrder.slice();
        const changed = connected && order.length === previousOrder.length && order.some((el, i) => el !== previousOrder[i]);
        pending = dragged = placeholder = null; pointerId = null; geometry = null;
        document.body.classList.remove('admin-dragging');
        if (capture?.hasPointerCapture?.(id)) capture.releasePointerCapture(id);
        capture = null; originalChildren = []; originalOrder = [];
        if (item) onDragFinish();
        if (commit && changed) onCommit({ container, item, order, previousOrder });
    }
    function measureGeometry(container) {
        const parent = scrollParent(container);
        geometry = {
            rects: new Map(items(container).filter(el => el !== dragged).map(el => [el, el.getBoundingClientRect()]).filter(([, rect]) => rect.height > 0)),
            slot: placeholder.getBoundingClientRect(), bounds: container.getBoundingClientRect(),
            scrollX: window.scrollX, scrollY: window.scrollY, parent,
            parentX: parent?.scrollLeft || 0, parentY: parent?.scrollTop || 0
        };
    }
    function placement(container) {
        if (!geometry) measureGeometry(container);
        const px = x + window.scrollX - geometry.scrollX + (geometry.parent?.scrollLeft || 0) - geometry.parentX;
        const py = y + window.scrollY - geometry.scrollY + (geometry.parent?.scrollTop || 0) - geometry.parentY;
        const { slot, bounds, rects } = geometry;
        if (px >= slot.left && px <= slot.right && py >= slot.top && py <= slot.bottom) return;
        if (px < bounds.left - 40 || px > bounds.right + 40 || py < bounds.top - 60 || py > bounds.bottom + 60) return;
        let target = null, distance = Infinity;
        rects.forEach((rect, el) => {
            const dx = px - Math.max(rect.left, Math.min(px, rect.right));
            const dy = py - Math.max(rect.top, Math.min(py, rect.bottom));
            const value = dx * dx + dy * dy;
            if (value < distance) { distance = value; target = el; }
        });
        if (!target) return;
        const rect = rects.get(target);
        const sameRow = slot.top < rect.bottom - 1 && slot.bottom > rect.top + 1 && Math.abs(slot.left - rect.left) > 2;
        const after = sameRow && py >= rect.top && py <= rect.bottom ? px > rect.left + rect.width / 2 : py > rect.top + rect.height / 2;
        let anchor = after ? target.nextElementSibling : target;
        if (anchor === dragged) anchor = dragged.nextElementSibling;
        if (anchor === placeholder || placeholder.nextElementSibling === anchor) return;
        // Only a slot change measures layout. Between changes the cached final
        // rectangles keep hit testing independent of the settling animation.
        const before = new Map([...rects.keys()].map(el => [el, el.getBoundingClientRect()]));
        stopAnimations();
        container.insertBefore(placeholder, anchor);
        measureGeometry(container);
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            before.forEach((old, el) => {
                const next = geometry.rects.get(el); if (!next) return;
                const dx = old.left - next.left, dy = old.top - next.top;
                if (!dx && !dy) return;
                animations.set(el, el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], { duration: 140, easing: 'ease-out' }));
            });
        }
    }
    function tick(time) {
        frame = 0;
        const container = getContainer();
        if (!dragged || !container || !dragged.isConnected || !placeholder?.isConnected) { finish(false); return; }
        const ratio = lastTime ? Math.min(2, (time - lastTime) / (1000 / 60)) : 1;
        lastTime = time;
        dragged.style.transform = `translate3d(${x - offsetX}px, ${y - offsetY}px, 0)`;
        const parent = scrollParent(container);
        const bounds = parent ? parent.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
        const delta = adminDragEdgeDelta(bounds.top + 40, bounds.bottom - 70, y) * ratio;
        if (delta) { if (parent) parent.scrollTop += delta; else window.scrollBy(0, delta); }
        placement(container);
        frame = requestAnimationFrame(tick);
    }
    function down(event) {
        if (document.body.classList.contains('admin-dragging') || pending || dragged || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0)) return;
        const container = getContainer(), handle = event.target.closest?.(handleSelector), item = handle?.closest(itemSelector);
        if (!container || !handle || !container.contains(handle) || handle.disabled || !item || item.parentElement !== container || !canDrag(item) || !canStart(item)) return;
        pending = item; pointerId = event.pointerId;
        startX = x = event.clientX; startY = y = event.clientY;
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('resize', cancel);
        document.addEventListener('visibilitychange', visibility);
        document.addEventListener('admin-content-changing', cancel);
        document.addEventListener('keydown', keydown, true);
    }
    function move(event) {
        if (event.pointerId !== pointerId) return;
        x = event.clientX; y = event.clientY;
        if (pending) {
            if (Math.hypot(x - startX, y - startY) < ADMIN_DRAG_SLOP) return;
            const container = getContainer(), item = pending;
            if (!container || !item.isConnected) { finish(false); return; }
            const rect = item.getBoundingClientRect();
            originalChildren = [...container.children]; originalOrder = items(container); originalStyle = item.getAttribute('style');
            offsetX = startX - rect.left; offsetY = startY - rect.top;
            placeholder = document.createElement('div'); placeholder.className = 'admin-drag-placeholder'; placeholder.setAttribute('aria-hidden', 'true');
            placeholder.style.width = `${rect.width}px`; placeholder.style.height = `${rect.height}px`;
            placeholder.style.gridColumn = getComputedStyle(item).gridColumn;
            container.insertBefore(placeholder, item);
            dragged = item; pending = null;
            Object.assign(item.style, { position: 'fixed', left: '0px', top: '0px', width: `${rect.width}px`, height: `${rect.height}px`, minWidth: '0', gridColumn: 'auto', transform: `translate3d(${rect.left}px, ${rect.top}px, 0)` });
            item.classList.add('dragging'); document.body.classList.add('admin-dragging');
            capture = container;
            capture.addEventListener('lostpointercapture', lostCapture);
            capture.setPointerCapture?.(pointerId);
            lastTime = 0; measureGeometry(container);
        }
        if (event.cancelable) event.preventDefault();
        if (!frame) frame = requestAnimationFrame(tick);
    }
    function up(event) {
        if (event.pointerId !== pointerId) return;
        if (dragged) { x = event.clientX; y = event.clientY; placement(getContainer()); if (event.cancelable) event.preventDefault(); }
        finish(true);
    }
    function lostCapture(event) {
        // Touch begins with implicit capture on the handle. Transferring it
        // to our stable container emits a bubbling loss event on that handle;
        // only loss of the container's own capture cancels this gesture.
        if (event.target === capture && event.pointerId === pointerId && !capture.hasPointerCapture(pointerId)) finish(false);
    }
    function cancel(event) { if (event?.pointerId !== undefined && event.pointerId !== pointerId) return; finish(false); }
    function visibility() { if (document.hidden) finish(false); }
    function keydown(event) { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finish(false); } }
    getContainer()?.addEventListener('pointerdown', down);
    return () => finish(false);
}

function getAdminButtonIcon(button) {
    const idMap = {
        'link-settings-reset': 'refresh',
        'btn-force-close-all': 'power',
        'btn-list-recent': 'refresh',
        'btn-list-stale': 'search',
        'btn-cleanup': 'trash',
        'btn-force-close': 'power',
        'wishlist-sync-now': 'refresh',
        'wishlist-feature-all': 'check',
        'wishlist-unfeature-all': 'trash',
        'static-seo-check': 'search',
        'run-health-check': 'check'
    };
    if (idMap[button.id]) return idMap[button.id];
    if (button.dataset.linkOpen) return 'external';
    if (button.dataset.videoUpload) return 'upload';
    if (button.dataset.videoRemove) return 'trash';
    if (button.dataset.socialMove) return button.dataset.socialMove === 'up' ? 'arrow-up' : 'arrow-down';
    if (button.dataset.pageStep) return Number(button.dataset.pageStep) < 0 ? 'arrow-left' : 'arrow-right';

    const action = button.dataset.action || button.dataset.bulkAction || '';
    if (/delete|remove|unfeature|cleanup|clear/.test(action)) return 'trash';
    if (/approve|select/.test(action)) return 'check';
    if (/save|edit|reply/.test(action)) return 'edit';
    if (/move.*up/.test(action)) return 'arrow-up';
    if (/move.*down/.test(action)) return 'arrow-down';
    if (/feature|add/.test(action)) return 'plus';

    const label = (button.textContent || '').trim().toLowerCase();
    if (/^(delete|remove|clear|cleanup|unfeature)/.test(label)) return 'trash';
    if (/^(approve|select|feature)/.test(label)) return 'check';
    if (/^(save|reply)/.test(label)) return 'edit';
    if (/^(refresh|sync|list)/.test(label)) return 'refresh';
    if (/^(open|enter|back)/.test(label)) return 'arrow-right';
    if (/^(add)/.test(label)) return 'plus';
    if (/^(force-close)/.test(label)) return 'power';
    return '';
}

function decorateAdminControls(root = document) {
    root.querySelectorAll('button').forEach(button => {
        if (button.querySelector(':scope > svg') || button.closest('#admin-tabs')) return;
        const icon = getAdminButtonIcon(button);
        if (!icon) return;
        button.insertAdjacentHTML('afterbegin', adminIcon(icon));
        button.classList.add('has-admin-icon');
    });
    root.querySelectorAll('button[aria-label], summary[aria-label], a[aria-label]').forEach(control => {
        if (!control.title && !control.textContent.trim()) control.title = control.getAttribute('aria-label');
    });
    root.querySelectorAll('.admin-video-picker').forEach(picker => {
        if (picker.querySelector(':scope > svg')) return;
        picker.insertAdjacentHTML('afterbegin', adminIcon('media'));
    });
    root.querySelectorAll('.admin-soft-link').forEach(link => {
        if (link.querySelector(':scope > svg')) return;
        link.insertAdjacentHTML('afterbegin', adminIcon('external'));
    });
}

function setupAdminHorizontalScroll() {
    // Kept for existing callers. Toolbars now wrap and use native scrolling.
    scheduleAdminLayout();
}

const ADMIN_REVIEW_LANE_KEY = 'doll_admin_review_lane_v1';
const ADMIN_PUBLISHED_LANE_KEY = 'doll_admin_published_lane_v1';
let adminCardInspectorRestore = null;
let adminCardInspectorReturnFocus = null;
let adminSocialSuppressClickUntil = 0;

function readAdminLocalPreference(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    } catch (error) {
        return fallback;
    }
}

function writeAdminLocalPreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.warn('admin preference save:', error);
    }
}

function setAdminLane(group, value) {
    const isReview = group === 'review';
    const allowed = ['doods', 'asks'];
    const lane = allowed.includes(value) ? value : 'doods';
    const panel = document.getElementById(isReview ? 'review-panel' : 'published-panel');
    if (!panel) return;
    panel.querySelectorAll(`[data-admin-${group}-lane]`).forEach(button => {
        const active = button.dataset[`admin${group[0].toUpperCase()}${group.slice(1)}Lane`] === lane;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
        button.tabIndex = active ? 0 : -1;
    });
    panel.querySelectorAll(`[data-admin-${group}-content]`).forEach(content => {
        content.hidden = content.dataset[`admin${group[0].toUpperCase()}${group.slice(1)}Content`] !== lane;
    });
    document.dispatchEvent(new Event('admin-content-changing'));
    writeAdminLocalPreference(isReview ? ADMIN_REVIEW_LANE_KEY : ADMIN_PUBLISHED_LANE_KEY, lane);
    setupAdminHorizontalScroll();
}

function initAdminLaneNavigation() {
    [['review', ADMIN_REVIEW_LANE_KEY], ['published', ADMIN_PUBLISHED_LANE_KEY]].forEach(([group, key]) => {
        const panel = document.getElementById(`${group}-panel`);
        if (!panel) return;
        panel.addEventListener('click', event => {
            const laneButton = event.target.closest(`[data-admin-${group}-lane]`);
            if (laneButton) setAdminLane(group, laneButton.dataset[`admin${group[0].toUpperCase()}${group.slice(1)}Lane`]);
            const jump = event.target.closest('[data-admin-jump]');
            if (jump) activateAdminPanel(jump.dataset.adminJump, { focusHeading: true, scrollToTop: true });
        });
        panel.querySelector('.admin-lane-tabs')?.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            const buttons = [...panel.querySelectorAll(`[data-admin-${group}-lane]`)];
            const index = buttons.indexOf(event.target);
            if (index < 0) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
            buttons[next].click(); buttons[next].focus();
        });
        setAdminLane(group, readAdminLocalPreference(key, 'doods'));
    });
}

function restoreAdminCardInspector() {
    if (adminCardInspectorRestore?.body && adminCardInspectorRestore?.placeholder?.isConnected) {
        adminCardInspectorRestore.placeholder.replaceWith(adminCardInspectorRestore.body);
    }
    adminCardInspectorRestore = null;
    if (adminCardInspectorReturnFocus?.isConnected) adminCardInspectorReturnFocus.focus({ preventScroll: true });
    adminCardInspectorReturnFocus = null;
}

function openAdminCardInspector(key, returnFocus) {
    const dialog = document.getElementById('admin-card-inspector');
    const output = document.getElementById('admin-card-inspector-body');
    const card = document.querySelector(`[data-link-card="${key}"]`);
    const body = card?.querySelector(':scope > .admin-link-card-body');
    if (!dialog || !output || !card || !body || dialog.open) return;

    const placeholder = document.createElement('span');
    placeholder.hidden = true;
    placeholder.dataset.adminInspectorPlaceholder = key;
    body.replaceWith(placeholder);
    output.replaceChildren(body);
    adminCardInspectorRestore = { body, placeholder };
    adminCardInspectorReturnFocus = returnFocus || document.activeElement;
    const title = document.getElementById('admin-card-inspector-title');
    if (title) title.textContent = `${card.querySelector('summary strong')?.textContent?.trim() || key} card`;
    dialog.showModal();
    requestAnimationFrame(() => { if (dialog.open && body.isConnected && output.contains(body)) body.querySelector('input, select, textarea, button')?.focus({ preventScroll: true }); });
}

function initAdminCardInspector() {
    const dialog = document.getElementById('admin-card-inspector');
    if (!dialog) return;
    dialog.querySelector('[data-close-card-inspector]')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', restoreAdminCardInspector);
}

function initAdminSocialCardReorder() {
    const grid = document.querySelector('#links-panel .admin-link-grid');
    if (!grid) return;
    createAdminDragSort({
        container: grid,
        handleSelector: '[data-social-drag]',
        itemSelector: '[data-link-card]',
        canDrag: card => SOCIAL_CARD_KEYS.includes(card.dataset.linkCard),
        canStart: () => {
            // The old drop handler surfaced this on release; say it on the
            // press instead rather than letting a doomed drag start.
            if (linkSettingsHydrated) return true;
            setStatus(els.adminStatus, 'Saved site settings are still loading.');
            return false;
        },
        onDragFinish: () => { adminSocialSuppressClickUntil = performance.now() + ADMIN_DRAG_CLICK_GUARD_MS; },
        onCommit: ({ order }) => {
            commitSocialCardOrder(order.map(card => card.dataset.linkCard));
        }
    });
}

function initAdminWishlistReorder() {
    const list = els.wishlistItemsList;
    if (!list) return;
    createAdminDragSort({
        container: list,
        handleSelector: '.admin-wishlist-drag',
        itemSelector: '.admin-card',
        canDrag: card => card.classList.contains('is-featured'),
        canStart: () => !wishlistActionBusy,
        onCommit: async ({ item, order, previousOrder }) => {
            const index = order.indexOf(item), previous = index > 0 ? order[index - 1] : null, next = order[index + 1];
            const saved = previous ? await moveWishlistItemByDrag(item.dataset.id, previous.dataset.id, true) : next ? await moveWishlistItemByDrag(item.dataset.id, next.dataset.id, false) : true;
            // A failed reload leaves the original nodes connected. Restore
            // their last known order while retaining the error and retry UI.
            if (!saved && previousOrder.every(node => node.parentElement === list)) previousOrder.forEach(node => list.append(node));
        }
    });
}

const ADMIN_LAYOUT_KEY = 'doll_admin_layout_v1';
const adminBlockGrids = new Map();
let adminLayout = { version: 1, nav: [...ADMIN_PANEL_IDS], sidebar: 200, blocks: {} };
let adminArrangeSnapshot = null;
let adminLayoutFrame = 0;

function syncAdminNavigationLabels() {
    const mobile = matchMedia('(max-width: 860px)').matches;
    document.querySelectorAll('#admin-tabs [data-panel]').forEach(button => {
        const name = ADMIN_PANEL_NAMES[button.dataset.panel], label = button.querySelector('span');
        const text = (mobile && name === 'Search appearance' ? 'Search' : name) + ' ';
        if (label?.firstChild?.nodeType === Node.TEXT_NODE && label.firstChild.textContent !== text) label.firstChild.textContent = text;
        button.setAttribute('aria-label', name + (label.querySelector('b') ? ' ' + label.querySelector('b').textContent : ''));
    });
}
function scheduleAdminLayout() {
    if (adminLayoutFrame) return;
    adminLayoutFrame = requestAnimationFrame(() => {
        adminLayoutFrame = 0;
        syncAdminNavigationLabels();
        const headerHeight = document.querySelector('.admin-header')?.getBoundingClientRect().height || 80;
        if (document.documentElement.style.getPropertyValue('--admin-header-height') !== `${headerHeight}px`) document.documentElement.style.setProperty('--admin-header-height', `${headerHeight}px`);
        const viewport = window.visualViewport;
        const editing = document.activeElement?.matches('input:not([type="checkbox"]):not([type="range"]), textarea');
        const keyboard = Boolean(editing && viewport && window.innerHeight - viewport.height > 120);
        document.documentElement.classList.toggle('admin-keyboard-open', keyboard);
        if (keyboard) {
            document.documentElement.style.setProperty('--admin-visible-height', `${viewport.height}px`);
            document.documentElement.style.setProperty('--admin-visible-top', `${viewport.offsetTop}px`);
        }
        adminBlockGrids.forEach(grid => {
            if (!grid.getBoundingClientRect().width) return;
            const columns = matchMedia('(max-width: 860px)').matches ? 1 : Math.max(1, Math.min(Number(grid.dataset.maxColumns) || 3, Math.floor((grid.clientWidth + 12) / 292)));
            if (grid.dataset.columns !== String(columns)) {
                grid.dataset.columns = String(columns);
                grid.style.setProperty('--admin-columns', columns);
            }
            [...grid.children].filter(el => el.dataset.adminBlock).forEach(block => {
                const saved = adminLayout.blocks[block.dataset.adminBlock];
                let preferred = saved?.span || Number(block.dataset.defaultSpan) || 1;
                if (block.dataset.adminBlock === 'review-feed' && !saved) preferred = getAdminSelectionCount('pending-drawings-list') ? 2 : 3;
                const span = Math.min(columns, preferred);
                if (block.style.getPropertyValue('--admin-span') !== String(span)) block.style.setProperty('--admin-span', span);
                const resize = block.querySelector(':scope > .admin-block-tools .admin-block-resize');
                if (resize) resize.setAttribute('aria-valuenow', String(span));
            });
        });
    });
}
function readAdminLayout() {
    let saved;
    try { saved = JSON.parse(readAdminLocalPreference(ADMIN_LAYOUT_KEY, 'null')); } catch {}
    let legacy;
    try { legacy = JSON.parse(readAdminLocalPreference(ADMIN_NAV_ORDER_KEY, 'null')); } catch {}
    adminLayout = { version: 1, nav: normalizeAdminNavOrder(saved?.version === 1 ? saved.nav : legacy), sidebar: 200, blocks: {} };
    if (saved?.version !== 1) return;
    if (Number.isFinite(saved.sidebar)) adminLayout.sidebar = Math.min(280, Math.max(168, saved.sidebar));
    if (!saved.blocks || typeof saved.blocks !== 'object' || Array.isArray(saved.blocks)) return;
    Object.entries(saved.blocks).forEach(([id, value]) => {
        if (!document.querySelector(`[data-admin-block="${CSS.escape(id)}"]`) || !value || typeof value !== 'object') return;
        adminLayout.blocks[id] = { order: Number.isFinite(value.order) ? Math.max(0, Math.min(100, value.order)) : 100, span: [1, 2, 3].includes(value.span) ? value.span : 1 };
    });
}
function saveAdminLayout() {
    try {
        localStorage.setItem(ADMIN_LAYOUT_KEY, JSON.stringify(adminLayout));
        localStorage.setItem(ADMIN_NAV_ORDER_KEY, JSON.stringify(adminLayout.nav));
        return true;
    } catch { setStatus(els.adminStatus, 'Couldn’t save layout on this browser. Your current arrangement is still available until reload.'); return false; }
}
function applyAdminLayout() {
    const more = document.getElementById('admin-mobile-more');
    adminLayout.nav.forEach((id, index) => {
        const button = els.tabs.querySelector(`[data-panel="${id}"]`);
        if (!button) return;
        els.tabs.insertBefore(button, more);
        const label = button.querySelector('span');
        if (label?.firstChild?.nodeType === Node.TEXT_NODE) label.firstChild.textContent = ADMIN_PANEL_NAMES[id] + ' ';
        button.dataset.navIndex = index;
        button.toggleAttribute('data-mobile-hidden', index >= 4);
    });
    document.documentElement.style.setProperty('--admin-sidebar', `${adminLayout.sidebar}px`);
    document.getElementById('admin-sidebar-width').value = adminLayout.sidebar;
    adminBlockGrids.forEach(grid => {
        const blocks = [...grid.children].filter(el => el.dataset.adminBlock);
        blocks.sort((a, b) => (adminLayout.blocks[a.dataset.adminBlock]?.order ?? Number(a.dataset.defaultOrder)) - (adminLayout.blocks[b.dataset.adminBlock]?.order ?? Number(b.dataset.defaultOrder)));
        blocks.forEach(block => grid.appendChild(block));
        grid.classList.toggle('has-custom-layout', blocks.some(block => adminLayout.blocks[block.dataset.adminBlock]));
    });
    renderAdminNavArrangement(); renderAdminMore(); scheduleAdminLayout();
}
function recordAdminBlockOrder(grid) {
    [...grid.children].filter(el => el.dataset.adminBlock).forEach((block, order) => {
        const id = block.dataset.adminBlock;
        adminLayout.blocks[id] = { span: adminLayout.blocks[id]?.span || Number(block.dataset.defaultSpan), order };
    });
}
function registerAdminBlockGrid(name, parent, nodes) {
    const entries = nodes.filter(entry => entry.node);
    if (!entries.length) return;
    const grid = document.createElement('div'); grid.className = 'admin-block-grid'; grid.dataset.adminGrid = name;
    parent.insertBefore(grid, entries[0].node);
    entries.forEach(({ node, id, label, span = 1 }, index) => {
        const block = document.createElement('section'); block.className = 'admin-layout-block'; block.dataset.adminBlock = id; block.dataset.defaultSpan = span; block.dataset.defaultOrder = index;
        block.setAttribute('aria-label', label);
        const tools = document.createElement('div'); tools.className = 'admin-block-tools';
        tools.innerHTML = `<button type="button" class="admin-block-drag" aria-label="Drag ${escapeHtml(label)}">${adminIcon('drag')}</button><strong>${escapeHtml(label)}</strong><button type="button" data-block-move="up" aria-label="Move ${escapeHtml(label)} up">${adminIcon('arrow-up')}</button><button type="button" data-block-move="down" aria-label="Move ${escapeHtml(label)} down">${adminIcon('arrow-down')}</button><button type="button" class="admin-block-resize" role="slider" aria-label="Resize ${escapeHtml(label)} width" aria-valuemin="1" aria-valuemax="3" aria-valuenow="${span}" title="Drag to resize; arrow keys also work">${adminIcon('arrow-left')}${adminIcon('arrow-right')}</button>`;
        block.append(tools, node); grid.append(block);
    });
    adminBlockGrids.set(name, grid);
    createAdminDragSort({ container: grid, handleSelector: '.admin-block-drag', itemSelector: '[data-admin-block]', canStart: () => Boolean(adminArrangeSnapshot), onCommit: () => recordAdminBlockOrder(grid) });
    grid.addEventListener('click', event => {
        const button = event.target.closest('[data-block-move]');
        if (!button || !adminArrangeSnapshot) return;
        const block = button.closest('[data-admin-block]');
        const adjacent = button.dataset.blockMove === 'up' ? block.previousElementSibling : block.nextElementSibling;
        if (!adjacent) return;
        grid.insertBefore(block, button.dataset.blockMove === 'up' ? adjacent : adjacent.nextElementSibling);
        recordAdminBlockOrder(grid); button.focus({ preventScroll: true });
    });
    initAdminBlockResize(grid);
}
function initAdminBlockResize(grid) {
    const setSpan = (block, span) => {
        const id = block.dataset.adminBlock;
        adminLayout.blocks[id] = { order: adminLayout.blocks[id]?.order ?? Number(block.dataset.defaultOrder), span };
        scheduleAdminLayout();
    };
    grid.addEventListener('keydown', event => {
        const button = event.target.closest('.admin-block-resize');
        if (!button || !adminArrangeSnapshot || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const block = button.closest('[data-admin-block]'), old = adminLayout.blocks[block.dataset.adminBlock]?.span || Number(block.dataset.defaultSpan);
        setSpan(block, event.key === 'Home' ? 1 : event.key === 'End' ? 3 : Math.min(3, Math.max(1, old + (event.key === 'ArrowRight' ? 1 : -1))));
    });
    grid.addEventListener('pointerdown', event => {
        const button = event.target.closest('.admin-block-resize');
        if (!button || !adminArrangeSnapshot || event.isPrimary === false || document.body.classList.contains('admin-dragging') || matchMedia('(max-width: 860px)').matches || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        document.dispatchEvent(new Event('admin-content-changing'));
        const block = button.closest('[data-admin-block]'), id = block.dataset.adminBlock;
        const previous = adminLayout.blocks[id] ? { ...adminLayout.blocks[id] } : null;
        const start = event.clientX, width = block.getBoundingClientRect().width, columns = Number(grid.dataset.columns) || 1, unit = (grid.clientWidth + 12) / columns;
        let pendingX = start, resizeFrame = 0, active = true;
        button.setPointerCapture(event.pointerId);
        const flush = () => { resizeFrame = 0; setSpan(block, Math.max(1, Math.min(columns, Math.round((width + pendingX - start + 12) / unit)))); };
        const move = e => { if (e.pointerId !== event.pointerId) return; pendingX = e.clientX; if (!resizeFrame) resizeFrame = requestAnimationFrame(flush); };
        const finish = commit => {
            if (!active) return; active = false;
            if (resizeFrame) cancelAnimationFrame(resizeFrame);
            if (commit) flush(); else { if (previous) adminLayout.blocks[id] = previous; else delete adminLayout.blocks[id]; scheduleAdminLayout(); }
            button.removeEventListener('pointermove', move); button.removeEventListener('pointerup', up); button.removeEventListener('pointercancel', cancel); button.removeEventListener('lostpointercapture', cancel);
            document.removeEventListener('admin-content-changing', cancel); window.removeEventListener('resize', cancel); window.removeEventListener('blur', cancel); document.removeEventListener('keydown', key, true);
            if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
        };
        const up = e => { if (e.pointerId === event.pointerId) { pendingX = e.clientX; finish(true); } };
        const cancel = () => finish(false);
        const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } };
        button.addEventListener('pointermove', move); button.addEventListener('pointerup', up); button.addEventListener('pointercancel', cancel); button.addEventListener('lostpointercapture', cancel);
        document.addEventListener('admin-content-changing', cancel); window.addEventListener('resize', cancel); window.addEventListener('blur', cancel); document.addEventListener('keydown', key, true);
    });
}
function renderAdminNavArrangement() {
    const output = document.getElementById('admin-nav-arrange');
    output.replaceChildren(...adminLayout.nav.map((id, index) => {
        const row = document.createElement('div'); row.className = 'admin-nav-arrange-row'; row.dataset.arrangePanel = id;
        row.innerHTML = `<button type="button" class="admin-nav-arrange-drag" aria-label="Drag ${ADMIN_PANEL_NAMES[id]} navigation">${adminIcon('drag')}</button><strong>${ADMIN_PANEL_NAMES[id]}</strong><button type="button" data-nav-move="up" ${index === 0 ? 'disabled' : ''} aria-label="Move ${ADMIN_PANEL_NAMES[id]} navigation up">${adminIcon('arrow-up')}</button><button type="button" data-nav-move="down" ${index === adminLayout.nav.length - 1 ? 'disabled' : ''} aria-label="Move ${ADMIN_PANEL_NAMES[id]} navigation down">${adminIcon('arrow-down')}</button>`;
        return row;
    }));
}
function renderAdminMore() {
    const output = document.querySelector('.admin-more-grid');
    if (!output) return;
    const active = document.querySelector('#admin-tabs [aria-current="page"]')?.dataset.panel || 'review-panel';
    const order = adminLayout.nav;
    output.innerHTML = order.slice(4).map(id => {
        const icon = els.tabs.querySelector(`[data-panel="${id}"] > svg`)?.outerHTML || '';
        return `<button type="button" data-more-panel="${id}" ${id === active ? 'aria-current="page"' : ''}>${icon}<span>${ADMIN_PANEL_NAMES[id]}</span></button>`;
    }).join('');
    document.getElementById('admin-mobile-more')?.classList.toggle('more-active', order.indexOf(active) >= 4);
}
function initAdminLayout() {
    const select = selector => document.querySelector(selector);
    const review = select('.admin-review-dood-layout');
    registerAdminBlockGrid('review-doods', review, [
        { node: select('.admin-review-primary'), id: 'review-feed', label: 'Doods', span: 3 },
        { node: select('#admin-selection-preview'), id: 'review-selection', label: 'Selection preview' }
    ]);
    const asks = select('[data-admin-review-content="asks"]');
    const askFeed = document.createElement('div');
    [...asks.children].forEach(child => askFeed.append(child)); asks.append(askFeed);
    registerAdminBlockGrid('review-asks', asks, [{ node: askFeed, id: 'review-asks', label: 'Asks', span: 3 }]);
    ['doods', 'asks'].forEach(lane => {
        const root = select(`[data-admin-published-content="${lane}"]`), feed = document.createElement('div');
        [...root.children].forEach(child => feed.append(child)); root.append(feed);
        registerAdminBlockGrid(`published-${lane}`, root, [{ node: feed, id: `published-${lane}`, label: lane === 'doods' ? 'Published doods' : 'Answered asks', span: 3 }]);
    });
    const site = select('#site-panel .admin-control-grid');
    // Group existing settings by purpose. Stable block IDs preserve saved widths.
    const siteCards = new Map([...site.children].map(node => [node.dataset.linkCard, node]));
    [['site', 'Content', ['homepage-note', 'submissions']], ['site-entry', 'First visit', ['entrance', 'first-visit-tour']], ['site-availability', 'Availability', ['maintenance']]].forEach(([id, label, keys]) => {
        const group = document.createElement('section'); group.className = 'admin-settings-section';
        const heading = document.createElement('h2'); heading.textContent = label; group.append(heading);
        const content = document.createElement('div'); group.append(content); site.before(group);
        const cards = keys.map(key => siteCards.get(key));
        cards.forEach(card => { card.open = card.dataset.linkCard === 'homepage-note' || card.dataset.linkCard === 'submissions'; content.append(card); });
        registerAdminBlockGrid(id, content, cards.map(node => ({ node, id: `site-${node.dataset.linkCard}`, label: node.querySelector('summary strong').textContent.trim(), span: id === 'site-availability' ? 3 : 1 })));
        if (id !== 'site-availability') adminBlockGrids.get(id).dataset.maxColumns = '2';
    });
    site.remove();
    const links = select('#links-panel'), linkFeed = document.createElement('div');
    links.insertBefore(linkFeed, select('#links-panel .admin-order-toolbar'));
    [...links.children].filter(node => node !== linkFeed && !node.classList.contains('admin-panel-intro')).forEach(node => linkFeed.append(node));
    registerAdminBlockGrid('links', links, [{ node: linkFeed, id: 'links-feed', label: 'Link cards', span: 3 }]);
    const wishes = select('#wishlist-panel'), wishFeed = document.createElement('div'), menu = select('#wishlist-panel .admin-link-grid');
    wishes.append(wishFeed);
    [...wishes.children].filter(node => node !== wishFeed && node !== menu && !node.classList.contains('admin-panel-intro')).forEach(node => wishFeed.append(node));
    registerAdminBlockGrid('wishes', wishes, [{ node: menu, id: 'wishes-menu', label: 'Wishes menu' }, { node: wishFeed, id: 'wishes-feed', label: 'Featured wishes', span: 2 }]);
    const seo = select('.admin-search-layout'), seoTools = [...seo.querySelector('.admin-chat-tools').children];
    seoTools.forEach(node => seo.append(node)); seo.querySelector('.admin-chat-tools').remove();
    registerAdminBlockGrid('search', seo, [...seo.children].map((node, index) => ({ node, id: ['search-editor', 'search-crawler', 'search-checks'][index], label: ['Search appearance', 'Crawler copy', 'Site checks'][index], span: index === 0 ? 2 : 1 })));
    const rooms = select('#rooms-panel'), operations = document.createElement('div'), bans = document.createElement('div');
    const roomHeading = select('#table-wrap').previousElementSibling.previousElementSibling;
    rooms.insertBefore(operations, roomHeading);
    let next = roomHeading;
    while (next && next !== select('#ban-add-form').previousElementSibling) { const following = next.nextElementSibling; operations.append(next); next = following; }
    const banHeading = select('#ban-add-form').previousElementSibling;
    rooms.insertBefore(bans, banHeading);
    [banHeading, select('#ban-add-form'), select('#bans-table-wrap')].forEach(node => bans.append(node));
    const roomSettings = select('#rooms-panel .admin-control-grid');
    roomSettings.classList.add('admin-room-settings');
    roomSettings.querySelectorAll('details').forEach(card => card.open = false);
    registerAdminBlockGrid('rooms', rooms, [{ node: operations, id: 'rooms-operations', label: 'Recent rooms', span: 3 }, { node: roomSettings, id: 'rooms-settings', label: 'Access' }, { node: bans, id: 'rooms-bans', label: 'Global bans', span: 2 }]);
    readAdminLayout(); applyAdminLayout();
    const bar = document.getElementById('admin-arrange-bar'), opener = document.getElementById('admin-arrange-open');
    const end = commit => {
        document.dispatchEvent(new Event('admin-content-changing'));
        if (!adminArrangeSnapshot) return;
        if (!commit) adminLayout = adminArrangeSnapshot;
        adminArrangeSnapshot = null;
        els.dashboardPanel.classList.remove('is-arranging'); bar.hidden = true; opener.setAttribute('aria-pressed', 'false');
        applyAdminLayout(); updateAdminSelectionBar(getAdminSelectionCount('pending-drawings-list'));
        if (commit && saveAdminLayout()) setStatus(els.adminStatus, 'Dashboard layout saved on this browser.');
        opener.focus({ preventScroll: true });
    };
    opener.addEventListener('click', () => {
        if (adminArrangeSnapshot) { end(true); return; }
        document.dispatchEvent(new Event('admin-content-changing'));
        adminArrangeSnapshot = JSON.parse(JSON.stringify(adminLayout));
        ['links-panel', 'wishlist-panel'].forEach(id => setAdminPublicEditing(id, false));
        els.dashboardPanel.classList.add('is-arranging'); bar.hidden = false; opener.setAttribute('aria-pressed', 'true');
        window.scrollTo({ top: 0, behavior: 'instant' });
        updateAdminSelectionBar(getAdminSelectionCount('pending-drawings-list'));
        document.getElementById('admin-arrange-done').focus({ preventScroll: true });
    });
    document.getElementById('admin-arrange-done').addEventListener('click', () => end(true));
    document.getElementById('admin-arrange-cancel').addEventListener('click', () => end(false));
    document.getElementById('admin-arrange-reset').addEventListener('click', () => {
        document.dispatchEvent(new Event('admin-content-changing'));
        adminLayout = { version: 1, nav: [...ADMIN_PANEL_IDS], sidebar: 200, blocks: {} }; applyAdminLayout();
    });
    document.getElementById('admin-sidebar-width').addEventListener('input', event => { adminLayout.sidebar = Number(event.target.value); document.documentElement.style.setProperty('--admin-sidebar', `${adminLayout.sidebar}px`); scheduleAdminLayout(); });
    const nav = document.getElementById('admin-nav-arrange');
    nav.addEventListener('click', event => {
        const button = event.target.closest('[data-nav-move]'); if (!button || !adminArrangeSnapshot) return;
        const id = button.closest('[data-arrange-panel]').dataset.arrangePanel, index = adminLayout.nav.indexOf(id), target = index + (button.dataset.navMove === 'up' ? -1 : 1);
        if (target < 0 || target >= adminLayout.nav.length) return;
        [adminLayout.nav[index], adminLayout.nav[target]] = [adminLayout.nav[target], adminLayout.nav[index]]; applyAdminLayout();
        nav.querySelector(`[data-arrange-panel="${id}"] [data-nav-move="${button.dataset.navMove}"]`)?.focus({ preventScroll: true });
    });
    createAdminDragSort({ container: nav, handleSelector: '.admin-nav-arrange-drag', itemSelector: '[data-arrange-panel]', canStart: () => Boolean(adminArrangeSnapshot), onCommit: ({ order }) => { adminLayout.nav = order.map(row => row.dataset.arrangePanel); applyAdminLayout(); } });
    const resize = new ResizeObserver(scheduleAdminLayout); resize.observe(els.dashboardPanel.querySelector('.admin-dashboard-main')); resize.observe(document.querySelector('.admin-header'));
    window.visualViewport?.addEventListener('resize', scheduleAdminLayout, { passive: true });
    window.visualViewport?.addEventListener('scroll', scheduleAdminLayout, { passive: true });
    document.addEventListener('focusin', scheduleAdminLayout); document.addEventListener('focusout', scheduleAdminLayout);
    document.addEventListener('keydown', event => { if (!event.defaultPrevented && event.key === 'Escape' && adminArrangeSnapshot && !document.querySelector('dialog[open]') && !document.body.classList.contains('admin-dragging')) { event.preventDefault(); end(false); } });
    updateAdminSelectionBar(getAdminSelectionCount('pending-drawings-list'));
    updateAdminPublishedSelection();
    activateAdminPanel('review-panel');
}
function updateAdminPublishedSelection() {
    const list = document.getElementById('published-drawings-list');
    if (!list) return;
    let bar = document.getElementById('admin-published-selection-bar');
    if (!bar) {
        bar = document.createElement('div'); bar.id = 'admin-published-selection-bar'; bar.className = 'admin-selection-bar admin-bulk-bar';
        bar.innerHTML = '<strong></strong><button type="button" class="danger" data-bulk-action="delete" data-list="published-drawings-list">Delete</button><button type="button" class="soft" data-clear-published>Clear selection</button>';
        list.before(bar);
        bar.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.hasAttribute('data-clear-published')) { clearAdminListSelection('published-drawings-list'); refreshVisibleListSelection('published-drawings-list'); } else if (button.dataset.bulkAction) void runBulkAction(button); });
        document.querySelector('[data-admin-published-content="doods"] .admin-section-heading [data-bulk-action="delete"]')?.remove();
    }
    const count = getAdminSelectionCount('published-drawings-list'); bar.hidden = !count; bar.querySelector('strong').textContent = `${count} selected`;
}
function updateAdminSelectionBar(count) {
    const list = document.getElementById('pending-drawings-list'); if (!list) return;
    let bar = document.getElementById('admin-review-selection-bar');
    if (!bar) {
        bar = document.createElement('div'); bar.id = 'admin-review-selection-bar'; bar.className = 'admin-selection-bar admin-bulk-bar';
        bar.innerHTML = '<strong data-current-selection></strong><button type="button" data-bulk-action="approve" data-list="pending-drawings-list">Approve</button><button type="button" class="danger" data-bulk-action="delete" data-list="pending-drawings-list">Delete</button><button type="button" class="soft" data-clear-selection>Clear selection</button>';
        list.before(bar);
        bar.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.hasAttribute('data-clear-selection')) { clearAdminListSelection('pending-drawings-list'); refreshVisibleListSelection('pending-drawings-list'); } else if (button.dataset.bulkAction) void runBulkAction(button); });
        const old = document.querySelector('[data-admin-review-content="doods"] > .admin-section-heading .admin-bulk-bar');
        old?.querySelectorAll('[data-bulk-action="approve"], [data-bulk-action="delete"]').forEach(button => button.remove());
        document.querySelector('#admin-selection-preview [data-selection-actions]')?.remove();
    }
    bar.hidden = !count; bar.querySelector('[data-current-selection]').textContent = `${count} selected`;
    const preview = document.querySelector('[data-admin-block="review-selection"]');
    if (preview) preview.hidden = !count && !adminArrangeSnapshot;
    scheduleAdminLayout();
}
function updateAdminLaneCounts(doods, asks, postedDoods, postedAsks) {
    [['review', 'doods', doods, 'Doods'], ['review', 'asks', asks, 'Asks'], ['published', 'doods', postedDoods, 'Doods'], ['published', 'asks', postedAsks, 'Answered']].forEach(([group, lane, count, label]) => {
        const button = document.querySelector(`[data-admin-${group}-lane="${lane}"]`);
        if (button && button.textContent !== `${label} ${count}`) button.textContent = `${label} ${count}`;
    });
}
function setAdminPublicEditing(panelId, active) {
    const panel = document.getElementById(panelId);
    const button = document.getElementById(panelId === 'links-panel' ? 'admin-link-order' : 'admin-wish-order');
    const changed = panel.classList.contains('is-public-order') !== active;
    panel.classList.toggle('is-public-order', active);
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Done' : 'Edit';
    button.setAttribute('aria-label', `${active ? 'Finish editing' : 'Edit'} ${panelId === 'links-panel' ? 'links' : 'wishes'}`);
    if (changed && panelId === 'wishlist-panel') {
        panel.querySelector('.admin-wishlist-filter-options').open = !active;
        renderWishlistItems();
    }
}
function initAdminPublicOrdering() {
    [['admin-link-order', 'links-panel'], ['admin-wish-order', 'wishlist-panel']].forEach(([id, panelId]) => {
        const button = document.getElementById(id), panel = document.getElementById(panelId);
        button.addEventListener('click', async () => {
            if (adminArrangeSnapshot) { setStatus(els.adminStatus, 'Finish arranging the dashboard before editing site content.'); return; }
            const active = !panel.classList.contains('is-public-order');
            // Entering Edit should work from any wishlist sort. Return to the
            // actual public ordering scope rather than displaying a dead toggle.
            if (active && panelId === 'wishlist-panel' && (state.wishlistSort !== 'featured' || adminExactFilters.has('wishlist-items-list'))) {
                if (adminExactFilters.has('wishlist-items-list')) { setStatus(els.adminStatus, 'Clear the single-item search result before editing the order of wishes.'); return; }
                state.wishlistSort = 'featured'; els.wishlistSort.value = 'featured';
                adminListPages.set('wishlist-items-list', 1);
                button.disabled = true;
                try { await loadAdminList('wishlist-items-list'); } finally { button.disabled = !state.wishlistItemsAvailable; }
                if (adminArrangeSnapshot || adminListErrors.has('wishlist-items-list') || state.wishlistSort !== 'featured' || state.wishlistLoadedSort !== 'featured' || !panel.classList.contains('active')) return;
            }
            document.dispatchEvent(new Event('admin-content-changing'));
            setAdminPublicEditing(panelId, active);
        });
    });
}
function initAdminFieldLabels() {
    document.querySelectorAll('.admin-switch input').forEach(input => {
        if (input.getAttribute('aria-label')) return;
        const title = input.closest('.admin-toggle-row')?.querySelector('strong')?.textContent.trim() || input.closest('.admin-link-card')?.querySelector('summary strong')?.textContent.trim() || input.id.replaceAll('-', ' ');
        input.setAttribute('aria-label', title);
    });
    const reset = document.getElementById('link-settings-reset');
    const actions = document.createElement('details'); actions.className = 'admin-secondary-actions';
    actions.innerHTML = `<summary aria-label="More link actions" title="More link actions">${adminIcon('more')}</summary><div></div>`;
    actions.querySelector('div').append(reset); document.querySelector('#links-panel .admin-order-toolbar').append(actions);
    document.querySelectorAll('.admin-panel-intro .admin-kicker, .admin-panel-intro > div:first-child > h2').forEach(el => el.remove());
    document.querySelectorAll('.admin-panel-intro > div:first-child').forEach(el => { if (!el.textContent.trim() && !el.children.length) el.remove(); });
    document.querySelectorAll('#links-panel .admin-social-order-note').forEach(el => el.remove());
}

function initAdminExperience() {
    initAdminLayout();
    initAdminCommandPalette();
    initAdminMobileMore();
    initAdminLaneNavigation();
    initAdminCardInspector();
    initAdminSocialCardReorder();
    initAdminWishlistReorder();
    initAdminPublicOrdering();
    initAdminFieldLabels();
    const account = document.querySelector('.admin-account-menu');
    document.addEventListener('click', event => {
        if (account.open && !account.contains(event.target)) account.open = false;
        document.querySelectorAll('.admin-secondary-actions[open]').forEach(menu => { if (!menu.contains(event.target) || event.target.closest('button, a')) menu.open = false; });
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && account.open) { account.open = false; account.querySelector('summary').focus(); } });
    decorateAdminControls();
    setupAdminHorizontalScroll();

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node instanceof Element) decorateAdminControls(node.matches('button, .admin-video-picker, .admin-soft-link') ? node.parentElement : node);
            });
        });
        scheduleAdminLayout();
    });
    observer.observe(els.dashboardPanel, { childList: true, subtree: true });
    window.addEventListener('resize', setupAdminHorizontalScroll);
}

function initTabs() {
    els.tabs.addEventListener('click', event => {
        const button = event.target.closest('button[data-panel]');
        if (!button) return;
        activateAdminPanel(button.dataset.panel, { scrollToTop: true });
    });
}

async function init() {
    if (window.dollAdminConnectionUnavailable) {
        const message = "Couldn't connect. Check your connection or blocker, then reload.";
        setStatus(els.gateStatus, message);
        setStatus(els.loginStatus, message);
    }
    els.passcodeForm.addEventListener('submit', async e => {
        e.preventDefault();
        const entered = await hashPin(els.passcode.value.trim());
        if (entered !== ADMIN_PASSCODE_HASH) {
            setStatus(els.gateStatus, 'Incorrect passcode.');
            els.passcode.select();
            return;
        }

        sessionStorage.setItem('doll_admin_gate', 'open');
        showPanel(els.loginPanel);
        els.email.focus();
    });

    els.loginForm.addEventListener('submit', handleLogin);
    els.refresh.addEventListener('click', () => {
        els.refresh.closest('details')?.removeAttribute('open');
        void loadAdminData().catch(error => {
            setStatus(els.adminStatus, error.message || 'Could not refresh admin data.');
        });
    });
    els.logout.addEventListener('click', async () => {
        els.logout.closest('details')?.removeAttribute('open');
        if (els.logout.disabled) return;
        els.logout.disabled = true;
        try {
            const { error } = await withAdminDeadline(adminClient.auth.signOut());
            if (error) throw error;
            clearTimeout(wishlistSearchTimer);
            SOCIAL_CARD_VIDEO_KEYS.forEach(revokeSocialVideoObjectUrl);
            socialVideoSelectedFiles.clear();
            if (window.roomsSignOut) {
                await withAdminDeadline(window.roomsSignOut(), 5000).catch(err => console.error('rooms signOut:', err));
            }
            sessionStorage.removeItem('doll_admin_gate');
            showPanel(els.gatePanel);
        } catch (error) {
            setStatus(els.adminStatus, error.message || 'Could not sign out. Please try again.');
        } finally {
            els.logout.disabled = false;
        }
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
            if (list.id === 'pending-drawings-list') renderAdminSelectionPreview();
            if (list.id === 'published-drawings-list') updateAdminPublishedSelection();
        });
        list.addEventListener('input', event => {
            const textarea = event.target.closest('textarea[data-answer-for]');
            if (!textarea) return;
            adminQuestionDrafts.set(String(textarea.dataset.answerFor), textarea.value);
        });
        list.addEventListener('paste', event => {
            const textarea = event.target.closest('textarea[data-answer-for]');
            if (!textarea) return;
            const gifUrl = getGifReplyUrlFromClipboard(event.clipboardData);
            if (gifUrl) {
                event.preventDefault();
                insertGifReplyUrl(textarea, gifUrl);
                setStatus(els.adminStatus, 'GIF link added — save the reply when ready.');
                return;
            }
            const pastedImageOnly = Array.from(event.clipboardData?.items || []).some(item => (
                item.kind === 'file' && item.type.startsWith('image/')
            ));
            if (pastedImageOnly
                && !(event.clipboardData?.getData('text/plain') || '').trim()) {
                setStatus(
                    els.adminStatus,
                    'That GIF keyboard pasted an image file without a link. Use its Copy Link option instead.'
                );
            }
        });
    });

    els.wishlistSyncNow?.addEventListener('click', syncWishlistNow);
    els.wishlistFeatureAll?.addEventListener('click', featureAllWishlistItems);
    els.wishlistUnfeatureAll?.addEventListener('click', unfeatureAllWishlistItems);
    const queueWishlistReload = () => {
        document.dispatchEvent(new Event('admin-content-changing'));
        setAdminPublicEditing('wishlist-panel', false);
        adminListPages.set('wishlist-items-list', 1);
        adminListLoadTokens.set(
            'wishlist-items-list',
            (adminListLoadTokens.get('wishlist-items-list') || 0) + 1
        );
        setAdminListBusy('wishlist-items-list', true);
        clearTimeout(wishlistSearchTimer);
        wishlistSearchTimer = setTimeout(() => loadAdminList('wishlist-items-list'), 180);
    };
    els.wishlistSearch?.addEventListener('input', () => {
        state.wishlistSearch = els.wishlistSearch.value || '';
        queueWishlistReload();
    });
    els.wishlistFilter?.addEventListener('change', () => {
        state.wishlistFilter = WISHLIST_FILTERS.has(els.wishlistFilter.value) ? els.wishlistFilter.value : 'all';
        queueWishlistReload();
    });
    els.wishlistSort?.addEventListener('change', () => {
        state.wishlistSort = WISHLIST_SORTS.has(els.wishlistSort.value) ? els.wishlistSort.value : 'featured';
        queueWishlistReload();
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
        const edit = event.target.closest('[data-social-edit]');
        if (edit) {
            event.preventDefault();
            event.stopPropagation();
            openAdminCardInspector(edit.dataset.socialEdit, edit);
            return;
        }
        const dragHandle = event.target.closest('[data-social-drag]');
        if (dragHandle || performance.now() < adminSocialSuppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        const button = event.target.closest('[data-social-move]');
        if (!button) {
            const summary = event.target.closest('summary');
            if (summary && !event.target.closest('button, input, label, a')) { event.preventDefault(); openAdminCardInspector(summary.closest('[data-link-card]').dataset.linkCard, summary); }
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        moveSocialCard(button.dataset.socialKey, button.dataset.socialMove);
    });
    document.querySelectorAll('.admin-switch').forEach(toggle => {
        toggle.addEventListener('click', e => e.stopPropagation());
        toggle.addEventListener('keydown', e => e.stopPropagation());
        // Rooms has a confirmed, immediate save path above. Registering this
        // generic debounce too would save twice (even after a cancelled toggle).
        if ((els.roomsMasterEnabled && toggle.contains(els.roomsMasterEnabled)) || toggle.querySelector('#lockdown-toggle')) return;
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
        els.throneLinkUrl,
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
    initAdminExperience();

    if (!hasGateAccess()) {
        showPanel(els.gatePanel);
        return;
    }

    try {
        if (await withAdminDeadline(ensureAdminSession())) {
            if (window.roomsRestoreSession) {
                await withAdminDeadline(window.roomsRestoreSession(), 5000).catch(err => console.error('rooms session restore:', err));
            }
            await openDashboard();
        } else {
            showPanel(els.loginPanel);
        }
    } catch (error) {
        showPanel(els.loginPanel);
        setStatus(els.loginStatus, error.message || 'Could not restore your session.');
    }
}

init().catch(error => {
    showPanel(els.loginPanel);
    setStatus(els.loginStatus, error.message || 'Could not open the dashboard.');
});
