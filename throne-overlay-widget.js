(function() {
    let wishlistUrl = window.dollThroneUrl || 'https://throne.com/edoll';
    const widgetId = 'doll-throne-overlay';
    const styleId = 'doll-throne-overlay-style';
    let overlay = null;
    let iframeLoaded = false;
    let fallbackTimer = null;
    let backNavigationActive = false;
    let backNavigationStartedAt = 0;
    let backNavigationSafetyTimer = null;
    let unloadIframeTimer = null;
    let openVeilTimer = null;
    let fullWebsiteHintTimer = null;
    let fullWebsiteHintHideTimer = null;
    let fullWebsiteHintCycle = 0;
    let throneReturnFocus = null;

    function playSound(type) {
        if (typeof window.dollPlayUiSound === 'function') {
            window.dollPlayUiSound(type);
        }
    }

    function injectStyles() {
        if (document.getElementById(styleId)) return;

        const preconnect = document.createElement('link');
        preconnect.rel = 'preconnect';
        preconnect.href = 'https://throne.com';
        document.head.appendChild(preconnect);

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .doll-throne-overlay {
                --throne-scale: 0.8;
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: max(18px, env(safe-area-inset-top, 0px)) 18px max(18px, env(safe-area-inset-bottom, 0px));
                visibility: hidden;
                pointer-events: none;
                z-index: 10001;
                overflow: hidden;
                overscroll-behavior: contain;
                transition: visibility 0s linear 0.58s;
            }

            body.has-throne-overlay-open {
                overflow: hidden;
            }

            .doll-throne-overlay.show {
                visibility: visible;
                pointer-events: auto;
                transition-delay: 0s;
            }

            .doll-throne-scrim {
                position: absolute;
                inset: 0;
                background:
                    radial-gradient(circle at 50% 44%, rgba(255, 214, 235, 0.72), transparent 34%),
                    rgba(255, 247, 251, 0.3);
                opacity: 0;
                backdrop-filter: blur(0px);
                -webkit-backdrop-filter: blur(0px);
                transition:
                    opacity 0.5s ease,
                    backdrop-filter 0.62s ease,
                    -webkit-backdrop-filter 0.62s ease;
            }

            .doll-throne-overlay.show .doll-throne-scrim {
                opacity: 1;
                backdrop-filter: blur(9px);
                -webkit-backdrop-filter: blur(9px);
            }

            .doll-throne-frame {
                position: relative;
                width: min(123.75vw, 429px);
                height: min(102.5vh, 650px);
                min-height: min(575px, 102.5vh);
                border: 1px solid rgba(255, 178, 215, 0.66);
                border-radius: 28px;
                background:
                    radial-gradient(circle at 20% 12%, rgba(255, 255, 255, 0.9), transparent 22%),
                    linear-gradient(145deg, rgba(255, 254, 255, 0.92), rgba(255, 229, 241, 0.84));
                box-shadow:
                    0 24px 60px rgba(202, 82, 147, 0.24),
                    0 2px 0 rgba(255, 255, 255, 0.86) inset,
                    0 0 0 7px rgba(255, 255, 255, 0.22);
                opacity: 0;
                overflow: visible;
                transform: translateY(18px) scale(calc(var(--throne-scale) * 0.96));
                transition:
                    opacity 0.34s ease 0.08s,
                    transform 0.46s cubic-bezier(0.18, 0.9, 0.24, 1);
            }

            .doll-throne-overlay.show .doll-throne-frame {
                opacity: 1;
                transform: translateY(0) scale(var(--throne-scale));
            }

            .doll-throne-frame::before {
                content: '';
                position: absolute;
                inset: 8px;
                border: 1px solid rgba(255, 186, 220, 0.42);
                border-radius: 22px;
                pointer-events: none;
                z-index: 5;
            }

            .doll-throne-frame::after {
                content: '';
                position: absolute;
                inset: 0;
                border: 8px solid transparent;
                border-radius: 28px;
                background:
                    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 205, 232, 0.54), rgba(255, 255, 255, 0.78), rgba(255, 174, 218, 0.42)) border-box;
                box-shadow:
                    inset 0 0 14px rgba(255, 255, 255, 0.82),
                    inset 0 0 24px rgba(255, 166, 214, 0.42),
                    0 0 16px rgba(255, 203, 229, 0.26);
                -webkit-mask:
                    linear-gradient(#000 0 0) padding-box,
                    linear-gradient(#000 0 0);
                -webkit-mask-composite: xor;
                mask:
                    linear-gradient(#000 0 0) padding-box,
                    linear-gradient(#000 0 0);
                mask-composite: exclude;
                pointer-events: none;
                z-index: 4;
            }

            .doll-throne-close,
            .doll-throne-back,
            .doll-throne-popout {
                z-index: 8;
                display: grid;
                place-items: center;
                border: 1px solid rgba(255, 168, 209, 0.58);
                background: rgba(255, 247, 251, 0.9);
                color: rgba(177, 72, 126, 0.84);
                box-shadow:
                    0 9px 20px rgba(214, 92, 151, 0.16),
                    inset 0 1px 0 rgba(255, 255, 255, 0.92);
                cursor: pointer;
                -webkit-tap-highlight-color: transparent;
            }

            .doll-throne-close {
                position: static;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                font-family: Georgia, serif;
                font-size: 26px;
                line-height: 1;
            }

            .doll-throne-close span {
                transform: translateY(-2px);
            }

            .doll-throne-controls {
                position: absolute;
                left: 50%;
                bottom: -17px;
                z-index: 8;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transform: translateX(-50%);
            }

            .doll-throne-back,
            .doll-throne-popout {
                position: static;
                height: 30px;
                border-radius: 999px;
                font-family: "Comic Sans MS", "Trebuchet MS", cursive;
                font-size: 11px;
                font-weight: 700;
            }

            .doll-throne-back {
                min-width: 34px;
                width: 34px;
                height: 34px;
                padding: 0;
                border-radius: 50%;
                overflow: hidden;
            }

            .doll-throne-back::before {
                content: '';
                width: 10px;
                height: 10px;
                border-left: 2px solid rgba(177, 72, 126, 0.76);
                border-bottom: 2px solid rgba(177, 72, 126, 0.76);
                transform: translateX(2px) rotate(45deg);
            }

            .doll-throne-popout {
                min-width: 106px;
                padding: 0 13px;
                white-space: nowrap;
            }

            .doll-throne-close:active {
                transform: scale(0.96);
            }

            .doll-throne-back:active,
            .doll-throne-popout:active {
                transform: scale(0.96);
            }

            .doll-throne-iframe-wrap {
                position: absolute;
                inset: 0;
                z-index: 2;
                background: rgba(255, 247, 251, 0.76);
                border-radius: inherit;
                overflow: hidden;
            }

            .doll-throne-iframe {
                width: 100%;
                height: 100%;
                border: 0;
                background: rgba(255, 247, 251, 0.9);
                opacity: 0;
                transition: opacity 0.28s ease;
            }

            .doll-throne-iframe.loaded {
                opacity: 1;
            }

            .doll-throne-loading,
            .doll-throne-fallback {
                position: absolute;
                inset: 0;
                z-index: 7;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 13px;
                padding: 28px;
                background:
                    radial-gradient(circle at 50% 38%, rgba(255, 225, 240, 0.72), transparent 34%),
                    rgba(255, 247, 251, 0.88);
                color: rgba(122, 76, 92, 0.78);
                font-family: "Comic Sans MS", "Trebuchet MS", cursive;
                border-radius: inherit;
                overflow: hidden;
                transition: opacity 0.28s ease;
            }

            .doll-throne-loading.hidden,
            .doll-throne-fallback.hidden {
                opacity: 0;
                pointer-events: none;
            }

            .doll-throne-loading.soft {
                background:
                    radial-gradient(circle at 50% 38%, rgba(255, 225, 240, 0.56), transparent 34%),
                    rgba(255, 247, 251, 0.62);
            }

            .doll-throne-loader-mark {
                width: 72px;
                height: 72px;
                display: grid;
                place-items: center;
                border-radius: 26px;
                background: linear-gradient(145deg, rgba(255, 255, 255, 0.8), rgba(255, 218, 236, 0.58));
                box-shadow:
                    0 16px 30px rgba(227, 97, 161, 0.16),
                    inset 0 1px 0 rgba(255, 255, 255, 0.92);
                animation: dollThroneFloat 2.8s ease-in-out infinite alternate;
            }

            .doll-throne-loader-mark img {
                width: 54px;
                height: 54px;
                object-fit: contain;
                filter: drop-shadow(0 7px 10px rgba(151, 64, 105, 0.18));
            }

            .doll-throne-loading p,
            .doll-throne-fallback p {
                max-width: 230px;
                margin: 0;
                font-size: 13px;
                line-height: 1.45;
            }

            .doll-throne-fallback button {
                min-width: 164px;
                min-height: 42px;
                padding: 0 24px;
                border: 1px solid rgba(255, 156, 204, 0.72);
                border-radius: 999px;
                background: linear-gradient(180deg, rgba(255, 245, 251, 0.96), rgba(255, 194, 224, 0.88));
                color: rgba(127, 70, 96, 0.86);
                font-family: "Comic Sans MS", "Trebuchet MS", cursive;
                font-size: 13px;
                font-weight: 700;
                box-shadow:
                    0 14px 28px rgba(224, 94, 160, 0.18),
                    inset 0 1px 0 rgba(255, 255, 255, 0.95);
                cursor: pointer;
            }

            .doll-throne-hint {
                position: absolute;
                left: 50%;
                bottom: 28px;
                z-index: 9;
                width: min(206px, calc(100% - 46px));
                min-height: 38px;
                padding: 9px 16px 10px;
                border: 1px solid rgba(255, 169, 211, 0.56);
                border-radius: 999px;
                background:
                    radial-gradient(circle at 18% 24%, rgba(255, 255, 255, 0.98), transparent 26%),
                    radial-gradient(circle at 88% 28%, rgba(255, 222, 238, 0.72), transparent 30%),
                    rgba(255, 249, 252, 0.95);
                color: rgba(139, 68, 103, 0.86);
                font-family: "Comic Sans MS", "Trebuchet MS", cursive;
                font-size: 11px;
                font-weight: 700;
                line-height: 1.28;
                text-align: center;
                display: grid;
                place-items: center;
                box-shadow:
                    0 13px 30px rgba(209, 83, 148, 0.18),
                    inset 0 1px 0 rgba(255, 255, 255, 0.95),
                    inset 0 -10px 20px rgba(255, 210, 232, 0.28);
                opacity: 0;
                pointer-events: none;
                transform: translateX(-50%) translateY(9px) scale(0.96);
                transition:
                    opacity 0.28s ease,
                    transform 0.34s cubic-bezier(0.18, 0.9, 0.24, 1);
            }

            .doll-throne-hint.show {
                opacity: 1;
                transform: translateX(-50%) translateY(0) scale(1);
            }

            .doll-throne-hint::after {
                content: '';
                position: absolute;
                left: 50%;
                bottom: -6px;
                width: 12px;
                height: 12px;
                border-right: 1px solid rgba(255, 169, 211, 0.46);
                border-bottom: 1px solid rgba(255, 169, 211, 0.46);
                background: rgba(255, 249, 252, 0.95);
                transform: translateX(-50%) rotate(45deg);
                box-shadow: 6px 6px 14px rgba(209, 83, 148, 0.08);
            }

            .doll-throne-hint::before {
                content: '';
                position: absolute;
                right: 20px;
                top: 8px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: rgba(255, 196, 225, 0.62);
                box-shadow:
                    -116px 10px 0 -2px rgba(255, 215, 236, 0.8),
                    -94px -4px 0 -3px rgba(255, 255, 255, 0.95);
            }

            .doll-throne-ornaments {
                position: absolute;
                inset: 0;
                z-index: 6;
                pointer-events: none;
                overflow: hidden;
                border-radius: 28px;
                opacity: 0.72;
            }

            .doll-throne-ornaments span,
            .doll-throne-ornaments i {
                position: absolute;
                display: block;
                pointer-events: none;
                will-change: transform;
            }

            .doll-throne-ornaments span {
                width: var(--size);
                height: var(--size);
                border-radius: 50%;
                border: 1px solid rgba(255, 164, 209, 0.34);
                background:
                    radial-gradient(circle at 32% 30%, rgba(255, 255, 255, 0.94) 0 18%, transparent 20%),
                    rgba(255, 236, 246, 0.42);
                box-shadow: inset 0 1px 8px rgba(255, 255, 255, 0.72);
                animation: dollThroneBubbleDrift var(--speed) ease-in-out infinite alternate;
            }

            .doll-throne-ornaments span:nth-child(1) { --size: 54px; --speed: 3.9s; left: -14px; top: 16%; }
            .doll-throne-ornaments span:nth-child(2) { --size: 24px; --speed: 3.1s; right: 36px; top: 13%; animation-delay: -1.4s; }
            .doll-throne-ornaments span:nth-child(3) { --size: 38px; --speed: 4.8s; right: -10px; bottom: 22%; animation-delay: -2.2s; }
            .doll-throne-ornaments span:nth-child(4) { --size: 18px; --speed: 3.4s; left: 46px; bottom: 14%; opacity: 0.78; animation-delay: -0.7s; }
            .doll-throne-ornaments span:nth-child(5) { --size: 72px; --speed: 6.1s; right: 34%; bottom: -26px; opacity: 0.34; animation-name: dollThroneBubbleWander; animation-delay: -3.2s; }
            .doll-throne-ornaments span:nth-child(6) { --size: 14px; --speed: 2.9s; left: 28%; top: 7%; opacity: 0.88; animation-name: dollThroneBubbleJitter; animation-delay: -1.1s; }
            .doll-throne-ornaments span:nth-child(7) { --size: 31px; --speed: 5.2s; left: 13%; top: 58%; opacity: 0.64; animation-name: dollThroneBubbleWander; animation-delay: -4.1s; }
            .doll-throne-ornaments span:nth-child(8) { --size: 19px; --speed: 3.6s; right: 18%; bottom: 34%; opacity: 0.82; animation-name: dollThroneBubbleJitter; animation-delay: -2.3s; }
            .doll-throne-ornaments span:nth-child(9) { --size: 86px; --speed: 4.4s; left: -32px; bottom: 5%; opacity: 0.38; animation-name: dollThroneBubbleBounce; animation-delay: -0.6s; }

            .doll-throne-ornaments i {
                width: 16px;
                height: 16px;
                border-radius: 4px 4px 2px 4px;
                background: rgba(255, 139, 196, 0.48);
                transform: rotate(45deg);
                animation: dollThroneHeartFloat var(--speed) ease-in-out infinite alternate;
            }

            .doll-throne-ornaments i::before,
            .doll-throne-ornaments i::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: inherit;
            }

            .doll-throne-ornaments i::before { left: -8px; top: 0; }
            .doll-throne-ornaments i::after { left: 0; top: -8px; }
            .doll-throne-ornaments i:nth-of-type(1) { --speed: 3.7s; left: 26px; bottom: 28%; opacity: 0.48; }
            .doll-throne-ornaments i:nth-of-type(2) { --speed: 4.3s; right: 42px; bottom: 9%; opacity: 0.5; transform: rotate(45deg) scale(0.78); animation-delay: -1.8s; }
            .doll-throne-ornaments i:nth-of-type(3) { --speed: 3.2s; right: 70px; top: 9%; opacity: 0.36; transform: rotate(45deg) scale(0.62); animation-delay: -0.9s; }
            .doll-throne-ornaments i:nth-of-type(4) { --speed: 4.9s; left: 39%; top: 18%; opacity: 0.28; transform: rotate(45deg) scale(0.52); animation-delay: -2.5s; }

            @keyframes dollThroneFloat {
                from { transform: translateY(0) scale(1); }
                to { transform: translateY(-8px) scale(1.03); }
            }

            @keyframes dollThroneBubbleDrift {
                from { transform: translate3d(0, 0, 0) scale(1); opacity: 0.5; }
                to { transform: translate3d(8px, -14px, 0) scale(1.08); opacity: 0.76; }
            }

            @keyframes dollThroneBubbleWander {
                0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                34% { transform: translate3d(13px, -18px, 0) scale(1.03); }
                72% { transform: translate3d(-8px, 5px, 0) scale(0.99); }
            }

            @keyframes dollThroneBubbleJitter {
                0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                26% { transform: translate3d(7px, -10px, 0) scale(1.12); }
                58% { transform: translate3d(-5px, -16px, 0) scale(0.94); }
                82% { transform: translate3d(3px, -5px, 0) scale(1.04); }
            }

            @keyframes dollThroneBubbleBounce {
                0%, 100% { transform: translate3d(0, 0, 0) scale(0.98); }
                28% { transform: translate3d(9px, -22px, 0) scale(1.06); }
                52% { transform: translate3d(4px, -12px, 0) scale(0.95); }
                78% { transform: translate3d(14px, -28px, 0) scale(1.09); }
            }

            @keyframes dollThroneHeartFloat {
                from { translate: 0 0; }
                to { translate: -5px -13px; }
            }

            @media screen and (max-width: 420px) {
                .doll-throne-overlay {
                    align-items: center;
                    padding-left: 10px;
                    padding-right: 10px;
                }

                .doll-throne-frame {
                    width: min(123.75vw, 429px);
                    height: min(102.5vh, 650px);
                    min-height: min(538px, 102.5vh);
                }
            }
        `;
        document.head.appendChild(style);
    }

    function openFullWishlist() {
        playSound('link');
        hideFullWebsiteHint();
        window.open(wishlistUrl, '_blank', 'noopener,noreferrer');
    }

    function getFocusableElements(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll([
            'a[href]',
            'button:not([disabled])',
            'iframe',
            '[role="button"]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(','))).filter(element => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && element.getClientRects().length > 0;
        });
    }

    function trapFocus(event) {
        if (event.key !== 'Tab' || !overlay?.classList.contains('show')) return;
        const focusable = getFocusableElements(overlay);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus({ preventScroll: true });
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus({ preventScroll: true });
        }
    }

    function setDollThroneUrl(nextUrl) {
        if (!nextUrl) return;
        wishlistUrl = nextUrl;
        window.dollThroneUrl = nextUrl;
        const iframe = overlay?.querySelector('.doll-throne-iframe');
        if (iframe && iframe.src !== nextUrl) {
            iframeLoaded = false;
            iframe.src = nextUrl;
        }
    }

    function hideFullWebsiteHint() {
        window.clearTimeout(fullWebsiteHintTimer);
        window.clearTimeout(fullWebsiteHintHideTimer);
        overlay?.querySelector('.doll-throne-hint')?.classList.remove('show');
    }

    function scheduleFullWebsiteHint() {
        hideFullWebsiteHint();
        fullWebsiteHintCycle = 0;
        queueFullWebsiteHint(10000);
    }

    function queueFullWebsiteHint(delay) {
        fullWebsiteHintTimer = window.setTimeout(function() {
            if (!overlay?.classList.contains('show')) return;
            const visibleFor = fullWebsiteHintCycle === 0 ? 4000 : 2000;
            fullWebsiteHintCycle += 1;
            overlay.querySelector('.doll-throne-hint')?.classList.add('show');

            fullWebsiteHintHideTimer = window.setTimeout(function() {
                if (!overlay?.classList.contains('show')) return;
                overlay.querySelector('.doll-throne-hint')?.classList.remove('show');
                queueFullWebsiteHint(10000);
            }, visibleFor);
        }, delay);
    }

    function showOpeningVeil() {
        const loading = overlay?.querySelector('.doll-throne-loading');
        const iframe = overlay?.querySelector('.doll-throne-iframe');

        window.clearTimeout(openVeilTimer);
        iframe?.classList.remove('loaded');
        loading?.classList.add('soft');
        loading?.classList.remove('hidden');

        openVeilTimer = window.setTimeout(function() {
            if (!overlay?.classList.contains('show')) return;
            if (!iframeLoaded) return;
            iframe?.classList.add('loaded');
            loading?.classList.add('hidden');
            loading?.classList.remove('soft');
        }, 850);
    }

    function buildOverlay() {
        injectStyles();

        overlay = document.createElement('div');
        overlay.id = widgetId;
        overlay.className = 'doll-throne-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.setAttribute('tabindex', '-1');
        overlay.innerHTML = `
            <div class="doll-throne-scrim" data-throne-close></div>
            <section class="doll-throne-frame" role="dialog" aria-label="Wishlist">
                <div class="doll-throne-controls">
                    <button type="button" class="doll-throne-back" aria-label="Back"></button>
                    <button type="button" class="doll-throne-popout">full website</button>
                    <button type="button" class="doll-throne-close" aria-label="Close"><span>&times;</span></button>
                </div>
                <div class="doll-throne-hint">Apple Pay checkout: full site</div>
                <div class="doll-throne-iframe-wrap"></div>
                <div class="doll-throne-loading">
                    <div class="doll-throne-loader-mark"><img src="wishlist.png" alt=""></div>
                    <p>opening wishlist...</p>
                </div>
                <div class="doll-throne-fallback hidden">
                    <div class="doll-throne-loader-mark"><img src="wishlist.png" alt=""></div>
                    <p>checkout works best on the full throne website.</p>
                    <button type="button">open full website</button>
                </div>
                <div class="doll-throne-ornaments" aria-hidden="true">
                    <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><i></i><i></i><i></i><i></i>
                </div>
            </section>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('.doll-throne-close').addEventListener('click', closeThroneOverlay);
        overlay.querySelector('[data-throne-close]').addEventListener('click', closeThroneOverlay);
        overlay.querySelector('.doll-throne-back').addEventListener('click', goBackInWishlist);
        overlay.querySelector('.doll-throne-popout').addEventListener('click', openFullWishlist);
        overlay.querySelector('.doll-throne-fallback button').addEventListener('click', openFullWishlist);
    }

    function goBackInWishlist() {
        playSound('tap');
        const iframe = overlay?.querySelector('.doll-throne-iframe');
        if (!iframe) return;
        const loading = overlay.querySelector('.doll-throne-loading');

        backNavigationActive = true;
        backNavigationStartedAt = Date.now();
        window.clearTimeout(backNavigationSafetyTimer);
        iframe.classList.remove('loaded');
        loading?.classList.add('soft');
        loading?.classList.remove('hidden');

        try {
            iframe.contentWindow.history.back();
        } catch (error) {
            iframe.src = wishlistUrl;
        }

        // Throne may navigate like an app without firing a full iframe load.
        // Keep the veil for at least 0.7s, then use this only as a safety net.
        backNavigationSafetyTimer = window.setTimeout(finishBackNavigation, 2800);
    }

    function finishBackNavigation() {
        if (!backNavigationActive) return;
        const elapsed = Date.now() - backNavigationStartedAt;
        const remaining = Math.max(700 - elapsed, 0);

        window.setTimeout(function() {
            const iframe = overlay?.querySelector('.doll-throne-iframe');
            const loading = overlay?.querySelector('.doll-throne-loading');
            iframe?.classList.add('loaded');
            loading?.classList.add('hidden');
            loading?.classList.remove('soft');
            backNavigationActive = false;
            window.clearTimeout(backNavigationSafetyTimer);
        }, remaining);
    }

    function ensureIframe() {
        const wrapper = overlay.querySelector('.doll-throne-iframe-wrap');
        if (wrapper.querySelector('iframe')) return;

        iframeLoaded = false;
        const iframe = document.createElement('iframe');
        iframe.className = 'doll-throne-iframe';
        iframe.title = 'Throne wishlist';
        iframe.loading = 'eager';
        iframe.allow = 'payment';
        iframe.allowPaymentRequest = true;
        iframe.setAttribute('allow', 'payment');
        iframe.setAttribute('allowpaymentrequest', 'true');
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.src = wishlistUrl;
        iframe.addEventListener('load', function() {
            iframeLoaded = true;
            if (backNavigationActive) {
                finishBackNavigation();
                return;
            }
            window.clearTimeout(openVeilTimer);
            openVeilTimer = window.setTimeout(function() {
                iframe.classList.add('loaded');
                overlay.querySelector('.doll-throne-loading')?.classList.add('hidden');
                overlay.querySelector('.doll-throne-loading')?.classList.remove('soft');
                overlay.querySelector('.doll-throne-fallback')?.classList.add('hidden');
            }, 700);
        });
        wrapper.appendChild(iframe);
    }

    function showFallbackIfNeeded() {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = window.setTimeout(function() {
            if (!overlay?.classList.contains('show')) return;
            if (iframeLoaded) return;
            overlay.querySelector('.doll-throne-loading')?.classList.add('hidden');
            overlay.querySelector('.doll-throne-fallback')?.classList.remove('hidden');
        }, 4500);
    }

    function openThroneOverlay() {
        if (!overlay) buildOverlay();
        throneReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        window.clearTimeout(unloadIframeTimer);
        ensureIframe();
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-throne-overlay-open');
        overlay.querySelector('.doll-throne-fallback')?.classList.add('hidden');
        showOpeningVeil();
        window.requestAnimationFrame(function() {
            overlay.classList.add('show');
            window.setTimeout(() => {
                overlay.querySelector('.doll-throne-close')?.focus({ preventScroll: true });
            }, 80);
        });
        showFallbackIfNeeded();
        scheduleFullWebsiteHint();
    }

    function closeThroneOverlay() {
        if (!overlay || !overlay.classList.contains('show')) return;
        playSound('tap');
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-throne-overlay-open');
        throneReturnFocus?.focus?.({ preventScroll: true });
        throneReturnFocus = null;
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(openVeilTimer);
        hideFullWebsiteHint();
        unloadIframeTimer = window.setTimeout(function() {
            if (overlay?.classList.contains('show')) return;
            const iframe = overlay?.querySelector('.doll-throne-iframe');
            iframe?.remove();
            iframeLoaded = false;
        }, 900);
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && overlay?.classList.contains('show')) {
            closeThroneOverlay();
            return;
        }
        trapFocus(event);
    });

    window.openThroneOverlay = openThroneOverlay;
    window.closeThroneOverlay = closeThroneOverlay;
    window.setDollThroneUrl = setDollThroneUrl;

    if (document.body) {
        buildOverlay();
    } else {
        document.addEventListener('DOMContentLoaded', buildOverlay, { once: true });
    }
}());
