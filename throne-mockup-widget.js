(function() {
    const panelId = 'doll-wishlist-panel';
    const styleId = 'doll-wishlist-style';
    const previewStyleId = 'doll-wishlist-preview-style';
    const marqueeStyleId = 'doll-wishlist-marquee-keyframes';
    const SUPABASE_URL = 'https://zvqdodzkhmcptwkjlfeu.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8';
    const FETCH_TIMEOUT_MS = 6000;
    const MAX_FEATURED = 12;
    const NAME_MAX = 60;
    const CARD_GAP = 10;
    const PAGE_SIZE = 4;
    const FULL_WISHLIST_URL = 'https://throne.com/edoll';

    const HEART_PATH = 'M12 20.3s-7.6-4.5-9.9-9C.6 7.7 2.3 4.3 5.9 4c2.2-.2 4.2 1 6.1 3.4C13.9 5 15.9 3.8 18.1 4c3.6.3 5.3 3.7 3.8 7.3-2.3 4.5-9.9 9-9.9 9z';
    const ICON_HEART = `<svg class="dwl-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
    const ICON_HEART_FILLED = `<svg class="dwl-heart-filled" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;

    let panel = null;
    let items = [];
    let selectedIds = new Set();
    let loadState = 'idle'; // idle | loading | ready | failed
    let checkoutInFlight = false;
    let checkoutStatusMessage = '';
    let scrollRaf = 0;
    let resizeRaf = 0;
    let panelResizeObserver = null;
    let panelMutationObserver = null;
    let conflictObserver = null;
    let conflictClickGuardReady = false;
    let throneFooterLink = null;
    let previewOverlay = null;
    let previewOpenCount = 0;
    let marqueeRuleCounter = 0;

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

    function withTimeout(promise, ms) {
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    function injectStyles() {
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .doll-wishlist-panel {
                --dwl-sans: "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif;
                --dwl-cute: "Chalkboard SE", "Comic Sans MS", "Segoe Print", cursive;
                --dwl-ink: #663b4b;
                --dwl-pink: #f47fad;
                --dwl-line: rgba(239, 183, 204, 0.72);
                position: absolute;
                top: 0;
                left: 50%;
                width: min(88vw, 324px);
                transform: translateX(-50%) translateY(-7px) scale(0.988);
                opacity: 0;
                pointer-events: none;
                /* Matches .note-peel-target's own hide/show timing (0.46s
                   opacity / 0.42s transform) so the note and this panel
                   cross-fade in lockstep instead of at mismatched speeds
                   (which reads as a glitch/double-image when swapping). */
                transition: opacity 0.46s ease, transform 0.42s cubic-bezier(0.2, 0.9, 0.25, 1);
                z-index: 9;
            }

            .doll-wishlist-panel.active {
                opacity: 1;
                pointer-events: auto;
                transform: translateX(-50%) translateY(0) scale(1);
            }

            body.has-wishlist-panel-open {
                overflow-x: hidden;
                overflow-y: auto;
            }

            body.has-wishlist-panel-open .toggle-container {
                min-height: var(--dwl-wishlist-height, 220px);
                transition: min-height 0.22s ease;
            }

            /* !important because a short-viewport rule in styles.css
               (@media max-height:720px) also sets .site-brand-footer's
               margin-top, and this needs to win unconditionally so the
               throne.com pill always sits tight under the panel, never
               inheriting that rule's much larger gap. */
            body.has-wishlist-panel-open .site-brand-footer {
                margin-top: 10px !important;
            }

            body.has-wishlist-panel-open .button-group {
                margin-bottom: 3px;
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
            .doll-wishlist-throne-footer-link .site-brand-gg {
                margin-left: 3px;
                white-space: nowrap;
            }

            .doll-wishlist-body {
                position: relative;
            }

            .doll-wishlist-scroll {
                display: flex;
                gap: ${CARD_GAP}px;
                overflow-x: auto;
                overflow-y: hidden;
                scroll-snap-type: x mandatory;
                scroll-padding-inline: 1px;
                overscroll-behavior-x: contain;
                -webkit-overflow-scrolling: touch;
                padding: 5px 1px 15px;
                margin: 0 -1px;
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
                padding: 1px;
                scroll-snap-align: start;
                scroll-snap-stop: always;
            }

            /* If a page ends up with an odd tile count (only possible on the
               final page), its last tile would otherwise sit alone with a
               blank cell beside it — span the full row instead. */
            .doll-wishlist-page > :last-child:nth-child(odd) {
                grid-column: 1 / -1;
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

            .doll-wishlist-panel.active .doll-wishlist-item:not(.doll-wishlist-skeleton) {
                animation: dollWishlistCardIn 0.22s ease backwards;
            }

            @keyframes dollWishlistCardIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .doll-wishlist-item.selected {
                border-color: rgba(235, 107, 157, 0.86);
                transform: translateY(-2px);
            }

            /* The glow lives on its own pseudo-element rather than animating
               the card's own box-shadow/animation — that way it can never
               collide with the card's entrance-fade animation (both would
               otherwise fight over the same "animation" property). */
            .doll-wishlist-item::after {
                content: "";
                position: absolute;
                inset: -4px;
                border-radius: 22px;
                opacity: 0;
                pointer-events: none;
                box-shadow: 0 0 0 3px rgba(255, 179, 209, 0.3), 0 0 14px 2px rgba(255, 141, 193, 0.24);
                transition: opacity 0.22s ease;
            }
            .doll-wishlist-item.selected::after {
                opacity: 1;
                animation: dollWishlistGlowPulse 2.6s ease-in-out 0.35s infinite;
            }
            @keyframes dollWishlistGlowPulse {
                0%, 100% { box-shadow: 0 0 0 3px rgba(255, 179, 209, 0.3), 0 0 14px 2px rgba(255, 141, 193, 0.24); }
                50% { box-shadow: 0 0 0 3px rgba(255, 179, 209, 0.5), 0 0 26px 6px rgba(255, 141, 193, 0.4); }
            }

            /* A quick burst from the heart button sweeps across the card the
               instant it's picked, timed to fade out right as the border
               glow (above) finishes fading in — the light "reaches" the
               edge and that's what ignites the glow. */
            .doll-wishlist-item::before {
                content: "";
                position: absolute;
                right: 13px;
                bottom: 12px;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 158, 205, 0.85) 32%, rgba(255, 158, 205, 0) 70%);
                opacity: 0;
                pointer-events: none;
                transform: scale(0);
                z-index: 2;
            }
            .doll-wishlist-item.selected::before {
                animation: dollWishlistBurst 0.5s cubic-bezier(0.15, 0.7, 0.3, 1) both;
            }
            @keyframes dollWishlistBurst {
                0% { opacity: 0.9; transform: scale(0); }
                65% { opacity: 0.45; transform: scale(17); }
                100% { opacity: 0; transform: scale(20); }
            }

            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-item.selected::after {
                    animation: none;
                    box-shadow: 0 0 0 3px rgba(255, 179, 209, 0.42), 0 0 18px 3px rgba(255, 141, 193, 0.3);
                }
                .doll-wishlist-item.selected::before {
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
                transition: transform 0.36s cubic-bezier(0.2, 0.82, 0.24, 1), filter 0.3s ease;
            }

            .doll-wishlist-name {
                min-width: 0;
                margin: 7px 7px 0 7px;
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
            .doll-wishlist-name.dwl-marquee {
                -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);
                mask-image: linear-gradient(90deg, transparent 0, #000 8px, #000 calc(100% - 8px), transparent 100%);
            }
            .doll-wishlist-name.dwl-marquee > span {
                display: inline-block;
                animation-timing-function: linear;
                animation-iteration-count: infinite;
                will-change: transform, opacity;
            }
            @media (prefers-reduced-motion: reduce) {
                .doll-wishlist-name.dwl-marquee {
                    -webkit-mask-image: none;
                    mask-image: none;
                }
                .doll-wishlist-name.dwl-marquee > span {
                    animation: none;
                    display: inline;
                }
            }

            .doll-wishlist-foot-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                min-height: 16px;
                margin: 3px 7px 7px;
                text-align: left;
            }

            .doll-wishlist-price {
                min-width: 0;
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

            .doll-wishlist-cart-btn {
                flex: 0 0 auto;
                width: 28px;
                height: 28px;
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

            @media (hover: hover) and (pointer: fine) {
                .doll-wishlist-item:not(.selected):hover {
                    border-color: rgba(232, 151, 182, 0.82);
                    box-shadow:
                        inset 0 0 0 2px rgba(255, 255, 255, 0.94),
                        0 9px 18px rgba(174, 75, 113, 0.13);
                    transform: translateY(-3px);
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
                display: flex;
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

            .doll-wishlist-more-card:focus-visible {
                outline: 2px solid rgba(216, 69, 125, 0.58);
                outline-offset: 2px;
            }

            .doll-wishlist-more-card {
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 7px;
                min-width: 0;
                padding: 12px;
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
            /* A hand-drawn dashed inset, echoing the ask-form note's own
               ::before treatment — a small nod to the site's paper/doodle
               language instead of a plain flat card. */
            .doll-wishlist-more-card::before {
                content: "";
                position: absolute;
                inset: 5px;
                border: 1.5px dashed rgba(255, 180, 212, 0.58);
                border-radius: 13px;
                pointer-events: none;
            }
            .dwl-more-label {
                font-family: var(--dwl-cute);
                font-size: 12px;
                font-weight: 600;
                line-height: 1;
            }
            .dwl-more-arrow {
                position: relative;
                display: grid;
                place-items: center;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 1px solid rgba(245, 185, 208, 0.82);
                background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), #ffedf4);
                color: #ef6d9f;
                font-family: system-ui, sans-serif;
                font-size: 13px;
                line-height: 1;
                transition: transform 0.18s ease;
            }
            .dwl-more-arrow::after {
                content: "✧";
                position: absolute;
                top: -6px;
                right: -5px;
                font-family: var(--dwl-cute);
                font-size: 11px;
                line-height: 1;
                color: rgba(244, 127, 173, 0.9);
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

            .doll-wishlist-skeleton {
                pointer-events: none;
            }
            .doll-wishlist-skeleton .doll-wishlist-media,
            .doll-wishlist-skeleton .dwl-sk-line {
                background: linear-gradient(100deg, #fff2f7 25%, #ffdae9 48%, #fff2f7 72%);
                background-size: 220% 100%;
                animation: dollWishlistShimmer 1.3s ease-in-out infinite;
            }
            .doll-wishlist-skeleton .doll-wishlist-media::after { display: none; }
            .doll-wishlist-skeleton .dwl-sk-line {
                height: 8px;
                border-radius: 999px;
                margin: 8px 7px 0;
                width: 68%;
            }
            .doll-wishlist-skeleton .dwl-sk-line.short {
                width: 38%;
                margin-top: 6px;
                margin-bottom: 8px;
            }

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
                margin: 9px auto 0;
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

            .doll-wishlist-checkout {
                flex: 0 0 auto;
                min-height: 36px;
                padding: 0 17px;
                border: 1px solid rgba(220, 84, 135, 0.24);
                border-radius: 999px;
                background: linear-gradient(180deg, #fa9ec1 0%, #ec6f9f 100%);
                color: #fff;
                font-family: var(--dwl-cute);
                font-size: 11.5px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(145, 44, 82, 0.18);
                box-shadow:
                    0 6px 13px rgba(202, 70, 122, 0.22),
                    inset 0 1px 0 rgba(255, 255, 255, 0.48);
                cursor: pointer;
                transition: transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease, opacity 0.16s ease;
            }
            .doll-wishlist-checkout:not(:disabled):hover {
                transform: translateY(-1px);
                filter: saturate(1.04);
                box-shadow: 0 8px 16px rgba(202, 70, 122, 0.27), inset 0 1px 0 rgba(255, 255, 255, 0.5);
            }
            .doll-wishlist-checkout:not(:disabled):active { transform: scale(0.97); }
            .doll-wishlist-checkout:focus-visible {
                outline: 2px solid rgba(216, 69, 125, 0.62);
                outline-offset: 2px;
            }
            .doll-wishlist-checkout:disabled { opacity: 0.55; cursor: default; }

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
                .doll-wishlist-checkout {
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
                    border-color: rgba(237, 139, 176, 0.92);
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
            .doll-wishlist-preview-img {
                display: block;
                width: 100%;
                max-height: 60vh;
                object-fit: contain;
                border-radius: 20px;
                background: #fff;
                box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35), 0 0 0 4px rgba(255, 255, 255, 0.85);
            }
            .doll-wishlist-preview-caption {
                display: flex;
                align-items: center;
                gap: 10px;
                max-width: 100%;
                margin: 14px 0 0;
                padding: 8px 18px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.94);
                box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
                font-family: var(--dwl-cute, "Comic Sans MS", cursive);
            }
            .doll-wishlist-preview-name {
                max-width: 210px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                font-size: 13px;
                font-weight: 600;
                color: #663b4b;
            }
            .doll-wishlist-preview-hint {
                margin: 10px 0 0;
                padding: 6px 16px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.86);
                color: #a3486e;
                font-family: var(--dwl-cute, "Comic Sans MS", cursive);
                font-size: 11.5px;
                font-weight: 600;
                text-align: center;
            }
            .doll-wishlist-preview-hint:empty { display: none; }
            .doll-wishlist-preview-price {
                flex: 0 0 auto;
                font-family: var(--dwl-sans, "Trebuchet MS", sans-serif);
                font-weight: 700;
                font-size: 13px;
                color: #ef6d9f;
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
        throneFooterLink.innerHTML = `
            <span class="site-brand-name">throne</span><span class="site-brand-dot">.</span><span class="site-brand-gg">com</span>
        `;
        throneFooterLink.addEventListener('click', openInNewTab);
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
                <img class="doll-wishlist-preview-img" src="" alt="">
                <figcaption class="doll-wishlist-preview-caption">
                    <span class="doll-wishlist-preview-name"></span>
                    <span class="doll-wishlist-preview-price"></span>
                </figcaption>
                <p class="doll-wishlist-preview-hint"></p>
            </figure>
        `;
        // Tapping the dark backdrop closes it; tapping the card itself must
        // not, so the card swallows its own clicks before they can bubble up.
        previewOverlay.addEventListener('click', closePreview);
        previewOverlay.querySelector('.doll-wishlist-preview-card').addEventListener('click', e => e.stopPropagation());
        previewOverlay.querySelector('.doll-wishlist-preview-close').addEventListener('click', closePreview);
        document.body.appendChild(previewOverlay);
        return previewOverlay;
    }

    function openPreview(item) {
        if (!item) return;
        const overlay = ensurePreviewOverlay();
        overlay.querySelector('.doll-wishlist-preview-img').src = item.image_url || '';
        overlay.querySelector('.doll-wishlist-preview-name').textContent = String(item.name || '').trim() || 'wishlist item';
        overlay.querySelector('.doll-wishlist-preview-price').textContent = formatPrice(item.price_cents);

        // A gentle nudge the second time (and after) someone previews a
        // photo without having picked anything yet — never on the very
        // first look, and it stops the moment they heart something.
        previewOpenCount += 1;
        const hint = overlay.querySelector('.doll-wishlist-preview-hint');
        if (hint) {
            hint.textContent = previewOpenCount >= 2 && !selectedIds.size
                ? "don't forget to heart your favorites! ♡"
                : '';
        }

        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        playSound('tap');
    }

    function closePreview() {
        if (!previewOverlay || !previewOverlay.classList.contains('active')) return;
        previewOverlay.classList.remove('active');
        previewOverlay.setAttribute('aria-hidden', 'true');
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
            <div class="doll-wishlist-body"></div>
            <nav class="doll-wishlist-dots" aria-label="wishlist pages"></nav>
            <p class="doll-wishlist-status"></p>
            <div class="doll-wishlist-foot">
                <span class="doll-wishlist-count"><b>0 items</b><small>+ fees at checkout</small></span>
                <button type="button" class="doll-wishlist-checkout" disabled>checkout</button>
            </div>
        `;

        contentArea.appendChild(panel);

        if (typeof window.ResizeObserver === 'function') {
            panelResizeObserver?.disconnect();
            panelResizeObserver = new ResizeObserver(() => syncReservedHeight());
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

    function closeOtherContentPanels() {
        const drawingWidget = document.querySelector('.drawing-widget');
        const pencilButton = document.getElementById('toggle-button');
        if (drawingWidget?.classList.contains('active')) {
            drawingWidget.classList.remove('active');
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
            postsPopup.classList.remove('active');
            if (postsButton) postsButton.textContent = ':3';
        }
    }

    function hideNoteImage() {
        document.getElementById('note-peel-target')?.classList.add('hidden');
        document.querySelector('.note-image')?.classList.add('hidden');
    }

    function showNoteImage() {
        document.getElementById('note-peel-target')?.classList.remove('hidden');
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
                    '#latest-note-toggle',
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

    function syncReservedHeight() {
        if (!panel?.classList.contains('active')) return;
        const host = panel.closest('.toggle-container');
        if (!host) return;
        const panelRect = panel.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        const neededHeight = Math.max(60, Math.ceil(panelRect.bottom - hostRect.top + 4));
        host.style.setProperty('--dwl-wishlist-height', `${neededHeight}px`);
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
        if (!scroll || !dots.length || !pages.length) return;
        const firstOffset = pages[0].offsetLeft;
        const idx = pages.reduce((best, page, index) => {
            const distance = Math.abs(scroll.scrollLeft - (page.offsetLeft - firstOffset));
            return distance < best.distance ? { index, distance } : best;
        }, { index: 0, distance: Infinity }).index;
        dots.forEach((dot, i) => dot.classList.toggle('active', i === idx));
    }

    function onScroll() {
        if (scrollRaf) return;
        scrollRaf = window.requestAnimationFrame(() => {
            scrollRaf = 0;
            updateActiveDot();
        });
    }

    function renderSkeleton() {
        return `<div class="doll-wishlist-scroll"><div class="doll-wishlist-page">${Array.from({ length: PAGE_SIZE }).map(() => `
                <div class="doll-wishlist-item doll-wishlist-skeleton">
                    <div class="doll-wishlist-media"></div>
                    <span class="dwl-sk-line"></span>
                    <span class="dwl-sk-line short"></span>
                </div>
            `).join('')}</div></div>`;
    }

    function pagesMarkup(list) {
        // The full-list link rides along as one extra virtual slot at the
        // end, then everything is chunked into pages together. Only the
        // final page can ever come up short (every earlier page is a full
        // PAGE_SIZE); if it lands on an odd count, CSS makes its last tile
        // span the full row instead of leaving a blank cell beside it.
        const slots = [...list, null];
        const pageItems = [];
        for (let index = 0; index < slots.length; index += PAGE_SIZE) {
            pageItems.push(slots.slice(index, index + PAGE_SIZE));
        }

        return pageItems.map(page => `
            <div class="doll-wishlist-page">
                ${page.map(item => item ? cardMarkup(item) : seeMoreMarkup()).join('')}
            </div>
        `).join('');
    }

    function seeMoreMarkup() {
        return `
        <a class="doll-wishlist-more-card" href="${FULL_WISHLIST_URL}" target="_blank" rel="noopener noreferrer" aria-label="See the full wishlist on Throne">
            <span class="dwl-more-arrow" aria-hidden="true">↗</span>
            <span class="dwl-more-label">see all</span>
        </a>`;
    }

    function cardMarkup(item) {
        const selected = selectedIds.has(item.throne_item_id);
        const fullLabel = String(item.name || '').trim() || 'wishlist item';
        const label = capName(fullLabel);
        return `
        <article class="doll-wishlist-item${selected ? ' selected' : ''}" data-item-id="${escapeHtml(item.throne_item_id)}">
            <div class="doll-wishlist-media">
                <img src="${escapeHtml(item.image_url)}" alt="" loading="lazy" onerror="this.onerror=null;this.removeAttribute('src');this.parentNode.style.background='rgba(255,214,235,0.6)';">
            </div>
            <p class="doll-wishlist-name" title="${escapeHtml(fullLabel)}">${escapeHtml(label)}</p>
            <div class="doll-wishlist-foot-row">
                <span class="doll-wishlist-price">${escapeHtml(formatPrice(item.price_cents))}</span>
                <button type="button" class="doll-wishlist-cart-btn" data-item-id="${escapeHtml(item.throne_item_id)}" aria-label="${selected ? 'Remove ' : 'Add '}${escapeHtml(fullLabel)}" aria-pressed="${selected}">
                    ${ICON_HEART}${ICON_HEART_FILLED}
                </button>
            </div>
        </article>`;
    }

    function renderBody() {
        if (!panel) return;
        const body = panel.querySelector('.doll-wishlist-body');
        if (loadState === 'loading') {
            body.innerHTML = renderSkeleton();
            renderDots();
            return;
        }
        if (loadState === 'failed') {
            body.innerHTML = `<div class="doll-wishlist-state">couldn't load the wishlist here.<br>opening the full site instead…</div>`;
            renderDots();
            return;
        }
        if (loadState === 'ready' && !items.length) {
            body.innerHTML = `<div class="doll-wishlist-state">nothing featured yet.<br>opening the full site instead…</div>`;
            renderDots();
            return;
        }

        body.innerHTML = `<div class="doll-wishlist-scroll">${pagesMarkup(items)}</div>`;

        const scroll = body.querySelector('.doll-wishlist-scroll');
        scroll.addEventListener('scroll', onScroll, { passive: true });
        body.querySelectorAll('.doll-wishlist-cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleItem(btn.dataset.itemId);
            });
        });
        body.querySelectorAll('.doll-wishlist-media').forEach(media => {
            media.addEventListener('click', () => {
                const id = media.closest('.doll-wishlist-item')?.dataset.itemId;
                const item = items.find(candidate => candidate.throne_item_id === id);
                if (item) openPreview(item);
            });
        });
        body.querySelector('.doll-wishlist-more-card')?.addEventListener('click', openInNewTab);
        window.requestAnimationFrame(() => syncTitleMarquees(body));
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
    function buildMarqueeKeyframes(overflow) {
        const shift = -(overflow + 4);
        const scrollDuration = Math.min(9, Math.max(2.4, overflow / 55));
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

        const name = `dwlMarquee${marqueeRuleCounter++}`;
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
        checkoutBtn.textContent = checkoutInFlight ? 'opening…' : 'checkout';
        const statusEl = panel.querySelector('.doll-wishlist-status');
        if (statusEl) statusEl.textContent = checkoutStatusMessage;
        syncReservedHeight();
    }

    function toggleItem(id) {
        if (!id) return;
        playSound('tap');
        if (selectedIds.has(id)) selectedIds.delete(id);
        else selectedIds.add(id);

        // Update just the one card in place so the carousel keeps its scroll
        // position instead of snapping back to the start on every tap.
        const card = panel?.querySelector(`.doll-wishlist-item[data-item-id="${CSS.escape(id)}"]`);
        if (card) {
            const selected = selectedIds.has(id);
            card.classList.toggle('selected', selected);
            const btn = card.querySelector('.doll-wishlist-cart-btn');
            if (btn) {
                btn.setAttribute('aria-pressed', String(selected));
                const nameEl = card.querySelector('.doll-wishlist-name');
                const label = nameEl?.getAttribute('title') || nameEl?.textContent || '';
                btn.setAttribute('aria-label', `${selected ? 'Remove ' : 'Add '}${label}`);
            }
        } else {
            renderBody();
        }
        renderFoot();
    }

    async function waitForSupabaseClient(maxAttempts) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const client = window.supabase;
            if (client && typeof client.from === 'function') return client;
            await new Promise(resolve => window.setTimeout(resolve, 100));
        }
        return null;
    }

    async function loadItems() {
        loadState = 'loading';
        renderBody();

        // script.js lazy-loads the Supabase client after first paint, so it
        // may not exist yet if the widget is opened right away — wait a bit
        // rather than treating "not ready yet" as a hard failure.
        const client = await waitForSupabaseClient(30);
        if (!client) {
            loadState = 'failed';
            renderBody();
            window.setTimeout(fallbackToLegacy, 900);
            return;
        }

        try {
            const { data, error } = await withTimeout(
                client.from('wishlist_items')
                    .select('*')
                    .eq('featured', true)
                    .eq('is_available', true)
                    .order('position')
                    .limit(MAX_FEATURED),
                FETCH_TIMEOUT_MS
            );
            if (error) throw error;
            items = Array.isArray(data) ? data : [];
            loadState = 'ready';
            renderBody();
            renderFoot();
            if (!items.length) {
                window.setTimeout(fallbackToLegacy, 900);
            }
        } catch (err) {
            loadState = 'failed';
            renderBody();
            window.setTimeout(fallbackToLegacy, 900);
        }
    }

    function triggerBackgroundSync() {
        // Fire-and-forget: safe to call on every open because the function
        // itself throttles real Throne calls server-side. Never blocks
        // rendering and never surfaces errors to the visitor.
        fetch(`${SUPABASE_URL}/functions/v1/throne-wishlist-sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        }).catch(() => {});
    }

    async function startCheckout() {
        if (checkoutInFlight || !selectedIds.size) return;
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
                }),
                FETCH_TIMEOUT_MS
            );
            const body = await res.json().catch(() => ({}));

            if (res.status === 409) {
                // Something the visitor picked sold out / got unfeatured
                // between selecting and checking out. Never silently ship a
                // smaller cart — refresh what's actually still available and
                // let them retry with an honest selection.
                checkoutStatusMessage = 'sorry, something you picked just sold out — pick again?';
                checkoutInFlight = false;
                await loadItems();
                const stillValid = new Set(items.map(item => item.throne_item_id));
                selectedIds = new Set(Array.from(selectedIds).filter(id => stillValid.has(id)));
                renderBody();
                renderFoot();
                return;
            }

            if (!res.ok || !body.checkoutUrl) {
                throw new Error(body.error || `throne-cart ${res.status}`);
            }
            window.open(body.checkoutUrl, '_blank', 'noopener,noreferrer');
            closeThroneMockup();
        } catch (err) {
            fallbackToLegacy();
        } finally {
            checkoutInFlight = false;
            if (panel) renderFoot();
        }
    }

    function openThroneMockup() {
        const el = ensurePanel();
        if (!el) return;
        if (hasConflictingLayer()) return;

        closeOtherContentPanels();
        hideNoteImage();
        document.body.classList.add('has-wishlist-panel-open');
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
        el.classList.add('active');
        el.setAttribute('aria-hidden', 'false');
        renderFoot();

        loadItems();
        triggerBackgroundSync();
    }

    function closeThroneMockup(silent = false) {
        closePreview();
        document.body.classList.remove('has-wishlist-panel-open', 'has-wishlist-selection');
        const wishlistButton = getWishlistButton();
        wishlistButton?.classList.remove('dwl-open', 'show-glitter');
        wishlistButton?.setAttribute('aria-expanded', 'false');
        wishlistButton?.setAttribute('aria-label', 'Open wishlist');
        document.querySelector('.site-brand-footer')?.setAttribute('aria-label', 'Site home');
        panel?.closest('.toggle-container')?.style.removeProperty('--dwl-wishlist-height');
        if (!panel || !panel.classList.contains('active')) return;
        if (!silent) playSound('tap');
        panel.classList.remove('active');
        panel.setAttribute('aria-hidden', 'true');
        showNoteImage();
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
