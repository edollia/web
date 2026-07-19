(function() {
    const panelId = 'doll-wishlist-panel';
    const styleId = 'doll-wishlist-style';
    const previewStyleId = 'doll-wishlist-preview-style';
    const marqueeStyleId = 'doll-wishlist-marquee-keyframes';
    const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
    const FETCH_TIMEOUT_MS = 6000;
    const MAX_FEATURED = 30;
    // Throne's cart endpoint accepts at most ten wishlist entries at once.
    // Keep the public selection UI honest instead of letting the Edge
    // function silently trim an 11th (or later) choice.
    const MAX_CHECKOUT_ITEMS = 10;
    const NAME_MAX = 60;
    const CARD_GAP = 10;
    const PAGE_SIZE = 4;
    const IMAGE_HYDRATE_CONCURRENCY = 6;
    const IMAGE_INITIAL_EXTRA_COUNT = 2;
    const IMAGE_HYDRATE_MARGIN_PX = 320;
    const IMAGE_DECODE_CACHE_LIMIT = 10;
    const IMAGE_SCROLL_PRIORITY_IDLE_MS = 120;
    const IMAGE_HYDRATE_TIMEOUT_MS = 8000;
    const IMAGE_DECODE_TIMEOUT_MS = 2500;
    const WISHLIST_MEDIA_PREPARE_TIMEOUT_MS = 12000;
    const WISHLIST_EXIT_TRANSITION_FALLBACK_MS = 520;
    const WISHLIST_RELEASE_DELAY_MS = 1000;
    const SWIPE_HINT_INITIAL_DELAY_MS = 3000;
    const SWIPE_HINT_FIRST_VISIBLE_MS = 3000;
    const SWIPE_HINT_REPEAT_DELAY_MS = 5000;
    const SWIPE_HINT_SECOND_VISIBLE_MS = 2000;
    const FULL_WISHLIST_URL = 'https://throne.com/edoll';

    const HEART_PATH = 'M12 20.3s-7.6-4.5-9.9-9C.6 7.7 2.3 4.3 5.9 4c2.2-.2 4.2 1 6.1 3.4C13.9 5 15.9 3.8 18.1 4c3.6.3 5.3 3.7 3.8 7.3-2.3 4.5-9.9 9-9.9 9z';
    const ICON_HEART = `<svg class="dwl-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
    const ICON_HEART_FILLED = `<svg class="dwl-heart-filled" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;

    // Used to clip the selection burst (see .dwl-burst) into an actual heart
    // silhouette instead of a plain circle, while still letting the burst's
    // own background be a soft radial gradient (a mask clips a shape; it
    // doesn't flatten the shape's own fill into one solid color the way an
    // SVG `fill` on the heart path directly would).
    const HEART_MASK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${HEART_PATH}" fill="#000"/></svg>`;
    const HEART_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(HEART_MASK_SVG)}")`;

    let panel = null;
    let items = [];
    let selectedIds = new Set();
    let loadState = 'idle'; // idle | loading | preparing | ready | failed
    // Which of the 3 wishlist layouts to render. Defaults to 'masonry' and
    // is overridden by the admin-configurable wishlist_view_mode setting
    // (fetched in loadItems, see applyWishlistViewModeSetting) — grid and
    // list stay in the code as the other two options that setting can pick.
    let wishlistViewMode = 'masonry'; // 'grid' | 'list' | 'masonry'
    const WISHLIST_VIEW_MODES = ['grid', 'list', 'masonry'];
    let checkoutInFlight = false;
    let checkoutStatusMessage = '';
    let checkoutRequestRun = 0;
    let checkoutRequestController = null;
    let scrollRaf = 0;
    let resizeRaf = 0;
    let panelOpenRaf = 0;
    let panelOpening = false;
    let swipeHintTimer = 0;
    let swipeHintSequenceStarted = false;
    let swipeHintDismissed = false;
    let panelResizeObserver = null;
    let panelMutationObserver = null;
    let conflictObserver = null;
    let conflictClickGuardReady = false;
    let throneFooterLink = null;
    let previewOverlay = null;
    let previewOpenCount = 0;
    let previewItemId = null;
    let previewImageGeneration = 0;
    let previewImageReleaseTimer = 0;
    let marqueeRuleCounter = 0;
    let imageHydrationRun = 0;
    let imageHydrationObserver = null;
    let imageHydrationRoot = null;
    let imageHydrationFallbackHandler = null;
    let imagePriorityScrollEndHandler = null;
    let imagePriorityRefreshRaf = 0;
    let imagePriorityRefreshTimer = 0;
    let imageRevealRun = 0;
    let itemsLoadRun = 0;
    let itemsFetchController = null;
    let wishlistExitTransitionTimer = 0;
    let wishlistReleaseTimer = 0;
    let wishlistExitTransitionHandler = null;
    let renderedBodySignature = '';
    const imageHydrationQueue = [];
    const imageHydrationQueued = new Set();
    const activeImageHydrations = new Map();
    const imagePriorityWindow = new Set();
    const imageDecodedRecency = new Map();
    const atomicImageWaitCancels = new Set();

    function formatPrice(cents) {
        if (typeof cents !== 'number' || !cents) return '';
        return `$${(cents / 100).toFixed(2)}`;
    }

    function capName(name) {
        const clean = String(name || '').trim();
        if (clean.length <= NAME_MAX) return clean;
        return clean.slice(0, NAME_MAX - 1).trimEnd() + '…';
    }

    function playSound(type) {
        if (typeof window.dollPlayUiSound === 'function') {
            window.dollPlayUiSound(type);
        }
    }

    function openCheckoutDestination(url) {
        // This is the same delayed-link navigation used by the social cards.
        // Opening about:blank synchronously keeps Safari's popup permission,
        // but visibly strands the visitor on an empty tab while the cart API
        // responds. A real anchor opens only once the final Throne URL exists,
        // so there is no intermediate blank page.
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
    }

    function getWishlistButton() {
        return document.getElementById('support-menu-button');
    }

    function openInNewTab(event) {
        // Belt-and-suspenders: always force a real new tab/window via JS
        // rather than trusting the anchor's target="_blank" alone, since
        // that can silently get swallowed depending on how the tap reaches
        // the element (e.g. through the site's other click handling).
        event.preventDefault();
        playSound('link');
        window.open(FULL_WISHLIST_URL, '_blank', 'noopener,noreferrer');
    }

    function fallbackToLegacy() {
        closeThroneMockup();
        if (typeof window.openThroneOverlay === 'function') {
            window.openThroneOverlay();
            return;
        }
        const url = window.dollThroneUrl || 'https://throne.com/edoll';
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    function withTimeout(promise, ms, onTimeout = null) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                try { onTimeout?.(); } catch (error) {}
                reject(new Error('timeout'));
            }, ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    function withSupabaseTimeout(query, ms, externalSignal = null) {
        if (typeof window.AbortController !== 'function' || typeof query?.abortSignal !== 'function') {
            return withTimeout(query, ms);
        }
        const controller = new AbortController();
        const relayAbort = () => controller.abort();
        if (externalSignal?.aborted) controller.abort();
        else externalSignal?.addEventListener('abort', relayAbort, { once: true });
        return withTimeout(
            query.abortSignal(controller.signal),
            ms,
            () => controller.abort()
        ).finally(() => externalSignal?.removeEventListener('abort', relayAbort));
    }

    // url -> { w, h } natural pixel dimensions, captured while preloading so
    // the markup can reserve each photo's exact final height up front (via
    // width/height attributes). Without reserved height the masonry columns
    // lay out at zero height and visibly re-balance the instant the photos
    // decode — that split-second "the wishlist reorganizes itself" jump.
    const imageDims = new Map();
    // Emits width/height attrs when the photo was measured during preload, so
    // the browser reserves the tile's true aspect ratio before the pixels
    // decode. Empty string when unknown — the tile just falls back to the old
    // (reflow-prone) behavior for that one image rather than breaking.
    function imageDimsAttr(url) {
        const dims = imageDims.get(String(url || ''));
        return dims ? ` width="${dims.w}" height="${dims.h}"` : '';
    }

    function imageRatioStyle(url) {
        const dims = imageDims.get(String(url || ''));
        return dims ? ` style="--dwl-image-ratio:${dims.w} / ${dims.h}"` : '';
    }

    function isWishlistPanelVisible() {
        return Boolean(panel && (panelOpening || panel.classList.contains('active')));
    }

    function isProductImageWanted(img) {
        return imagePriorityWindow.has(img) || img?.dataset?.dwlObservedNear === 'true';
    }

    function applyProductImageDimensions(img, url) {
        if (!(img instanceof HTMLImageElement) || !img.naturalWidth || !img.naturalHeight) return false;
        const cleanUrl = String(url || img.dataset.src || '').trim();
        if (cleanUrl) imageDims.set(cleanUrl, { w: img.naturalWidth, h: img.naturalHeight });
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
        const media = img.closest('.doll-wishlist-media');
        media?.style.setProperty('--dwl-image-ratio', `${img.naturalWidth} / ${img.naturalHeight}`);
        media?.classList.remove('dwl-media-pending', 'dwl-media-error');
        if (isWishlistPanelVisible()) {
            imageDecodedRecency.set(img, performance.now());
        } else {
            imageDecodedRecency.delete(img);
        }
        return true;
    }

    function signalProductImageSettled(img) {
        try { img.dispatchEvent(new Event('dwl-image-settled')); } catch (error) {}
    }

    function beginProductImageHydration(img, run, url, priority = 'low') {
        const token = Symbol('wishlist-image-request');
        const onLoad = () => finishProductImageLoad(img, token);
        const onError = () => finishProductImageError(img, token);
        const timeoutId = window.setTimeout(() => {
            // A CDN request can neither resolve nor reject on a broken mobile
            // connection. Treat that exactly like an image error so it cannot
            // occupy one of the bounded hydration slots forever.
            finishProductImageError(img, token);
        }, IMAGE_HYDRATE_TIMEOUT_MS);
        const request = { run, url, timeoutId, priority, token, onLoad, onError };
        activeImageHydrations.set(img, request);
        img.addEventListener('load', onLoad);
        img.addEventListener('error', onError);
        img.dataset.dwlLoading = '1';
        return request;
    }

    function clearProductImageRequest(img, request) {
        if (!request) return;
        window.clearTimeout(request.timeoutId);
        img.removeEventListener('load', request.onLoad);
        img.removeEventListener('error', request.onError);
    }

    function cancelProductImageRequest(img, {
        removeSource = true,
        signalSettled = true,
        deferDrain = false,
    } = {}) {
        const request = activeImageHydrations.get(img);
        if (!request) return false;
        clearProductImageRequest(img, request);
        activeImageHydrations.delete(img);
        delete img.dataset.dwlLoading;
        if (removeSource) img.removeAttribute('src');
        if (signalSettled) signalProductImageSettled(img);
        if (!deferDrain) drainProductImageQueue();
        return true;
    }

    function drainProductImageQueue() {
        const run = imageHydrationRun;
        while (activeImageHydrations.size < IMAGE_HYDRATE_CONCURRENCY && imageHydrationQueue.length) {
            const entry = imageHydrationQueue.shift();
            imageHydrationQueued.delete(entry.img);
            const { img, url } = entry;
            if (entry.run !== run
                || !isWishlistPanelVisible()
                || !img.isConnected
                || !isProductImageWanted(img)
                || img.dataset.src !== url
                || img.dataset.dwlFailed === url
                || activeImageHydrations.has(img)) continue;

            if (img.hasAttribute('src')) {
                if (img.complete) {
                    if (img.naturalWidth) applyProductImageDimensions(img, url);
                    else img.removeAttribute('src');
                    signalProductImageSettled(img);
                    continue;
                }
                const request = beginProductImageHydration(img, run, url, entry.priority);
                if (img.complete) {
                    if (img.naturalWidth) finishProductImageLoad(img, request.token);
                    else finishProductImageError(img, request.token);
                }
                continue;
            }

            const request = beginProductImageHydration(img, run, url, entry.priority);
            img.loading = 'eager';
            try { img.fetchPriority = entry.priority; } catch (err) {}
            img.src = url;

            // A memory-cache hit may be complete before the load event can
            // run. Settle it explicitly without waiting for another task.
            if (img.complete) {
                if (img.naturalWidth) finishProductImageLoad(img, request.token);
                else finishProductImageError(img, request.token);
            }
        }
    }

    function finishProductImageLoad(img, token) {
        const request = activeImageHydrations.get(img);
        if (!request || request.run !== imageHydrationRun || request.token !== token) return;
        clearProductImageRequest(img, request);

        applyProductImageDimensions(img, request.url);
        delete img.dataset.dwlLoading;
        activeImageHydrations.delete(img);
        signalProductImageSettled(img);
        if (isWishlistPanelVisible()) {
            trimDecodedProductImageCache(img.closest('.doll-wishlist-body'));
        }
        drainProductImageQueue();
    }

    function finishProductImageError(img, token) {
        const request = activeImageHydrations.get(img);
        if (!request || request.run !== imageHydrationRun || request.token !== token) return;
        clearProductImageRequest(img, request);

        img.dataset.dwlFailed = request.url;
        delete img.dataset.dwlLoading;
        img.removeAttribute('src');
        img.closest('.doll-wishlist-media')?.classList.add('dwl-media-pending', 'dwl-media-error');
        activeImageHydrations.delete(img);
        signalProductImageSettled(img);
        drainProductImageQueue();
    }

    function removeQueuedProductImage(img) {
        imageHydrationQueued.delete(img);
        const index = imageHydrationQueue.findIndex(entry => entry.img === img);
        if (index >= 0) imageHydrationQueue.splice(index, 1);
    }

    function queueProductImage(img, priority = 'low', { deferDrain = false } = {}) {
        const url = String(img?.dataset?.src || '').trim();
        if (!url
            || !isWishlistPanelVisible()
            || !isProductImageWanted(img)
            || img.dataset.dwlFailed === url
            || !img.isConnected) return;

        const activeRequest = activeImageHydrations.get(img);
        if (activeRequest) {
            if (priority === 'high' && activeRequest.priority !== 'high') {
                activeRequest.priority = 'high';
                try { img.fetchPriority = 'high'; } catch (error) {}
            }
            return;
        }

        if (img.hasAttribute('src')) {
            if (img.complete) {
                if (img.naturalWidth) applyProductImageDimensions(img, url);
                else img.removeAttribute('src');
                signalProductImageSettled(img);
            } else {
                const request = beginProductImageHydration(img, imageHydrationRun, url, priority);
                if (img.complete) {
                    if (img.naturalWidth) finishProductImageLoad(img, request.token);
                    else finishProductImageError(img, request.token);
                }
            }
            return;
        }

        if (imageHydrationQueued.has(img)) {
            if (priority === 'high') {
                const queuedIndex = imageHydrationQueue.findIndex(entry => entry.img === img);
                if (queuedIndex >= 0 && imageHydrationQueue[queuedIndex].priority !== 'high') {
                    const [entry] = imageHydrationQueue.splice(queuedIndex, 1);
                    entry.priority = 'high';
                    const firstLow = imageHydrationQueue.findIndex(candidate => candidate.priority !== 'high');
                    if (firstLow < 0) imageHydrationQueue.push(entry);
                    else imageHydrationQueue.splice(firstLow, 0, entry);
                }
            }
            if (!deferDrain) drainProductImageQueue();
            return;
        }

        imageHydrationQueued.add(img);
        const entry = { img, url, run: imageHydrationRun, priority };
        if (priority === 'high') {
            const firstLow = imageHydrationQueue.findIndex(candidate => candidate.priority !== 'high');
            if (firstLow < 0) imageHydrationQueue.push(entry);
            else imageHydrationQueue.splice(firstLow, 0, entry);
        } else {
            imageHydrationQueue.push(entry);
        }
        if (!deferDrain) drainProductImageQueue();
    }

    function releaseOffscreenProductImage(img, { deferDrain = false, force = false } = {}) {
        if (!img || imagePriorityWindow.has(img)) return;
        removeQueuedProductImage(img);
        // Once a product photo has decoded, keep it for the rest of this open
        // wishlist session. Releasing a decoded image as soon as it crossed the
        // observer margin made a fast down/up swipe show empty cards and forced
        // Safari to decode the same photo repeatedly. The close path still
        // releases everything outside the small opening cohort, so memory is
        // bounded between visits without making active scrolling pay for it.
        if (!force && img.hasAttribute('src') && img.complete && img.naturalWidth) return;
        cancelProductImageRequest(img, { deferDrain: true });
        if (img.hasAttribute('src')) img.removeAttribute('src');
        imageDecodedRecency.delete(img);
        img.removeAttribute('fetchpriority');
        img.loading = 'lazy';
        delete img.dataset.dwlLoading;
        img.closest('.doll-wishlist-media')?.classList.add('dwl-media-pending');
        if (!deferDrain) drainProductImageQueue();
    }

    function disconnectProductImageObserver() {
        imageHydrationObserver?.disconnect();
        imageHydrationObserver = null;
        if (imageHydrationRoot && imageHydrationFallbackHandler) {
            imageHydrationRoot.removeEventListener('scroll', imageHydrationFallbackHandler);
            window.removeEventListener('resize', imageHydrationFallbackHandler);
        }
        if (imageHydrationRoot && imagePriorityScrollEndHandler) {
            imageHydrationRoot.removeEventListener('scrollend', imagePriorityScrollEndHandler);
        }
        if (imagePriorityRefreshRaf) {
            window.cancelAnimationFrame(imagePriorityRefreshRaf);
            imagePriorityRefreshRaf = 0;
        }
        if (imagePriorityRefreshTimer) {
            window.clearTimeout(imagePriorityRefreshTimer);
            imagePriorityRefreshTimer = 0;
        }
        imageHydrationRoot = null;
        imageHydrationFallbackHandler = null;
        imagePriorityScrollEndHandler = null;
    }

    function stopProgressiveItemImages({
        releaseLoaded = false,
        retainLoaded = null,
        preserveRetainedRequests = false,
    } = {}) {
        imageHydrationRun += 1;
        imageRevealRun += 1;
        disconnectProductImageObserver();
        imageHydrationQueue.length = 0;
        imageHydrationQueued.clear();
        imagePriorityWindow.clear();
        imageDecodedRecency.clear();

        activeImageHydrations.forEach((request, img) => {
            if (preserveRetainedRequests && retainLoaded instanceof Set && retainLoaded.has(img)) {
                request.run = imageHydrationRun;
                return;
            }
            // Removing src is the only browser-level cancellation available
            // for an <img>; browsers may still finish a response already in
            // flight, but it will no longer decode or paint into this panel.
            cancelProductImageRequest(img, { deferDrain: true });
            img.removeAttribute('fetchpriority');
            img.loading = 'lazy';
            img.closest('.doll-wishlist-media')?.classList.add('dwl-media-pending');
        });
        panel?.querySelectorAll('.doll-wishlist-product-img').forEach(img => {
            delete img.dataset.dwlObservedNear;
        });

        if (releaseLoaded || retainLoaded instanceof Set) {
            panel?.querySelectorAll('.doll-wishlist-product-img[src]').forEach(img => {
                if (!releaseLoaded && retainLoaded.has(img)) return;
                cancelProductImageRequest(img, { deferDrain: true });
                img.removeAttribute('src');
                img.removeAttribute('fetchpriority');
                img.loading = 'lazy';
                img.closest('.doll-wishlist-media')?.classList.add('dwl-media-pending');
            });
        }
    }

    function rectsOverlap(rect, rootRect) {
        return rect.bottom > rootRect.top
            && rect.top < rootRect.bottom
            && rect.right > rootRect.left
            && rect.left < rootRect.right;
    }

    function getHydratableProductImages(body) {
        if (!body) return [];
        return Array.from(body.querySelectorAll('.doll-wishlist-product-img[data-src]'));
    }

    function freezeMasonryProductGeometry(img, measuredRect = null) {
        if (wishlistViewMode !== 'masonry' || !img) return;
        const media = img.closest('.doll-wishlist-media');
        if (!media || media.classList.contains('dwl-media-frozen')) return;
        const rect = measuredRect || media.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        media.style.setProperty('--dwl-frozen-image-ratio', `${rect.width} / ${rect.height}`);
        media.classList.add('dwl-media-frozen');
    }

    function getPriorityProductImages(body, { atStart = false } = {}) {
        if (!body) return [];
        const root = wishlistViewMode === 'grid'
            ? body.querySelector('.doll-wishlist-scroll')
            : body;
        const productImages = getHydratableProductImages(body);
        if (!productImages.length || !root) return [];
        const rootRect = root.getBoundingClientRect();
        const shiftX = atStart ? Math.max(0, root.scrollLeft) : 0;
        const shiftY = atStart ? Math.max(0, root.scrollTop) : 0;
        const entries = productImages.map((img, index) => {
            const rect = img.getBoundingClientRect();
            return {
                img,
                index,
                rect: {
                    top: rect.top + shiftY,
                    bottom: rect.bottom + shiftY,
                    left: rect.left + shiftX,
                    right: rect.right + shiftX,
                }
            };
        });
        const visibleEntries = entries.filter(entry => rectsOverlap(entry.rect, rootRect));
        const visibleSet = new Set(visibleEntries.map(entry => entry.img));
        const horizontal = wishlistViewMode === 'grid';
        const candidates = entries.filter(entry => !visibleSet.has(entry.img) && (horizontal
            ? entry.rect.left >= rootRect.right - 1
            : entry.rect.top >= rootRect.bottom - 1));
        candidates.sort((a, b) => {
            const aDistance = horizontal
                ? Math.max(0, a.rect.left - rootRect.right)
                : Math.max(0, a.rect.top - rootRect.bottom);
            const bDistance = horizontal
                ? Math.max(0, b.rect.left - rootRect.right)
                : Math.max(0, b.rect.top - rootRect.bottom);
            if (aDistance !== bDistance) return aDistance - bDistance;
            if (horizontal && a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
            if (!horizontal && a.rect.top !== b.rect.top) return a.rect.top - b.rect.top;
            if (a.rect.top !== b.rect.top) return a.rect.top - b.rect.top;
            if (a.rect.left !== b.rect.left) return a.rect.left - b.rect.left;
            return a.index - b.index;
        });

        if (!visibleEntries.length) {
            return entries
                .sort((a, b) => horizontal
                    ? (a.rect.left - b.rect.left || a.rect.top - b.rect.top || a.index - b.index)
                    : (a.rect.top - b.rect.top || a.rect.left - b.rect.left || a.index - b.index))
                .slice(0, IMAGE_INITIAL_EXTRA_COUNT)
                .map(entry => entry.img);
        }
        return [
            ...visibleEntries.map(entry => entry.img),
            ...candidates.slice(0, IMAGE_INITIAL_EXTRA_COUNT).map(entry => entry.img),
        ];
    }

    function preemptLowPriorityHydrations(nextPriorityWindow) {
        const urgentImages = Array.from(nextPriorityWindow).filter(img => {
            if (!String(img.dataset.src || '').trim()) return false;
            if (img.complete && img.naturalWidth) return false;
            return !activeImageHydrations.has(img);
        });
        let slotsNeeded = urgentImages.length
            - Math.max(0, IMAGE_HYDRATE_CONCURRENCY - activeImageHydrations.size);
        if (slotsNeeded <= 0) return;

        for (const [img] of activeImageHydrations) {
            if (slotsNeeded <= 0) break;
            if (nextPriorityWindow.has(img)) continue;
            cancelProductImageRequest(img, { deferDrain: true });
            img.closest('.doll-wishlist-media')?.classList.add('dwl-media-pending');
            slotsNeeded -= 1;
        }
    }

    function trimDecodedProductImageCache(body) {
        if (!body || !isWishlistPanelVisible()) return;
        const loadedImages = getHydratableProductImages(body).filter(img => (
            img.hasAttribute('src') && img.complete && img.naturalWidth
        ));
        const protectedImages = new Set(loadedImages.filter(img => (
            imagePriorityWindow.has(img) || img.dataset.dwlObservedNear === 'true'
        )));
        const cacheLimit = Math.max(IMAGE_DECODE_CACHE_LIMIT, protectedImages.size);
        if (loadedImages.length <= cacheLimit) return;
        loadedImages
            .filter(img => !protectedImages.has(img))
            .sort((a, b) => (imageDecodedRecency.get(a) || 0) - (imageDecodedRecency.get(b) || 0))
            .slice(0, loadedImages.length - cacheLimit)
            .forEach(img => releaseOffscreenProductImage(img, {
                deferDrain: true,
                force: true,
            }));
    }

    function refreshProductImagePriorityWindow(body) {
        if (!body || !isWishlistPanelVisible()) return new Set();
        const productImages = getHydratableProductImages(body);
        const nextPriorityWindow = new Set(getPriorityProductImages(body));
        imagePriorityWindow.clear();
        nextPriorityWindow.forEach(img => imagePriorityWindow.add(img));
        nextPriorityWindow.forEach(img => {
            if (img.hasAttribute('src') && img.complete && img.naturalWidth) {
                imageDecodedRecency.set(img, performance.now());
            }
        });
        // Rebuild the not-yet-started queue atomically for the new viewport.
        // Otherwise a card that used to be high priority can keep that stale
        // rank after a fast scroll and jump ahead of the newly visible cards.
        imageHydrationQueue.length = 0;
        imageHydrationQueued.clear();
        preemptLowPriorityHydrations(nextPriorityWindow);

        productImages.forEach(img => {
            if (imagePriorityWindow.has(img)) {
                queueProductImage(img, 'high', { deferDrain: true });
            } else if (img.dataset.dwlObservedNear === 'true'
                && !body.classList.contains('dwl-images-preparing')) {
                queueProductImage(img, 'low', { deferDrain: true });
            } else {
                releaseOffscreenProductImage(img, { deferDrain: true });
            }
        });
        trimDecodedProductImageCache(body);
        drainProductImageQueue();
        return nextPriorityWindow;
    }

    function scheduleProductImagePriorityRefresh(body, delayMs = 0) {
        if (!body || !isWishlistPanelVisible()) return;
        if (delayMs > 0) {
            window.clearTimeout(imagePriorityRefreshTimer);
            imagePriorityRefreshTimer = window.setTimeout(() => {
                imagePriorityRefreshTimer = 0;
                scheduleProductImagePriorityRefresh(body);
            }, delayMs);
            return;
        }
        if (imagePriorityRefreshTimer) {
            window.clearTimeout(imagePriorityRefreshTimer);
            imagePriorityRefreshTimer = 0;
        }
        if (imagePriorityRefreshRaf) return;
        imagePriorityRefreshRaf = window.requestAnimationFrame(() => {
            imagePriorityRefreshRaf = 0;
            refreshProductImagePriorityWindow(body);
        });
    }

    function setupProgressiveItemImages(body) {
        const run = imageHydrationRun;
        const productImages = getHydratableProductImages(body);
        if (!productImages.length) return;

        productImages.forEach(img => {
            delete img.dataset.dwlFailed;
        });
        // Read every masonry rectangle first, then write every frozen ratio.
        // Interleaving a layout read and class/style write 30 times can force
        // repeated synchronous layouts on iPhone before the panel even opens.
        if (wishlistViewMode === 'masonry') {
            const unfrozenImages = productImages.filter(img => (
                !img.closest('.doll-wishlist-media')?.classList.contains('dwl-media-frozen')
            ));
            const measurements = unfrozenImages.map(img => ({
                img,
                rect: img.closest('.doll-wishlist-media')?.getBoundingClientRect() || null,
            }));
            measurements.forEach(({ img, rect }) => freezeMasonryProductGeometry(img, rect));
        }

        imageHydrationRoot = wishlistViewMode === 'grid'
            ? body.querySelector('.doll-wishlist-scroll')
            : body;
        if (!imageHydrationRoot) return;

        // Use the real laid-out viewport, never a fixed "first four" guess.
        // Every card actually visible at this screen height is high priority,
        // followed by exactly two more cards in the forward scroll direction.
        refreshProductImagePriorityWindow(body);
        imagePriorityScrollEndHandler = () => scheduleProductImagePriorityRefresh(body);
        imageHydrationRoot.addEventListener('scrollend', imagePriorityScrollEndHandler, { passive: true });
        if (typeof window.IntersectionObserver === 'function') {
            imageHydrationObserver = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    const img = entry.target;
                    if (entry.isIntersecting) {
                        img.dataset.dwlObservedNear = 'true';
                        if (body.classList.contains('dwl-images-preparing')
                            && !imagePriorityWindow.has(img)) return;
                        queueProductImage(img);
                        return;
                    }
                    delete img.dataset.dwlObservedNear;
                    releaseOffscreenProductImage(img);
                });
            }, {
                root: imageHydrationRoot,
                rootMargin: `${IMAGE_HYDRATE_MARGIN_PX}px`,
                threshold: 0.01,
            });
            // Keep observing after a load: when a card moves well outside the
            // scroll root, release its decoded original and rehydrate it only
            // if the visitor comes back. This bounds a full 30-card traversal.
            productImages.forEach(img => imageHydrationObserver.observe(img));
            return;
        }

        // Old Safari fallback: scan only the nearby portion on scroll rather
        // than degrading to assigning every URL at once.
        imageHydrationFallbackHandler = () => {
            if (run !== imageHydrationRun || !imageHydrationRoot) return;
            const rootRect = imageHydrationRoot.getBoundingClientRect();
            productImages.forEach(img => {
                const rect = img.getBoundingClientRect();
                const nearby = rect.bottom >= rootRect.top - IMAGE_HYDRATE_MARGIN_PX
                    && rect.top <= rootRect.bottom + IMAGE_HYDRATE_MARGIN_PX
                    && rect.right >= rootRect.left - IMAGE_HYDRATE_MARGIN_PX
                    && rect.left <= rootRect.right + IMAGE_HYDRATE_MARGIN_PX;
                if (nearby) img.dataset.dwlObservedNear = 'true';
                else delete img.dataset.dwlObservedNear;
                if (nearby) {
                    if (!body.classList.contains('dwl-images-preparing')
                        || imagePriorityWindow.has(img)) queueProductImage(img);
                }
                else releaseOffscreenProductImage(img);
            });
        };
        imageHydrationRoot.addEventListener('scroll', imageHydrationFallbackHandler, { passive: true });
        window.addEventListener('resize', imageHydrationFallbackHandler, { passive: true });
        imageHydrationFallbackHandler();
    }

    function markAtomicProductImageFailed(img, url) {
        if (!(img instanceof HTMLImageElement)) return;
        if (url) img.dataset.dwlFailed = url;
        img.removeAttribute('src');
        img.removeAttribute('fetchpriority');
        img.loading = 'lazy';
        img.closest('.doll-wishlist-media')
            ?.classList.add('dwl-media-pending', 'dwl-media-error');
    }

    function loadAndDecodeAtomicProductImage(img, run) {
        const url = String(img?.dataset?.src || '').trim();
        if (!(img instanceof HTMLImageElement) || !url) {
            markAtomicProductImageFailed(img, url);
            return Promise.resolve();
        }

        return new Promise(resolve => {
            let settled = false;
            let timeoutId = 0;

            const cleanup = () => {
                if (timeoutId) window.clearTimeout(timeoutId);
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
                atomicImageWaitCancels.delete(cancelWait);
                delete img.dataset.dwlLoading;
            };
            const finish = async loaded => {
                if (settled) return;
                settled = true;
                cleanup();

                if (run !== itemsLoadRun) {
                    resolve();
                    return;
                }
                if (!loaded || !img.naturalWidth || !img.naturalHeight) {
                    markAtomicProductImageFailed(img, url);
                    resolve();
                    return;
                }

                let decoded = true;
                if (typeof img.decode === 'function') {
                    try {
                        await withTimeout(img.decode(), IMAGE_DECODE_TIMEOUT_MS);
                    } catch (error) {
                        decoded = false;
                    }
                }
                if (run === itemsLoadRun) {
                    if (decoded) applyProductImageDimensions(img, url);
                    else markAtomicProductImageFailed(img, url);
                }
                resolve();
            };
            const onLoad = () => { void finish(true); };
            const onError = () => { void finish(false); };
            const cancelWait = () => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve();
            };

            atomicImageWaitCancels.add(cancelWait);
            img.addEventListener('load', onLoad, { once: true });
            img.addEventListener('error', onError, { once: true });
            img.dataset.dwlLoading = '1';
            img.loading = 'eager';
            try { img.fetchPriority = 'high'; } catch (error) {}
            timeoutId = window.setTimeout(onError, IMAGE_HYDRATE_TIMEOUT_MS);
            img.src = url;

            // Cached images can become complete synchronously in Safari.
            if (img.complete) {
                Promise.resolve().then(() => {
                    void finish(Boolean(img.naturalWidth && img.naturalHeight));
                });
            }
        });
    }

    async function loadAndDecodeAllWishlistImages(body, run) {
        const productImages = getHydratableProductImages(body);
        if (!productImages.length) return;
        let cursor = 0;
        let deadlineReached = false;
        const worker = async () => {
            while (!deadlineReached && run === itemsLoadRun && cursor < productImages.length) {
                const image = productImages[cursor];
                cursor += 1;
                await loadAndDecodeAtomicProductImage(image, run);
            }
        };
        const workerCount = Math.min(IMAGE_HYDRATE_CONCURRENCY, productImages.length);
        const workers = Promise.all(Array.from({ length: workerCount }, () => worker()));
        let deadlineTimer = 0;
        await Promise.race([
            workers,
            new Promise(resolve => {
                deadlineTimer = window.setTimeout(() => {
                    deadlineReached = true;
                    resolve();
                }, WISHLIST_MEDIA_PREPARE_TIMEOUT_MS);
            }),
        ]);
        if (deadlineTimer) window.clearTimeout(deadlineTimer);
        if (deadlineReached && run === itemsLoadRun) {
            cancelAtomicImageWaits();
            productImages.forEach(img => {
                if (img.closest('.doll-wishlist-media')?.classList.contains('dwl-media-pending')) {
                    markAtomicProductImageFailed(img, String(img.dataset.src || '').trim());
                }
            });
            await workers;
        }
    }

    function cancelAtomicImageWaits() {
        Array.from(atomicImageWaitCancels).forEach(cancel => cancel());
        atomicImageWaitCancels.clear();
    }

    function revealPreparedWishlistBody(body, run) {
        if (run !== itemsLoadRun || !isWishlistPanelVisible() || !body?.isConnected) return false;
        body.querySelector('.dwl-initial-image-loader')?.remove();
        body.classList.remove('dwl-images-preparing');
        void body.offsetWidth;
        body.classList.add('dwl-ready-in');
        window.setTimeout(() => {
            if (run === itemsLoadRun) body?.classList.remove('dwl-ready-in');
        }, 360);
        return true;
    }

    function prepareWishlistImageReveal(body, existingLoader = null) {
        if (!body) return;
        body.classList.add('dwl-images-preparing');
        body.querySelector('.dwl-initial-image-loader:not(.dwl-wishlist-loading-only)')?.remove();
        const loader = existingLoader || document.createElement('div');
        loader.classList.add('dwl-initial-image-loader');
        if (!existingLoader) {
            loader.innerHTML = renderLoadingState();
            body.prepend(loader);
        }
    }

    function injectStyles() {
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            :root {
                /* Declared at :root, not on .doll-wishlist-panel, because the
                   preview lightbox overlay is appended as a document.body
                   sibling of the panel (not a descendant) — a panel-scoped
                   custom property would never reach it, silently falling
                   back to a mismatched cursive font on old iOS. */
                --dwl-sans: "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;
                --dwl-cute: "Chalkboard SE", "Comic Sans MS", "Segoe Print", cursive;
            }
            .doll-wishlist-panel {
                --dwl-ink: #663b4b;
                --dwl-pink: #f47fad;
                --dwl-line: rgba(239, 183, 204, 0.72);
                position: absolute;
                top: var(--open-surface-top, -14px);
                left: 50%;
                width: min(88vw, 324px);
                transform: translateX(-50%) translateY(-7px) scale(0.988);
                transform-origin: 50% 0;
                opacity: 0;
                pointer-events: none;
                /* Matches .note-peel-target's own hide/show timing (0.46s
                   opacity / 0.42s transform) so the note and this panel
                   cross-fade in lockstep instead of at mismatched speeds
                   (which reads as a glitch/double-image when swapping). */
                transition: opacity 0.46s ease, transform 0.42s cubic-bezier(0.2, 0.9, 0.25, 1);
                will-change: opacity, transform;
                z-index: 9;
            }

            .doll-wishlist-panel.active {
                opacity: 1;
                pointer-events: auto;
                transform: translateX(-50%) translateY(0) scale(1);
            }

            .doll-wishlist-panel.dwl-measure-open {
                transform: translateX(-50%) translateY(0) scale(1);
                transition: none;
            }

            body.has-wishlist-panel-open {
                overflow-x: hidden;
                overflow-y: auto;
            }

            body.has-wishlist-panel-open .toggle-container {
                min-height: var(--dwl-wishlist-height, 220px);
                transition: min-height 0.42s cubic-bezier(0.2, 0.9, 0.25, 1);
            }

            /* !important because a short-viewport rule in styles.css
               (@media max-height:720px) also sets .site-brand-footer's
               margin-top, and this needs to win unconditionally so the
               throne.com pill always sits tight under the panel, never
               inheriting that rule's much larger gap. The scroll body grows
               to fill tall screens now (--panel-fill-max, setPanelFillMax in
               script.js), so the pill just hugs the panel bottom -- no
               viewport-based push. */
            body.has-wishlist-panel-open .site-brand-footer {
                margin-top: 10px !important;
            }

            body.has-wishlist-panel-open .toggle-container {
                /* Wishlist reclaims 38px of icon-row height plus 7px of its
                   9px expanded gap. Its final viewport allocates that same
                   45px once, keeping checkout/footer stationary as content
                   is revealed upward. */
                --dwl-collapse-distance: 45px;
            }

            .doll-wishlist-throne-footer-link {
                display: none !important;
            }
            body.has-wishlist-panel-open #site-brand-button {
                display: none !important;
            }
            body.has-wishlist-panel-open .site-brand-footer .doll-wishlist-throne-footer-link {
                display: inline-flex !important;
            }
            /* The "com" of "throne.com" wears the SAME pale rounded badge
               that doll.gg's own "gg" does (.site-brand-gg in styles.css), so
               the two footer pills read as one matched pair — same pale look,
               shared visual language. (It was briefly reset to flat text; the
               "disjointed floating chip" that motivated that was really the
               stale reserved-height position jump — fixed separately via
               dollSyncWishlistReservedHeight. With the pill steady, the pale
               chip sits clean.) Just keep it from wrapping. */
            .doll-wishlist-throne-footer-link .site-brand-gg {
                margin-left: 1px;
                white-space: nowrap;
            }
            .doll-wishlist-throne-footer-link {
                position: relative;
                /* Wide enough that the "com" chip has doll.gg's same easy
                   breathing room, never clipped by the overflow:hidden below
                   (which exists for the swipe-hint width tween). */
                width: 108px;
                justify-content: center;
                overflow: hidden;
                transition: width 0.26s cubic-bezier(0.2, 0.84, 0.24, 1), color 0.2s ease;
            }
            .doll-wishlist-footer-brand,
            .doll-wishlist-footer-hint {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.2, 0.84, 0.24, 1);
            }
            .doll-wishlist-footer-hint {
                position: absolute;
                inset: 0;
                gap: 7px;
                opacity: 0;
                pointer-events: none;
                transform: translateY(4px);
            }
            .doll-wishlist-throne-footer-link.is-swipe-hint {
                width: 118px;
                padding-inline: 9px 7px;
                color: rgba(153, 73, 105, 0.88);
                cursor: default;
            }
            .doll-wishlist-throne-footer-link.is-swipe-hint .doll-wishlist-footer-brand {
                opacity: 0;
                transform: translateY(-4px);
            }
            .doll-wishlist-throne-footer-link.is-swipe-hint .doll-wishlist-footer-hint {
                opacity: 1;
                transform: translateY(0);
            }
            .doll-wishlist-footer-swipe-copy {
                white-space: nowrap;
            }
            .doll-wishlist-footer-swipe-arrow {
                display: grid;
                place-items: center;
                flex: 0 0 20px;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: linear-gradient(180deg, rgba(255, 188, 218, 0.9), rgba(244, 128, 178, 0.88));
                color: #fff;
                font-family: var(--dwl-sans);
                font-size: 14px;
                line-height: 1;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.58);
                animation: dollWishlistSwipeNudge 1.15s ease-in-out infinite;
            }
            .doll-wishlist-body {
                position: relative;
            }
            .doll-wishlist-scroll-shell {
                position: relative;
            }
            /* List/masonry can hold many more items than the paged grid
               ever showed at once, so without a cap the whole panel (and
               the page space reserved for it, see syncReservedHeight)
               would grow to fit every item — pushing the checkout bar
               further down the more things are on the wishlist, exactly
               backwards from what a shopping list needs. Capping the body
               and scrolling *inside* it keeps checkout always one short
               reach away, right under the visible items, no matter how
               long the list is. */
            .doll-wishlist-body.dwl-scroll-body {
                max-height: max(380px, var(--panel-fill-max, 0px));
                overflow-y: auto;
                overflow-x: hidden;
                overscroll-behavior-y: contain;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
            }
            .doll-wishlist-body.dwl-scroll-body::-webkit-scrollbar { display: none; }

            .doll-wishlist-scroll {
                display: flex;
                gap: ${CARD_GAP}px;
                overflow-x: auto;
                overflow-y: hidden;
                scroll-snap-type: x mandatory;
                scroll-padding-inline: 1px;
                overscroll-behavior-x: contain;
                -webkit-overflow-scrolling: touch;
                padding: 5px 7px 15px;
                margin: 0;
                scrollbar-width: none;
            }
            .doll-wishlist-scroll::-webkit-scrollbar { display: none; }

            .doll-wishlist-page {
                flex: 0 0 100%;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                grid-template-rows: repeat(2, auto);
                align-items: stretch;
                align-self: flex-start;
                gap: ${CARD_GAP}px;
                min-width: 0;
                padding: 1px 2px;
                scroll-snap-align: start;
                scroll-snap-stop: always;
            }

            /* If a page ends up with an odd tile count (only possible on the
               final page), its last tile would otherwise sit alone with a
               blank cell beside it — span the full row instead. */
            .doll-wishlist-page > :last-child:nth-child(odd) {
                grid-column: 1 / -1;
            }

            /* The other two wishlist layouts, alongside the paged grid
               above — which one renders is driven by the admin-configurable
               wishlist_view_mode setting (see applyWishlistViewModeSetting). */
            .doll-wishlist-list {
                display: flex;
                flex-direction: column;
                gap: ${CARD_GAP}px;
                padding: 5px 8px 15px;
            }

            .doll-wishlist-masonry {
                columns: 2;
                column-gap: ${CARD_GAP}px;
                padding: 9px 8px 15px;
            }

            .doll-wishlist-item {
                position: relative;
                display: flex;
                flex-direction: column;
                width: 100%;
                min-width: 0;
                padding: 3px;
                background: linear-gradient(180deg, #fffefe 0%, #fff9fb 70%, #fff6fa 100%);
                border: 1px solid var(--dwl-line);
                border-radius: 18px;
                box-shadow:
                    inset 0 0 0 2px rgba(255, 255, 255, 0.92),
                    0 5px 12px rgba(177, 92, 124, 0.08),
                    0 1px 2px rgba(142, 76, 99, 0.06);
                transform: translateZ(0);
                transition: border-color 0.2s ease, transform 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }
            /* .doll-wishlist-media already clips the photo itself (it has
               its own overflow:hidden + rounded corners below), so the card
               no longer needs overflow:hidden of its own — freeing it up
               lets the selected-glow ring bloom outward past the border
               instead of being clipped flush against it. */

            .doll-wishlist-body.dwl-ready-in {
                animation: dollWishlistContentIn 0.32s cubic-bezier(0.2, 0.82, 0.24, 1) both;
            }

            /* The real cards exist only so their final images can load and
               decode. Keep them completely hidden until the whole set settles;
               the visitor sees one harmonized paw state, never partial cards. */
            .doll-wishlist-body.dwl-images-preparing > :not(.dwl-initial-image-loader) {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }
            .doll-wishlist-body.dwl-images-preparing {
                height: clamp(170px, 38vh, 300px);
                min-height: clamp(170px, 38vh, 300px);
                overflow: hidden !important;
            }
            .dwl-initial-image-loader {
                position: absolute;
                inset: 0;
                z-index: 20;
                display: grid;
                place-items: center;
                width: 100%;
                height: 100%;
                overflow: visible;
                background: transparent;
                pointer-events: none;
            }
            .dwl-fetch-loader {
                position: absolute;
                inset: 0;
                z-index: 20;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                overflow: visible;
                background: transparent;
                pointer-events: none;
            }
            .dwl-wishlist-loading-only {
                min-height: clamp(170px, 38vh, 300px);
                height: clamp(170px, 38vh, 300px);
                box-sizing: border-box;
                display: grid;
                place-items: center;
                width: 100%;
                padding: 12px 0;
            }
            .dwl-wishlist-loading-only .dwl-wishlist-fetch-state {
                width: 100%;
                margin: 0;
            }
            .dwl-initial-image-loader .dwl-wishlist-fetch-state {
                width: 100%;
                margin: 0;
                transform: none;
            }
            .dwl-fetch-loader .dwl-wishlist-fetch-state {
                width: 100%;
                margin: 0;
                transform: translateY(clamp(28px, 12vh, 82px));
            }

            @keyframes dollWishlistContentIn {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .doll-wishlist-item.selected {
                border-color: rgba(235, 107, 157, 0.86);
                transform: translateY(-2px) rotate(var(--dwl-tilt, 0deg));
            }

            /* The glow is a real child element (not a pseudo-element, and
               NOT an outward-blooming ring past the card's own edge — both
               earlier approaches here were wrong). It's sized to exactly
               match the card (same inset:0, same 18px radius as the card
               itself — no enlarged/offset radius to get subtly wrong), so a
               background on it is clipped to that exact rounded shape by
               the browser natively, with zero approximation: browsers clip
               background to border-radius exactly, unlike a blurred
               box-shadow (which Gaussian-diffuses the corner and visibly
               flattens it at small radii — that was the real cause of the
               "squarish" look before). It sits above the photo (z-index: 2,
               below the burst's z-index: 3) so the glow is genuinely visible
               across the whole card face, but its radial-gradient is
               transparent through the middle so it reads as a glow hugging
               the rounded edge, not a haze over the photo. A crisp inset
               ring (also naturally exact to the same border-radius) adds a
               defined edge on top of the soft wash. It fades in timed to the
               heart-burst (below) reaching the edge, plays one bright
               "ignite" flare, then settles into a steady pulse. */
            .dwl-glow {
                position: absolute;
                inset: 0;
                z-index: 2;
                border-radius: 18px;
                opacity: 0;
                pointer-events: none;
                background: radial-gradient(ellipse at center, transparent 52%, rgba(255, 141, 193, 0.4) 100%);
                box-shadow: inset 0 0 0 1.5px rgba(255, 179, 209, 0.65);
                transition: opacity 0.22s ease;
            }
            .doll-wishlist-item.selected .dwl-glow {
                animation:
                    dollWishlistGlowIgnite 0.32s ease-out 0.38s both,
                    dollWishlistGlowPulse 3s ease-in-out 0.7s infinite;
            }
            @keyframes dollWishlistGlowIgnite {
                0%   { opacity: 0; }
                55%  { opacity: 0.85; }
                100% { opacity: 0.52; }
            }
            @keyframes dollWishlistGlowPulse {
                0%, 100% { opacity: 0.52; }
                50%      { opacity: 0.78; }
            }

            /* A soft glowing burst blooms out from the heart button the
               instant an item is picked, clipped into an actual heart
               silhouette (via mask-image, referencing the same HEART_PATH
               used for the heart icon) rather than a plain circle or a flat
               solid-fill heart — the mask clips the shape while the
               background underneath stays a soft radial gradient, so it's
               heart-shaped AND still reads as a glow, not a hard vector blob.
               It lives on a real child element wrapped in its own
               card-shaped clipping layer, so it can never spill past the
               card's rounded corners. It grows fast, holds bright and large
               enough to wash gently over the whole card for a beat, then
               fades — timed to finish just as the border glow (above) begins
               igniting, so the burst's light visually "hands off" to it. */
            .dwl-burst-clip {
                position: absolute;
                inset: 0;
                border-radius: 18px;
                overflow: hidden;
                pointer-events: none;
                z-index: 3;
            }
            .dwl-burst {
                position: absolute;
                right: 9px;
                bottom: 8px;
                width: 17px;
                height: 17px;
                opacity: 0;
                transform: scale(0);
                transform-origin: 78% 78%;
                background: radial-gradient(circle at 50% 42%, rgba(255, 255, 255, 0.98) 0%, rgba(255, 200, 224, 0.95) 32%, rgba(255, 150, 199, 0.55) 62%, rgba(255, 150, 199, 0) 78%);
                -webkit-mask-image: ${HEART_MASK_URL};
                -webkit-mask-size: 100% 100%;
                -webkit-mask-repeat: no-repeat;
                mask-image: ${HEART_MASK_URL};
                mask-size: 100% 100%;
                mask-repeat: no-repeat;
                pointer-events: none;
            }
            .doll-wishlist-item.selected .dwl-burst {
                animation: dollWishlistBurst 0.5s cubic-bezier(0.22, 0.7, 0.2, 1) both;
            }
            @keyframes dollWishlistBurst {
                0%   { opacity: 0;    transform: scale(0); }
                12%  { opacity: 0.48; transform: scale(2); }
                45%  { opacity: 0.42; transform: scale(15); }
                100% { opacity: 0;    transform: scale(17); }
            }

            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-item.selected .dwl-glow {
                    animation: none;
                    transition: opacity 0.15s ease;
                    opacity: 0.6;
                }
                .doll-wishlist-item.selected .dwl-burst {
                    animation: none;
                    opacity: 0;
                }
            }

            .doll-wishlist-media {
                position: relative;
                width: 100%;
                aspect-ratio: 11 / 8;
                overflow: hidden;
                border-radius: 14px 14px 8px 8px;
                background:
                    radial-gradient(circle at 48% 38%, rgba(255, 255, 255, 0.9), transparent 48%),
                    #fce8f0;
                box-shadow: inset 0 0 0 1px rgba(245, 205, 220, 0.5);
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }
            .doll-wishlist-media:active img {
                transform: scale(1.04);
            }
            .doll-wishlist-media::after {
                content: "";
                position: absolute;
                inset: 0;
                pointer-events: none;
                background:
                    linear-gradient(145deg, rgba(255, 255, 255, 0.18), transparent 34%),
                    linear-gradient(0deg, rgba(98, 35, 58, 0.055), transparent 28%);
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.34);
            }
            .doll-wishlist-media img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center;
                display: block;
                opacity: 1;
                transition: transform 0.36s cubic-bezier(0.2, 0.82, 0.24, 1), filter 0.3s ease, opacity 0.2s ease;
            }
            .doll-wishlist-media.dwl-media-pending {
                aspect-ratio: var(--dwl-image-ratio, 11 / 8);
            }
            .doll-wishlist-media.dwl-media-pending img {
                opacity: 0;
            }
            .doll-wishlist-media.dwl-media-error {
                background:
                    radial-gradient(circle at 48% 38%, rgba(255, 255, 255, 0.92), transparent 48%),
                    rgba(255, 214, 235, 0.72);
            }
            .doll-wishlist-media.dwl-media-error::before {
                content: "♡";
                position: absolute;
                inset: 0;
                z-index: 1;
                display: grid;
                place-items: center;
                color: rgba(125, 104, 113, 0.54);
                font-family: var(--dwl-cute);
                font-size: 22px;
                line-height: 1;
            }

            /* Title and price are a plain, tight text stack — two lines,
               one small consistent gap between them — completely decoupled
               from the heart button's size (see .doll-wishlist-cart-btn
               below, which is absolutely positioned in the corner instead
               of sharing a flex row with either line). Every earlier
               version of this put the heart IN a flex row alongside a much
               shorter text line, and no matter how that row's alignment was
               tuned, the row's own height still had to equal the heart's
               height — which always left some awkward dead space around
               the shorter sibling. Taking the heart out of the flow
               entirely removes that whole category of bug: the text stack
               can be as tight as the text itself needs, and the heart can
               be any size without stretching or repositioning anything. */
            .doll-wishlist-info {
                display: flex;
                flex-direction: column;
                gap: 3px;
                margin: 5px 7px 7px 7px;
                padding-right: 34px;
            }
            .doll-wishlist-name {
                min-width: 0;
                margin: 0;
                font-family: var(--dwl-cute);
                font-size: 11.25px;
                font-weight: 500;
                color: var(--dwl-ink);
                line-height: 1.2;
                letter-spacing: 0.01em;
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            /* Long titles get a one-way scrolling loop: hold at the start,
               scroll left at a constant speed to reveal the end, pause a
               beat, then fade out, snap back to the start while invisible,
               and fade back in — reads as a seamless loop instead of a
               back-and-forth bounce. The exact keyframe percentages are
               generated per-title in JS (see syncTitleMarquees) since each
               title needs a different scroll-to-pause ratio to keep the
               pause a real, fixed ~1s regardless of how long the scroll is;
               this rule just supplies the shared, non-title-specific parts. */
            .doll-wishlist-name.dwl-marquee,
            .doll-wishlist-preview-name.dwl-marquee {
                -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);
                mask-image: linear-gradient(90deg, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);
            }
            .doll-wishlist-name.dwl-marquee > span,
            .doll-wishlist-preview-name.dwl-marquee > span {
                display: inline-block;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                will-change: transform, opacity;
            }
            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-name.dwl-marquee,
                .doll-wishlist-preview-name.dwl-marquee {
                    -webkit-mask-image: none;
                    mask-image: none;
                }
                .doll-wishlist-name.dwl-marquee > span,
                .doll-wishlist-preview-name.dwl-marquee > span {
                    animation: none;
                    display: inline;
                }
            }

            /* Plain price text on the grid card — selecting an item is the
               heart button's job alone; the price is just informational
               here. The price pill below (.doll-wishlist-price-tag) is only
               used in the preview lightbox, as its own clickable control
               there. Just the second line of .doll-wishlist-info now, no
               wrapper row of its own needed. */
            .doll-wishlist-price {
                display: block;
                min-width: 0;
                text-align: left;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-family: var(--dwl-sans);
                font-size: 12px;
                font-weight: 700;
                color: #7b304a;
                line-height: 1;
                letter-spacing: -0.01em;
            }

            /* The preview title is plain text (see .doll-wishlist-preview-name
               below), so this tag is the single, unambiguous control in the
               caption — the only thing that looks like a button gets to be
               one. Solid pill using the site's real glass-pink tokens (the
               earlier clip-path notch read as noise at 13px), with a real
               dark drop shadow so it stays legible sitting directly on the
               blurred backdrop. Heart glyph crossfades outline -> filled
               exactly like .doll-wishlist-cart-btn (same HEART_PATH, same
               dollWishlistHeartIn keyframe), so selecting from the tag or
               the grid card reads as the same action. It has no
               .doll-wishlist-item ancestor here, so its selected look is
               driven by an explicit .is-selected class rather than a
               parent rule. */
            .doll-wishlist-price-tag {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(to right, #fdeef5, #ffdbee);
                border: 1px solid rgba(255, 199, 222, 0.6);
                border-radius: 999px;
                padding: 8px 18px;
                color: #7b304a;
                font-family: var(--dwl-sans, "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif);
                font-size: 13.5px;
                font-weight: 800;
                letter-spacing: -0.01em;
                cursor: pointer;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3), 0 2px 7px rgba(255, 145, 195, 0.2);
                transition: transform 0.16s cubic-bezier(0.2, 0.8, 0.25, 1.25), background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
                -webkit-tap-highlight-color: transparent;
            }
            .doll-wishlist-price-tag svg { width: 13px; height: 13px; display: block; flex: 0 0 auto; }
            .doll-wishlist-price-tag .dwl-heart-filled { display: none; }
            .doll-wishlist-price-tag:active {
                transform: scale(0.92);
            }
            .doll-wishlist-price-tag.is-selected {
                background: linear-gradient(to right, #f5527f, #ff8bb3);
                color: #fff;
                box-shadow: 0 8px 18px rgba(237, 88, 143, 0.4), 0 2px 7px rgba(255, 145, 195, 0.2);
                animation: dollWishlistTagPop 0.32s cubic-bezier(0.2, 0.85, 0.25, 1.35);
            }
            .doll-wishlist-price-tag.is-selected .dwl-heart { display: none; }
            .doll-wishlist-price-tag.is-selected .dwl-heart-filled {
                display: block;
                animation: dollWishlistHeartIn 0.32s cubic-bezier(0.2, 0.85, 0.25, 1.35);
            }
            @keyframes dollWishlistTagPop {
                0%   { transform: scale(0.85); }
                55%  { transform: scale(1.08); }
                100% { transform: scale(1); }
            }
            @media (hover: hover) and (pointer: fine) {
                .doll-wishlist-price-tag:not(.is-selected):hover {
                    transform: scale(1.05);
                    background: linear-gradient(to right, #ffdbee, #fdeef5);
                }
            }

            .doll-wishlist-cart-btn {
                position: absolute;
                right: 7px;
                bottom: 7px;
                z-index: 4;
                width: 30px;
                height: 30px;
                display: grid;
                place-items: center;
                border-radius: 50%;
                border: 1px solid rgba(245, 185, 208, 0.82);
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), #ffedf4);
                color: #ef6d9f;
                box-shadow:
                    0 3px 8px rgba(210, 88, 136, 0.1),
                    inset 0 1px 0 #fff;
                cursor: pointer;
                padding: 0;
                -webkit-tap-highlight-color: transparent;
                transition: transform 0.16s cubic-bezier(0.2, 0.8, 0.25, 1.25), background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
            }
            .doll-wishlist-cart-btn:active { transform: scale(0.88); }
            .doll-wishlist-cart-btn:focus-visible {
                outline: 2px solid rgba(220, 77, 132, 0.68);
                outline-offset: 2px;
            }
            .doll-wishlist-cart-btn svg { width: 16px; height: 16px; display: block; }
            .doll-wishlist-cart-btn .dwl-heart-filled { display: none; }
            .doll-wishlist-item.selected .doll-wishlist-cart-btn {
                border-color: rgba(228, 82, 139, 0.78);
                background: linear-gradient(180deg, #ff9fc2, #ec699c);
                color: #fff;
                box-shadow:
                    0 5px 11px rgba(202, 70, 123, 0.26),
                    inset 0 1px 0 rgba(255, 255, 255, 0.55);
            }
            .doll-wishlist-item.selected .dwl-heart { display: none; }
            .doll-wishlist-item.selected .dwl-heart-filled {
                display: block;
                animation: dollWishlistHeartIn 0.32s cubic-bezier(0.2, 0.85, 0.25, 1.35);
            }

            @keyframes dollWishlistHeartIn {
                0% { opacity: 0; transform: scale(0.4); }
                55% { opacity: 1; transform: scale(1.22); }
                100% { opacity: 1; transform: scale(1); }
            }

            /* TEMP — list view mode: same card, laid out as a row instead
               of a tall tile. Heart/burst re-center vertically via top +
               negative margin (not transform), so they never fight the
               scale()/translateY() transforms hover, active and selected
               already animate on those same elements. */
            .doll-wishlist-item.dwl-row {
                flex-direction: row;
                align-items: center;
                padding: 6px;
            }
            .doll-wishlist-item.dwl-row .doll-wishlist-media {
                width: 66px;
                aspect-ratio: 1;
                flex: 0 0 auto;
                border-radius: 12px;
            }
            .doll-wishlist-item.dwl-row .doll-wishlist-info {
                flex: 1;
                min-width: 0;
                margin: 0 0 0 10px;
                padding-right: 34px;
            }
            .doll-wishlist-item.dwl-row .doll-wishlist-name {
                font-size: 12px;
            }
            .doll-wishlist-item.dwl-row .doll-wishlist-price {
                font-size: 12.5px;
            }
            .doll-wishlist-item.dwl-row .doll-wishlist-cart-btn {
                top: 50%;
                bottom: auto;
                margin-top: -15px;
            }
            .doll-wishlist-item.dwl-row .dwl-burst {
                bottom: auto;
                top: 50%;
                margin-top: -8.5px;
                transform-origin: 78% 50%;
            }
            .doll-wishlist-more-card.dwl-row {
                flex-direction: row;
                min-height: 68px;
            }

            /* TEMP — masonry view mode: photos keep their natural aspect
               ratio (capped) instead of a fixed crop, tiles get a small
               alternating tilt via --dwl-tilt (composed into the existing
               .selected / :hover transforms above, not replacing them) and
               a little corkboard pin-head, matching the ":3" panel. */
            .doll-wishlist-item.dwl-pin {
                break-inside: avoid;
                margin-bottom: 16px;
            }
            /* :not(.selected) (matching the existing hover rule's own
               pattern below) instead of a plain .dwl-pin rule — a plain
               rule would tie in specificity with .doll-wishlist-item.selected
               and, being later in the sheet, silently win and eat the
               selected translateY(-2px) lift on pinned cards. */
            .doll-wishlist-item.dwl-pin:not(.selected) {
                transform: translateZ(0) rotate(var(--dwl-tilt, 0deg));
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media {
                aspect-ratio: auto;
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media.dwl-media-pending {
                aspect-ratio: var(--dwl-image-ratio, var(--dwl-fallback-image-ratio, 4 / 5));
                max-height: 220px;
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media.dwl-media-frozen {
                aspect-ratio: var(--dwl-frozen-image-ratio) !important;
                max-height: 220px;
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media.dwl-media-frozen img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media.dwl-media-pending img {
                height: 100%;
            }
            .doll-wishlist-item.dwl-pin .doll-wishlist-media img {
                height: auto;
                max-height: 220px;
                object-fit: cover;
            }
            .doll-wishlist-item.dwl-pin::after {
                content: '';
                position: absolute;
                top: 3px;
                left: 50%;
                transform: translateX(-50%);
                width: 11px;
                height: 11px;
                border-radius: 50%;
                background: radial-gradient(circle at 35% 30%, #fff, #ffb6d5);
                box-shadow: 0 2px 3px rgba(0, 0, 0, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.5);
                pointer-events: none;
                z-index: 5;
            }
            .doll-wishlist-masonry .doll-wishlist-item.dwl-pin:nth-child(4n+1) { --dwl-tilt: -1.35deg; --dwl-fallback-image-ratio: 4 / 5; }
            .doll-wishlist-masonry .doll-wishlist-item.dwl-pin:nth-child(4n+2) { --dwl-tilt: 1.1deg; --dwl-fallback-image-ratio: 7 / 8; }
            .doll-wishlist-masonry .doll-wishlist-item.dwl-pin:nth-child(4n+3) { --dwl-tilt: 1.35deg; --dwl-fallback-image-ratio: 3 / 4; }
            .doll-wishlist-masonry .doll-wishlist-item.dwl-pin:nth-child(4n+4) { --dwl-tilt: -1.1deg; --dwl-fallback-image-ratio: 1 / 1; }
            .doll-wishlist-more-card.dwl-pin {
                break-inside: avoid;
                margin-bottom: 16px;
            }
            .doll-wishlist-more-card.dwl-pin.dwl-more-banner {
                column-span: all;
                flex-direction: row;
                min-height: 70px;
                margin: 3px 2px 16px;
            }
            .doll-wishlist-more-card.dwl-pin.dwl-more-tile {
                flex-direction: column;
                justify-content: center;
                gap: 8px;
                min-height: 148px;
            }
            .doll-wishlist-more-card.dwl-pin.dwl-more-tile .dwl-more-copy {
                flex: 0 0 auto;
                text-align: center;
            }
            .doll-wishlist-more-card.dwl-pin::after {
                content: '';
                position: absolute;
                top: 3px;
                left: 50%;
                width: 11px;
                height: 11px;
                border-radius: 50%;
                transform: translateX(-50%);
                background: radial-gradient(circle at 35% 30%, #fff, #ffb6d5);
                box-shadow: 0 2px 3px rgba(0, 0, 0, 0.25), inset 0 -1px 1px rgba(0, 0, 0, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.55);
            }

            @media (hover: hover) and (pointer: fine) {
                .doll-wishlist-item:not(.selected):hover {
                    border-color: rgba(232, 151, 182, 0.82);
                    box-shadow:
                        inset 0 0 0 2px rgba(255, 255, 255, 0.94),
                        0 9px 18px rgba(174, 75, 113, 0.13);
                    transform: translateY(-3px) rotate(var(--dwl-tilt, 0deg));
                }
                .doll-wishlist-item:hover .doll-wishlist-media img {
                    transform: scale(1.028);
                    filter: saturate(1.025) brightness(1.015);
                }
                .doll-wishlist-cart-btn:hover {
                    color: #e9518b;
                    border-color: rgba(237, 139, 176, 0.92);
                    transform: translateY(-1px) scale(1.035);
                    box-shadow: 0 5px 10px rgba(205, 76, 126, 0.16), inset 0 1px 0 #fff;
                }
            }

            .doll-wishlist-dots {
                display: none;
                justify-content: center;
                align-items: center;
                gap: 4px;
                width: max-content;
                min-height: 13px;
                margin: -5px auto 0;
                padding: 3px 8px;
                border: 1px solid rgba(242, 199, 216, 0.5);
                border-radius: 999px;
                background: rgba(255, 252, 253, 0.72);
                box-shadow: 0 3px 9px rgba(191, 107, 138, 0.06);
            }
            .doll-wishlist-dots::before {
                content: "✧";
                margin-right: 1px;
                color: rgba(244, 127, 173, 0.6);
                font-family: var(--dwl-cute);
                font-size: 10px;
                line-height: 1;
            }
            .doll-wishlist-dots:empty { display: none; }
            .doll-wishlist-dot {
                width: 4px;
                height: 4px;
                padding: 0;
                border: none;
                border-radius: 999px;
                background: rgba(224, 143, 174, 0.34);
                cursor: pointer;
                transition: background 0.2s ease, width 0.22s ease, transform 0.2s ease;
                -webkit-tap-highlight-color: transparent;
            }
            .doll-wishlist-dot.active {
                width: 13px;
                background: rgba(233, 104, 154, 0.76);
            }
            .doll-wishlist-dot:focus-visible {
                outline: 2px solid rgba(220, 77, 132, 0.55);
                outline-offset: 2px;
            }

            @keyframes dollWishlistSwipeNudge {
                0%, 100% { transform: translateX(0); }
                50% { transform: translateX(3px); }
            }

            .doll-wishlist-more-card:focus-visible {
                outline: 2px solid rgba(216, 69, 125, 0.58);
                outline-offset: 2px;
            }

            .doll-wishlist-more-card {
                position: relative;
                display: flex;
                flex-direction: row;
                align-items: center;
                justify-content: flex-start;
                gap: 10px;
                min-width: 0;
                min-height: 76px;
                padding: 10px 11px;
                color: var(--dwl-ink);
                text-decoration: none;
                background: linear-gradient(180deg, #fffefe 0%, #fff9fb 70%, #fff6fa 100%);
                border: 1px solid var(--dwl-line);
                border-radius: 18px;
                box-shadow:
                    inset 0 0 0 2px rgba(255, 255, 255, 0.92),
                    0 5px 12px rgba(177, 92, 124, 0.08),
                    0 1px 2px rgba(142, 76, 99, 0.06);
                -webkit-tap-highlight-color: transparent;
                transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
            }
            /* A tiny overlapping-card mark makes this read as the rest of
               the wishlist, rather than a generic CTA dropped into it. */
            .doll-wishlist-more-card::before {
                content: "";
                flex: 0 0 39px;
                width: 39px;
                height: 35px;
                border: 1px solid rgba(237, 171, 197, 0.72);
                border-radius: 9px;
                background:
                    linear-gradient(145deg, rgba(255, 255, 255, 0.78), transparent 42%),
                    linear-gradient(160deg, #ffd9e8, #fff5f9);
                box-shadow:
                    -4px 3px 0 -1px #fff,
                    -4px 3px 0 0 rgba(239, 184, 205, 0.62),
                    4px -3px 0 -1px #fff7fa,
                    4px -3px 0 0 rgba(239, 184, 205, 0.48);
                transform: rotate(-3deg);
            }
            .dwl-more-copy {
                display: flex;
                flex: 1 1 auto;
                min-width: 0;
                flex-direction: column;
                gap: 3px;
                text-align: left;
            }
            .dwl-more-kicker {
                color: rgba(129, 71, 92, 0.58);
                font-family: var(--dwl-cute);
                font-size: 9.5px;
                line-height: 1;
                white-space: nowrap;
            }
            .dwl-more-label {
                font-family: var(--dwl-cute);
                font-size: 12.25px;
                font-weight: 600;
                line-height: 1.1;
                white-space: nowrap;
            }
            .dwl-more-arrow {
                display: inline-block;
                flex: 0 0 23px;
                width: 23px;
                color: #ef6d9f;
                font-family: var(--dwl-cute);
                font-size: 19px;
                line-height: 1;
                text-align: center;
                transform: rotate(-5deg);
                transition: transform 0.18s ease;
            }

            .doll-wishlist-state {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 142px;
                margin: 10px 4px;
                padding: 26px 16px;
                border: 1px solid rgba(240, 192, 210, 0.62);
                border-radius: 18px;
                background: rgba(255, 252, 253, 0.86);
                box-shadow: 0 6px 15px rgba(177, 92, 124, 0.07);
                text-align: center;
                color: rgba(111, 60, 79, 0.76);
                font-family: var(--dwl-cute);
                font-size: 12px;
                line-height: 1.5;
            }

            /* The skeleton reuses the real .doll-wishlist-info text-stack
               container (same markup class, just with shimmer placeholders
               instead of real content) rather than inventing separate
               skeleton-only dimensions — that guarantees the loading state
               is exactly as tall as the loaded state. .dwl-sk-circle mirrors
               .doll-wishlist-cart-btn's absolute corner position and size by
               hand (it's a separate placeholder element, not the real
               button, so it can't inherit those automatically the way the
               info container does). */
            .doll-wishlist-skeleton {
                pointer-events: none;
            }
            .doll-wishlist-skeleton .doll-wishlist-media,
            .doll-wishlist-skeleton .dwl-sk-line,
            .doll-wishlist-skeleton .dwl-sk-circle {
                background: linear-gradient(100deg, #fff2f7 25%, #ffdae9 48%, #fff2f7 72%);
                background-size: 220% 100%;
                animation: dollWishlistShimmer 1.3s ease-in-out infinite;
            }
            .doll-wishlist-skeleton .doll-wishlist-media::after { display: none; }
            .doll-wishlist-skeleton .dwl-sk-line {
                display: inline-block;
                height: 8px;
                border-radius: 999px;
                width: 68%;
                vertical-align: middle;
            }
            .doll-wishlist-skeleton .dwl-sk-price {
                width: 34%;
            }
            .doll-wishlist-skeleton .dwl-sk-circle {
                position: absolute;
                right: 7px;
                bottom: 7px;
                width: 30px;
                height: 30px;
                border-radius: 50%;
            }
            /* TEMP — matches the .dwl-row cart-btn override above. */
            .doll-wishlist-skeleton.dwl-row .dwl-sk-circle {
                top: 50%;
                bottom: auto;
                margin-top: -15px;
            }

            /* Masonry skeletons get .dwl-pin too (tilt, pin-head dot,
               break-inside spacing all come along for free), but with fixed
               varied heights instead of .dwl-pin's own aspect-ratio:auto —
               there's no real <img> yet to size against, so auto would
               collapse the media box to 0. These heights stay at/under the
               loaded-card cap (230px) so skeletons never look taller than a
               real pinned card could be. Placed after the .dwl-pin block
               above so source order wins at equal specificity. */
            .doll-wishlist-skeleton.dwl-pin .doll-wishlist-media {
                aspect-ratio: auto;
                height: 190px;
            }
            .doll-wishlist-masonry .doll-wishlist-skeleton.dwl-pin:nth-child(4n+1) .doll-wishlist-media { height: 210px; }
            .doll-wishlist-masonry .doll-wishlist-skeleton.dwl-pin:nth-child(4n+2) .doll-wishlist-media { height: 160px; }
            .doll-wishlist-masonry .doll-wishlist-skeleton.dwl-pin:nth-child(4n+3) .doll-wishlist-media { height: 230px; }
            .doll-wishlist-masonry .doll-wishlist-skeleton.dwl-pin:nth-child(4n+4) .doll-wishlist-media { height: 180px; }

            @keyframes dollWishlistShimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            .doll-wishlist-status {
                margin: 8px 4px 0;
                font-size: 10.5px;
                color: rgba(176, 59, 92, 0.9);
                text-align: center;
                line-height: 1.35;
                font-family: var(--dwl-sans);
            }
            .doll-wishlist-status:empty { display: none; margin: 0; }

            .doll-wishlist-foot {
                display: none;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                width: min(calc(100% - 8px), 420px);
                margin: 8px auto 0;
                padding: 7px 8px 7px 11px;
                border: 1px solid rgba(237, 173, 198, 0.74);
                border-radius: 18px;
                background: rgba(255, 251, 253, 0.96);
                box-shadow:
                    0 8px 19px rgba(183, 82, 121, 0.12),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }
            .doll-wishlist-panel.has-selection .doll-wishlist-foot {
                display: flex;
                animation: dollWishlistFootIn 0.3s cubic-bezier(0.2, 0.84, 0.24, 1);
            }
            @keyframes dollWishlistFootIn {
                from { opacity: 0; transform: translateY(6px) scale(0.985); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            /* List/masonry: the foot is relocated inside .dwl-scroll-body
               (see renderBody()), wrapped in .doll-wishlist-foot-dock — a
               full-width sticky wrapper (see below) — instead of being
               sticky itself. Sticking the bare foot directly (an earlier
               version of this) meant the fade scrim on it could only ever
               be as wide as the foot's own narrow centered pill (min(100% -
               8px, 420px)), reading as a boxed-in blur patch rather than an
               edge-to-edge fade. The dock is a plain 100%-wide block, so its
               own fade (below) genuinely spans the full card width instead
               of needing overshoot tricks relative to a narrower ancestor. */
            .doll-wishlist-foot-dock {
                position: sticky;
                bottom: 0;
                z-index: 4;
                /* Hidden by default (not just empty) — otherwise its ::before
                   scrim below would render at the bottom of every scrolled
                   list/masonry view even with nothing selected yet. */
                display: none;
            }
            .doll-wishlist-panel.has-selection .doll-wishlist-foot-dock {
                display: flex;
                justify-content: center;
            }
            /* Selection mode has its own checkout dissolve. Keep this mask's
               bottom edge opaque so it never fades the sticky bar itself. */
            .doll-wishlist-panel.has-selection .doll-wishlist-scroll-shell {
                --dwl-edge-bottom: 1;
            }
            /* Softens the line where the sticky checkout bar overlaps the
               cards so they dissolve gently into it instead of being cut off
               hard. This MUST be a real backdrop-blur, not a coloured
               gradient: proven by rendering (qlmanage) over light/white
               product photos (makeup sets, pale plushes), a near-white
               gradient scrim is completely INVISIBLE — white-on-white — so it
               only ever softened dark cards and did nothing for the many
               light ones, which is why the bar kept reading as an abrupt cut.
               A blur softens content of ANY colour. The mask-image fades the
               blur out toward the top so it doesn't leave a hard seam at its
               own top edge (a bare backdrop-filter box does). The layered
               light gradient is a graceful fallback: if backdrop-filter or
               mask degrades on old WebKit, the result is still a soft wash,
               never a hard seam. Verified over both light and busy cards.

               Shape: it matches the checkout bar rather than being a
               full-width rectangle. An earlier full-width version had square
               left/right ends that stuck out past the bar's rounded sides and
               read as "sharp." This is the same width as the bar (min(100% -
               8px, 420px)), centered, with the bar's 24px corner radius, and
               it starts from BEHIND the whole bar (bottom:-2px) and rises up,
               fading at the top — so the blur follows the bar's rounded border
               and looks like it emanates from the bar. Because it now overlaps
               the bar, the foot is given position/z-index below to stay on
               top of (and readable over) its own blur. */
            .doll-wishlist-foot-dock::before {
                content: '';
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                bottom: -2px;
                width: min(calc(100% - 8px), 420px);
                height: 104px;
                border-radius: 24px;
                pointer-events: none;
                -webkit-backdrop-filter: blur(9px);
                backdrop-filter: blur(9px);
                background: linear-gradient(
                    to top,
                    rgba(255, 251, 253, 0.72) 0%,
                    rgba(255, 251, 253, 0.34) 46%,
                    rgba(255, 251, 253, 0) 100%
                );
                -webkit-mask-image: linear-gradient(to top, #000 48%, transparent 100%);
                mask-image: linear-gradient(to top, #000 48%, transparent 100%);
            }
            /* Docked mode only: drop the foot's own top margin so the blur
               dissolve above meets the pill's top edge with no un-blurred gap.
               Drop the pill's 1px border ENTIRELY (not just the top): with the
               border kept, its crisp pink outline drew hard, visible corners
               that read as "too sharp" against the soft blur — verified by
               rendering. Define the bar with a soft glow/shadow instead, and
               round the corners more (24px) so the whole bar reads as a soft,
               cozy shape rather than a bordered box. Bottom stays readable. */
            .doll-wishlist-foot-dock .doll-wishlist-foot {
                position: relative;
                z-index: 1; /* stay above the ::before blur, which now overlaps it */
                margin-top: 0;
                border-color: transparent;
                border-radius: 24px;
                box-shadow:
                    0 -6px 12px rgba(255, 251, 253, 0.6),
                    0 8px 19px rgba(183, 82, 121, 0.12),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }

            .doll-wishlist-count {
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 30px;
                line-height: 1.15;
                text-align: left;
            }
            .doll-wishlist-count b {
                font-family: var(--dwl-cute);
                font-size: 11.5px;
                font-weight: 600;
                color: #713b50;
            }
            .doll-wishlist-count small {
                margin-top: 2px;
                font-family: var(--dwl-sans);
                font-size: 8.5px;
                font-weight: 500;
                color: rgba(113, 59, 80, 0.52);
            }

            .doll-wishlist-checkout-wrap {
                position: relative;
                flex: 0 0 112px;
                width: 112px;
                height: 42px;
                isolation: isolate;
            }

            .doll-wishlist-checkout {
                position: relative;
                z-index: 1;
                width: 100%;
                height: 100%;
                padding: 0 16px;
                border: 1px solid rgba(220, 84, 135, 0.24);
                border-radius: 999px;
                background: linear-gradient(180deg, #fa9ec1 0%, #ec6f9f 100%);
                color: #fff;
                font-family: var(--dwl-cute);
                font-size: 13.5px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(145, 44, 82, 0.18);
                box-shadow:
                    0 0 10px rgba(255, 255, 255, 0.58),
                    0 5px 11px rgba(202, 70, 122, 0.2),
                    inset 0 1px 0 rgba(255, 255, 255, 0.48);
                cursor: pointer;
                transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, opacity 0.16s ease;
            }
            .doll-wishlist-checkout:not(:disabled):hover {
                transform: translateY(-1px);
                filter: saturate(1.04);
                box-shadow:
                    0 0 12px rgba(255, 255, 255, 0.68),
                    0 7px 14px rgba(202, 70, 122, 0.23),
                    inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
            .doll-wishlist-checkout:not(:disabled):active { transform: scale(0.97); }
            .doll-wishlist-checkout:focus-visible {
                outline: 2px solid rgba(216, 69, 125, 0.62);
                outline-offset: 2px;
            }
            .doll-wishlist-checkout:disabled { opacity: 0.55; cursor: default; }

            .doll-wishlist-checkout-art {
                position: absolute;
                z-index: 2;
                left: 50%;
                bottom: 17px;
                width: 74px;
                max-width: none;
                height: auto;
                pointer-events: none;
                user-select: none;
                -webkit-user-drag: none;
                transform: translateX(-50%);
                transform-origin: 50% 72%;
                filter: drop-shadow(0 3px 3px rgba(177, 92, 124, 0.14));
                transition: transform 0.22s cubic-bezier(0.2, 0.84, 0.24, 1), filter 0.22s ease, opacity 0.16s ease;
            }
            .doll-wishlist-panel.has-selection .doll-wishlist-checkout-art {
                animation: dollWishlistCheckoutArtIn 0.42s cubic-bezier(0.2, 0.84, 0.24, 1.12);
            }
            @keyframes dollWishlistCheckoutArtIn {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(6px) rotate(-2deg) scale(0.88);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0) rotate(0) scale(1);
                }
            }
            .doll-wishlist-checkout:not(:disabled):hover + .doll-wishlist-checkout-art {
                transform: translateX(-50%) translateY(-1px) rotate(-1deg) scale(1.015);
                filter: drop-shadow(0 4px 4px rgba(177, 92, 124, 0.18));
            }
            .doll-wishlist-checkout:not(:disabled):active + .doll-wishlist-checkout-art {
                transform: translateX(-50%) translateY(1px) scale(0.985);
            }
            .doll-wishlist-checkout:disabled + .doll-wishlist-checkout-art {
                opacity: 0.82;
            }

            @media (max-width: 560px) {
                .doll-wishlist-panel {
                    width: min(88vw, 324px);
                }

                .doll-wishlist-foot {
                    width: calc(100% - 8px);
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-panel,
                .doll-wishlist-item,
                .doll-wishlist-media img,
                .doll-wishlist-more-card,
                .doll-wishlist-cart-btn,
                .doll-wishlist-checkout,
                .doll-wishlist-checkout-art,
                .doll-wishlist-throne-footer-link.is-swipe-hint,
                .doll-wishlist-footer-swipe-arrow {
                    animation: none !important;
                    transition-duration: 0.01ms !important;
                }
            }

            /* Close icon: same swap mechanism the socials/action buttons
               already use for their own open state (plain menu-main-icon
               <-> alternate glyph show/hide), instead of a bespoke overlay.
               The ID selector already outweighs .email-button/.show-glitter,
               so no !important is needed anywhere here. */
            .menu-close-icon {
                display: none;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                flex: 0 0 auto;
                color: rgba(184, 74, 117, 0.88);
                font-family: ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif;
                font-size: 20px;
                font-weight: 400;
                line-height: 1;
            }
            #support-menu-button.dwl-open > .menu-main-icon {
                display: none;
            }
            #support-menu-button.dwl-open > .menu-close-icon {
                display: inline-flex;
            }
            #support-menu-button.dwl-open {
                background: linear-gradient(145deg, rgba(255, 252, 254, 0.98), rgba(255, 226, 239, 0.9));
                box-shadow:
                    0 5px 13px rgba(211, 92, 140, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.94);
                outline: none;
            }
            #support-menu-button.dwl-open:hover {
                transform: translateY(-1px) scale(1.035);
            }
            #support-menu-button.dwl-open:focus-visible {
                outline: 2px solid rgba(216, 69, 125, 0.56);
                outline-offset: 2px;
            }
            /* The independent glitter cycle in script.js re-adds
               .show-glitter every ~10s with no awareness of dwl-open — keep
               its heart/sparkle pseudo-elements neutralized whenever open. */
            #support-menu-button.dwl-open::before,
            #support-menu-button.dwl-open::after {
                content: none;
                animation: none;
            }

            @media (hover: hover) and (pointer: fine) {
                .doll-wishlist-more-card:hover {
                    border-color: rgba(232, 151, 182, 0.82);
                    box-shadow:
                        inset 0 0 0 2px rgba(255, 255, 255, 0.94),
                        0 9px 18px rgba(174, 75, 113, 0.13);
                    transform: translateY(-3px);
                }
                .doll-wishlist-more-card:hover .dwl-more-arrow {
                    color: #e9518b;
                    transform: translateX(2px) rotate(-5deg);
                }
            }
        `;
        document.head.appendChild(style);
        injectPreviewStyles();
    }

    function injectPreviewStyles() {
        if (document.getElementById(previewStyleId)) return;
        const style = document.createElement('style');
        style.id = previewStyleId;
        style.textContent = `
            .doll-wishlist-preview-overlay {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(35, 12, 22, 0.58);
                backdrop-filter: blur(10px) saturate(1.1);
                -webkit-backdrop-filter: blur(10px) saturate(1.1);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.28s ease;
                z-index: 99999;
                padding: 28px;
            }
            .doll-wishlist-preview-overlay.active {
                opacity: 1;
                pointer-events: auto;
            }
            .doll-wishlist-preview-card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: min(86vw, 360px);
                margin: 0;
                transform: scale(0.92) translateY(10px);
                transition: transform 0.28s cubic-bezier(0.2, 0.85, 0.25, 1.15);
            }
            .doll-wishlist-preview-overlay.active .doll-wishlist-preview-card {
                transform: scale(1) translateY(0);
            }
            .doll-wishlist-preview-media {
                position: relative;
                width: 100%;
                display: flex;
                justify-content: center;
            }
            .doll-wishlist-preview-img {
                display: block;
                width: 100%;
                max-height: 60vh;
                object-fit: contain;
                border-radius: 20px;
                background: #fff;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35), 0 0 0 4px rgba(255, 255, 255, 0.85);
                /* Hidden until THIS item's photo has actually decoded — see
                   openPreview. Without it the <img> keeps painting the
                   previously-previewed photo while the new src loads, so
                   opening a different item flashed the wrong picture for a
                   beat (worst on first open / slow network). Fades in clean. */
                opacity: 0;
                transition: opacity 0.22s ease;
            }
            .doll-wishlist-preview-img.is-loaded {
                opacity: 1;
            }
            .doll-wishlist-preview-caption {
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 100%;
                margin: 14px 0 0;
                font-family: var(--dwl-cute, "Comic Sans MS", cursive);
            }
            /* Plain text, not a pill — the title is information, not a
               control, so it shouldn't look tappable (only the price tag
               below is). A soft dark text-shadow keeps it legible directly
               on the blurred backdrop without needing a background chip. */
            .doll-wishlist-preview-name {
                position: relative;
                display: inline-block;
                min-width: 0;
                max-width: 232px;
                margin: 0 0 9px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                text-align: center;
                font-size: 14px;
                font-weight: 700;
                color: #fff;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.4);
            }
            /* Floats as a soft toast above the photo (never overlapping it),
               anchored to the top edge of .doll-wishlist-preview-media, and
               rises into place with a gentle fade so it reads as popping up,
               not just appearing. Toggled via .show in JS rather than :empty
               so it can replay the same entrance every time it's triggered. */
            .doll-wishlist-preview-hint {
                position: absolute;
                left: 50%;
                bottom: 100%;
                margin: 0 0 10px;
                padding: 7px 16px;
                max-width: calc(100% - 32px);
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.72);
                backdrop-filter: blur(6px) saturate(1.2);
                -webkit-backdrop-filter: blur(6px) saturate(1.2);
                box-shadow: 0 8px 20px rgba(80, 20, 45, 0.22), inset 0 0 0 1px rgba(255, 255, 255, 0.55);
                color: #a3486e;
                font-family: var(--dwl-cute, "Comic Sans MS", cursive);
                font-size: 11.5px;
                font-weight: 600;
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                opacity: 0;
                pointer-events: none;
                transform: translate(-50%, 8px);
                transition: opacity 0.3s ease, transform 0.32s cubic-bezier(0.2, 0.85, 0.25, 1.2);
            }
            .doll-wishlist-preview-hint.show {
                opacity: 1;
                transform: translate(-50%, 0);
            }
            .doll-wishlist-preview-close {
                position: absolute;
                top: 18px;
                right: 18px;
                width: 38px;
                height: 38px;
                display: grid;
                place-items: center;
                border: none;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.94);
                color: #a3486e;
                font-family: ui-rounded, system-ui, sans-serif;
                font-size: 20px;
                line-height: 1;
                cursor: pointer;
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
                -webkit-tap-highlight-color: transparent;
                transition: transform 0.16s ease;
            }
            .doll-wishlist-preview-close:active { transform: scale(0.9); }
            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-preview-overlay,
                .doll-wishlist-preview-card {
                    transition-duration: 0.01ms !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureThroneFooterLink() {
        if (throneFooterLink && document.body.contains(throneFooterLink)) return throneFooterLink;
        const footer = document.querySelector('.site-brand-footer');
        if (!footer) return null;

        throneFooterLink = document.createElement('a');
        throneFooterLink.className = 'doll-wishlist-throne-footer-link';
        throneFooterLink.href = FULL_WISHLIST_URL;
        throneFooterLink.target = '_blank';
        throneFooterLink.rel = 'noopener noreferrer';
        throneFooterLink.setAttribute('aria-label', 'View the full wishlist on Throne');
        throneFooterLink.setAttribute('aria-live', 'polite');
        throneFooterLink.innerHTML = `
            <span class="doll-wishlist-footer-brand">
                <span class="site-brand-name">throne</span><span class="site-brand-dot">.</span><span class="site-brand-gg">com</span>
            </span>
            <span class="doll-wishlist-footer-hint" aria-hidden="true">
                <span class="doll-wishlist-footer-swipe-copy">swipe for more</span>
                <span class="doll-wishlist-footer-swipe-arrow">→</span>
            </span>
        `;
        throneFooterLink.addEventListener('click', event => {
            if (throneFooterLink.classList.contains('is-swipe-hint')) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }
            openInNewTab(event);
        });
        footer.appendChild(throneFooterLink);
        return throneFooterLink;
    }

    function ensurePreviewOverlay() {
        if (previewOverlay && document.body.contains(previewOverlay)) return previewOverlay;

        previewOverlay = document.createElement('div');
        previewOverlay.className = 'doll-wishlist-preview-overlay';
        previewOverlay.setAttribute('aria-hidden', 'true');
        previewOverlay.innerHTML = `
            <button type="button" class="doll-wishlist-preview-close" aria-label="Close preview">&times;</button>
            <figure class="doll-wishlist-preview-card">
                <div class="doll-wishlist-preview-media">
                    <img class="doll-wishlist-preview-img" src="" alt="">
                    <p class="doll-wishlist-preview-hint"></p>
                </div>
                <figcaption class="doll-wishlist-preview-caption">
                    <span class="doll-wishlist-preview-name"></span>
                    <button type="button" class="doll-wishlist-price-tag doll-wishlist-preview-price-tag">${ICON_HEART}${ICON_HEART_FILLED}<span class="dwl-price-text"></span></button>
                </figcaption>
            </figure>
        `;
        // Tapping the dark backdrop closes it. The card (figure) itself has
        // no background of its own, so most of its bounding box — the
        // margins around the photo, the plain-text title, the gaps between
        // pieces — still visually reads as backdrop; only the photo itself
        // looks like "not background." Previously the whole card swallowed
        // clicks, so those visually-backdrop areas silently ate taps meant
        // to close the preview ("tapping the background doesn't always
        // work"). Now only the photo stops propagation; the price tag stops
        // its own separately below (it toggles selection instead of
        // closing), and everything else in the card falls through to close.
        previewOverlay.addEventListener('click', closePreview);
        previewOverlay.querySelector('.doll-wishlist-preview-media').addEventListener('click', e => e.stopPropagation());
        previewOverlay.querySelector('.doll-wishlist-preview-close').addEventListener('click', closePreview);
        previewOverlay.querySelector('.doll-wishlist-preview-price-tag').addEventListener('click', e => {
            e.stopPropagation();
            if (previewItemId) toggleItem(previewItemId);
        });
        document.body.appendChild(previewOverlay);
        return previewOverlay;
    }

    function releasePreviewImage() {
        window.clearTimeout(previewImageReleaseTimer);
        previewImageReleaseTimer = 0;
        previewImageGeneration += 1;
        const previewImg = previewOverlay?.querySelector('.doll-wishlist-preview-img');
        if (!previewImg) return;
        previewImg.onload = null;
        previewImg.onerror = null;
        previewImg.classList.remove('is-loaded');
        previewImg.removeAttribute('src');
    }

    function schedulePreviewImageRelease() {
        window.clearTimeout(previewImageReleaseTimer);
        const releaseGeneration = ++previewImageGeneration;
        const previewImg = previewOverlay?.querySelector('.doll-wishlist-preview-img');
        if (!previewImg) return;
        // Keep the current pixels for the 280ms overlay fade, but detach its
        // handlers immediately so a late response cannot revive a closed view.
        previewImg.onload = null;
        previewImg.onerror = null;
        previewImageReleaseTimer = window.setTimeout(() => {
            if (releaseGeneration !== previewImageGeneration) return;
            previewImageReleaseTimer = 0;
            previewImg.classList.remove('is-loaded');
            previewImg.removeAttribute('src');
        }, 320);
    }

    function openPreview(item) {
        if (!item) return;
        const overlay = ensurePreviewOverlay();
        releasePreviewImage();
        const imageGeneration = previewImageGeneration;
        previewItemId = item.throne_item_id;
        const fullLabel = String(item.name || '').trim() || 'wishlist item';
        // Reveal the photo only once its OWN pixels have decoded, so a newly
        // opened item never flashes the previously-previewed photo first.
        const previewImg = overlay.querySelector('.doll-wishlist-preview-img');
        previewImg.classList.remove('is-loaded');
        previewImg.onload = () => {
            if (imageGeneration === previewImageGeneration) previewImg.classList.add('is-loaded');
        };
        previewImg.src = item.image_url || '';
        if (previewImg.complete && previewImg.naturalWidth) previewImg.classList.add('is-loaded');
        overlay.querySelector('.doll-wishlist-preview-name').textContent = fullLabel;
        window.requestAnimationFrame(() => syncPreviewTitleMarquee(overlay.querySelector('.doll-wishlist-preview-name')));

        const selected = selectedIds.has(item.throne_item_id);
        const previewTag = overlay.querySelector('.doll-wishlist-preview-price-tag');
        if (previewTag) {
            const priceText = previewTag.querySelector('.dwl-price-text');
            if (priceText) priceText.textContent = formatPrice(item.price_cents);
            previewTag.classList.toggle('is-selected', selected);
            previewTag.setAttribute('aria-pressed', String(selected));
            previewTag.setAttribute('aria-label', `${selected ? 'Remove ' : 'Add '}${fullLabel}`);
        }

        // A gentle nudge the second time (and after) someone previews a
        // photo without having picked anything yet — never on the very
        // first look, and it stops the moment they heart something.
        previewOpenCount += 1;
        const hint = overlay.querySelector('.doll-wishlist-preview-hint');
        if (hint) {
            hint.classList.remove('show');
            const shouldShow = previewOpenCount >= 2 && !selectedIds.size;
            hint.textContent = shouldShow ? "don't forget to heart your favorites! ♡" : '';
            if (shouldShow) {
                // Force a reflow so the rise-in transition replays even if
                // this same hint element already showed (and hid) earlier.
                void hint.offsetWidth;
                window.requestAnimationFrame(() => hint.classList.add('show'));
            }
        }

        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        playSound('tap');
    }

    function closePreview() {
        if (!previewOverlay) return;
        const wasActive = previewOverlay.classList.contains('active');
        previewOverlay.classList.remove('active');
        previewOverlay.setAttribute('aria-hidden', 'true');
        // A full-size product image can be much larger than its thumbnail.
        // Preserve it only long enough for the visible close transition.
        if (wasActive) schedulePreviewImageRelease();
        else if (!previewImageReleaseTimer) releasePreviewImage();
        previewItemId = null;
    }

    function buildPanel() {
        const contentArea = document.querySelector('.content-area');
        if (!contentArea) return null;

        injectStyles();
        ensureThroneFooterLink();

        panel = document.createElement('div');
        panel.id = panelId;
        panel.className = 'doll-wishlist-panel';
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = `
            <div class="doll-wishlist-scroll-shell dwl-motion-shell scroll-edge-bottom-mask">
                <div class="dwl-motion-viewport scroll-edge-top-mask">
                    <div class="doll-wishlist-body"></div>
                </div>
            </div>
            <nav class="doll-wishlist-dots" aria-label="wishlist pages"></nav>
            <p class="doll-wishlist-status"></p>
            <div class="doll-wishlist-foot">
                <span class="doll-wishlist-count"><b>0 items</b><small>+ fees at checkout</small></span>
                <span class="doll-wishlist-checkout-wrap">
                    <button type="button" class="doll-wishlist-checkout" disabled>checkout</button>
                    <img data-checkout-src="site-images/checkout.png" class="doll-wishlist-checkout-art" alt="" aria-hidden="true" draggable="false" decoding="async" width="320" height="320">
                </span>
            </div>
        `;

        contentArea.appendChild(panel);

        if (typeof window.ResizeObserver === 'function') {
            panelResizeObserver?.disconnect();
            panelResizeObserver = new ResizeObserver(() => {
                // Motion setup keeps the panel's flow height unchanged. Never
                // remeasure a ready viewport during its open session.
                if (window.dollIsPanelScrolling?.()
                    || panel.querySelector('.dwl-motion-ready')) return;
                syncReservedHeight();
            });
            panelResizeObserver.observe(panel);
        }
        if (typeof window.MutationObserver === 'function') {
            panelMutationObserver?.disconnect();
            panelMutationObserver = new MutationObserver(() => syncReservedHeight());
            panelMutationObserver.observe(panel, {
                subtree: true,
                childList: true,
                characterData: true,
            });
        }

        panel.querySelector('.doll-wishlist-checkout').addEventListener('click', startCheckout);
        setupConflictGuards();

        return panel;
    }

    function ensurePanel() {
        if (panel && document.body.contains(panel)) return panel;
        return buildPanel();
    }

    // Skips the panel's own multi-hundred-ms close transition so it can't
    // still be visibly fading out underneath the wishlist panel's incoming
    // fade-in (closeOtherContentPanels() wants these gone immediately, not
    // gradually).
    function forceInstantClose(el) {
        if (!el) return;
        el.style.transition = 'none';
        el.classList.remove('active');
        void el.offsetWidth;
        el.style.transition = '';
    }

    function closeOtherContentPanels() {
        const drawingWidget = document.querySelector('.drawing-widget');
        const pencilButton = document.getElementById('toggle-button');
        if (drawingWidget?.classList.contains('active')) {
            forceInstantClose(drawingWidget);
            pencilButton?.classList.remove('drawing-open');
            if (pencilButton) pencilButton.textContent = '✎';
        }

        const askForm = document.getElementById('ask-form-container');
        const askButton = document.getElementById('ask-button');
        if (askForm && askForm.style.display === 'block') {
            askForm.style.display = 'none';
            if (askButton) askButton.textContent = '?';
        }

        const postsPopup = document.getElementById('posts-popup');
        const postsButton = document.getElementById('posts-button');
        if (postsPopup?.classList.contains('active')) {
            if (typeof window.dollClosePostsPanel === 'function') {
                window.dollClosePostsPanel();
                // The real closer performs all fetch/media/cache cleanup.
                // Suppress only its visual tail here so two full surfaces do
                // not overlap for 450ms while Wishlist begins entering.
                forceInstantClose(postsPopup);
            } else {
                // Defensive fallback for an unusually early open before the
                // main script has installed the full cleanup hook.
                forceInstantClose(postsPopup);
                window.dollClearScrollMotion?.(postsPopup);
                document.body.classList.remove('has-posts-panel-open');
                postsPopup.closest('.toggle-container')?.style.removeProperty('--posts-panel-height');
                postsPopup.querySelector('.popup-content')?.style.removeProperty('--panel-fill-max');
                if (postsButton) postsButton.textContent = ':3';
            }
        }
    }

    function hideNoteImage() {
        document.getElementById('note-peel-target')?.classList.add('hidden');
        document.querySelector('.note-image')?.classList.add('hidden');
    }

    function showNoteImage() {
        const noteTarget = document.getElementById('note-peel-target');
        noteTarget?.classList.remove('hidden');
        noteTarget?.classList.remove('dwl-note-locking');
        document.querySelector('.note-image')?.classList.remove('hidden');
    }

    function entryPopupIsVisible() {
        const popup = document.getElementById('popup');
        if (!popup) return false;
        const styles = window.getComputedStyle(popup);
        return styles.display !== 'none'
            && styles.visibility !== 'hidden'
            && Number.parseFloat(styles.opacity || '1') > 0.05;
    }

    function hasConflictingLayer() {
        if (document.body.classList.contains('site-maintenance-active')
            || document.body.classList.contains('first-visit-tour-active')) {
            return true;
        }

        return entryPopupIsVisible() || Boolean(document.querySelector([
            '.submit-popup.show',
            '.admin-gate.show',
            '.doll-throne-overlay.show',
            '[data-kofi-open="true"]',
        ].join(',')));
    }

    function setupConflictGuards() {
        if (!conflictClickGuardReady) {
            conflictClickGuardReady = true;
            document.addEventListener('click', event => {
                if (!panel?.classList.contains('active')) return;
                const target = event.target instanceof Element ? event.target : null;
                if (!target?.closest([
                    '#socials-button',
                    '#action-menu-button',
                    '#toggle-button',
                    '#ask-button',
                    '#posts-button',
                    '#donate-option',
                    '#site-brand-button',
                ].join(','))) return;

                // Let the clicked control continue normally; collapse the
                // wishlist first so the two surfaces never share the screen.
                closeThroneMockup(true);
            }, true);
        }

        if (typeof window.MutationObserver !== 'function' || conflictObserver || !document.body) return;
        conflictObserver = new MutationObserver(() => {
            if (panel?.classList.contains('active') && hasConflictingLayer()) {
                closeThroneMockup(true);
            }
        });
        conflictObserver.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-kofi-open'],
        });
    }

    function syncReservedHeight(force = false) {
        if (!panel) return;
        if (!force && !panel?.classList.contains('active')) return;
        const host = panel.closest('.toggle-container');
        if (!host) return;
        // The scroll cap lives on .doll-wishlist-body, but the checkout foot
        // (+ dots/status) renders below its stationary shell. Measure that
        // chrome, set the base cap, then allocate the final viewport once.
        const body = panel.querySelector('.doll-wishlist-body');
        const shell = body?.closest('.doll-wishlist-scroll-shell');
        const motionFrozen = shell?.classList.contains('dwl-motion-ready');
        if (body && (!motionFrozen || force)) {
            const preShellBottom = shell?.getBoundingClientRect().bottom
                ?? body.getBoundingClientRect().bottom;
            const prePanelBottom = panel.getBoundingClientRect().bottom;
            const belowBody = Math.max(0, prePanelBottom - preShellBottom);
            window.dollSetPanelFillMax?.(body, { reservedPad: 4, openMargin: 10, bottomGap: 16, extraReserve: belowBody });
            window.dollConfigureScrollMotion?.(shell, body, body, {
                enabled: body.classList.contains('dwl-scroll-body'),
            });
        }
        const panelRect = panel.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        const neededHeight = Math.max(60, Math.ceil(panelRect.bottom - hostRect.top + 4));
        host.style.setProperty('--dwl-wishlist-height', `${neededHeight}px`);
    }
    // Exposed for the shared settled-resize scheduler in script.js. It is not
    // called by the scroll-driven icon morph; that separation keeps Safari's
    // scroller geometry stable throughout momentum scrolling.
    window.dollSyncWishlistReservedHeight = (force = false) => syncReservedHeight(force);

    function getActivePageIndex(scroll) {
        const pages = scroll ? Array.from(scroll.querySelectorAll('.doll-wishlist-page')) : [];
        if (!scroll || !pages.length) return -1;
        const firstOffset = pages[0].offsetLeft;
        return pages.reduce((best, page, index) => {
            const distance = Math.abs(scroll.scrollLeft - (page.offsetLeft - firstOffset));
            return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity }).index;
    }

    function setSwipeFooterHint(show) {
        const link = ensureThroneFooterLink();
        if (!link) return;

        const shouldShow = Boolean(show && canShowSwipeHint());
        link.classList.toggle('is-swipe-hint', shouldShow);
        link.tabIndex = shouldShow ? -1 : 0;
        link.setAttribute(
            'aria-label',
            shouldShow ? 'Swipe the wishlist for more items' : 'View the full wishlist on Throne'
        );
    }

    function clearSwipeHintTimer() {
        if (swipeHintTimer) {
            window.clearTimeout(swipeHintTimer);
            swipeHintTimer = 0;
        }
    }

    function pauseSwipeHintSequence() {
        clearSwipeHintTimer();
        swipeHintSequenceStarted = false;
        setSwipeFooterHint(false);
    }

    function cancelSwipeHintSequence() {
        pauseSwipeHintSequence();
        swipeHintDismissed = true;
    }

    function resetSwipeHintSequence() {
        pauseSwipeHintSequence();
        swipeHintDismissed = false;
    }

    function canShowSwipeHint() {
        if (loadState !== 'ready' || !panel?.classList.contains('active')) return false;

        const scroll = panel.querySelector('.doll-wishlist-scroll');
        const pageCount = scroll?.querySelectorAll('.doll-wishlist-page').length || 0;
        return pageCount >= 2 && getActivePageIndex(scroll) === 0;
    }

    function queueSwipeHintStep(callback, delay) {
        clearSwipeHintTimer();
        swipeHintTimer = window.setTimeout(() => {
            swipeHintTimer = 0;
            callback();
        }, delay);
    }

    function scheduleSwipeHint() {
        if (swipeHintSequenceStarted || swipeHintDismissed || !canShowSwipeHint()) return;
        swipeHintSequenceStarted = true;

        queueSwipeHintStep(() => {
            if (!canShowSwipeHint()) {
                cancelSwipeHintSequence();
                return;
            }

            setSwipeFooterHint(true);
            queueSwipeHintStep(() => {
                setSwipeFooterHint(false);
                if (!canShowSwipeHint()) {
                    cancelSwipeHintSequence();
                    return;
                }

                queueSwipeHintStep(() => {
                    if (!canShowSwipeHint()) {
                        cancelSwipeHintSequence();
                        return;
                    }

                    setSwipeFooterHint(true);
                    queueSwipeHintStep(() => {
                        setSwipeFooterHint(false);
                        swipeHintSequenceStarted = false;
                        swipeHintDismissed = true;
                    }, SWIPE_HINT_SECOND_VISIBLE_MS);
                }, SWIPE_HINT_REPEAT_DELAY_MS);
            }, SWIPE_HINT_FIRST_VISIBLE_MS);
        }, SWIPE_HINT_INITIAL_DELAY_MS);
    }

    function renderDots() {
        if (!panel) return;
        syncReservedHeight();
        const dotsEl = panel.querySelector('.doll-wishlist-dots');
        const scroll = panel.querySelector('.doll-wishlist-scroll');
        const pages = scroll ? Array.from(scroll.querySelectorAll('.doll-wishlist-page')) : [];
        if (loadState !== 'ready' || !scroll || !pages.length) {
            dotsEl.innerHTML = '';
            return;
        }
        const pageCount = pages.length;
        if (pageCount < 2) {
            dotsEl.innerHTML = '';
            return;
        }
        const firstOffset = pages[0].offsetLeft;
        const activeIndex = pages.reduce((best, page, index) => {
            const distance = Math.abs(scroll.scrollLeft - (page.offsetLeft - firstOffset));
            return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity }).index;
        dotsEl.innerHTML = Array.from({ length: pageCount }, (_, i) =>
            `<button type="button" class="doll-wishlist-dot${i === activeIndex ? ' active' : ''}" data-dot="${i}" aria-label="Show wishlist page ${i + 1}"></button>`
        ).join('');
        dotsEl.querySelectorAll('.doll-wishlist-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                const page = pages[Number(dot.dataset.dot)];
                if (!page) return;
                scroll.scrollTo({ left: page.offsetLeft - firstOffset, behavior: 'smooth' });
            });
        });
    }

    function updateActiveDot() {
        if (!panel) return;
        const scroll = panel.querySelector('.doll-wishlist-scroll');
        const dots = panel.querySelectorAll('.doll-wishlist-dot');
        const pages = scroll ? Array.from(scroll.querySelectorAll('.doll-wishlist-page')) : [];
        if (!scroll || !pages.length) return;
        const idx = getActivePageIndex(scroll);
        dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
    }

    function onScroll(event) {
        const scroll = event.currentTarget;
        if (Math.abs(scroll.scrollLeft) > 2) cancelSwipeHintSequence();
        if (scrollRaf) return;
        scrollRaf = window.requestAnimationFrame(() => {
            scrollRaf = 0;
            updateActiveDot();
        });
    }

    let bodyScrollRaf = 0;
    function updateWishlistEdgeFade(body) {
        if (!body) return;
        const shell = body.closest('.doll-wishlist-scroll-shell');
        if (!shell) return;
        if (window.dollUpdateScrollEdgeState) {
            window.dollUpdateScrollEdgeState(body, shell);
            return;
        }
        const scrollable = body.classList.contains('dwl-scroll-body');
        const maxScroll = scrollable ? Math.max(0, body.scrollHeight - body.clientHeight) : 0;
        const scrollTop = scrollable ? Math.max(0, Math.min(maxScroll, body.scrollTop)) : 0;
        const remaining = Math.max(0, maxScroll - scrollTop);
        const hadAbove = shell.classList.contains('has-content-above');
        const hadBelow = shell.classList.contains('has-content-below');
        const hasAbove = scrollTop > (hadAbove ? 1.5 : 6);
        const hasBelow = remaining > (hadBelow ? 1.5 : 6);
        if (shell.classList.contains('has-content-above') !== hasAbove) {
            shell.classList.toggle('has-content-above', hasAbove);
        }
        if (shell.classList.contains('has-content-below') !== hasBelow) {
            shell.classList.toggle('has-content-below', hasBelow);
        }
    }

    function onWishlistBodyScroll(event) {
        const body = event.currentTarget;
        if (!body.classList.contains('dwl-scroll-body')) return;
        const shell = body.closest('.doll-wishlist-scroll-shell');
        if (window.dollQueuePanelScrollUpdate?.(body, shell)) return;
        window.dollMarkPanelScrollActivity?.();
        if (bodyScrollRaf) return;
        bodyScrollRaf = window.requestAnimationFrame(() => {
            bodyScrollRaf = 0;
            window.dollSetIconsScrollProgress?.(body.scrollTop);
            updateWishlistEdgeFade(body);
        });
    }

    function renderLoadingState() {
        return `
            <div class="posts-fetch-state dwl-wishlist-fetch-state" role="status" aria-live="polite">
                <span class="loading-paw-print posts-fetch-paw" aria-hidden="true"></span>
                <span>fetching little wishes…</span>
            </div>`;
    }

    function renderSkeleton(mode = wishlistViewMode) {
        const modeClass = mode === 'list' ? ' dwl-row' : mode === 'masonry' ? ' dwl-pin' : '';
        const tile = `
                <div class="doll-wishlist-item doll-wishlist-skeleton${modeClass}">
                    <div class="doll-wishlist-media"></div>
                    <div class="doll-wishlist-info">
                        <p class="doll-wishlist-name"><span class="dwl-sk-line"></span></p>
                        <span class="dwl-sk-line dwl-sk-price"></span>
                    </div>
                    <span class="dwl-sk-circle"></span>
                </div>`;
        if (mode === 'list') {
            return `<div class="doll-wishlist-list">${Array.from({ length: PAGE_SIZE }).map(() => tile).join('')}</div>`;
        }
        if (mode === 'masonry') {
            // .dwl-pin gives skeleton tiles the same tilt/pin-head/spacing as
            // real pinned cards (see the .doll-wishlist-skeleton.dwl-pin
            // fixed-height overrides above, which stand in for .dwl-pin's own
            // aspect-ratio:auto since there's no real <img> yet to size
            // against) — so the loading state actually previews the masonry
            // look instead of a flat, untilted placeholder grid.
            return `<div class="doll-wishlist-masonry">${Array.from({ length: PAGE_SIZE }).map(() => tile).join('')}</div>`;
        }
        return `<div class="doll-wishlist-scroll"><div class="doll-wishlist-page">${Array.from({ length: PAGE_SIZE }).map(() => tile).join('')}</div></div>`;
    }

    function pagesMarkup(list) {
        // The full-list link rides along as one extra virtual slot at the
        // end, then everything is chunked into pages together. Only the
        // final page can ever come up short (every earlier page is a full
        // PAGE_SIZE); if it lands on an odd count, CSS makes its last tile
        // span the full row instead of leaving a blank cell beside it.
        const slots = [...list.map((item, index) => ({ item, index })), { item: null, index: list.length }];
        const pageItems = [];
        for (let index = 0; index < slots.length; index += PAGE_SIZE) {
            pageItems.push(slots.slice(index, index + PAGE_SIZE));
        }

        return pageItems.map(page => `
            <div class="doll-wishlist-page">
                ${page.map(slot => slot.item ? cardMarkup(slot.item, 'grid', slot.index) : seeMoreMarkup('grid')).join('')}
            </div>
        `).join('');
    }

    // TEMP — the other two view modes being compared alongside the paged
    // grid above. Both reuse the exact same cardMarkup/seeMoreMarkup as the
    // grid (just a different mode flag), so selection, glow, burst and
    // marquee behavior is identical in all three — only the container flow
    // (and the card's own row/pin CSS modifier) differs.
    function listMarkup(list) {
        return `<div class="doll-wishlist-list">${list.map((item, index) => cardMarkup(item, 'list', index)).join('')}${seeMoreMarkup('list')}</div>`;
    }

    function masonryMarkup(list) {
        return `<div class="doll-wishlist-masonry">${list.map((item, index) => cardMarkup(item, 'masonry', index)).join('')}${seeMoreMarkup('masonry', list.length)}</div>`;
    }

    function seeMoreMarkup(mode = wishlistViewMode, featuredCount = items.length) {
        const modeClass = mode === 'list' ? ' dwl-row' : mode === 'masonry' ? ' dwl-pin' : '';
        const countClass = mode === 'masonry'
            ? (featuredCount % 2 === 0 ? ' dwl-more-banner' : ' dwl-more-tile')
            : '';
        return `
        <a class="doll-wishlist-more-card${modeClass}${countClass}" href="${FULL_WISHLIST_URL}" target="_blank" rel="noopener noreferrer" aria-label="See the full wishlist on Throne">
            <span class="dwl-more-copy">
                <span class="dwl-more-kicker">more little dreams…</span>
                <span class="dwl-more-label">see all wishes</span>
            </span>
            <span class="dwl-more-arrow" aria-hidden="true">→</span>
        </a>`;
    }

    function cardMarkup(item, mode = wishlistViewMode, itemIndex = 0) {
        const selected = selectedIds.has(item.throne_item_id);
        const fullLabel = String(item.name || '').trim() || 'wishlist item';
        const label = capName(fullLabel);
        const modeClass = mode === 'list' ? ' dwl-row' : mode === 'masonry' ? ' dwl-pin' : '';
        const imageUrl = String(item.image_url || '').trim();
        return `
        <article class="doll-wishlist-item${modeClass}${selected ? ' selected' : ''}" data-item-id="${escapeHtml(item.throne_item_id)}">
            <div class="dwl-glow" aria-hidden="true"></div>
            <div class="dwl-burst-clip" aria-hidden="true"><div class="dwl-burst"></div></div>
            <div class="doll-wishlist-media dwl-media-pending"${imageRatioStyle(imageUrl)}>
                <img class="doll-wishlist-product-img" data-src="${escapeHtml(imageUrl)}" alt="" decoding="async" loading="lazy"${imageDimsAttr(imageUrl)}>
            </div>
            <div class="doll-wishlist-info">
                <p class="doll-wishlist-name" title="${escapeHtml(fullLabel)}">${escapeHtml(label)}</p>
                <span class="doll-wishlist-price">${escapeHtml(formatPrice(item.price_cents))}</span>
            </div>
            <button type="button" class="doll-wishlist-cart-btn" data-item-id="${escapeHtml(item.throne_item_id)}" aria-label="${selected ? 'Remove ' : 'Add '}${escapeHtml(fullLabel)}" aria-pressed="${selected}">
                ${ICON_HEART}${ICON_HEART_FILLED}
            </button>
        </article>`;
    }

    function getWishlistBodySignature() {
        return JSON.stringify([
            wishlistViewMode,
            items.map(item => [
                item.throne_item_id,
                item.name,
                item.price_cents,
                item.image_url,
                item.position
            ])
        ]);
    }

    function renderBody() {
        if (!panel) return;
        const body = panel.querySelector('.doll-wishlist-body');
        stopProgressiveItemImages();
        window.dollClearScrollMotion?.(body.closest('.doll-wishlist-scroll-shell'));
        const readyScrollable = (loadState === 'preparing' || loadState === 'ready')
            && (wishlistViewMode === 'list' || wishlistViewMode === 'masonry');
        body.classList.toggle('dwl-scroll-body', readyScrollable);
        body.classList.remove('dwl-ready-in', 'dwl-images-preparing');
        body.closest('.doll-wishlist-scroll-shell')
            ?.classList.remove('has-content-above', 'has-content-below');
        if (!body.dataset.dwlBodyScrollBound) {
            body.dataset.dwlBodyScrollBound = '1';
            body.addEventListener('scroll', onWishlistBodyScroll, { passive: true });
        }
        // Park the foot back on the panel (its original position) before any
        // body.innerHTML assignment below — innerHTML destroys existing
        // children, and if the foot was left sitting inside body from a
        // prior render (list/masonry mode, see the bottom of this function)
        // it would be destroyed along with its attached click listener.
        const foot = panel.querySelector('.doll-wishlist-foot');
        if (foot && foot.parentElement !== panel) {
            panel.appendChild(foot);
        }
        // The old dock (if any) is just an empty wrapper at this point —
        // the line above already pulled foot back out of it — and is about
        // to be destroyed anyway by the body.innerHTML assignment below, or
        // by the fresh dock created further down for list/masonry.
        if (loadState === 'loading') {
            renderedBodySignature = '';
            pauseSwipeHintSequence();
            body.scrollTop = 0;
            body.innerHTML = `<div class="dwl-wishlist-loading-only">${renderLoadingState()}</div>`;
            renderDots();
            return;
        }
        if (loadState === 'failed') {
            renderedBodySignature = '';
            cancelSwipeHintSequence();
            body.innerHTML = `<div class="doll-wishlist-state">couldn't load the wishlist here.<br>opening the full site instead…</div>`;
            renderDots();
            return;
        }
        if (loadState === 'ready' && !items.length) {
            renderedBodySignature = '';
            cancelSwipeHintSequence();
            body.innerHTML = `<div class="doll-wishlist-state">nothing featured yet.<br>opening the full site instead…</div>`;
            renderDots();
            return;
        }

        body.scrollTop = 0;
        window.dollResetIconsCollapse?.();

        // TEMP: 'list' and 'masonry' build their own self-contained
        // container (no .doll-wishlist-scroll/.doll-wishlist-page), so the
        // page-swipe/dots/swipe-hint machinery below simply finds nothing
        // to attach to and no-ops for those two modes — only 'grid' uses it.
        const uninterruptedLoader = loadState === 'preparing'
            ? body.querySelector('.dwl-wishlist-loading-only')
            : null;
        const contentMarkup = wishlistViewMode === 'list'
            ? listMarkup(items)
            : wishlistViewMode === 'masonry'
                ? masonryMarkup(items)
                : `<div class="doll-wishlist-scroll">${pagesMarkup(items)}</div>`;
        if (uninterruptedLoader) {
            body.insertAdjacentHTML('beforeend', contentMarkup);
        } else {
            body.innerHTML = contentMarkup;
        }
        renderedBodySignature = getWishlistBodySignature();

        if (loadState === 'preparing') prepareWishlistImageReveal(body, uninterruptedLoader);

        const scroll = body.querySelector('.doll-wishlist-scroll');
        scroll?.addEventListener('scroll', onScroll, { passive: true });
        body.querySelectorAll('.doll-wishlist-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleItem(btn.dataset.itemId);
            });
        });
        body.querySelectorAll('.doll-wishlist-media').forEach(media => {
            media.addEventListener('click', () => {
                if (media.classList.contains('dwl-media-error')) return;
                const id = media.closest('.doll-wishlist-item')?.dataset.itemId;
                const item = items.find(candidate => candidate.throne_item_id === id);
                if (item) openPreview(item);
            });
        });
        body.querySelector('.doll-wishlist-more-card')?.addEventListener('click', openInNewTab);
        // List/masonry: move the foot inside the scroll container, wrapped
        // in a full-width .doll-wishlist-foot-dock, so position:sticky pins
        // it to the bottom of the visible scrolled area (see
        // .doll-wishlist-foot-dock in the injected stylesheet) instead of
        // the bottom of the whole panel, which could sit below the fold on
        // a long list/small screen. Grid mode keeps the foot at the panel
        // level, undocked, where it already reads fine. A fresh dock is
        // created each render — any old one was left behind (now empty)
        // when the innerHTML assignment above wiped body's children.
        if (foot && (wishlistViewMode === 'list' || wishlistViewMode === 'masonry')) {
            const dock = document.createElement('div');
            dock.className = 'doll-wishlist-foot-dock';
            dock.appendChild(foot);
            body.appendChild(dock);
        }
        if (loadState === 'ready') {
            window.requestAnimationFrame(() => {
                syncTitleMarquees(body);
                scheduleSwipeHint();
                updateWishlistEdgeFade(body);
            });
        }
        renderDots();
    }

    function getMarqueeStyleSheet() {
        let el = document.getElementById(marqueeStyleId);
        if (!el) {
            el = document.createElement('style');
            el.id = marqueeStyleId;
            document.head.appendChild(el);
        }
        return el.sheet;
    }

    // A one-way marquee needs the "pause at the end" to stay a real, fixed
    // ~1s no matter how long the scroll phase is — that ratio is different
    // for every title, so a single shared keyframe can't express it. Each
    // overflowing title gets its own tiny generated @keyframes instead:
    // hold at the start -> scroll left at a constant speed -> pause -> a
    // quick opacity dip masks an instant snap back to the start -> loop.
    // No JS timers are involved once this is built; the browser just runs
    // the animation natively and forever.
    function buildMarqueeKeyframes(overflow, explicitName) {
        const shift = -(overflow + 4);
        // Constant scroll SPEED (px per second), so every title — long or
        // short — travels at the exact same visual pace. Duration is derived
        // purely from distance (overflow / speed) with NO floor and NO cap:
        //  - An upper cap would make very long titles speed up (they'd have
        //    to cover more distance in the same capped time).
        //  - A lower floor (the old Math.max(2.4, …)) did the mirror-image
        //    damage — it stretched short overflows over a fixed minimum time,
        //    so they crawled while long ones zipped. That mismatch is exactly
        //    the "long titles scroll faster than short ones" bug. Distance is
        //    already tiny for a small overflow, so a short duration there is
        //    correct: same speed, just less ground to cover.
        const MARQUEE_SPEED = 42; // px/sec — one calm, uniform reading pace
        const scrollDuration = overflow / MARQUEE_SPEED;
        const startHold = 0.5;
        const pause = 1;
        const snapOut = 0.15;
        const snapIn = 0.15;
        const total = startHold + scrollDuration + pause + snapOut + snapIn;

        const pct = seconds => Math.min(99.98, (seconds / total) * 100).toFixed(3);
        const p1 = pct(startHold);
        const p2 = pct(startHold + scrollDuration);
        const p3 = pct(startHold + scrollDuration + pause);
        const p4 = pct(startHold + scrollDuration + pause + snapOut);
        const p5 = Math.min(99.99, Number(p4) + 0.01).toFixed(3);

        const name = explicitName || `dwlMarquee${marqueeRuleCounter++}`;
        const css = `@keyframes ${name} {
            0% { opacity: 1; transform: translateX(0); }
            ${p1}% { opacity: 1; transform: translateX(0); }
            ${p2}% { opacity: 1; transform: translateX(${shift}px); }
            ${p3}% { opacity: 1; transform: translateX(${shift}px); }
            ${p4}% { opacity: 0; transform: translateX(${shift}px); }
            ${p5}% { opacity: 0; transform: translateX(0); }
            100% { opacity: 1; transform: translateX(0); }
        }`;
        return { name, css, duration: total };
    }

    function syncTitleMarquees(root = panel) {
        if (!root) return;
        const sheet = getMarqueeStyleSheet();
        while (sheet.cssRules.length) sheet.deleteRule(0);
        marqueeRuleCounter = 0;

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        root.querySelectorAll('.doll-wishlist-name').forEach(name => {
            name.classList.remove('dwl-marquee');
            const label = name.textContent;
            name.textContent = label;
            if (reduceMotion) return;

            const overflow = Math.ceil(name.scrollWidth - name.clientWidth);
            if (overflow <= 2) return;

            const { name: keyframeName, css, duration } = buildMarqueeKeyframes(overflow);
            try {
                sheet.insertRule(css, sheet.cssRules.length);
            } catch (err) {
                return;
            }

            name.innerHTML = `<span style="animation-name:${keyframeName};animation-duration:${duration.toFixed(2)}s;">${escapeHtml(label)}</span>`;
            name.classList.add('dwl-marquee');
        });
    }

    // The preview lightbox only ever shows one title at a time, so it gets
    // its own fixed keyframe name in the shared marquee stylesheet rather
    // than sharing syncTitleMarquees' rule-clearing pass — that pass wipes
    // and rebuilds the *whole* sheet, which would kill every grid card's
    // still-running marquee the instant a preview is opened.
    const PREVIEW_MARQUEE_NAME = 'dwlPreviewMarquee';
    function syncPreviewTitleMarquee(nameEl) {
        if (!nameEl) return;
        const sheet = getMarqueeStyleSheet();
        for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
            if (sheet.cssRules[i].name === PREVIEW_MARQUEE_NAME) sheet.deleteRule(i);
        }
        nameEl.classList.remove('dwl-marquee');
        const label = nameEl.textContent;
        nameEl.textContent = label;

        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;

        const overflow = Math.ceil(nameEl.scrollWidth - nameEl.clientWidth);
        if (overflow <= 2) return;

        const { css, duration } = buildMarqueeKeyframes(overflow, PREVIEW_MARQUEE_NAME);
        try {
            sheet.insertRule(css, sheet.cssRules.length);
        } catch (err) {
            return;
        }

        nameEl.innerHTML = `<span style="animation-name:${PREVIEW_MARQUEE_NAME};animation-duration:${duration.toFixed(2)}s;">${escapeHtml(label)}</span>`;
        nameEl.classList.add('dwl-marquee');
    }

    function renderFoot() {
        if (!panel) return;
        const count = selectedIds.size;
        panel.classList.toggle('has-selection', count > 0);
        document.body.classList.toggle(
            'has-wishlist-selection',
            count > 0 && panel.classList.contains('active')
        );
        panel.querySelector('.doll-wishlist-count b').textContent = count === 1 ? '1 item' : `${count} items`;
        const checkoutBtn = panel.querySelector('.doll-wishlist-checkout');
        checkoutBtn.disabled = count === 0 || checkoutInFlight;
        checkoutBtn.textContent = checkoutInFlight ? 'loading…' : 'checkout';
        const statusEl = panel.querySelector('.doll-wishlist-status');
        if (statusEl) statusEl.textContent = checkoutStatusMessage;
        syncReservedHeight();
        window.requestAnimationFrame(() => {
            const body = panel?.querySelector('.doll-wishlist-body');
            window.dollRefreshPanelScrollExtent?.(body);
            updateWishlistEdgeFade(body);
        });
    }

    function toggleItem(id) {
        if (!id) return;
        playSound('tap');
        if (selectedIds.has(id)) {
            selectedIds.delete(id);
            checkoutStatusMessage = '';
        } else if (selectedIds.size >= MAX_CHECKOUT_ITEMS) {
            checkoutStatusMessage = `checkout holds up to ${MAX_CHECKOUT_ITEMS} wishes at once`;
            renderFoot();
            return;
        } else {
            selectedIds.add(id);
            checkoutStatusMessage = '';
        }
        const selected = selectedIds.has(id);

        // Update just the one card in place so the carousel keeps its scroll
        // position instead of snapping back to the start on every tap.
        const card = panel?.querySelector(`.doll-wishlist-item[data-item-id="${CSS.escape(id)}"]`);
        let label = items.find(candidate => candidate.throne_item_id === id)?.name || '';
        if (card) {
            card.classList.toggle('selected', selected);
            const nameEl = card.querySelector('.doll-wishlist-name');
            label = nameEl?.getAttribute('title') || nameEl?.textContent || label;
            const btn = card.querySelector('.doll-wishlist-cart-btn');
            if (btn) {
                btn.setAttribute('aria-pressed', String(selected));
                btn.setAttribute('aria-label', `${selected ? 'Remove ' : 'Add '}${label}`);
            }
        }

        // The preview lightbox's own price tag lives outside the card, so it
        // needs its selected state mirrored explicitly when it's showing the
        // item that was just toggled (including when the tag itself, inside
        // the preview, is what triggered this toggle).
        if (previewItemId === id) {
            const previewTag = previewOverlay?.querySelector('.doll-wishlist-preview-price-tag');
            if (previewTag) {
                previewTag.classList.toggle('is-selected', selected);
                previewTag.setAttribute('aria-pressed', String(selected));
                previewTag.setAttribute('aria-label', `${selected ? 'Remove ' : 'Add '}${label}`);
            }
        }
        renderFoot();
    }

    async function waitForSupabaseClient(maxAttempts, signal = null) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
            const client = window.supabase;
            if (client && typeof client.from === 'function') return client;
            await new Promise(resolve => window.setTimeout(resolve, 100));
        }
        return null;
    }

    // Reads the admin-configurable "wishlist layout" setting (site_settings,
    // same row/table admin.js's other link settings live in). Return the mode
    // instead of mutating global state so an aborted/closed run can never race
    // a newer open and change its layout.
    async function readWishlistViewModeSetting(client, signal) {
        try {
            const { data, error } = await withSupabaseTimeout(
                client.from('site_settings').select('value').eq('id', 'links').maybeSingle(),
                FETCH_TIMEOUT_MS,
                signal
            );
            if (error || !data) return null;
            const mode = data.value?.wishlist_view_mode;
            return WISHLIST_VIEW_MODES.includes(mode) ? mode : null;
        } catch (err) {
            return null;
        }
    }

    async function triggerBackgroundSync(signal) {
        const controller = typeof window.AbortController === 'function'
            ? new AbortController()
            : null;
        const relayAbort = () => controller?.abort();
        if (signal?.aborted) relayAbort();
        else signal?.addEventListener('abort', relayAbort, { once: true });
        try {
            await withTimeout(
                fetch(`${SUPABASE_URL}/functions/v1/throne-wishlist-sync`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
                    signal: controller?.signal,
                }),
                FETCH_TIMEOUT_MS,
                () => controller?.abort()
            );
        } catch (error) {
            if (signal?.aborted) throw error;
            // The mirrored table is still a valid fallback when live sync is
            // throttled or temporarily unavailable.
        } finally {
            signal?.removeEventListener('abort', relayAbort);
        }
    }

    async function fetchWishlistItemsFresh(signal) {
        // script.js lazy-loads the Supabase client after first paint, so the
        // first opener may need to wait briefly for it.
        const client = await waitForSupabaseClient(30, signal);
        if (!client) throw new Error('supabase client unavailable');

        // Synchronize first, then read. The old fire-and-forget order queried
        // the previous snapshot and only refreshed it after cards appeared.
        await triggerBackgroundSync(signal);
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const [itemsResult, viewMode] = await Promise.all([
            withSupabaseTimeout(
                client.from('wishlist_items')
                    .select('throne_item_id,name,price_cents,image_url,position')
                    .eq('featured', true)
                    .eq('is_available', true)
                    .order('position')
                    .limit(MAX_FEATURED),
                FETCH_TIMEOUT_MS,
                signal
            ),
            readWishlistViewModeSetting(client, signal),
        ]);
        const { data, error } = itemsResult;
        if (error) throw error;
        return { items: Array.isArray(data) ? data : [], viewMode };
    }

    async function loadItems({ bodyPrepared = false } = {}) {
        itemsFetchController?.abort();
        const controller = typeof window.AbortController === 'function'
            ? new AbortController()
            : null;
        itemsFetchController = controller;
        const run = ++itemsLoadRun;
        loadState = 'loading';
        items = [];
        if (!bodyPrepared) renderBody();

        try {
            const result = await fetchWishlistItemsFresh(controller?.signal);
            if (run !== itemsLoadRun) return;
            items = result.items;
            if (result.viewMode) wishlistViewMode = result.viewMode;
            const currentImageUrls = new Set(items.map(item => String(item.image_url || '').trim()));
            imageDims.forEach((_dims, url) => {
                if (!currentImageUrls.has(url)) imageDims.delete(url);
            });
            if (!isWishlistPanelVisible()) return;
            if (!items.length) {
                loadState = 'ready';
                renderBody();
                renderFoot();
                window.setTimeout(() => {
                    if (run === itemsLoadRun && isWishlistPanelVisible()) fallbackToLegacy();
                }, 900);
                return;
            }

            loadState = 'preparing';
            renderBody();
            renderFoot();
            const body = panel?.querySelector('.doll-wishlist-body');
            await loadAndDecodeAllWishlistImages(body, run);
            if (run !== itemsLoadRun || !isWishlistPanelVisible()) return;

            loadState = 'ready';
            if (!revealPreparedWishlistBody(body, run)) return;
            renderDots();
            renderFoot();
            syncReservedHeight(true);
            window.requestAnimationFrame(() => {
                if (run !== itemsLoadRun || !isWishlistPanelVisible()) return;
                syncTitleMarquees(body);
                scheduleSwipeHint();
                updateWishlistEdgeFade(body);
            });
        } catch (err) {
            if (run !== itemsLoadRun) return;
            loadState = 'failed';
            if (isWishlistPanelVisible()) {
                renderBody();
                window.setTimeout(() => {
                    if (run === itemsLoadRun && isWishlistPanelVisible()) fallbackToLegacy();
                }, 900);
            }
        } finally {
            if (itemsFetchController === controller) itemsFetchController = null;
        }
    }

    async function startCheckout() {
        if (checkoutInFlight || !selectedIds.size) return;
        const requestRun = ++checkoutRequestRun;
        const panelSessionRun = itemsLoadRun;
        const checkoutController = typeof window.AbortController === 'function'
            ? new AbortController()
            : null;
        checkoutRequestController = checkoutController;
        checkoutInFlight = true;
        checkoutStatusMessage = '';
        playSound('link');
        renderFoot();

        try {
            const res = await withTimeout(
                fetch(`${SUPABASE_URL}/functions/v1/throne-cart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    },
                    body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
                    signal: checkoutController?.signal,
                }),
                FETCH_TIMEOUT_MS,
                () => checkoutController?.abort()
            );
            const body = await res.json().catch(() => ({}));
            const requestStillOwnsPanel = requestRun === checkoutRequestRun
                && panelSessionRun === itemsLoadRun
                && isWishlistPanelVisible();
            if (!requestStillOwnsPanel) return;

            if (res.status === 409) {
                // Something the visitor picked sold out / got unfeatured
                // between selecting and checking out. Never silently ship a
                // smaller cart — refresh what's actually still available and
                // let them retry with an honest selection.
                checkoutStatusMessage = 'sorry, something you picked just sold out — pick again?';
                await loadItems();
                if (requestRun !== checkoutRequestRun || !isWishlistPanelVisible()) return;
                const stillValid = new Set(items.map(item => item.throne_item_id));
                selectedIds = new Set(Array.from(selectedIds).filter(id => stillValid.has(id)));
                renderFoot();
                return;
            }

            if (!res.ok || !body.checkoutUrl) {
                throw new Error(body.error || `throne-cart ${res.status}`);
            }
            openCheckoutDestination(body.checkoutUrl);
            closeThroneMockup();
        } catch (err) {
            const staleRequest = requestRun !== checkoutRequestRun
                || panelSessionRun !== itemsLoadRun
                || !isWishlistPanelVisible();
            if (staleRequest) return;
            fallbackToLegacy();
        } finally {
            if (requestRun === checkoutRequestRun) {
                if (checkoutRequestController === checkoutController) checkoutRequestController = null;
                checkoutInFlight = false;
                if (panel?.classList.contains('active')) renderFoot();
            }
        }
    }

    function cancelCheckoutRequest() {
        checkoutRequestRun += 1;
        checkoutRequestController?.abort();
        checkoutRequestController = null;
        checkoutInFlight = false;
    }

    function cancelScheduledWishlistRelease() {
        if (wishlistExitTransitionTimer) {
            window.clearTimeout(wishlistExitTransitionTimer);
            wishlistExitTransitionTimer = 0;
        }
        if (wishlistReleaseTimer) {
            window.clearTimeout(wishlistReleaseTimer);
            wishlistReleaseTimer = 0;
        }
        if (wishlistExitTransitionHandler && panel) {
            panel.removeEventListener('transitionend', wishlistExitTransitionHandler);
        }
        wishlistExitTransitionHandler = null;
    }

    function releaseClosedWishlistResources() {
        wishlistReleaseTimer = 0;
        if (panelOpening || panel?.classList.contains('active')) return;
        cancelAtomicImageWaits();
        cancelCheckoutRequest();
        stopProgressiveItemImages({ releaseLoaded: true });
        itemsFetchController?.abort();
        itemsFetchController = null;
        items = [];
        loadState = 'idle';
        renderedBodySignature = '';
        imageDims.clear();

        const body = panel?.querySelector('.doll-wishlist-body');
        const foot = panel?.querySelector('.doll-wishlist-foot');
        if (foot && foot.parentElement !== panel) panel.appendChild(foot);
        if (body) {
            body.replaceChildren();
            body.scrollTop = 0;
            body.classList.remove('dwl-scroll-body', 'dwl-images-preparing', 'dwl-ready-in');
            body.style.removeProperty('--panel-fill-max');
        }
        renderDots();
    }

    function scheduleWishlistReleaseAfterExit(waitForTransition) {
        cancelScheduledWishlistRelease();
        const beginDelay = () => {
            if (wishlistExitTransitionTimer) {
                window.clearTimeout(wishlistExitTransitionTimer);
                wishlistExitTransitionTimer = 0;
            }
            if (wishlistExitTransitionHandler && panel) {
                panel.removeEventListener('transitionend', wishlistExitTransitionHandler);
            }
            wishlistExitTransitionHandler = null;
            if (panelOpening || panel?.classList.contains('active')) return;
            wishlistReleaseTimer = window.setTimeout(
                releaseClosedWishlistResources,
                WISHLIST_RELEASE_DELAY_MS
            );
        };

        if (!waitForTransition || !panel) {
            beginDelay();
            return;
        }
        wishlistExitTransitionHandler = event => {
            if (event.target === panel && event.propertyName === 'opacity') beginDelay();
        };
        panel.addEventListener('transitionend', wishlistExitTransitionHandler);
        // Instant conflict closes suppress transitionend; never retain a
        // closed wishlist forever just because that event was skipped.
        wishlistExitTransitionTimer = window.setTimeout(
            beginDelay,
            WISHLIST_EXIT_TRANSITION_FALLBACK_MS
        );
    }

    function openThroneMockup() {
        const el = ensurePanel();
        if (!el) return;
        if (hasConflictingLayer()) return;
        if (el.classList.contains('active') || panelOpening) return;
        cancelScheduledWishlistRelease();
        itemsFetchController?.abort();
        itemsFetchController = null;
        itemsLoadRun += 1;
        cancelAtomicImageWaits();
        const checkoutArt = el.querySelector('.doll-wishlist-checkout-art[data-checkout-src]');
        if (checkoutArt && !checkoutArt.getAttribute('src') && checkoutArt.dataset.checkoutLoadStarted !== 'true') {
            checkoutArt.dataset.checkoutLoadStarted = 'true';
            const finishCheckoutArtLoad = () => {
                checkoutArt.removeEventListener('error', retryCheckoutArtLoad);
                delete checkoutArt.dataset.checkoutLoadStarted;
            };
            const retryCheckoutArtLoad = () => {
                checkoutArt.removeEventListener('load', finishCheckoutArtLoad);
                delete checkoutArt.dataset.checkoutLoadStarted;
                checkoutArt.removeAttribute('src');
            };
            checkoutArt.addEventListener('load', finishCheckoutArtLoad, { once: true });
            checkoutArt.addEventListener('error', retryCheckoutArtLoad, { once: true });
            checkoutArt.src = checkoutArt.dataset.checkoutSrc;
        }

        panelOpening = true;
        closeOtherContentPanels();
        // Lock the note's interactivity now, but defer its actual hide
        // transition to the same rAF that adds .active below — starting
        // both transitions in the same frame instead of racing the
        // synchronous renderBody()/syncReservedHeight() work in between is
        // what stops the note from visibly "swapping upward" ahead of the
        // panel's own entrance.
        document.getElementById('note-peel-target')?.classList.add('dwl-note-locking');
        const wishlistButton = getWishlistButton();
        wishlistButton?.classList.remove('show-glitter');
        wishlistButton?.classList.add('dwl-open');
        wishlistButton?.setAttribute('aria-expanded', 'true');
        wishlistButton?.setAttribute('aria-label', 'Close wishlist');
        document.querySelector('.site-brand-footer')?.setAttribute('aria-label', 'Full wishlist on Throne');

        selectedIds = new Set();
        checkoutStatusMessage = '';
        previewOpenCount = 0;
        el.classList.remove('has-selection');
        window.dollResetIconsCollapse?.();
        // Apply the wishlist's stable open-state gap/footer before measuring
        // so the frozen panel geometry matches what is actually displayed.
        document.body.classList.add('has-wishlist-panel-open');

        // Every visit is a two-state lifecycle: paw-only fetching, then one
        // atomic reveal of the freshly synchronized and decoded result set.
        loadState = 'loading';
        items = [];
        renderBody();
        renderFoot();
        el.classList.add('dwl-measure-open');
        syncReservedHeight(true);
        el.classList.remove('dwl-measure-open');

        // Commit the hidden starting state before adding .active. This keeps
        // repeat opens reliable and gives opacity/transform one clean start.
        void el.offsetWidth;
        panelOpenRaf = window.requestAnimationFrame(() => {
            panelOpenRaf = 0;
            if (!panelOpening) return;
            panelOpening = false;
            hideNoteImage();
            el.classList.add('active');
            el.setAttribute('aria-hidden', 'false');
            resetSwipeHintSequence();

            void loadItems({ bodyPrepared: true });
        });
    }

    function closeThroneMockup(silent = false) {
        const wasOpening = panelOpening;
        const wasOpen = Boolean(panel?.classList.contains('active'));
        if (panelOpenRaf) {
            window.cancelAnimationFrame(panelOpenRaf);
            panelOpenRaf = 0;
        }
        panelOpening = false;
        if (wasOpen || wasOpening) {
            itemsLoadRun += 1;
            itemsFetchController?.abort();
            itemsFetchController = null;
            cancelCheckoutRequest();
        }
        closePreview();
        cancelSwipeHintSequence();
        document.body.classList.remove('has-wishlist-panel-open', 'has-wishlist-selection');
        window.dollResetIconsCollapse?.();
        window.dollClearScrollMotion?.(panel?.querySelector('.doll-wishlist-scroll-shell'));
        panel?.querySelector('.doll-wishlist-body')?.style.removeProperty('--panel-fill-max');
        const wishlistButton = getWishlistButton();
        wishlistButton?.classList.remove('dwl-open', 'show-glitter');
        wishlistButton?.setAttribute('aria-expanded', 'false');
        wishlistButton?.setAttribute('aria-label', 'Open wishlist');
        document.querySelector('.site-brand-footer')?.setAttribute('aria-label', 'Site home');
        panel?.closest('.toggle-container')?.style.removeProperty('--dwl-wishlist-height');
        if (!panel || (!wasOpen && !wasOpening)) return;
        if (!silent) playSound('tap');
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
        showNoteImage();
        scheduleWishlistReleaseAfterExit(wasOpen);
    }

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (previewOverlay?.classList.contains('active')) {
            closePreview();
            return;
        }
        if (panel?.classList.contains('active')) closeThroneMockup();
    });

    window.addEventListener('resize', () => {
        if (resizeRaf || loadState !== 'ready') return;
        resizeRaf = window.requestAnimationFrame(() => {
            resizeRaf = 0;
            renderDots();
            updateActiveDot();
            syncTitleMarquees();
        });
    }, { passive: true });

    window.openThroneMockup = openThroneMockup;
    window.closeThroneMockup = closeThroneMockup;

    if (document.querySelector('.content-area')) {
        buildPanel();
    } else {
        document.addEventListener('DOMContentLoaded', buildPanel, { once: true });
    }
}());
