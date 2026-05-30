(function() {
    const wishlistUrl = 'https://throne.com/edoll';
    const widgetId = 'doll-throne-overlay';
    const styleId = 'doll-throne-overlay-style';
    let overlay = null;
    let iframeLoaded = false;
    let fallbackTimer = null;

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
                inset: 2px;
                border: 6px solid transparent;
                border-radius: 25px;
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
                min-width: 78px;
                height: 30px;
                padding: 0 10px;
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
                z-index: 4;
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

            .doll-throne-ornaments {
                position: absolute;
                inset: 0;
                z-index: 1;
                pointer-events: none;
                overflow: hidden;
                border-radius: 28px;
                opacity: 0.5;
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

            .doll-throne-ornaments span:nth-child(1) { --size: 44px; --speed: 4s; left: -12px; top: 82px; }
            .doll-throne-ornaments span:nth-child(2) { --size: 24px; --speed: 3.2s; right: 46px; top: 74px; }
            .doll-throne-ornaments span:nth-child(3) { --size: 34px; --speed: 4.8s; right: -8px; bottom: 94px; }

            .doll-throne-ornaments i {
                width: 15px;
                height: 15px;
                border-radius: 4px 4px 2px 4px;
                background: rgba(255, 139, 196, 0.48);
                transform: rotate(45deg);
                animation: dollThroneHeartFloat var(--speed) ease-in-out infinite alternate;
            }

            .doll-throne-ornaments i::before,
            .doll-throne-ornaments i::after {
                content: '';
                position: absolute;
                width: 15px;
                height: 15px;
                border-radius: 50%;
                background: inherit;
            }

            .doll-throne-ornaments i::before { left: -7px; top: 0; }
            .doll-throne-ornaments i::after { left: 0; top: -7px; }
            .doll-throne-ornaments i:nth-of-type(1) { --speed: 3.8s; left: 34px; bottom: 92px; opacity: 0.52; }
            .doll-throne-ornaments i:nth-of-type(2) { --speed: 4.4s; right: 58px; top: 34px; opacity: 0.42; transform: rotate(45deg) scale(0.74); }

            @keyframes dollThroneFloat {
                from { transform: translateY(0) scale(1); }
                to { transform: translateY(-8px) scale(1.03); }
            }

            @keyframes dollThroneBubbleDrift {
                from { transform: translate3d(0, 0, 0) scale(1); opacity: 0.5; }
                to { transform: translate3d(8px, -14px, 0) scale(1.08); opacity: 0.76; }
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
        window.open(wishlistUrl, '_blank', 'noopener,noreferrer');
    }

    function buildOverlay() {
        injectStyles();

        overlay = document.createElement('div');
        overlay.id = widgetId;
        overlay.className = 'doll-throne-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="doll-throne-scrim" data-throne-close></div>
            <section class="doll-throne-frame" role="dialog" aria-label="Wishlist">
                <div class="doll-throne-controls">
                    <button type="button" class="doll-throne-back" aria-label="Back"></button>
                    <button type="button" class="doll-throne-popout">open full</button>
                    <button type="button" class="doll-throne-close" aria-label="Close"><span>&times;</span></button>
                </div>
                <div class="doll-throne-iframe-wrap"></div>
                <div class="doll-throne-loading">
                    <div class="doll-throne-loader-mark"><img src="wishlist.png" alt=""></div>
                    <p>opening wishlist...</p>
                </div>
                <div class="doll-throne-fallback hidden">
                    <div class="doll-throne-loader-mark"><img src="wishlist.png" alt=""></div>
                    <p>if throne is being shy in the mini window, open the full wishlist.</p>
                    <button type="button">open throne</button>
                </div>
                <div class="doll-throne-ornaments" aria-hidden="true">
                    <span></span><span></span><span></span><i></i><i></i>
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
        playSound('link');
        const iframe = overlay?.querySelector('.doll-throne-iframe');
        if (!iframe) return;
        const loading = overlay.querySelector('.doll-throne-loading');

        iframe.classList.remove('loaded');
        loading?.classList.add('soft');
        loading?.classList.remove('hidden');

        try {
            iframe.contentWindow.history.back();
        } catch (error) {
            iframe.src = wishlistUrl;
        }

        window.setTimeout(function() {
            iframe.classList.add('loaded');
            loading?.classList.add('hidden');
            loading?.classList.remove('soft');
        }, 850);
    }

    function ensureIframe() {
        const wrapper = overlay.querySelector('.doll-throne-iframe-wrap');
        if (wrapper.querySelector('iframe')) return;

        iframeLoaded = false;
        const iframe = document.createElement('iframe');
        iframe.className = 'doll-throne-iframe';
        iframe.title = 'Throne wishlist';
        iframe.loading = 'eager';
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        iframe.src = wishlistUrl;
        iframe.addEventListener('load', function() {
            iframeLoaded = true;
            iframe.classList.add('loaded');
            overlay.querySelector('.doll-throne-loading')?.classList.add('hidden');
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
        ensureIframe();
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('has-throne-overlay-open');
        overlay.querySelector('.doll-throne-fallback')?.classList.add('hidden');
        if (!iframeLoaded) overlay.querySelector('.doll-throne-loading')?.classList.remove('hidden');
        window.requestAnimationFrame(function() {
            overlay.classList.add('show');
        });
        showFallbackIfNeeded();
    }

    function closeThroneOverlay() {
        if (!overlay || !overlay.classList.contains('show')) return;
        playSound('tap');
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('has-throne-overlay-open');
        window.clearTimeout(fallbackTimer);
    }

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && overlay?.classList.contains('show')) {
            closeThroneOverlay();
        }
    });

    window.openThroneOverlay = openThroneOverlay;
    window.closeThroneOverlay = closeThroneOverlay;

    if (document.body) {
        buildOverlay();
    } else {
        document.addEventListener('DOMContentLoaded', buildOverlay, { once: true });
    }
}());
