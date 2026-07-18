document.addEventListener("DOMContentLoaded", async function() {
    const DEFAULT_SOCIAL_CARD_ORDER = ['snapchat', 'instagram', 'kofi', 'telegram', 'x', 'tiktok', 'twitch', 'discord', 'onlyfans', 'spotify'];
    const SOCIAL_CARD_KEYS = [...DEFAULT_SOCIAL_CARD_ORDER];
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
        homepage_note_text: '',
        homepage_note_font_size: 13.25,
        maintenance_enabled: false,
        maintenance_title: '',
        maintenance_message: '',
        maintenance_eta: '',
        entrance_mode: 'paw',
        drawings_enabled: true,
        questions_enabled: true,
        rooms_enabled: false,
        seo_title: 'Lia ⋆౨ৎ˚⟡',
        seo_description: "Lia's little space",
        site_tagline: "Lia's little space."
    };
    let siteLinkSettings = { ...DEFAULT_LINK_SETTINGS };
    let applySiteLinkSettingsToDom = null;
    let siteSettingsLoadExpired = false;
    let resolveSiteClientReady;
    const siteClientReady = new Promise(resolve => {
        resolveSiteClientReady = resolve;
    });

    // ===== ENHANCED AUDIO HANDLING =====
    const audio = new Audio('hehe.mp3');
    audio.preload = 'auto';
    audio.loop = true;
    const backgroundMusicVolume = 0.4;
    const backgroundFadeInDuration = 6;
    const backgroundFadeOutDuration = 4;
    let backgroundMusicRequestedVolume = backgroundMusicVolume;
    let backgroundFadeLevel = 0;
    let backgroundFadeFrame = null;
    let audioPlayed = false;
    let backgroundMusicUnlocked = false;
    let backgroundMusicRetryArmed = false;
    const uiSounds = {
        tap: 'CUT1.mp3?v=2',
        link: 'CUT2.mp3?v=2',
        submit: 'CUT3.mp3?v=2'
    };
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let uiAudioContext = null;
    let backgroundMusicGain = null;
    if (AudioContextClass) {
        try {
            uiAudioContext = new AudioContextClass();
        } catch (error) {
            // HTMLAudio remains available even if Web Audio cannot initialize.
            uiAudioContext = null;
        }
    }
    if (uiAudioContext) {
        try {
            const backgroundMusicSource = uiAudioContext.createMediaElementSource(audio);
            backgroundMusicGain = uiAudioContext.createGain();
            backgroundMusicSource.connect(backgroundMusicGain);
            backgroundMusicGain.connect(uiAudioContext.destination);
        } catch (error) {
            // UI sounds can still use Web Audio; music falls back to HTMLAudio.
            backgroundMusicGain = null;
        }
    }
    function setBackgroundMusicVolume(volume) {
        backgroundMusicRequestedVolume = volume;
        applyBackgroundMusicVolume();
    }

    function applyBackgroundMusicVolume() {
        const volume = backgroundMusicRequestedVolume * backgroundFadeLevel;
        if (backgroundMusicGain) {
            audio.volume = 1;
            backgroundMusicGain.gain.value = volume;
        } else {
            audio.volume = volume;
        }
    }

    function updateBackgroundFade() {
        if (!audioPlayed || audio.paused) {
            backgroundFadeFrame = null;
            return;
        }

        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        const fadeInWindow = duration > 0 ? Math.min(backgroundFadeInDuration, duration / 2) : backgroundFadeInDuration;
        const fadeOutWindow = duration > 0 ? Math.min(backgroundFadeOutDuration, duration / 2) : backgroundFadeOutDuration;
        const fadeInLevel = fadeInWindow ? audio.currentTime / fadeInWindow : 1;
        const fadeOutLevel = duration > 0 && fadeOutWindow ? (duration - audio.currentTime) / fadeOutWindow : 1;
        backgroundFadeLevel = Math.max(0, Math.min(1, fadeInLevel, fadeOutLevel));
        applyBackgroundMusicVolume();

        backgroundFadeFrame = requestAnimationFrame(updateBackgroundFade);
    }

    function startBackgroundFadeLoop() {
        if (backgroundFadeFrame !== null) return;
        updateBackgroundFade();
    }

    function stopBackgroundFadeLoop() {
        if (backgroundFadeFrame === null) return;
        cancelAnimationFrame(backgroundFadeFrame);
        backgroundFadeFrame = null;
    }

    // Safari can reject a play() call made after an entrance-transition
    // timeout because the original tap activation has expired. Start the
    // element silently during that trusted gesture, then rewind and fade it
    // in at the existing visual cue.
    function primeBackgroundMusic() {
        // Without Web Audio gain, iOS may ignore audio.volume = 0. In that
        // rare fallback, wait for the scheduled/next trusted play instead of
        // risking an audible full-volume prime.
        if (!backgroundMusicGain) return;
        if (audioPlayed || backgroundMusicUnlocked || !audio.paused) {
            backgroundMusicUnlocked = !audio.paused;
            return;
        }
        backgroundFadeLevel = 0;
        applyBackgroundMusicVolume();
        const playAttempt = audio.play();
        if (!playAttempt?.then) {
            backgroundMusicUnlocked = !audio.paused;
            return;
        }
        playAttempt
            .then(() => { backgroundMusicUnlocked = true; })
            .catch(() => { backgroundMusicUnlocked = false; });
    }

    function armBackgroundMusicRetry() {
        if (backgroundMusicRetryArmed) return;
        backgroundMusicRetryArmed = true;
        const retry = () => {
            backgroundMusicRetryArmed = false;
            document.removeEventListener('pointerdown', retry, true);
            document.removeEventListener('keydown', retry, true);
            startBackgroundMusic();
        };
        document.addEventListener('pointerdown', retry, { once: true, capture: true });
        document.addEventListener('keydown', retry, { once: true, capture: true });
    }

    function startBackgroundMusic() {
        if (audioPlayed) return;
        audioPlayed = true;
        backgroundFadeLevel = 0;
        applyBackgroundMusicVolume();
        try {
            audio.currentTime = 0;
        } catch (error) {
            // Metadata may still be settling; play() below remains safe.
        }
        audio.play()
            .then(() => {
                backgroundMusicUnlocked = true;
                startBackgroundFadeLoop();
            })
            .catch(() => {
                audioPlayed = false;
                backgroundMusicUnlocked = false;
                armBackgroundMusicRetry();
            });
    }

    audio.addEventListener('play', startBackgroundFadeLoop);
    audio.addEventListener('pause', stopBackgroundFadeLoop);
    setBackgroundMusicVolume(backgroundMusicVolume);
    const uiSoundBuffers = {};
    const uiSoundPlayers = Object.fromEntries(
        Object.entries(uiSounds).map(([type, src]) => {
            const sound = new Audio(src);
            sound.preload = 'auto';
            sound.volume = 1;
            sound.load();
            return [type, sound];
        })
    );
    let uiSoundsWarmed = false;

    async function loadUiSoundBuffers() {
        if (!uiAudioContext) return;

        await Promise.all(Object.entries(uiSounds).map(async ([type, src]) => {
            try {
                const response = await fetch(src);
                const buffer = await response.arrayBuffer();
                uiSoundBuffers[type] = await uiAudioContext.decodeAudioData(buffer);
            } catch (error) {
                // Fall back to HTMLAudioElement for this sound.
            }
        }));
    }

    let uiSoundBuffersReady = null;

    function ensureUiSoundBuffers() {
        if (!uiSoundBuffersReady) {
            uiSoundBuffersReady = loadUiSoundBuffers();
        }
        return uiSoundBuffersReady;
    }

    async function resumeUiAudioContext() {
        if (!uiAudioContext || uiAudioContext.state === 'running') return;
        try {
            await uiAudioContext.resume();
        } catch (error) {
            // The overlapping HTMLAudioElement fallback remains available.
        }
    }

    async function warmUiSounds() {
        if (uiSoundsWarmed) return;
        uiSoundsWarmed = true;
        await resumeUiAudioContext();
        void ensureUiSoundBuffers();
    }

    function playUiSound(type) {
        if (uiAudioContext && uiAudioContext.state === 'running' && uiSoundBuffers[type]) {
            const source = uiAudioContext.createBufferSource();
            const gain = uiAudioContext.createGain();
            source.buffer = uiSoundBuffers[type];
            gain.gain.value = 1;
            source.connect(gain);
            gain.connect(uiAudioContext.destination);
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
            };
            source.start(0);
            return;
        }

        const sound = uiSoundPlayers[type];
        if (!sound) return;

        // Do not cut off a pop that is already playing. Rapid bubble taps can
        // overlap through Web Audio above; this clone provides the same
        // behaviour on browsers still using the HTMLAudioElement fallback.
        const player = sound.paused ? sound : sound.cloneNode(true);
        player.volume = sound.volume;
        player.currentTime = 0;
        player.play().catch(() => {});
    }

    window.dollPlayUiSound = playUiSound;

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function loadDeferredImage(image, dataKey) {
        if (!(image instanceof HTMLImageElement)
            || image.getAttribute('src')
            || image.dataset.deferredLoadStarted === 'true') return;
        const src = String(image.dataset[dataKey] || '').trim();
        if (!src) return;
        image.dataset.deferredLoadStarted = 'true';
        const handleLoad = () => {
            image.removeEventListener('error', handleError);
            delete image.dataset.deferredLoadStarted;
            delete image.dataset[dataKey];
            image.style.removeProperty('display');
        };
        const handleError = () => {
            image.removeEventListener('load', handleLoad);
            delete image.dataset.deferredLoadStarted;
            image.removeAttribute('src');
        };
        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });
        image.src = src;
    }

    function createUnavailableSupabaseClient() {
        const unavailableError = {
            message: 'Connection is unavailable right now. Please try again.'
        };

        function createSelectQuery(single = false) {
            let abortSignal = null;

            const getResult = () => {
                if (abortSignal?.aborted) {
                    const abortError = new Error('The request was aborted.');
                    abortError.name = 'AbortError';
                    return Promise.reject(abortError);
                }

                return Promise.resolve({
                    data: single ? null : [],
                    error: single ? { code: 'PGRST116', message: 'No rows found' } : null
                });
            };

            const query = {
                eq: () => query,
                not: () => query,
                order: () => query,
                limit: () => query,
                abortSignal: signal => {
                    abortSignal = signal;
                    return query;
                },
                single: () => createSelectQuery(true),
                then: (resolve, reject) => getResult().then(resolve, reject),
                catch: callback => getResult().catch(callback)
            };

            return query;
        }

        return {
            // Public panels must distinguish a missing Supabase SDK/client
            // from a real, successful query that simply returned no rows.
            // Without this marker the :3 panel could silently present an
            // empty state forever after a CDN/network failure.
            __dollUnavailable: true,
            from: () => ({
                select: () => createSelectQuery(),
                insert: () => Promise.resolve({ data: null, error: unavailableError }),
                update: () => ({
                    eq: () => ({
                        eq: () => Promise.resolve({ data: null, error: unavailableError })
                    })
                }),
                delete: () => ({
                    eq: () => ({
                        eq: () => Promise.resolve({ data: null, error: unavailableError })
                    })
                })
            })
        };
    }

    let submitPopupTimer = null;

    function showSubmitPopup(message) {
        let popup = document.getElementById('submit-popup');
        let popupMessage = document.getElementById('submit-popup-message');
        if (!popup || !popupMessage) {
            popup = document.createElement('div');
            popup.className = 'submit-popup';
            popup.id = 'submit-popup';
            popup.setAttribute('aria-hidden', 'true');
            popup.innerHTML = '<div class="submit-popup-card"><p id="submit-popup-message"></p></div>';
            document.body.appendChild(popup);
            popupMessage = document.getElementById('submit-popup-message');
        }

        popupMessage.textContent = message;
        popup.classList.add('show');
        popup.setAttribute('aria-hidden', 'false');
        clearTimeout(submitPopupTimer);
        submitPopupTimer = setTimeout(() => {
            popup.classList.remove('show');
            popup.setAttribute('aria-hidden', 'true');
        }, 1500);
    }

    function showSubmitPopupAndWait(message) {
        showSubmitPopup(message);
        return wait(1500);
    }

    function resolveSiteRoute(route) {
        if (window.location.protocol === 'file:') {
            return route.replace(/\/$/, '/index.html');
        }

        const cleanRoute = route.replace(/^\/+/, '');
        const currentPath = window.location.pathname;
        const lastSegment = currentPath.split('/').pop() || '';
        const currentDir = currentPath.endsWith('/')
            ? currentPath
            : lastSegment.includes('.')
                ? currentPath.replace(/\/[^/]*$/, '/')
                : `${currentPath}/`;

        return new URL(cleanRoute, `${window.location.origin}${currentDir}`).href;
    }

    function setSendButtonLoading(button, isLoading) {
        if (!button) return;

        if (!button.dataset.defaultText) {
            button.dataset.defaultText = button.textContent;
        }

        button.disabled = isLoading;
        button.classList.toggle('is-loading', isLoading);
        button.innerHTML = isLoading
            ? '<span class="send-loading-dot" aria-hidden="true"></span><span>Sending</span>'
            : button.dataset.defaultText;
    }

    function getFocusableElements(container) {
        if (!container) return [];
        return Array.from(container.querySelectorAll([
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'textarea:not([disabled])',
            'select:not([disabled])',
            '[role="button"]',
            '[tabindex]:not([tabindex="-1"])'
        ].join(','))).filter(element => {
            const style = window.getComputedStyle(element);
            return style.display !== 'none'
                && style.visibility !== 'hidden'
                && element.getClientRects().length > 0;
        });
    }

    function trapFocusWithin(container, event) {
        if (event.key !== 'Tab') return;
        const focusable = getFocusableElements(container);
        if (!focusable.length) {
            event.preventDefault();
            container.focus?.({ preventScroll: true });
            return;
        }

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

    function initAdminGate() {
        const headerImage = document.querySelector('.header-image');
        const gate = document.getElementById('admin-gate');
        const form = document.getElementById('admin-gate-form');
        const input = document.getElementById('admin-gate-code');
        const error = document.getElementById('admin-gate-error');
        const closeButton = document.getElementById('admin-gate-close');
        if (!headerImage || !gate || !form || !input) return;

        const adminCode = '7769';
        let tapCount = 0;
        let tapResetTimer = null;
        let gateReturnFocus = null;

        function showGate() {
            gateReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            gate.classList.add('show');
            gate.setAttribute('aria-hidden', 'false');
            input.value = '';
            if (error) error.textContent = '';
            window.setTimeout(() => input.focus(), 80);
        }

        function hideGate() {
            gate.classList.remove('show');
            gate.setAttribute('aria-hidden', 'true');
            gateReturnFocus?.focus?.({ preventScroll: true });
            gateReturnFocus = null;
        }

        headerImage.addEventListener('click', function() {
            tapCount++;
            clearTimeout(tapResetTimer);
            tapResetTimer = setTimeout(() => {
                tapCount = 0;
            }, 2600);

            if (tapCount >= 5) {
                tapCount = 0;
                clearTimeout(tapResetTimer);
                playUiSound('tap');
                showGate();
            }
        });

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (input.value.trim() !== adminCode) {
                if (error) error.textContent = 'nope';
                playUiSound('tap');
                input.select();
                return;
            }

            sessionStorage.setItem('doll_admin_gate', 'open');
            playUiSound('link');
            window.location.href = resolveSiteRoute('admin/');
        });

        closeButton?.addEventListener('click', hideGate);
        gate.addEventListener('click', function(e) {
            if (e.target === gate) hideGate();
        });
        gate.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideGate();
                return;
            }
            trapFocusWithin(gate, e);
        });
    }

    initAdminGate();

    function initNotePeel() {
        const noteTarget = document.getElementById('note-peel-target');
        const note = document.querySelector('.note-image');
        const peelHandle = noteTarget?.querySelector('.note-peel-handle');
        const frontFace = noteTarget?.querySelector('.note-front-face');
        const foldLayer = noteTarget?.querySelector('.note-fold-layer');
        const foldBack = foldLayer?.querySelector('.note-fold-back');
        const foldShadow = foldLayer?.querySelector('.note-fold-shadow');
        const creaseShadow = foldLayer?.querySelector('.note-fold-crease-shadow');
        const creaseHighlight = foldLayer?.querySelector('.note-fold-crease-highlight');
        const underSign = document.querySelector('.note-under-sign');
        if (!noteTarget || !note || !peelHandle || !frontFace || !foldLayer
            || !foldBack || !foldShadow || !creaseShadow || !creaseHighlight) return;

        let startX = 0;
        let startY = 0;
        let currentProgress = 0;
        let dragging = false;
        let detaching = false;
        let foldFrame = 0;
        let motionFrame = 0;
        let queuedPoint = null;
        let noteWidth = 254;
        let noteHeight = 214;
        let pointerScaleX = 1;
        let pointerScaleY = 1;
        let detachDistance = 280;
        let corner = { x: 246, y: 200 };
        let paperOutline = [];
        let renderedPoint = { ...corner };

        // Normalized from the note PNG's real alpha contour. The visible
        // lower-right tip is inset from its transparent rectangular bounds,
        // so the fold must originate from this contour rather than 100%/100%.
        const NOTE_TIP = { x: 579 / 599, y: 471 / 504 };
        const NOTE_OUTLINE = [
            { x: 6 / 599, y: 1 / 504 },
            { x: 596 / 599, y: 1 / 504 },
            { x: 598 / 599, y: 420 / 504 },
            { x: 594 / 599, y: 440 / 504 },
            { x: 587 / 599, y: 460 / 504 },
            { ...NOTE_TIP },
            { x: 574 / 599, y: 475 / 504 },
            { x: 555 / 599, y: 485 / 504 },
            { x: 520 / 599, y: 492 / 504 },
            { x: 480 / 599, y: 496 / 504 },
            { x: 400 / 599, y: 499 / 504 },
            { x: 300 / 599, y: 500 / 504 },
            { x: 200 / 599, y: 501 / 504 },
            { x: 100 / 599, y: 501 / 504 },
            { x: 25 / 599, y: 502 / 504 },
            { x: 3 / 599, y: 500 / 504 }
        ];

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const dot = (a, b) => a.x * b.x + a.y * b.y;

        function showUnderSign() {
            if (!underSign) return;
            loadDeferredImage(underSign, 'noteUnderSrc');
            underSign.hidden = false;
            underSign.setAttribute('aria-hidden', 'false');
        }

        function hideUnderSign() {
            if (!underSign) return;
            underSign.hidden = true;
            underSign.setAttribute('aria-hidden', 'true');
        }

        hideUnderSign();

        function setSvgLine(line, points) {
            if (points.length < 2) {
                line.removeAttribute('x1');
                line.removeAttribute('y1');
                line.removeAttribute('x2');
                line.removeAttribute('y2');
                return;
            }
            line.setAttribute('x1', points[0].x.toFixed(2));
            line.setAttribute('y1', points[0].y.toFixed(2));
            line.setAttribute('x2', points[1].x.toFixed(2));
            line.setAttribute('y2', points[1].y.toFixed(2));
        }

        function polygonPoints(points) {
            return points.map(point => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' ');
        }

        function clipPolygon(points, normal, boundary, keepFront) {
            const clipped = [];
            const isInside = point => {
                const side = dot(normal, point) - boundary;
                return keepFront ? side <= 0.01 : side >= -0.01;
            };

            for (let index = 0; index < points.length; index += 1) {
                const start = points[index];
                const end = points[(index + 1) % points.length];
                const startInside = isInside(start);
                const endInside = isInside(end);

                if (startInside) clipped.push(start);
                if (startInside === endInside) continue;

                const startDistance = dot(normal, start) - boundary;
                const endDistance = dot(normal, end) - boundary;
                const denominator = startDistance - endDistance;
                if (Math.abs(denominator) < 0.0001) continue;
                const amount = clamp(startDistance / denominator, 0, 1);
                clipped.push({
                    x: start.x + (end.x - start.x) * amount,
                    y: start.y + (end.y - start.y) * amount
                });
            }
            return clipped;
        }

        function getCreasePoints(rectangle, normal, boundary) {
            const points = [];
            const addPoint = point => {
                if (!points.some(existing => Math.hypot(existing.x - point.x, existing.y - point.y) < 0.2)) {
                    points.push(point);
                }
            };

            for (let index = 0; index < rectangle.length; index += 1) {
                const start = rectangle[index];
                const end = rectangle[(index + 1) % rectangle.length];
                const startDistance = dot(normal, start) - boundary;
                const endDistance = dot(normal, end) - boundary;
                if (Math.abs(startDistance) < 0.01) addPoint(start);
                if (startDistance * endDistance >= 0) continue;
                const amount = startDistance / (startDistance - endDistance);
                addPoint({
                    x: start.x + (end.x - start.x) * amount,
                    y: start.y + (end.y - start.y) * amount
                });
            }
            return points.slice(0, 2);
        }

        function updatePeelMetrics() {
            noteWidth = frontFace.offsetWidth;
            noteHeight = frontFace.offsetHeight;
            corner = { x: NOTE_TIP.x * noteWidth, y: NOTE_TIP.y * noteHeight };
            paperOutline = NOTE_OUTLINE.map(point => ({
                x: point.x * noteWidth,
                y: point.y * noteHeight
            }));
            detachDistance = Math.hypot(corner.x - paperOutline[0].x, corner.y - paperOutline[0].y) * 0.84;
            foldLayer.setAttribute('viewBox', `0 0 ${noteWidth} ${noteHeight}`);
        }

        function clearFoldGeometry() {
            frontFace.style.removeProperty('clip-path');
            foldBack.removeAttribute('points');
            foldShadow.removeAttribute('points');
            setSvgLine(creaseShadow, []);
            setSvgLine(creaseHighlight, []);
            noteTarget.classList.remove('fold-active');
            noteTarget.style.removeProperty('--note-shadow-strength');
            currentProgress = 0;
            renderedPoint = { ...corner };
        }

        function renderFold(point) {
            const distance = Math.hypot(corner.x - point.x, corner.y - point.y);
            renderedPoint = { ...point };
            currentProgress = clamp(distance / detachDistance, 0, 1);
            const shadowStrength = Math.pow(1 - currentProgress, 1.55);
            noteTarget.style.setProperty('--note-shadow-strength', shadowStrength.toFixed(4));
            if (distance < 0.75) {
                clearFoldGeometry();
                return;
            }

            const normal = { x: corner.x - point.x, y: corner.y - point.y };
            const normalLengthSquared = dot(normal, normal);
            const boundary = (dot(corner, corner) - dot(point, point)) / 2;
            const front = clipPolygon(paperOutline, normal, boundary, true);
            const folded = clipPolygon(paperOutline, normal, boundary, false).map(original => {
                const distanceFromCrease = (dot(normal, original) - boundary) / normalLengthSquared;
                return {
                    x: original.x - 2 * distanceFromCrease * normal.x,
                    y: original.y - 2 * distanceFromCrease * normal.y
                };
            });
            const crease = getCreasePoints(paperOutline, normal, boundary);

            if (front.length >= 3) {
                frontFace.style.clipPath = `polygon(${front.map(vertex => `${vertex.x.toFixed(2)}px ${vertex.y.toFixed(2)}px`).join(', ')})`;
            } else {
                frontFace.style.clipPath = 'polygon(0 0, 0 0, 0 0)';
            }
            const foldedPoints = polygonPoints(folded);
            foldBack.setAttribute('points', foldedPoints);
            foldShadow.setAttribute('points', foldedPoints);
            setSvgLine(creaseShadow, crease);
            setSvgLine(creaseHighlight, crease);
            noteTarget.classList.add('fold-active');
        }

        function queueFold(point) {
            queuedPoint = point;
            if (foldFrame) return;
            foldFrame = window.requestAnimationFrame(() => {
                foldFrame = 0;
                const nextPoint = queuedPoint;
                queuedPoint = null;
                if (nextPoint) renderFold(nextPoint);
            });
        }

        function flushQueuedFold() {
            if (foldFrame) window.cancelAnimationFrame(foldFrame);
            foldFrame = 0;
            if (!queuedPoint) return;
            const nextPoint = queuedPoint;
            queuedPoint = null;
            renderFold(nextPoint);
        }

        function animateFold(from, to, duration, onComplete) {
            if (motionFrame) window.cancelAnimationFrame(motionFrame);
            const startedAt = performance.now();
            const tick = now => {
                const elapsed = clamp((now - startedAt) / duration, 0, 1);
                const eased = 1 - Math.pow(1 - elapsed, 3);
                renderFold({
                    x: from.x + (to.x - from.x) * eased,
                    y: from.y + (to.y - from.y) * eased
                });
                if (elapsed < 1) {
                    motionFrame = window.requestAnimationFrame(tick);
                    return;
                }
                motionFrame = 0;
                onComplete?.();
            };
            motionFrame = window.requestAnimationFrame(tick);
        }

        function resetPeel() {
            if (detaching) return;
            dragging = false;
            flushQueuedFold();
            noteTarget.classList.remove('peeling', 'completing', 'detached');
            noteTarget.classList.add('resetting');
            const from = { ...renderedPoint };
            animateFold(from, corner, 260, () => {
                if (dragging || detaching) return;
                clearFoldGeometry();
                noteTarget.classList.remove('resetting');
                noteTarget.style.removeProperty('transform');
                hideUnderSign();
            });
        }

        function detachNote() {
            if (detaching) return;
            detaching = true;
            flushQueuedFold();
            playUiSound('link');
            noteTarget.classList.remove('peeling');
            noteTarget.classList.add('completing');
            const from = { ...renderedPoint };
            const pullX = corner.x - from.x;
            const pullY = corner.y - from.y;
            const pullLength = Math.max(1, Math.hypot(pullX, pullY));
            const completionDistance = Math.max(pullLength, detachDistance * 1.12);
            const to = {
                x: corner.x - (pullX / pullLength) * completionDistance,
                y: corner.y - (pullY / pullLength) * completionDistance
            };
            animateFold(from, to, 170, () => {
                if (!detaching) return;
                window.requestAnimationFrame(() => {
                    noteTarget.classList.add('detached');
                    window.requestAnimationFrame(() => {
                        noteTarget.style.transform = 'translateX(-50%) translate3d(-52px, calc(100vh + 140px), 0) rotate(-18deg) scale(0.985)';
                    });
                    window.setTimeout(() => {
                        noteTarget.classList.add('peeled-away');
                        noteTarget.setAttribute('aria-hidden', 'true');
                    }, 860);
                });
            });
        }

        updatePeelMetrics();
        window.addEventListener('resize', function() {
            updatePeelMetrics();
            if (!dragging && !detaching && currentProgress > 0.001) resetPeel();
        });

        peelHandle.addEventListener('pointerdown', function(e) {
            if (detaching || !e.isPrimary || note.classList.contains('hidden')) return;
            if (noteTarget.classList.contains('editing')) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            updatePeelMetrics();
            const noteRect = frontFace.getBoundingClientRect();
            pointerScaleX = noteWidth / Math.max(1, noteRect.width);
            pointerScaleY = noteHeight / Math.max(1, noteRect.height);
            if (motionFrame) window.cancelAnimationFrame(motionFrame);
            motionFrame = 0;
            clearFoldGeometry();
            noteTarget.classList.remove('resetting');
            noteTarget.classList.add('peeling');
            showUnderSign();
            peelHandle.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        });

        peelHandle.addEventListener('pointermove', function(e) {
            if (!dragging || detaching) return;
            const point = {
                x: clamp(corner.x + (e.clientX - startX) * pointerScaleX, -noteWidth * 0.35, corner.x),
                y: clamp(corner.y + (e.clientY - startY) * pointerScaleY, -noteHeight * 0.35, corner.y)
            };
            if (Math.hypot(corner.x - point.x, corner.y - point.y) > 3) e.preventDefault();
            queueFold(point);
        });

        function finishPeel(e) {
            if (!dragging || detaching) return;
            dragging = false;
            flushQueuedFold();
            if (peelHandle.hasPointerCapture?.(e.pointerId)) peelHandle.releasePointerCapture(e.pointerId);

            if (currentProgress >= 1) {
                detachNote();
                return;
            }

            resetPeel();
        }

        peelHandle.addEventListener('pointerup', finishPeel);
        peelHandle.addEventListener('pointercancel', resetPeel);
        peelHandle.addEventListener('lostpointercapture', function() {
            if (dragging && !detaching) resetPeel();
        });
    }

    initNotePeel();
    
    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById("loading-screen");
    const loadingBarContainer = document.getElementById("loading-bar-container");
    const loadingBarFill = document.getElementById("loading-bar-fill");
    const loadingSlowMessage = document.getElementById("loading-slow-message");
    const loadingProgressElement = loadingBarFill?.closest('[role="progressbar"]');
    const loadingPawPrints = Array.from(document.querySelectorAll('.loading-paw-print'));
    const prefersReducedLoadingMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minLoadingTime = 2000;
    const PUBLIC_DRAWINGS_LIMIT = 24;
    const PUBLIC_QUESTIONS_LIMIT = 30;
    const PUBLIC_SUBMISSIONS_TIMEOUT_MS = 10000;
    let loadingBarShown = false;
    let loadingProgress = 0;
    let displayedLoadingProgress = 0;
    let loadingVisualFrame = null;
    let loadingVisualFrameTime = null;
    const slowLoadingMessageTimer = window.setTimeout(() => {
        if (loadingSlowMessage && loadingScreen?.style.display !== 'none') {
            loadingSlowMessage.hidden = false;
        }
    }, 4000);
    const preloadedSubmissions = {
        drawings: [],
        questions: [],
        loaded: false,
        error: null
    };
    let submissionsRevision = 0;
    let submissionsLoadPromise = null;
    let submissionsLoadController = null;

    function markSubmissionsDirty() {
        submissionsRevision += 1;
        submissionsLoadController?.abort();
        preloadedSubmissions.loaded = false;
        preloadedSubmissions.error = null;
    }

    function clearSlowLoadingMessage() {
        window.clearTimeout(slowLoadingMessageTimer);
        if (loadingSlowMessage) loadingSlowMessage.hidden = true;
    }

    function retireLoadingScreen() {
        if (!loadingScreen) return;
        if (loadingVisualFrame !== null) {
            window.cancelAnimationFrame(loadingVisualFrame);
            loadingVisualFrame = null;
        }
        loadingScreen.style.display = 'none';
        const loadingGif = loadingScreen.querySelector('.loading-gif');
        loadingGif?.removeAttribute('src');
        loadingScreen.replaceChildren();
    }
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    function renderLoadingPaws(progress) {
        loadingPawPrints.forEach((pawPrint, index) => {
            const stampAt = loadingPawPrints.length === 1
                ? 100
                : 8 + (index / (loadingPawPrints.length - 1)) * 92;
            pawPrint.classList.toggle('is-stamped', progress >= stampAt);
        });
    }

    function animateLoadingPaws(timestamp) {
        if (loadingVisualFrameTime === null) loadingVisualFrameTime = timestamp;
        const elapsed = Math.min(64, timestamp - loadingVisualFrameTime);
        loadingVisualFrameTime = timestamp;

        // Pace the trail independently so cached resources cannot stamp every paw at once.
        displayedLoadingProgress = Math.min(
            loadingProgress,
            displayedLoadingProgress + elapsed * 0.05
        );
        renderLoadingPaws(displayedLoadingProgress);

        if (displayedLoadingProgress + 0.01 < loadingProgress) {
            loadingVisualFrame = window.requestAnimationFrame(animateLoadingPaws);
            return;
        }

        loadingVisualFrame = null;
        loadingVisualFrameTime = null;
    }

    function scheduleLoadingPaws() {
        if (prefersReducedLoadingMotion) {
            displayedLoadingProgress = loadingProgress;
            renderLoadingPaws(displayedLoadingProgress);
            return;
        }

        if (loadingVisualFrame === null) {
            loadingVisualFrame = window.requestAnimationFrame(animateLoadingPaws);
        }
    }

    function waitForLoadingPawTrail() {
        if (!loadingPawPrints.length || displayedLoadingProgress >= 100) {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            const startedAt = Date.now();
            const checkProgress = () => {
                if (displayedLoadingProgress >= 100) {
                    resolve();
                    return;
                }
                // Safety net: by this point the real load is already done —
                // this is purely waiting on the cosmetic paw trail to catch
                // up visually. requestAnimationFrame can stall for a long
                // time (a backgrounded/minimized tab) with nothing else to
                // rescue it, so never let the site stay hidden behind the
                // loading screen just because the last paw hasn't visually
                // stamped yet.
                if (Date.now() - startedAt >= 2500) {
                    displayedLoadingProgress = 100;
                    renderLoadingPaws(displayedLoadingProgress);
                    resolve();
                    return;
                }
                window.requestAnimationFrame(checkProgress);
            };
            window.requestAnimationFrame(checkProgress);
        });
    }

    function setLoadingProgress(progress) {
        if (!loadingBarFill) return;
        loadingProgress = Math.max(loadingProgress, Math.max(0, Math.min(100, progress)));
        loadingBarFill.style.width = `${loadingProgress}%`;
        loadingProgressElement?.setAttribute('aria-valuenow', String(Math.round(loadingProgress)));
        scheduleLoadingPaws();

        if (loadingBarContainer && !loadingBarShown) {
            loadingBarShown = true;
            loadingBarContainer.style.display = 'flex';
        }

        // Force repaint on mobile
        if (isMobile) {
            loadingBarFill.offsetHeight;
        }
    }
    
    // Static resources are most of the load, but final app setup owns the last 16%.
    function updateLoadingBar(loadedCount, totalResources) {
        if (!totalResources) return;
        const resourceProgress = (loadedCount / totalResources) * 76;
        setLoadingProgress(resourceProgress);
    }

    setLoadingProgress(4);

    function waitForKofiOverlayReady() {
        return new Promise(resolve => {
            if (typeof window.openKofiOverlay === 'function' && typeof window.closeKofiOverlay === 'function') {
                resolve();
                return;
            }

            const startedAt = Date.now();
            const checkReady = () => {
                if (typeof window.openKofiOverlay === 'function' && typeof window.closeKofiOverlay === 'function') {
                    resolve();
                    return;
                }

                if (Date.now() - startedAt >= 2000) {
                    resolve();
                    return;
                }

                setTimeout(checkReady, 100);
            };

            checkReady();
        });
    }

    function createSubmissionsAbortError() {
        const error = new Error('Public submissions request was aborted.');
        error.name = 'AbortError';
        return error;
    }

    async function fetchPublicSubmissions(signal) {
        if (window.supabase?.__dollUnavailable) {
            throw new Error('Connection is unavailable right now. Please try again.');
        }

        const [drawingsResult, questionsResult] = await Promise.all([
            window.supabase
                .from('drawings')
                .select('id,imageData,created_at')
                .eq('approved', true)
                .order('created_at', { ascending: false })
                .limit(PUBLIC_DRAWINGS_LIMIT)
                .abortSignal(signal),
            window.supabase
                .from('questions')
                .select('id,question,answer,created_at')
                .not('answer', 'is', null)
                .order('created_at', { ascending: false })
                .limit(PUBLIC_QUESTIONS_LIMIT)
                .abortSignal(signal)
        ]);

        if (signal.aborted) throw createSubmissionsAbortError();
        if (drawingsResult.error) throw drawingsResult.error;
        if (questionsResult.error) throw questionsResult.error;

        return {
            drawings: drawingsResult.data || [],
            questions: (questionsResult.data || []).filter(item => String(item.answer || '').trim())
        };
    }

    function loadSubmissionsFromSupabase() {
        // Repeated taps while :3 is opening share one bounded request. There
        // is intentionally no startup/idle preload: public submissions never
        // compete with the entrance animation or its first interaction.
        if (submissionsLoadPromise && !submissionsLoadController?.signal.aborted) {
            return submissionsLoadPromise;
        }
        // A dirty-cache invalidation may have aborted the previous request
        // only moments before :3 opens. Detach that settling promise so the
        // fresh request can start immediately instead of inheriting its abort.
        if (submissionsLoadController?.signal.aborted) {
            submissionsLoadPromise = null;
            submissionsLoadController = null;
        }

        const requestRevision = submissionsRevision;
        const controller = new AbortController();
        let timedOut = false;
        let requestPromise;
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, PUBLIC_SUBMISSIONS_TIMEOUT_MS);

        submissionsLoadController = controller;
        requestPromise = fetchPublicSubmissions(controller.signal)
            .then(({ drawings, questions }) => {
                // A successful submit marks this cache dirty and aborts any
                // older fetch. Never let a late response overwrite that flag.
                if (controller.signal.aborted || requestRevision !== submissionsRevision) {
                    throw createSubmissionsAbortError();
                }

                preloadedSubmissions.drawings = drawings;
                preloadedSubmissions.questions = questions;
                preloadedSubmissions.error = null;
                preloadedSubmissions.loaded = true;
                return { drawings, questions };
            })
            .catch(error => {
                const finalError = controller.signal.aborted
                    ? createSubmissionsAbortError()
                    : error;

                if (requestRevision === submissionsRevision) {
                    preloadedSubmissions.error = finalError;
                    preloadedSubmissions.loaded = true;
                }

                if (timedOut) {
                    console.warn('Public submissions request timed out and was aborted; :3 will retry when opened.');
                }
                throw finalError;
            })
            .finally(() => {
                window.clearTimeout(timeoutId);
                if (submissionsLoadPromise === requestPromise) {
                    submissionsLoadPromise = null;
                }
                if (submissionsLoadController === controller) {
                    submissionsLoadController = null;
                }
            });

        submissionsLoadPromise = requestPromise;
        return requestPromise;
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

    function normalizeSiteLinkSettings(value) {
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
            wishlist_view_mode: ['grid', 'list', 'masonry'].includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry',
            homepage_note_text: String(settings.homepage_note_text || '').slice(0, 220),
            homepage_note_font_size: Math.min(17, Math.max(9, Number(settings.homepage_note_font_size) || 13.25)),
            maintenance_enabled: readBooleanSetting(settings, 'maintenance_enabled'),
            maintenance_title: String(settings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title),
            maintenance_message: String(settings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message),
            maintenance_eta: String(settings.maintenance_eta || ''),
            entrance_mode: settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw',
            drawings_enabled: readBooleanSetting(settings, 'drawings_enabled'),
            questions_enabled: readBooleanSetting(settings, 'questions_enabled'),
            rooms_enabled: readBooleanSetting(settings, 'rooms_enabled'),
            seo_title: String(settings.seo_title || DEFAULT_LINK_SETTINGS.seo_title),
            seo_description: String(settings.seo_description || DEFAULT_LINK_SETTINGS.seo_description),
            site_tagline: String(settings.site_tagline || DEFAULT_LINK_SETTINGS.site_tagline)
        };
    }

    async function loadSiteLinkSettings() {
        try {
            const { data, error } = await window.supabase
                .from('site_settings')
                .select('value')
                .eq('id', 'links');
            if (error || !Array.isArray(data) || !data[0]) return;
            const nextSettings = normalizeSiteLinkSettings(data[0].value);
            // The entrance timeout is a real boundary: a response arriving
            // later must not mutate settings without also updating the DOM.
            if (siteSettingsLoadExpired) return;
            siteLinkSettings = nextSettings;
        } catch (error) {
            if (siteSettingsLoadExpired) return;
            siteLinkSettings = { ...DEFAULT_LINK_SETTINGS };
        } finally {
            if (!siteSettingsLoadExpired && typeof applySiteLinkSettingsToDom === 'function') {
                applySiteLinkSettingsToDom();
            }
        }
    }

    async function loadSiteLinkSettingsWithTimeout() {
        let timeoutId = 0;
        await Promise.race([
            loadSiteLinkSettings(),
            new Promise(resolve => {
                timeoutId = window.setTimeout(() => {
                    siteSettingsLoadExpired = true;
                    resolve();
                }, 3000);
            })
        ]);
        if (timeoutId) window.clearTimeout(timeoutId);
    }

    // Enhanced loading logic: wait for min time, window load, AND ALL critical resources
    Promise.all([
        new Promise(resolve => setTimeout(resolve, minLoadingTime)),
        new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }
            // Async analytics or a non-critical DOM resource must never hold
            // the entrance forever. Explicit critical images are tracked by
            // the bounded resource promise below.
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timeoutId);
                window.removeEventListener('load', finish);
                resolve();
            };
            const timeoutId = window.setTimeout(finish, 8000);
            window.addEventListener('load', finish, { once: true });
        }),
        // Wait for DOM to be fully ready
        new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        }),
        waitForKofiOverlayReady(),
        // Wait for critical resources to load
        new Promise(resolve => {
            const criticalResources = [
                'site-images/background.png',
                'site-images/header.png',
                'note-paper-v4.png',
                'loading.gif',
                'site-images/wishlist.png'
            ];
            
            let loadedCount = 0;
            const totalResources = criticalResources.length;
            
            if (totalResources === 0) {
                resolve();
                return;
            }
            
            // Load each resource and track completion
            criticalResources.forEach(src => {
                let counted = false;

                const markResourceLoaded = () => {
                    if (counted) return;
                    counted = true;
                    loadedCount++;
                    updateLoadingBar(loadedCount, totalResources);

                    if (loadedCount === totalResources) {
                        resolve();
                    }
                };
                
                const resource = new Image();
                resource.onload = markResourceLoaded;
                resource.onerror = markResourceLoaded;
                resource.src = src;
            });
            
            updateLoadingBar(loadedCount, totalResources);
            
            // Mobile-specific: Force completion after 8 seconds to prevent infinite loading
            setTimeout(() => {
                if (loadedCount < totalResources) {
                    loadedCount = totalResources;
                    updateLoadingBar(loadedCount, totalResources);
                    resolve();
                }
            }, 8000);
        })
    ]).then(async () => {
        // Load Supabase only after the initial loading is complete
        setLoadingProgress(82);

        try {
            // Bounded — unlike fetch(), a dynamic import() has no built-in
            // timeout. A stalled connection to esm.sh (no error, just no
            // response) would hang this await forever with nothing else in
            // the whole loading sequence able to rescue it, since every
            // other network step here already races against a timeout.
            const { createClient } = await Promise.race([
                import('https://esm.sh/@supabase/supabase-js@2'),
                wait(8000).then(() => { throw new Error('Supabase module import timed out'); })
            ]);
            window.supabase = createClient(
                'https://zvqdodzkhmcptwkjlfeu.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8',
                {
                    db: {
                        schema: 'public'
                    },
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true
                    }
                }
            );
            setLoadingProgress(89);
        } catch (supabaseError) {
            // Create a dummy supabase object to prevent errors
            window.supabase = createUnavailableSupabaseClient();
            setLoadingProgress(89);
        }
        resolveSiteClientReady(window.supabase);

        // Tick the bar forward while data fetches to avoid a long plateau
        const progressTick = setInterval(() => {
            if (loadingProgress < 97) setLoadingProgress(loadingProgress + 0.25);
        }, 350);

        // Public :3 content is intentionally not part of the entrance gate.
        // It is fetched only if the visitor opens that panel, so base64
        // drawings can never contend with the entrance interaction.
        await loadSiteLinkSettingsWithTimeout();
        clearInterval(progressTick);
        setLoadingProgress(100);

        // Let the far-right paw finish pressing in before revealing the site.
        await waitForLoadingPawTrail();
        await wait(prefersReducedLoadingMotion ? 80 : 360);
        clearSlowLoadingMessage();
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
            retireLoadingScreen();
            const iconContainer = document.querySelector('.icon-container');
            if (iconContainer) {
                iconContainer.style.visibility = "visible";
                iconContainer.style.opacity = 1;
            }
            initApp();
        }, 500);
    }).catch(e => {
        // Mobile fallback: show website even if loading fails
        if (!window.supabase) window.supabase = createUnavailableSupabaseClient();
        resolveSiteClientReady(window.supabase);
        clearSlowLoadingMessage();
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
            retireLoadingScreen();
            const iconContainer = document.querySelector('.icon-container');
            if (iconContainer) {
                iconContainer.style.visibility = "visible";
                iconContainer.style.opacity = 1;
            }
            initApp();
        }, 500);
    });

    // ===== SITE ENTRANCE =====
    const popup = document.getElementById("popup");
    const closePopupButton = document.getElementById("close-popup");
    const entryBubbleField = document.getElementById("entry-bubble-field");
    let entryDismissalInProgress = false;
    let entryBubbleRemaining = 0;
    let entryBubbleHintTimer = 0;
    let entryBubbleHintCleanupTimer = 0;
    let entryBubbleHintShown = false;
    const legacyIOSMatch = navigator.userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) (\d+)[._]/);
    const isLegacyIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        && legacyIOSMatch
        && Number(legacyIOSMatch[1]) <= 15;
    if (popup) popup.style.display = "flex";

    function dismissEntryGate(trigger = null) {
        if (!popup || entryDismissalInProgress) return;
        entryDismissalInProgress = true;
        void warmUiSounds();
        primeBackgroundMusic();
        // This hidden sticker is needed only after the visitor enters. Starting
        // it now gives the transition time to load without delaying the loader
        // or briefly exposing it before the note begins to peel.
        loadDeferredImage(document.querySelector('.note-under-sign'), 'noteUnderSrc');

        // The paw gets its press acknowledgement. Bubble mode has already
        // played its final pop before reaching this shared exit path.
        trigger?.classList.add('is-pressed');

        setTimeout(() => {
            popup.style.opacity = 0;
            setTimeout(() => {
                popup.style.display = "none";
                const mainScreen = document.getElementById("main-screen");
                if (mainScreen) {
                    mainScreen.classList.remove('ui-ready', 'note-ready');
                    mainScreen.style.display = "block";
                    setTimeout(() => mainScreen.classList.add('ui-ready'), 780);
                    setTimeout(() => {
                        mainScreen.classList.add('note-ready');
                        scheduleFirstVisitTour();
                    }, 1080);
                }

            }, 500);

            // CUT2 is 0.6 seconds long. Give legacy iOS a little extra separation
            // before page music starts, while retaining the current timing elsewhere.
            window.setTimeout(startBackgroundMusic, isLegacyIOS ? 900 : 700);
        }, trigger ? 420 : 80);
    }

    function clearEntryBubbles() {
        if (!entryBubbleField) return;
        clearEntryBubbleHint();
        entryBubbleField.replaceChildren();
        entryBubbleField.inert = false;
        entryBubbleRemaining = 0;
    }

    function clearEntryBubbleHint() {
        window.clearTimeout(entryBubbleHintTimer);
        window.clearTimeout(entryBubbleHintCleanupTimer);
        entryBubbleHintTimer = 0;
        entryBubbleHintCleanupTimer = 0;
        entryBubbleField?.querySelectorAll('.entry-bubble-hint-finger, .entry-bubble-hint-wave').forEach(node => node.remove());
        entryBubbleField?.querySelectorAll('.entry-bubble.is-hint-pressed').forEach(bubble => {
            bubble.classList.remove('is-hint-pressed');
        });
    }

    function cancelEntryBubbleHint() {
        entryBubbleHintShown = true;
        clearEntryBubbleHint();
    }

    function showEntryBubbleHint() {
        entryBubbleHintTimer = 0;
        if (!entryBubbleField || entryDismissalInProgress || entryBubbleHintShown || entryBubbleRemaining < 1) return;
        const target = Array.from(entryBubbleField.querySelectorAll('.entry-bubble:not(.popping)'))[0];
        if (!target) return;

        entryBubbleHintShown = true;
        const rect = target.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const finger = document.createElement('span');
        const wave = document.createElement('span');
        finger.className = 'entry-bubble-hint-finger';
        wave.className = 'entry-bubble-hint-wave';
        finger.setAttribute('aria-hidden', 'true');
        wave.setAttribute('aria-hidden', 'true');
        finger.style.cssText = `--hint-x:${centerX}px;--hint-y:${centerY}px;`;
        wave.style.cssText = `--hint-x:${centerX}px;--hint-y:${centerY}px;--hint-size:${Math.max(rect.width, rect.height)}px;`;
        finger.innerHTML = `
            <svg viewBox="0 0 42 58" focusable="false" aria-hidden="true">
                <path d="M20.5 4.5c-3.2 0-5.2 2.4-5.2 5.7v20.1l-3.1-4.7c-1.6-2.4-4.4-3-6.4-1.4-2 1.6-2.1 4.4-.5 6.7l8.6 13c2.5 3.7 6.5 6 11 6h2.4c6.3 0 11.4-5.1 11.4-11.4V25.2c0-2.7-1.8-4.8-4.3-4.8-1.4 0-2.6.6-3.4 1.6v-2.7c0-2.8-1.9-4.9-4.4-4.9-1.4 0-2.7.6-3.5 1.7v-5.9c0-3.3-1.9-5.7-5.1-5.7Z" fill="rgba(255,255,255,.88)" stroke="rgba(255,210,230,.72)" stroke-width="1.2" stroke-linejoin="round"/>
            </svg>`;
        target.classList.add('is-hint-pressed');
        entryBubbleField.append(wave, finger);
        entryBubbleHintCleanupTimer = window.setTimeout(clearEntryBubbleHint, 1500);
    }

    function scheduleEntryBubbleHint() {
        clearEntryBubbleHint();
        entryBubbleHintShown = false;
        entryBubbleHintTimer = window.setTimeout(showEntryBubbleHint, 2000);
    }

    function createEntryBubbleBurst(bubble, host = entryBubbleField, extraClass = '') {
        if (!host) return;
        const rect = bubble.getBoundingClientRect();
        const burst = document.createElement('span');
        const fragment = document.createDocumentFragment();
        const particleCount = isMobile ? 12 : 16;
        const fragmentCount = isMobile ? 4 : 5;
        burst.className = `entry-bubble-burst ${extraClass}`.trim();
        burst.setAttribute('aria-hidden', 'true');
        burst.style.cssText = `--burst-size:${Math.max(rect.width, rect.height)}px;left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;`;

        for (let index = 0; index < particleCount; index += 1) {
            const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * 0.34;
            const distance = 42 + Math.random() * 56;
            const particle = document.createElement('i');
            const size = (5 + Math.random() * 7).toFixed(1);
            const spin = Math.round((Math.random() - 0.5) * 300);
            particle.style.cssText = `--burst-x:${(Math.cos(angle) * distance).toFixed(1)}px;--burst-y:${(Math.sin(angle) * distance).toFixed(1)}px;--particle-size:${size}px;--particle-spin:${spin}deg;--particle-delay:${Math.round(Math.random() * 55)}ms;`;
            fragment.appendChild(particle);
        }

        for (let index = 0; index < fragmentCount; index += 1) {
            const angle = (Math.PI * 2 * index) / fragmentCount + (Math.random() - 0.5) * 0.34;
            const distance = 42 * 0.84 + Math.random() * ((98 * 0.9) - (42 * 0.84));
            const filmArc = document.createElement('b');
            filmArc.style.cssText = `--burst-x:${(Math.cos(angle) * distance).toFixed(1)}px;--burst-y:${(Math.sin(angle) * distance).toFixed(1)}px;--fragment-size:${(18 + Math.random() * 22).toFixed(1)}px;--fragment-angle:${(angle * 180 / Math.PI).toFixed(1)}deg;--particle-delay:${Math.round(Math.random() * 45)}ms;`;
            fragment.appendChild(filmArc);
        }

        burst.appendChild(fragment);
        host.appendChild(burst);
        window.setTimeout(() => burst.remove(), 920);
    }

    function popEntryBubble(bubble) {
        if (!bubble || bubble.classList.contains('popping') || entryDismissalInProgress) return;
        cancelEntryBubbleHint();
        createEntryBubbleBurst(bubble);
        bubble.classList.add('popping');
        bubble.disabled = true;
        entryBubbleRemaining -= 1;
        playUiSound('tap');
        entryBubbleField.setAttribute('aria-label', entryBubbleRemaining
            ? `${entryBubbleRemaining} bubble${entryBubbleRemaining === 1 ? '' : 's'} left to pop`
            : 'All bubbles popped. Entering the site.');
        window.setTimeout(() => bubble.remove(), 360);

        if (entryBubbleRemaining === 0) {
            entryBubbleField.inert = true;
            primeBackgroundMusic();
            window.setTimeout(() => dismissEntryGate(), 620);
        }
    }

    function startBubbleEntrance() {
        if (!entryBubbleField || entryDismissalInProgress) return;
        clearEntryBubbles();

        const zones = [
            { x: [18, 36], y: [22, 42] },
            { x: [64, 82], y: [22, 42] },
            { x: [20, 40], y: [58, 76] },
            { x: [60, 80], y: [58, 76] }
        ].sort(() => Math.random() - 0.5);
        const bubbleCount = Math.random() < 0.5 ? 3 : 4;
        entryBubbleRemaining = bubbleCount;
        entryBubbleField.hidden = false;
        entryBubbleField.setAttribute('aria-label', `Pop all ${bubbleCount} bubbles to enter the site`);

        zones.slice(0, bubbleCount).forEach((zone, index) => {
            const bubble = document.createElement('button');
            const size = Math.round(66 + Math.random() * 38);
            const x = Math.round(zone.x[0] + Math.random() * (zone.x[1] - zone.x[0]));
            const y = Math.round(zone.y[0] + Math.random() * (zone.y[1] - zone.y[0]));
            const drift = Math.round((Math.random() - 0.5) * 42);
            const duration = (4.2 + Math.random() * 1.8).toFixed(2);
            bubble.type = 'button';
            bubble.className = 'footer-play-bubble entry-bubble';
            bubble.setAttribute('aria-label', `Pop bubble ${index + 1} of ${bubbleCount}`);
            bubble.style.cssText = `--bubble-size:${size}px;--bubble-x:${x}vw;--bubble-y:${y}vh;--bubble-drift:${drift}px;--bubble-duration:${duration}s;`;

            bubble.addEventListener('pointerdown', event => {
                if (!event.isPrimary || event.button > 0) return;
                event.preventDefault();
                void warmUiSounds();
                popEntryBubble(bubble);
            });
            bubble.addEventListener('click', event => {
                // Pointer input is handled on pointerdown for immediate iOS
                // feedback. A zero-detail click is keyboard/assistive input.
                if (event.detail !== 0) return;
                void warmUiSounds();
                popEntryBubble(bubble);
            });

            entryBubbleField.appendChild(bubble);
        });

        scheduleEntryBubbleHint();
    }

    function renderEntryGateMode() {
        if (!popup || entryDismissalInProgress || popup.style.display === 'none') return;
        const useBubbles = siteLinkSettings.entrance_mode === 'bubbles';
        popup.classList.toggle('entry-mode-bubbles', useBubbles);
        if (closePopupButton) closePopupButton.hidden = useBubbles;

        if (useBubbles) {
            if (entryBubbleField && !entryBubbleField.children.length) startBubbleEntrance();
            return;
        }

        clearEntryBubbles();
        if (entryBubbleField) entryBubbleField.hidden = true;
    }

    closePopupButton?.addEventListener("click", function() {
        dismissEntryGate(this);
    });

    renderEntryGateMode();

    // ===== TOP ICON ROW COLLAPSE (shared by wishlist + socials + :3) =====
    // One shared progress value drives a visual morph only. Each eligible
    // panel allocates its final scroll viewport once when it opens; scrolling
    // thereafter changes transforms/opacity, never layout or scroller size.
    //
    // A single 48px linear range made the content briefly travel at almost 2x
    // finger speed on iPhone (native scroll + as much as 53px of panel rise).
    // Give each surface roughly two scroll pixels per reclaimed pixel instead,
    // with socials capped at 72px so its short list can still finish the morph.
    // The eased ramp starts and ends at zero added velocity, removing the hard
    // speed changes that made even a slow drag feel strangely unsmooth.
    const ICON_COLLAPSE_RANGES = Object.freeze({
        social: 72,
        wishlist: 90,
        posts: 106,
    });
    const ICON_COLLAPSE_RAMP = 0.2;
    const ICON_COLLAPSE_PEAK_RATE = 1 / (1 - ICON_COLLAPSE_RAMP);
    let iconCollapseTweenRaf = 0;
    let iconCollapseDisplayed = 0;
    const panelScrollExtents = new WeakMap();
    const hasNativeScrollCollapse = Boolean(
        window.CSS?.supports?.('animation-timeline: scroll()')
        && window.CSS?.supports?.('timeline-scope: --dwl-test')
    );

    function getActiveMotionShell() {
        if (document.body.classList.contains('has-social-panel-open')) {
            return document.querySelector('.social-links-shell');
        }
        if (document.body.classList.contains('has-wishlist-panel-open')) {
            return document.querySelector('.doll-wishlist-scroll-shell');
        }
        if (document.body.classList.contains('has-posts-panel-open')) {
            return document.getElementById('posts-popup');
        }
        return null;
    }

    function getOpenPanelScroller() {
        return document.body.classList.contains('has-social-panel-open')
            ? document.querySelector('.social-links-panel')
            : document.body.classList.contains('has-wishlist-panel-open')
                ? document.querySelector('.doll-wishlist-body')
                : document.body.classList.contains('has-posts-panel-open')
                    ? document.querySelector('.posts-content')
                    : null;
    }

    function getIconCollapseRange() {
        const configuredRange = parseFloat(
            getActiveMotionShell()?.style.getPropertyValue('--dwl-motion-range') || ''
        );
        if (configuredRange > 0) return configuredRange;
        if (document.body.classList.contains('has-social-panel-open')) {
            return ICON_COLLAPSE_RANGES.social;
        }
        if (document.body.classList.contains('has-wishlist-panel-open')) {
            return ICON_COLLAPSE_RANGES.wishlist;
        }
        return ICON_COLLAPSE_RANGES.posts;
    }

    // A short linear middle with quadratic shoulders. Compared with regular
    // smoothstep it keeps the peak added speed lower (1.25x vs 1.5x) while
    // still joining natural scrolling with no velocity jump at either end.
    function easeIconCollapseProgress(progress) {
        const t = Math.max(0, Math.min(1, progress));
        const ramp = ICON_COLLAPSE_RAMP;
        const rate = ICON_COLLAPSE_PEAK_RATE;
        if (t < ramp) return (rate * t * t) / (2 * ramp);
        if (t > 1 - ramp) {
            const remaining = 1 - t;
            return 1 - ((rate * remaining * remaining) / (2 * ramp));
        }
        return ((rate * ramp) / 2) + (rate * (t - ramp));
    }

    function refreshMotionBodyState() {
        document.body.classList.toggle(
            'has-dwl-scroll-motion',
            Boolean(document.querySelector('.dwl-motion-shell.dwl-motion-ready'))
        );
    }

    function refreshPanelScrollExtent(scroller) {
        if (!scroller) return 0;
        const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        panelScrollExtents.set(scroller, maxScroll);
        return maxScroll;
    }
    window.dollRefreshPanelScrollExtent = refreshPanelScrollExtent;

    function clearScrollMotion(shell) {
        if (!shell) return;
        const scroller = shell.querySelector('.social-links-panel, .doll-wishlist-body, .posts-content');
        const host = shell.closest('.toggle-container');
        if (scroller) panelScrollExtents.delete(scroller);
        shell.classList.remove('dwl-motion-ready');
        shell.style.removeProperty('--dwl-motion-base-height');
        shell.style.removeProperty('--dwl-motion-range');
        // The row and pill are siblings of the motion shell, so their native
        // animations inherit the measured range from this common host. Keep a
        // range owned by another ready shell; otherwise remove the stale value.
        if (host && !host.querySelector('.dwl-motion-shell.dwl-motion-ready')) {
            host.style.removeProperty('--dwl-motion-range');
        }
        refreshMotionBodyState();
    }

    // Configure while the panel is stationary. The base measurement is saved
    // once and the real scroller is immediately given its final height. The
    // moving child initially offsets that extra height below the shell, so the
    // open-state appearance is unchanged until scrolling begins.
    function configureScrollMotion(shell, scroller, baseElement = scroller, { enabled = true } = {}) {
        if (!shell || !scroller || !baseElement) return false;
        clearScrollMotion(shell);
        if (!enabled) return false;

        const baseHeight = baseElement.getBoundingClientRect().height;
        const distance = parseFloat(
            window.getComputedStyle(shell).getPropertyValue('--dwl-collapse-distance')
        ) || 0;
        const baseOverflow = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
        const finalOverflow = Math.max(0, baseOverflow - distance);
        const desiredRange = document.body.classList.contains('has-social-panel-open')
            ? ICON_COLLAPSE_RANGES.social
            : document.body.classList.contains('has-wishlist-panel-open')
                ? ICON_COLLAPSE_RANGES.wishlist
                : ICON_COLLAPSE_RANGES.posts;
        const minimumSafeRange = Math.ceil(distance * 1.6);
        const configuredRange = Math.min(desiredRange, Math.floor(finalOverflow));

        // Slightly short surfaces may use their available range, but never a
        // range below 1.6 scroll pixels per reclaimed pixel. That removes the
        // abrupt full-range/no-morph cutoff without bringing back the fast,
        // unnatural content velocity that the Safari fix replaced.
        if (!(baseHeight > 0 && distance > 0 && configuredRange >= minimumSafeRange)) {
            refreshPanelScrollExtent(scroller);
            refreshMotionBodyState();
            return false;
        }

        shell.style.setProperty('--dwl-motion-base-height', `${baseHeight.toFixed(2)}px`);
        shell.style.setProperty('--dwl-motion-range', `${configuredRange}px`);
        shell.closest('.toggle-container')?.style.setProperty('--dwl-motion-range', `${configuredRange}px`);
        shell.classList.add('dwl-motion-ready');
        refreshPanelScrollExtent(scroller);
        refreshMotionBodyState();
        return true;
    }
    window.dollConfigureScrollMotion = configureScrollMotion;
    window.dollClearScrollMotion = clearScrollMotion;

    function getCurrentMotionGrow(panel) {
        const shell = panel?.closest('.dwl-motion-shell');
        if (!shell?.classList.contains('dwl-motion-ready')) return 0;
        const scroller = shell.querySelector('.social-links-panel, .doll-wishlist-body, .posts-content');
        const distance = parseFloat(
            window.getComputedStyle(shell).getPropertyValue('--dwl-collapse-distance')
        ) || 0;
        const range = parseFloat(shell.style.getPropertyValue('--dwl-motion-range')) || getIconCollapseRange();
        const progress = easeIconCollapseProgress((scroller?.scrollTop || 0) / range);
        return distance * progress;
    }

    // Size the open panel's base scroll window to the real screen height
    // instead of a fixed cap. A ready motion viewport may be visually shifted
    // upward by a known amount; normalizing that transform below gives us one
    // stable expanded-state top for --panel-fill-max. Small screens retain the
    // baseline cap and tall screens use their available space.
    //
    // visualViewport.height, NOT 100dvh: dvh resolves to the toolbar-RETRACTED
    // (tallest) viewport, which would size the panel past what's actually
    // visible and tuck the pill under the iOS toolbar. visualViewport tracks
    // the currently-visible area, keeping the pill on-screen as the toolbar
    // shows/hides. The footer's own padding-bottom already covers the safe-area
    // inset, so footerH (a border-box height) must not add it again.
    //
    // extraReserve is any chrome that renders BELOW the element being grown but
    // still inside the panel (e.g. the wishlist's checkout foot sits under its
    // scroll body), so the grown element must stop short by that much to keep
    // that chrome — and the pill under it — on screen.
    function setPanelFillMax(panel, { reservedPad = 4, openMargin = 10, bottomGap = 16, extraReserve = 0 } = {}) {
        if (!panel) return;
        const footer = document.querySelector('.site-brand-footer');
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const renderedPanelTop = panel.getBoundingClientRect().top;
        // A ready motion viewport may already be visually translated upward.
        // Normalize that transform back to its expanded-state top before
        // calculating a new stationary fill cap.
        const scrollGrow = getCurrentMotionGrow(panel);
        const panelTop = renderedPanelTop + scrollGrow;
        const footerHeight = footer ? (footer.getBoundingClientRect().height || 0) : 44;
        const avail = viewportHeight - panelTop - (footerHeight + reservedPad + openMargin + bottomGap + extraReserve);
        panel.style.setProperty('--panel-fill-max', `${Math.max(0, Math.floor(avail))}px`);
    }
    window.dollSetPanelFillMax = setPanelFillMax;

    // Safari changes visualViewport height while its browser chrome retracts.
    // Once a panel opens, height-only changes are ignored for that entire open
    // session; the next open measures afresh. Width/orientation changes remain
    // legitimate layout changes and are applied after active scrolling ends.
    let panelFillTimer = 0;
    let panelScrollIdleTimer = 0;
    let panelScrolling = false;
    let panelFillPending = false;
    let panelFillForcePending = false;
    let lastPanelViewportWidth = window.visualViewport?.width || window.innerWidth;

    function hasOpenScrollPanel() {
        return document.body.classList.contains('has-social-panel-open')
            || document.body.classList.contains('has-wishlist-panel-open')
            || document.body.classList.contains('has-posts-panel-open');
    }

    function markPanelScrollActivity() {
        panelScrolling = true;
        window.clearTimeout(panelScrollIdleTimer);
        panelScrollIdleTimer = window.setTimeout(() => {
            panelScrolling = false;
            reconcilePanelScrollState();
            if (panelFillPending) {
                schedulePanelFillSync({ force: panelFillForcePending });
            }
        }, 180);
    }
    window.dollMarkPanelScrollActivity = markPanelScrollActivity;
    window.dollIsPanelScrolling = () => panelScrolling;

    function schedulePanelFillSync({ force = false } = {}) {
        // Browser-toolbar height changes are intentionally frozen until the
        // panel closes. This keeps both native and fallback scrollers immutable
        // under a finger and during momentum.
        if (hasOpenScrollPanel() && !force) return;
        panelFillPending = true;
        panelFillForcePending ||= force;
        window.clearTimeout(panelFillTimer);
        if (panelScrolling) return;
        panelFillTimer = window.setTimeout(() => {
            const forceSync = panelFillForcePending;
            panelFillPending = false;
            panelFillForcePending = false;
            window.requestAnimationFrame(() => {
                if (document.body.classList.contains('has-social-panel-open')) {
                    window.dollSyncSocialReservedHeight?.(forceSync);
                } else if (document.body.classList.contains('has-wishlist-panel-open')) {
                    window.dollSyncWishlistReservedHeight?.(forceSync);
                } else if (document.body.classList.contains('has-posts-panel-open')) {
                    syncPostsPanelSpace();
                }
            });
        }, 120);
    }

    function handlePanelViewportResize() {
        const nextWidth = window.visualViewport?.width || window.innerWidth;
        const widthChanged = Math.abs(nextWidth - lastPanelViewportWidth) > 2;
        lastPanelViewportWidth = nextWidth;
        schedulePanelFillSync({ force: widthChanged });
    }
    window.addEventListener('resize', handlePanelViewportResize);
    window.visualViewport?.addEventListener('resize', handlePanelViewportResize);

    function setPillInteraction(progress, group = document.querySelector('.button-group')) {
        if (!group) return;
        const pill = document.getElementById('dwl-icons-pill');
        if (!pill) return;
        const interactive = progress > 0.78;
        const expectedPointerEvents = interactive ? 'auto' : 'none';
        const expectedTabIndex = interactive ? 0 : -1;
        const stateIsStale = group.classList.contains('icons-pill-active') !== interactive
            || pill.style.pointerEvents !== expectedPointerEvents
            || pill.tabIndex !== expectedTabIndex;
        if (stateIsStale) {
            group.classList.toggle('icons-pill-active', interactive);
            pill.style.pointerEvents = expectedPointerEvents;
            pill.tabIndex = expectedTabIndex;
        }
    }

    function setIconCollapseProgress(progress, { writeVisual = true } = {}) {
        const clamped = Math.max(0, Math.min(1, progress));
        iconCollapseDisplayed = clamped;
        const host = document.querySelector('.toggle-container');
        const group = document.querySelector('.button-group');
        if (!host || !group) return;
        if (writeVisual) host.style.setProperty('--dwl-collapse', clamped.toFixed(4));
        setPillInteraction(clamped, group);
    }

    function cancelIconCollapseTween() {
        if (!iconCollapseTweenRaf) return;
        window.cancelAnimationFrame(iconCollapseTweenRaf);
        iconCollapseTweenRaf = 0;
    }

    // The only independent animation is the no-scroll fallback for the pill.
    // Normal panel scrolling writes the transform progress directly.
    function animateIconCollapseTo(target, duration = 280) {
        cancelIconCollapseTween();
        const start = iconCollapseDisplayed;
        const startTime = performance.now();
        function tick(now) {
            const t = Math.min(1, (now - startTime) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setIconCollapseProgress(start + (target - start) * eased);
            iconCollapseTweenRaf = t < 1 ? window.requestAnimationFrame(tick) : 0;
        }
        iconCollapseTweenRaf = window.requestAnimationFrame(tick);
    }

    // This is called from an already-rAF-throttled listener in each panel.
    // Keep it one-way and synchronous: an additional easing loop would lag
    // behind Safari momentum and continue repainting after the gesture ends.
    function setIconsScrollProgress(scrollTop) {
        cancelIconCollapseTween();
        const shell = getActiveMotionShell();
        if (!shell?.classList.contains('dwl-motion-ready')) {
            setIconCollapseProgress(0);
            return;
        }
        const linearProgress = Math.max(0, Math.min(1, scrollTop / getIconCollapseRange()));
        setIconCollapseProgress(easeIconCollapseProgress(linearProgress), {
            // Native scroll timelines own the visual properties directly and
            // do not need main-thread style writes on every scroll frame.
            writeVisual: !hasNativeScrollCollapse,
        });
    }

    const ICON_TOP_RELEASE_PX = 4;

    // Safari can advance a native scroll timeline ahead of its main-thread
    // scroll event delivery. Release hit-testing immediately near the top, then
    // run this same reconciliation after scrollend/idle so a stale pill class
    // can never leave fully visible icons unclickable.
    function releaseIconHitTestingAtTop(scroller) {
        if (!scroller || scroller.scrollTop > ICON_TOP_RELEASE_PX) return false;
        const group = document.querySelector('.button-group');
        const pill = document.getElementById('dwl-icons-pill');
        const stale = group?.classList.contains('icons-pill-active')
            || pill?.style.pointerEvents === 'auto';
        if (stale) {
            cancelIconCollapseTween();
            setIconCollapseProgress(0, { writeVisual: !hasNativeScrollCollapse });
        }
        return true;
    }

    function reconcilePanelScrollState(scroller = getOpenPanelScroller()) {
        if (!scroller) return;
        if (releaseIconHitTestingAtTop(scroller)) {
            if (!hasNativeScrollCollapse) {
                setIconCollapseProgress(0);
            }
            return;
        }
        setIconsScrollProgress(scroller.scrollTop);
    }

    function resetIconsCollapse() {
        cancelIconCollapseTween();
        setIconCollapseProgress(0);
    }
    window.dollSetIconsScrollProgress = setIconsScrollProgress;
    window.dollResetIconsCollapse = resetIconsCollapse;

    // Whichever panel is open owns the scroll position that collapsed the
    // icons in the first place (collapse tracks its scrollTop 1:1 — see
    // setIconsScrollProgress). Tapping the pill used to only tween the icons
    // back open while that panel stayed scrolled down, so the very next
    // scroll tick (or even just momentum settling) immediately fed the same
    // scrollTop back in and re-collapsed them — the icons would pop back
    // open for a moment then snap shut again. Scrolling the actual panel to
    // top instead lets that one native motion drive everything: the existing
    // scroll listener sees scrollTop fall and un-collapses the icons in the
    // same smooth motion as the scroll, so the pill tap and the "back to
    // top" both read as one gesture instead of two fighting ones.
    function scrollOpenPanelToTop() {
        const panel = getOpenPanelScroller();
        if (panel && panel.scrollTop > 0) {
            panel.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        }
        return false;
    }
    document.getElementById('dwl-icons-pill')?.addEventListener('click', () => {
        if (!scrollOpenPanelToTop()) animateIconCollapseTo(0);
    });

    // The transparency gradient is a stationary mask on the scroller shell.
    // Two state classes cross-fade its edge strengths. Separate enter/exit
    // thresholds stop sub-pixel Safari rubber-banding from flickering them.
    function updateScrollEdgeState(el, shell) {
        if (!el || !shell) return;
        const maxScroll = panelScrollExtents.has(el)
            ? panelScrollExtents.get(el)
            : refreshPanelScrollExtent(el);
        const scrollTop = Math.max(0, Math.min(maxScroll, el.scrollTop));
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
    window.dollUpdateScrollEdgeState = updateScrollEdgeState;

    const panelScrollRafs = new WeakMap();
    const panelScrollEndBound = new WeakSet();
    function queuePanelScrollUpdate(scroller, shell) {
        if (!scroller || !shell) return false;
        releaseIconHitTestingAtTop(scroller);
        if (!panelScrollEndBound.has(scroller)) {
            panelScrollEndBound.add(scroller);
            scroller.addEventListener('scrollend', () => {
                reconcilePanelScrollState(scroller);
                updateScrollEdgeState(scroller, shell);
            }, { passive: true });
        }
        markPanelScrollActivity();
        if (panelScrollRafs.has(scroller)) return true;
        const raf = window.requestAnimationFrame(() => {
            panelScrollRafs.delete(scroller);
            setIconsScrollProgress(scroller.scrollTop);
            updateScrollEdgeState(scroller, shell);
        });
        panelScrollRafs.set(scroller, raf);
        return true;
    }
    window.dollQueuePanelScrollUpdate = queuePanelScrollUpdate;

    const postsContentEl = document.querySelector('.posts-content');
    postsContentEl?.addEventListener('scroll', (event) => {
        queuePanelScrollUpdate(event.currentTarget, postsPanel);
    }, { passive: true });

    // ===== TOGGLE NOTE & DRAWING WIDGET =====
    const toggleButton = document.getElementById('toggle-button');
    const noteImage = document.querySelector('.note-image');
    const notePeelTarget = document.getElementById('note-peel-target');
    const drawingWidget = document.querySelector('.drawing-widget');
    const postsPanel = document.getElementById('posts-popup');
    const postsButton = document.getElementById('posts-button');
    let postsPanelResizeObserver = null;
    let postsOpenGeneration = 0;

    function shouldPlayPostsMedia() {
        return Boolean(
            postsPanel?.classList.contains('active')
            && postsPanel.querySelector('#questions-tab')?.classList.contains('active')
            && !document.hidden
        );
    }

    function getPostsMediaFrames() {
        if (!postsPanel) return [];
        return Array.from(postsPanel.querySelectorAll([
            '.answer-gif-link',
            '.answer-video-frame',
            '.answer-media-frame'
        ].join(',')));
    }

    function pausePostsMediaFrame(frame) {
        frame.querySelectorAll('img.answer-gif, video, iframe').forEach(media => {
            if (media instanceof HTMLVideoElement) media.pause();
            const src = media.getAttribute('src');
            if (!src || src === 'about:blank') return;
            media.dataset.postsPausedSrc = src;
            if (media instanceof HTMLImageElement
                && media.naturalWidth > 0
                && media.naturalHeight > 0) {
                media.style.aspectRatio = `${media.naturalWidth} / ${media.naturalHeight}`;
            }
            if (media instanceof HTMLIFrameElement) {
                media.src = 'about:blank';
            } else {
                media.removeAttribute('src');
                if (media instanceof HTMLVideoElement) media.load();
            }
        });
    }

    function resumePostsMediaFrame(frame) {
        frame.querySelectorAll('img.answer-gif, video, iframe').forEach(media => {
            const src = media.dataset.postsPausedSrc || media.dataset.postsSrc;
            if (src && (!media.getAttribute('src') || media.getAttribute('src') === 'about:blank')) {
                media.src = src;
                delete media.dataset.postsPausedSrc;
                if (media instanceof HTMLVideoElement) media.load();
            }
            if (media instanceof HTMLVideoElement && media.getAttribute('src')) {
                media.play().catch(() => {});
            }
        });
    }

    const postsMediaObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const frame = entry.target;
                frame.dataset.postsMediaNear = entry.isIntersecting ? 'true' : 'false';
                if (entry.isIntersecting && shouldPlayPostsMedia()) {
                    resumePostsMediaFrame(frame);
                } else {
                    pausePostsMediaFrame(frame);
                }
            });
        }, {
            root: postsContentEl,
            rootMargin: '140px 0px'
        })
        : null;

    function observePostsMedia() {
        getPostsMediaFrames().forEach(frame => {
            if (frame.dataset.postsMediaObserved === 'true') return;
            frame.dataset.postsMediaObserved = 'true';
            frame.dataset.postsMediaNear = postsMediaObserver ? 'false' : 'true';
            postsMediaObserver?.observe(frame);
        });
    }

    function pausePostsMedia() {
        getPostsMediaFrames().forEach(pausePostsMediaFrame);
    }

    function resumePostsMedia() {
        if (!shouldPlayPostsMedia() || !postsPanel) return;
        observePostsMedia();
        getPostsMediaFrames()
            .filter(frame => frame.dataset.postsMediaNear === 'true')
            .forEach(resumePostsMediaFrame);
    }

    function syncPostsMediaPlayback() {
        if (!shouldPlayPostsMedia()) {
            pausePostsMedia();
            return;
        }
        observePostsMedia();
        getPostsMediaFrames()
            .filter(frame => frame.dataset.postsMediaNear !== 'true')
            .forEach(pausePostsMediaFrame);
        resumePostsMedia();
    }

    if (postsPanel && typeof window.MutationObserver === 'function') {
        const postsMediaMutationObserver = new MutationObserver(() => {
            observePostsMedia();
            syncPostsMediaPlayback();
        });
        postsMediaMutationObserver.observe(postsPanel, { childList: true, subtree: true });
    }

    function syncPostsPanelSpace() {
        if (!postsPanel?.classList.contains('active')) return;
        const host = postsPanel.closest('.toggle-container');
        const card = postsPanel.querySelector('.popup-content');
        if (!host || !card) return;
        // Establish the base fill cap, then allocate the final motion viewport
        // once. Its negative margin and added height cancel exactly, so this
        // outer bottom is identical before, during and after the conversion.
        setPanelFillMax(card, { reservedPad: 14, openMargin: 18, bottomGap: 16 });
        configureScrollMotion(postsPanel, postsContentEl, card);
        const panelRect = postsPanel.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        const neededHeight = Math.max(310, Math.ceil(panelRect.bottom - hostRect.top + 14));
        host.style.setProperty('--posts-panel-height', `${neededHeight}px`);
        updateScrollEdgeState(postsContentEl, postsPanel);
    }

    function setPostsPanelLayoutOpen(open) {
        document.body.classList.toggle('has-posts-panel-open', open);
        const host = postsPanel?.closest('.toggle-container');
        if (!open) {
            clearScrollMotion(postsPanel);
            host?.style.removeProperty('--posts-panel-height');
            postsPanel?.querySelector('.popup-content')?.style.removeProperty('--panel-fill-max');
            postsPanelResizeObserver?.disconnect();
            postsPanelResizeObserver = null;
            return;
        }

        window.requestAnimationFrame(syncPostsPanelSpace);
        const card = postsPanel?.querySelector('.popup-content');
        if (card && typeof window.ResizeObserver === 'function') {
            postsPanelResizeObserver?.disconnect();
            postsPanelResizeObserver = new ResizeObserver(() => {
                // Configuring the final viewport changes this card once. It
                // remains frozen afterward, so that known resize is ignored.
                if (panelScrolling || postsPanel.classList.contains('dwl-motion-ready')) return;
                syncPostsPanelSpace();
            });
            postsPanelResizeObserver.observe(card);
        }
    }

    function closeDrawingWidget() {
        if (!toggleButton || !noteImage || !drawingWidget) return;
        drawingWidget.classList.remove('active');
        toggleButton.classList.remove('drawing-open');
        toggleButton.textContent = '✎';
    }

    function closeQuestionForm() {
        const askButton = document.getElementById('ask-button');
        const askFormContainer = document.getElementById('ask-form-container');
        const askTextarea = document.getElementById('ask-textarea');
        if (!askButton || !askFormContainer) return;
        askFormContainer.style.display = 'none';
        askFormContainer.classList.toggle('has-text', Boolean(askTextarea?.value.trim()));
        askButton.textContent = '?';
    }

    function closePostsPanel() {
        // Closing :3 is also a cancellation boundary. Do not keep downloading
        // base64 drawings or decode the first cards behind a hidden panel.
        postsOpenGeneration += 1;
        if (submissionsLoadController && !submissionsLoadController.signal.aborted) {
            // Invalidate the request before aborting so a close/reopen race
            // cannot let the older catch overwrite the newer request cache.
            submissionsRevision += 1;
            submissionsLoadController.abort();
        }
        pausePostsMedia();
        setPostsPanelLayoutOpen(false);
        // Match the wishlist's own close behavior exactly: snap the icons back
        // instantly (resetIconsCollapse), not the eased scroll-tracking path
        // (setIconsScrollProgress), and reset the scrolled content itself so
        // reopening doesn't show a scrolled-down list underneath icons that
        // have already reset to their expanded state.
        resetIconsCollapse();
        if (postsContentEl) {
            postsContentEl.scrollTop = 0;
            updateScrollEdgeState(postsContentEl, postsPanel);
        }
        if (!postsPanel || !postsButton) return;
        postsPanel.classList.remove('active');
        postsButton.textContent = ':3';
    }

    function showNoteImage() {
        closeDrawingWidget();
        closeQuestionForm();
        closePostsPanel();
        closeActionMenu();
        notePeelTarget?.classList.remove('hidden');
        noteImage?.classList.remove('hidden');
    }

    function hideNoteImage() {
        notePeelTarget?.classList.add('hidden');
        noteImage?.classList.add('hidden');
    }

    function closeActionPanels() {
        closeDrawingWidget();
        closeQuestionForm();
        closePostsPanel();
        notePeelTarget?.classList.remove('hidden');
        noteImage?.classList.remove('hidden');
    }

    if (toggleButton && noteImage && drawingWidget) {
        toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (siteLinkSettings.drawings_enabled === false) {
                showSubmitPopup("Doodles are paused for a bit.");
                return;
            }
            playUiSound('tap');
            const open = drawingWidget.classList.contains('active');
            if (open) {
                showNoteImage();
            } else {
                closeQuestionForm();
                closePostsPanel();
                if (typeof window.closeThroneMockup === 'function') window.closeThroneMockup();
                hideNoteImage();
                drawingWidget.classList.add('active');
                toggleButton.classList.add('drawing-open');
                toggleButton.textContent = '✖';
            }
        });
    }

    // ===== CONTACT FORM REMOVED - Now using Ko-fi widget only =====
    // All contact form code has been removed - using Ko-fi widget instead

    // ===== SOCIALS AND SUPPORT MENUS =====
    const socialsButton = document.getElementById('socials-button');
    const socialLinksPanel = document.getElementById('social-links-panel');
    const socialLinksShell = socialLinksPanel?.closest('.social-links-shell');
    const snapchatOption = document.getElementById('snapchat-option');
    const instagramOption = document.getElementById('instagram-option');
    const telegramOption = document.getElementById('telegram-option');
    const xOption = document.getElementById('x-option');
    const tiktokOption = document.getElementById('tiktok-option');
    const twitchOption = document.getElementById('twitch-option');
    const discordOption = document.getElementById('discord-option');
    function createOnlyFansOption() {
        if (!socialLinksPanel) return null;
        const option = document.createElement('a');
        option.id = 'onlyfans-option';
        option.className = 'social-link-card site-link-hidden';
        option.target = '_blank';
        option.rel = 'noopener noreferrer';
        option.tabIndex = -1;
        option.setAttribute('aria-label', 'Open OnlyFans');
        option.setAttribute('aria-hidden', 'true');
        option.innerHTML = `
            <span class="social-link-icon" aria-hidden="true">
                <img data-social-src="social-icons/onlyfans.png" alt="" width="192" height="192" decoding="async">
            </span>
            <span class="social-link-copy">
                <strong>onlyfans</strong>
                <small hidden></small>
            </span>
            <span class="social-link-arrow" aria-hidden="true">
                <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M4 12 12 4M7 4h5v5"></path>
                </svg>
            </span>`;
        socialLinksPanel.append(option);
        return option;
    }
    const onlyfansOption = document.getElementById('onlyfans-option') || createOnlyFansOption();
    const spotifyOption = document.getElementById('spotify-option');
    const supportMenuButton = document.getElementById('support-menu-button');
    const actionMenuButton = document.getElementById('action-menu-button');
    const actionOptions = actionMenuButton?.querySelector('.action-options');
    const publicAskButton = document.getElementById('ask-button');
    const donateOption = document.getElementById('donate-option');
    const siteBrandButton = document.getElementById('site-brand-button');
    const footerBubbleField = document.getElementById('footer-bubble-field');
    const homepageNoteText = document.getElementById('homepage-note-text');
    const homepageNoteEditor = document.getElementById('homepage-note-editor');
    const homepageNoteTarget = document.getElementById('note-peel-target');
    const homepageNoteAdminControls = document.getElementById('homepage-note-admin-controls');
    const homepageNoteSize = document.getElementById('homepage-note-size');
    const homepageNoteSave = document.getElementById('homepage-note-save');
    const HOMEPAGE_NOTE_ADMIN_UID = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3';
    let homepageNoteCanEdit = false;
    let homepageNoteLastValidText = '';
    let homepageNoteSaveQueue = Promise.resolve();
    let homepageNoteSaveRevision = 0;
    let homepageNoteSizeSaveTimer = null;
    let homepageNoteSizeRollback = null;
    let homepageNoteFitFrame = null;
    let homepageNoteLastSaveError = null;
    let homepageNoteSaveLabelTimer = null;
    let homepageNoteExplicitSavePending = false;
    let homepageNoteAdminAccessRevision = 0;
    let homepageNoteSuppressOpen = false;
    let homepageNoteSuppressOpenTimer = null;
    const maintenanceOverlay = document.getElementById('site-maintenance-overlay');
    const maintenanceKicker = document.getElementById('site-maintenance-kicker');
    const maintenanceTitle = document.getElementById('site-maintenance-title');
    const maintenanceMessage = document.getElementById('site-maintenance-message');
    const maintenanceEta = document.getElementById('site-maintenance-eta');
    const FIRST_VISIT_TOUR_KEY = 'doll_first_visit_tour_seen_v1';
    const FIRST_VISIT_TOUR_FORCE = new URLSearchParams(window.location.search).get('previewTour') === '1';
    let activeKofiWidgetHandle = 'edoll';

    const socialCardDefinitions = [
        { key: 'snapchat', option: snapchatOption, label: 'Snapchat' },
        { key: 'instagram', option: instagramOption, label: 'Instagram', withAt: true },
        { key: 'kofi', option: donateOption, label: 'Ko-fi' },
        { key: 'telegram', option: telegramOption, label: 'Telegram' },
        { key: 'x', option: xOption, label: 'X', withAt: true },
        { key: 'tiktok', option: tiktokOption, label: 'TikTok', withAt: true },
        { key: 'twitch', option: twitchOption, label: 'Twitch', withAt: true },
        { key: 'discord', option: discordOption, label: 'Discord', withAt: true },
        { key: 'onlyfans', option: onlyfansOption, label: 'OnlyFans', withAt: true },
        { key: 'spotify', option: spotifyOption, label: 'Spotify' }
    ];
    let socialPreviewObserver = null;
    const SOCIAL_PREVIEW_ROOT_MARGIN = 120;

    function getSocialCardVideoEntries() {
        return socialCardDefinitions.map(({ key, option }) => [key, option]);
    }

    function getSocialCardVideoKey(card) {
        return socialCardDefinitions.find(({ option }) => option === card)?.key || '';
    }

    function applySocialCardOrder() {
        if (!socialLinksPanel) return;
        const byKey = new Map(socialCardDefinitions.map(({ key, option }) => [key, option]));
        normalizeSocialCardOrder(siteLinkSettings.social_card_order).forEach(key => {
            const option = byKey.get(key);
            const cardNode = option?.closest('.social-link-card-frame') || option;
            if (cardNode) socialLinksPanel.append(cardNode);
        });
    }

    function isGifSocialCardMedia(url) {
        return /\.gif(?:$|[?#])/i.test(String(url || ''));
    }

    function removeSocialCardVideo(card) {
        if (!card) return;
        const preview = card.querySelector('.social-link-preview');
        if (preview) {
            if (preview instanceof HTMLVideoElement) {
                preview.pause();
                preview.removeAttribute('src');
                preview.load();
            } else {
                preview.removeAttribute('src');
            }
            preview.remove();
        }
        card.classList.remove('has-social-preview');
    }

    function pauseSocialCardPreview(card) {
        const preview = card?.querySelector('.social-link-preview');
        if (preview instanceof HTMLVideoElement) {
            preview.pause();
            if (preview.getAttribute('src')) {
                card.classList.remove('has-social-preview');
                preview.removeAttribute('src');
                preview.load();
            }
            return;
        }
        if (!(preview instanceof HTMLImageElement) || !preview.getAttribute('src')) return;
        card.classList.remove('has-social-preview');
        preview.removeAttribute('src');
    }

    function syncSocialCardVideo(key, card, loadMedia = false) {
        if (!card) return;
        const url = String(siteLinkSettings[`${key}_card_video_url`] || '').trim();
        if (!url || !isPublicLinkEnabled(key)) {
            removeSocialCardVideo(card);
            return;
        }

        const useGif = isGifSocialCardMedia(url);
        let preview = card.querySelector('.social-link-preview');
        const hasWrongPreviewType = preview && (useGif
            ? !(preview instanceof HTMLImageElement)
            : !(preview instanceof HTMLVideoElement));
        if (hasWrongPreviewType) {
            removeSocialCardVideo(card);
            preview = null;
        }

        // Settings are applied while the social panel is still hidden. Keep
        // the URL in settings only; creating an element with src here would
        // download and (for GIFs) animate invisible media on every visit.
        if (!preview && !loadMedia) {
            card.classList.remove('has-social-preview');
            return;
        }

        if (!preview) {
            preview = document.createElement(useGif ? 'img' : 'video');
            preview.className = 'social-link-preview';
            preview.setAttribute('aria-hidden', 'true');
            preview.tabIndex = -1;
            if (preview instanceof HTMLVideoElement) {
                preview.muted = true;
                preview.defaultMuted = true;
                preview.loop = true;
                preview.playsInline = true;
                preview.preload = 'metadata';
                preview.setAttribute('muted', '');
                preview.setAttribute('playsinline', '');
            } else {
                preview.alt = '';
                preview.decoding = 'async';
            }
            preview.addEventListener(useGif ? 'load' : 'loadeddata', () => {
                card.classList.add('has-social-preview');
            });
            preview.addEventListener('error', () => {
                card.classList.remove('has-social-preview');
            });
            card.prepend(preview);
        }

        if (preview.dataset.source !== url) {
            card.classList.remove('has-social-preview');
            if (preview instanceof HTMLVideoElement) {
                preview.pause();
                preview.removeAttribute('src');
                preview.load();
            } else {
                preview.removeAttribute('src');
            }
            delete preview.dataset.socialPausedSrc;
            preview.dataset.source = url;
        }

        if (!loadMedia) return;

        if (preview.getAttribute('src') !== url) {
            preview.src = url;
            delete preview.dataset.socialPausedSrc;
            if (preview instanceof HTMLVideoElement) preview.load();
        }

        if (preview instanceof HTMLVideoElement && socialsButton?.classList.contains('open') && !document.hidden) {
            preview.play().catch(() => {});
        }
    }

    function syncSocialCardVideos(loadMedia = false) {
        getSocialCardVideoEntries().forEach(([key, card]) => {
            const shouldLoad = loadMedia && (
                typeof window.IntersectionObserver !== 'function'
                || card?.dataset.socialPreviewNear === 'true'
            );
            syncSocialCardVideo(key, card, shouldLoad);
        });
    }

    function isSocialCardNearPanel(card) {
        if (!socialLinksPanel || !card?.isConnected) return false;
        const panelRect = socialLinksPanel.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        return cardRect.bottom >= panelRect.top - SOCIAL_PREVIEW_ROOT_MARGIN
            && cardRect.top <= panelRect.bottom + SOCIAL_PREVIEW_ROOT_MARGIN;
    }

    function observeSocialCardPreviews() {
        socialPreviewObserver?.disconnect();
        socialPreviewObserver = null;
        const cards = getVisibleSocialOptions();
        cards.forEach(card => delete card.dataset.socialPreviewNear);

        if (!socialLinksPanel || typeof window.IntersectionObserver !== 'function') {
            cards.forEach(card => { card.dataset.socialPreviewNear = 'true'; });
            return false;
        }

        socialPreviewObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const card = entry.target;
                if (!(card instanceof HTMLElement)) return;
                if (!entry.isIntersecting) {
                    delete card.dataset.socialPreviewNear;
                    pauseSocialCardPreview(card);
                    return;
                }

                card.dataset.socialPreviewNear = 'true';
                if (!socialsButton?.classList.contains('open') || document.hidden) return;
                const key = getSocialCardVideoKey(card);
                if (key) syncSocialCardVideo(key, card, true);
            });
        }, {
            root: socialLinksPanel,
            rootMargin: `${SOCIAL_PREVIEW_ROOT_MARGIN}px 0px`,
            threshold: 0.01
        });

        cards.forEach(card => {
            socialPreviewObserver.observe(card);
            // Hydrate the initially visible cards in the same frame. The
            // observer takes over as soon as the visitor scrolls.
            if (!isSocialCardNearPanel(card)) return;
            card.dataset.socialPreviewNear = 'true';
            const key = getSocialCardVideoKey(card);
            if (key) syncSocialCardVideo(key, card, true);
        });
        return true;
    }

    function playSocialCardVideos() {
        if (document.hidden || !socialsButton?.classList.contains('open')) return;
        const usingObserver = observeSocialCardPreviews();
        if (!usingObserver) syncSocialCardVideos(true);
        getVisibleSocialOptions().filter(card => (
            !usingObserver || card.dataset.socialPreviewNear === 'true'
        )).forEach(card => {
            card.querySelector('video.social-link-preview')?.play().catch(() => {});
        });
    }

    function pauseSocialCardVideos() {
        socialPreviewObserver?.disconnect();
        socialPreviewObserver = null;
        getSocialCardVideoEntries().forEach(([, card]) => {
            if (card) delete card.dataset.socialPreviewNear;
            pauseSocialCardPreview(card);
        });
    }

    function getPublicLink(key) {
        return siteLinkSettings[`${key}_url`] || DEFAULT_LINK_SETTINGS[`${key}_url`];
    }

    function isPublicLinkEnabled(key) {
        return siteLinkSettings[`${key}_enabled`] !== false;
    }

    function updateSocialCardDisplay(option, key, platformLabel, withAt = false) {
        if (!option) return;
        const handle = normalizeSocialUsername(siteLinkSettings[`${key}_username`]);
        const small = option.querySelector('.social-link-copy small');
        if (small) {
            small.textContent = handle ? (withAt ? `@${handle}` : handle) : '';
            small.hidden = !handle;
        }
        option.setAttribute('aria-label', handle
            ? `Open ${platformLabel}: ${handle}`
            : `Open ${platformLabel}`);
    }

    function getVisibleSocialOptions() {
        return Array.from(socialLinksPanel?.querySelectorAll('.social-link-card') || [])
            .filter(option => !option.classList.contains('site-link-hidden'));
    }

    function loadDeferredSocialImage(image) {
        if (!(image instanceof HTMLImageElement) || image.dataset.socialLoadStarted === 'true') return;
        const src = String(image.dataset.socialSrc || '').trim();
        if (!src) return;

        image.dataset.socialLoadStarted = 'true';
        const markLoaded = () => {
            image.removeEventListener('error', allowRetry);
            delete image.dataset.socialLoadStarted;
            delete image.dataset.socialSrc;
            image.style.removeProperty('display');
            image.classList.add('is-social-image-loaded');
        };
        const allowRetry = () => {
            image.removeEventListener('load', markLoaded);
            delete image.dataset.socialLoadStarted;
            image.classList.remove('is-social-image-loaded');
            image.removeAttribute('src');
        };
        image.addEventListener('load', markLoaded, { once: true });
        image.addEventListener('error', allowRetry, { once: true });
        image.src = src;
        if (image.complete && image.naturalWidth > 0) markLoaded();
    }

    function loadVisibleSocialImages() {
        getVisibleSocialOptions().forEach(option => {
            const cardNode = option.closest('.social-link-card-frame') || option;
            cardNode.querySelectorAll('img[data-social-src]').forEach(loadDeferredSocialImage);
        });
    }

    function syncStructuredDataLinks() {
        const structuredData = document.getElementById('site-structured-data');
        if (!structuredData) return;

        try {
            const data = JSON.parse(structuredData.textContent);
            const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
            const websiteNode = graph.find(node => node['@type'] === 'WebSite');
            const personNodes = graph.filter(node => node['@type'] === 'Person');
            const pageTitle = siteLinkSettings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
            const pageDescription = siteLinkSettings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
            const siteTagline = siteLinkSettings.site_tagline || DEFAULT_LINK_SETTINGS.site_tagline;
            const sameAs = [...SOCIAL_CARD_KEYS, 'throne']
                .filter(isPublicLinkEnabled)
                .map(getPublicLink)
                .filter(Boolean);

            if (websiteNode) {
                websiteNode.sameAs = sameAs;
                websiteNode.description = pageDescription;
            }
            personNodes.forEach(node => {
                node.sameAs = sameAs;
                node.description = pageDescription;
                node.slogan = siteTagline;
            });
            graph
                .filter(node => node['@type'] === 'WebPage' || node['@type'] === 'ProfilePage')
                .forEach(node => {
                    node.name = pageTitle;
                    node.description = pageDescription;
                    if (node['@type'] === 'ProfilePage') node.headline = siteTagline;
                });
            structuredData.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            // Keep the static structured data if parsing ever fails.
        }
    }

    function fitHomepageNoteElement(element) {
        if (!element || element.hidden || !element.clientWidth || !element.clientHeight) return false;

        const preferredSize = getHomepageNoteFontSize();
        element.style.fontSize = `${preferredSize}px`;
        const fitsPreferredSize = element.scrollHeight <= element.clientHeight + 1
            && element.scrollWidth <= element.clientWidth + 1;
        if (fitsPreferredSize) return true;

        let low = 8.75;
        let high = preferredSize;
        for (let i = 0; i < 8; i += 1) {
            const middle = (low + high) / 2;
            element.style.fontSize = `${middle}px`;
            const fits = element.scrollHeight <= element.clientHeight + 1
                && element.scrollWidth <= element.clientWidth + 1;
            if (fits) low = middle;
            else high = middle;
        }
        element.style.fontSize = `${Math.floor(low * 4) / 4}px`;
        return element.scrollHeight <= element.clientHeight + 1
            && element.scrollWidth <= element.clientWidth + 1;
    }

    function getHomepageNoteDisplayText() {
        return String(siteLinkSettings.homepage_note_text || '')
            .replace(/\r\n?/g, '\n')
            .slice(0, 220);
    }

    function getHomepageNoteFontSize() {
        return Math.min(17, Math.max(9, Number(siteLinkSettings.homepage_note_font_size) || 13.25));
    }

    function getHomepageNoteSettingsSnapshot() {
        return {
            homepage_note_text: getHomepageNoteDisplayText(),
            homepage_note_font_size: getHomepageNoteFontSize()
        };
    }

    function syncHomepageNoteSizeControl() {
        if (!homepageNoteSize) return;
        const size = getHomepageNoteFontSize();
        homepageNoteSize.value = String(size);
        homepageNoteSize.setAttribute('aria-valuetext', `${size.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')} pixels`);
    }

    function renderHomepageNoteText() {
        if (!homepageNoteText) return;
        const text = getHomepageNoteDisplayText();
        homepageNoteText.textContent = text;
        homepageNoteText.hidden = !text || homepageNoteTarget?.classList.contains('editing');
        homepageNoteText.style.removeProperty('font-size');
        syncHomepageNoteSizeControl();
        if (homepageNoteFitFrame !== null) cancelAnimationFrame(homepageNoteFitFrame);
        homepageNoteFitFrame = text
            ? requestAnimationFrame(() => {
                homepageNoteFitFrame = null;
                fitHomepageNoteElement(homepageNoteText);
            })
            : null;
    }

    function getEditorPlainText() {
        if (!homepageNoteEditor) return '';
        return String(homepageNoteEditor.innerText || homepageNoteEditor.textContent || '')
            .replace(/\r\n?/g, '\n')
            .replace(/\u00a0/g, ' ');
    }

    function placeEditorCaretAtEnd() {
        if (!homepageNoteEditor) return;
        const selection = window.getSelection?.();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(homepageNoteEditor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function closeHomepageNoteEditor() {
        if (!homepageNoteEditor || !homepageNoteTarget) return;
        homepageNoteEditor.hidden = true;
        homepageNoteEditor.textContent = '';
        homepageNoteEditor.style.removeProperty('font-size');
        homepageNoteTarget.classList.remove('editing');
    }

    async function saveHomepageNoteSettings(noteSettings, revision) {
        const client = await siteClientReady;
        const { data: userData, error: userError } = await client.auth.getUser();
        if (userError || userData?.user?.id !== HOMEPAGE_NOTE_ADMIN_UID) {
            throw new Error('Your admin session has ended.');
        }

        const { data: currentRow, error: readError } = await client
            .from('site_settings')
            .select('value')
            .eq('id', 'links')
            .maybeSingle();
        if (readError && readError.code !== 'PGRST116') throw readError;

        const storedSettings = currentRow?.value && typeof currentRow.value === 'object'
            ? currentRow.value
            : {};
        const latestSettings = {
            ...storedSettings,
            ...normalizeSiteLinkSettings(storedSettings)
        };
        latestSettings.homepage_note_text = noteSettings.homepage_note_text;
        latestSettings.homepage_note_font_size = noteSettings.homepage_note_font_size;
        const { error: saveError } = await client
            .from('site_settings')
            .upsert({
                id: 'links',
                value: latestSettings,
                updated_at: new Date().toISOString()
            });
        if (saveError) throw saveError;

        if (revision === homepageNoteSaveRevision) {
            siteLinkSettings = latestSettings;
            renderHomepageNoteText();
        }
    }

    function queueHomepageNoteSave(previousSettings) {
        const noteSettings = getHomepageNoteSettingsSnapshot();
        const revision = ++homepageNoteSaveRevision;
        homepageNoteLastSaveError = null;
        homepageNoteSaveQueue = homepageNoteSaveQueue
            .catch(() => {})
            .then(() => saveHomepageNoteSettings(noteSettings, revision))
            .catch(error => {
                if (revision !== homepageNoteSaveRevision) return;
                homepageNoteLastSaveError = error;
                siteLinkSettings = { ...siteLinkSettings, ...previousSettings };
                renderHomepageNoteText();
                showSubmitPopup(error?.message || 'The note could not be saved.');
                void refreshHomepageNoteAdminAccess();
            });
        return homepageNoteSaveQueue;
    }

    function finishHomepageNoteEditing() {
        if (!homepageNoteEditor || !homepageNoteTarget || homepageNoteEditor.hidden) return;
        const value = getEditorPlainText().slice(0, 220);
        const previousSettings = getHomepageNoteSettingsSnapshot();
        closeHomepageNoteEditor();
        if (!homepageNoteCanEdit) {
            renderHomepageNoteText();
            return;
        }
        siteLinkSettings = { ...siteLinkSettings, homepage_note_text: value };
        renderHomepageNoteText();
        if (value !== previousSettings.homepage_note_text) queueHomepageNoteSave(previousSettings);
    }

    function beginHomepageNoteEditing() {
        if (!homepageNoteCanEdit || !homepageNoteEditor || !homepageNoteTarget || homepageNoteTarget.classList.contains('editing')) return;
        const noteImage = homepageNoteTarget.querySelector('.note-image');
        if (noteImage?.classList.contains('hidden') || homepageNoteTarget.classList.contains('completing')) return;

        homepageNoteLastValidText = getHomepageNoteDisplayText();
        homepageNoteEditor.textContent = homepageNoteLastValidText;
        homepageNoteEditor.hidden = false;
        homepageNoteText.hidden = true;
        homepageNoteTarget.classList.add('editing');
        homepageNoteEditor.style.removeProperty('font-size');
        fitHomepageNoteElement(homepageNoteEditor);
        try {
            homepageNoteEditor.focus({ preventScroll: true });
        } catch (error) {
            homepageNoteEditor.focus();
        }
        placeEditorCaretAtEnd();
    }

    if (homepageNoteEditor && homepageNoteTarget) {
        homepageNoteTarget.addEventListener('click', event => {
            if (!homepageNoteCanEdit) return;
            if (event.target instanceof Element && event.target.closest('.note-admin-controls')) return;
            if (event.target === homepageNoteEditor || homepageNoteEditor.contains(event.target)) return;
            if (homepageNoteSuppressOpen) {
                homepageNoteSuppressOpen = false;
                clearTimeout(homepageNoteSuppressOpenTimer);
                return;
            }
            if (homepageNoteTarget.classList.contains('peeling') || homepageNoteTarget.classList.contains('completing')) return;
            if (event.target instanceof Element && event.target.closest('.note-peel-handle')) return;
            beginHomepageNoteEditing();
        });

        homepageNoteEditor.addEventListener('input', () => {
            let value = getEditorPlainText();
            if (value.length > 220) {
                value = value.slice(0, 220);
                homepageNoteEditor.textContent = value;
                placeEditorCaretAtEnd();
            }
            if (fitHomepageNoteElement(homepageNoteEditor)) {
                homepageNoteLastValidText = value;
                return;
            }

            homepageNoteEditor.textContent = homepageNoteLastValidText;
            placeEditorCaretAtEnd();
            fitHomepageNoteElement(homepageNoteEditor);
        });

        homepageNoteEditor.addEventListener('blur', finishHomepageNoteEditing);
        homepageNoteEditor.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                homepageNoteEditor.blur();
            }
        });

        document.addEventListener('pointerdown', event => {
            if (homepageNoteEditor.hidden) return;
            if (event.target instanceof Node && homepageNoteEditor.contains(event.target)) return;
            if (event.target instanceof Element && event.target.closest('#homepage-note-save')) return;
            if (event.target instanceof Node
                && homepageNoteTarget.contains(event.target)
                && !(event.target instanceof Element && event.target.closest('.note-admin-controls'))) {
                homepageNoteSuppressOpen = true;
                clearTimeout(homepageNoteSuppressOpenTimer);
                homepageNoteSuppressOpenTimer = window.setTimeout(() => {
                    homepageNoteSuppressOpen = false;
                }, 500);
            }
            homepageNoteEditor.blur();
        }, true);
    }

    function flushHomepageNoteSizeSave() {
        clearTimeout(homepageNoteSizeSaveTimer);
        homepageNoteSizeSaveTimer = null;
        if (!homepageNoteSizeRollback) return;
        const previousSettings = homepageNoteSizeRollback;
        homepageNoteSizeRollback = null;
        queueHomepageNoteSave(previousSettings);
    }

    if (homepageNoteSize && homepageNoteAdminControls) {
        homepageNoteAdminControls.addEventListener('pointerdown', event => event.stopPropagation());
        homepageNoteAdminControls.addEventListener('click', event => event.stopPropagation());
        homepageNoteSize.addEventListener('input', () => {
            if (!homepageNoteCanEdit) {
                syncHomepageNoteSizeControl();
                return;
            }
            if (!homepageNoteSizeRollback) homepageNoteSizeRollback = getHomepageNoteSettingsSnapshot();
            siteLinkSettings = {
                ...siteLinkSettings,
                homepage_note_font_size: Math.min(17, Math.max(9, Number(homepageNoteSize.value) || 13.25))
            };
            renderHomepageNoteText();
            if (!homepageNoteEditor?.hidden) {
                homepageNoteEditor.style.removeProperty('font-size');
                fitHomepageNoteElement(homepageNoteEditor);
            }
            clearTimeout(homepageNoteSizeSaveTimer);
            homepageNoteSizeSaveTimer = window.setTimeout(flushHomepageNoteSizeSave, 500);
        });
        homepageNoteSize.addEventListener('change', flushHomepageNoteSizeSave);
    }

    async function saveHomepageNoteNow() {
        if (!homepageNoteCanEdit || !homepageNoteSave || homepageNoteSave.disabled) return;
        clearTimeout(homepageNoteSaveLabelTimer);
        homepageNoteExplicitSavePending = true;
        homepageNoteSave.disabled = true;
        if (homepageNoteSize) homepageNoteSize.disabled = true;
        homepageNoteSave.textContent = 'saving…';

        try {
            const revisionBeforeSave = homepageNoteSaveRevision;
            const fallbackSettings = getHomepageNoteSettingsSnapshot();
            if (homepageNoteEditor && !homepageNoteEditor.hidden) finishHomepageNoteEditing();
            flushHomepageNoteSizeSave();
            if (revisionBeforeSave === homepageNoteSaveRevision) {
                queueHomepageNoteSave(fallbackSettings);
            }

            await homepageNoteSaveQueue;
        } catch (error) {
            homepageNoteLastSaveError = error;
            showSubmitPopup(error?.message || 'The note could not be saved.');
            void refreshHomepageNoteAdminAccess();
        } finally {
            homepageNoteExplicitSavePending = false;
        }

        if (!homepageNoteCanEdit) return;
        homepageNoteSave.disabled = false;
        if (homepageNoteSize) homepageNoteSize.disabled = false;
        homepageNoteSave.textContent = homepageNoteLastSaveError ? 'retry' : 'saved ✓';
        if (!homepageNoteLastSaveError) {
            homepageNoteSaveLabelTimer = window.setTimeout(() => {
                if (homepageNoteSave) homepageNoteSave.textContent = 'save';
            }, 1400);
        }
    }

    homepageNoteSave?.addEventListener('click', saveHomepageNoteNow);

    function setHomepageNoteAdminAccess(canEdit) {
        homepageNoteCanEdit = canEdit;
        homepageNoteTarget?.classList.toggle('admin-editable', canEdit);
        if (homepageNoteAdminControls) homepageNoteAdminControls.hidden = !canEdit;
        if (homepageNoteSize) homepageNoteSize.disabled = !canEdit || homepageNoteExplicitSavePending;
        if (homepageNoteSave) {
            homepageNoteSave.disabled = !canEdit || homepageNoteExplicitSavePending;
            if (!canEdit) homepageNoteSave.textContent = 'save';
        }
        homepageNoteTarget?.setAttribute('aria-label', canEdit
            ? 'Tap the note to edit it, or pull its corner to peel it off'
            : 'Pull the note corner to peel it off');
        if (!canEdit && homepageNoteTarget?.classList.contains('editing')) {
            closeHomepageNoteEditor();
            renderHomepageNoteText();
        }
        if (!canEdit) {
            if (homepageNoteSizeRollback) {
                siteLinkSettings = { ...siteLinkSettings, ...homepageNoteSizeRollback };
                renderHomepageNoteText();
            }
            clearTimeout(homepageNoteSizeSaveTimer);
            clearTimeout(homepageNoteSaveLabelTimer);
            homepageNoteSizeSaveTimer = null;
            homepageNoteSizeRollback = null;
        }
    }

    async function refreshHomepageNoteAdminAccess() {
        const accessRevision = ++homepageNoteAdminAccessRevision;
        const client = await siteClientReady;
        if (accessRevision !== homepageNoteAdminAccessRevision) return;
        if (!client?.auth?.getUser) {
            setHomepageNoteAdminAccess(false);
            return;
        }

        try {
            const { data, error } = await client.auth.getUser();
            if (accessRevision !== homepageNoteAdminAccessRevision) return;
            setHomepageNoteAdminAccess(!error && data?.user?.id === HOMEPAGE_NOTE_ADMIN_UID);
        } catch (error) {
            if (accessRevision !== homepageNoteAdminAccessRevision) return;
            setHomepageNoteAdminAccess(false);
        }
    }

    void siteClientReady.then(client => {
        void refreshHomepageNoteAdminAccess();
        client.auth?.onAuthStateChange?.(() => {
            window.setTimeout(() => void refreshHomepageNoteAdminAccess(), 0);
        });
    });

    function renderMaintenanceMode() {
        const enabled = siteLinkSettings.maintenance_enabled === true;
        if (enabled) {
            closeSocialsMenu();
            closeSupportMenu();
            closeActionMenu();
        }
        const mainScreen = document.getElementById('main-screen');
        if (mainScreen) mainScreen.inert = enabled;
        document.body.classList.toggle('site-maintenance-active', enabled);
        if (!maintenanceOverlay) return;
        maintenanceOverlay.setAttribute('aria-hidden', enabled ? 'false' : 'true');
        maintenanceOverlay.toggleAttribute('data-nosnippet', true);
        if (maintenanceKicker) maintenanceKicker.textContent = enabled ? 'update' : '';
        if (maintenanceTitle) {
            maintenanceTitle.textContent = enabled
                ? (siteLinkSettings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title)
                : '';
        }
        if (maintenanceMessage) {
            maintenanceMessage.textContent = enabled
                ? (siteLinkSettings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message)
                : '';
        }
        if (maintenanceEta) {
            const eta = enabled && siteLinkSettings.maintenance_eta ? siteLinkSettings.maintenance_eta : '';
            maintenanceEta.textContent = eta;
            maintenanceEta.hidden = !eta;
        }
    }

    function syncMetaContent(selector, value) {
        const element = document.head.querySelector(selector);
        if (element) element.setAttribute('content', value);
    }

    function renderSeoSettings() {
        const title = siteLinkSettings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
        const description = siteLinkSettings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
        document.title = title;
        syncMetaContent('meta[name="description"]', description);
        syncMetaContent('meta[property="og:title"]', title);
        syncMetaContent('meta[property="og:description"]', description);
        syncMetaContent('meta[name="twitter:title"]', title);
        syncMetaContent('meta[name="twitter:description"]', description);
    }

    function renderSubmissionControls() {
        const drawingsEnabled = siteLinkSettings.drawings_enabled !== false;
        const questionsEnabled = siteLinkSettings.questions_enabled !== false;
        if (toggleButton) {
            toggleButton.classList.toggle('site-link-hidden', !drawingsEnabled);
            toggleButton.setAttribute('aria-hidden', drawingsEnabled ? 'false' : 'true');
            toggleButton.setAttribute('tabindex', drawingsEnabled ? '-1' : '-1');
            if (!drawingsEnabled) closeDrawingWidget();
        }
        if (publicAskButton) {
            publicAskButton.classList.toggle('site-link-hidden', !questionsEnabled);
            publicAskButton.setAttribute('aria-hidden', questionsEnabled ? 'false' : 'true');
            publicAskButton.setAttribute('tabindex', questionsEnabled ? '-1' : '-1');
            if (!questionsEnabled) closeQuestionForm();
        }
        if (actionMenuButton) {
            const hasActions = drawingsEnabled || questionsEnabled || Boolean(postsButton);
            actionMenuButton.classList.toggle('site-link-hidden', !hasActions);
            actionMenuButton.setAttribute('aria-hidden', hasActions ? 'false' : 'true');
            actionMenuButton.setAttribute('tabindex', hasActions ? '0' : '-1');
            if (!hasActions) closeActionMenu();
        }
    }

    function applyPublicLinkSettings() {
        document.body.classList.add('site-links-ready');
        renderEntryGateMode();
        const notePeelTarget = document.getElementById('note-peel-target');
        notePeelTarget?.removeAttribute('aria-disabled');
        notePeelTarget?.setAttribute('aria-label', homepageNoteCanEdit
            ? 'Tap the note to edit it, or pull its corner to peel it off'
            : 'Pull the note corner to peel it off');
        applySocialCardOrder();
        socialCardDefinitions.forEach(({ key, option, label, withAt = false }) => {
            if (!option) return;
            const enabled = isPublicLinkEnabled(key);
            if (enabled) option.href = getPublicLink(key);
            else option.removeAttribute('href');
            option.classList.toggle('site-link-hidden', !enabled);
            const cardNode = option.closest('.social-link-card-frame') || option;
            if (cardNode !== option) cardNode.classList.toggle('site-link-hidden', !enabled);
            option.setAttribute('aria-hidden', enabled ? 'false' : 'true');
            option.setAttribute('tabindex', '-1');
            updateSocialCardDisplay(option, key, label, withAt);
            if (key === 'onlyfans' && !enabled) option.remove();
        });
        if (donateOption) {
            syncKofiWidgetHandle();
            setKofiWidgetVisibility(isPublicLinkEnabled('kofi'));
        }
        syncSocialCardVideos();
        if (supportMenuButton) {
            const throneEnabled = isPublicLinkEnabled('throne');
            supportMenuButton.href = getPublicLink('throne');
            supportMenuButton.classList.toggle('site-link-hidden', !throneEnabled);
            supportMenuButton.setAttribute('aria-hidden', throneEnabled ? 'false' : 'true');
            supportMenuButton.setAttribute('tabindex', throneEnabled ? '0' : '-1');
            syncThroneWidgetUrl();
            if (!throneEnabled) closeSupportMenu();
        }
        if (socialsButton) {
            const hasVisibleLinks = getVisibleSocialOptions().length > 0;
            socialsButton.classList.toggle('site-link-hidden', !hasVisibleLinks);
            socialsButton.setAttribute('aria-hidden', hasVisibleLinks ? 'false' : 'true');
            socialsButton.setAttribute('tabindex', hasVisibleLinks ? '0' : '-1');
            if (!hasVisibleLinks) closeSocialsMenu();
            getVisibleSocialOptions().forEach(option => {
                option.setAttribute('tabindex', socialsButton.classList.contains('open') ? '0' : '-1');
            });
            if (socialsButton.classList.contains('open')) loadVisibleSocialImages();
        }
        syncStructuredDataLinks();
        renderSeoSettings();
        renderSubmissionControls();
        renderHomepageNoteText();
        renderMaintenanceMode();
    }

    function setKofiWidgetVisibility(visible) {
        document.body.classList.toggle('kofi-public-hidden', !visible);
        if (!visible && typeof window.closeKofiOverlay === 'function') {
            window.closeKofiOverlay();
        }
        document.querySelectorAll('[id^="kofi-widget-overlay-"], .floatingchat-container, .floatingchat-container-mobi')
            .forEach(element => {
                element.style.display = visible ? '' : 'none';
                element.style.pointerEvents = visible ? '' : 'none';
            });
    }

    function getKofiHandleFromUrl() {
        try {
            const url = new URL(getPublicLink('kofi'));
            const handle = url.hostname.includes('ko-fi.com')
                ? url.pathname.split('/').filter(Boolean)[0]
                : '';
            return handle || 'edoll';
        } catch (error) {
            return 'edoll';
        }
    }

    function syncKofiWidgetHandle() {
        const nextHandle = getKofiHandleFromUrl();
        if (nextHandle === activeKofiWidgetHandle || typeof kofiWidgetOverlay === 'undefined') return;
        activeKofiWidgetHandle = nextHandle;
        kofiWidgetOverlay.draw(nextHandle, {
            'type': 'floating-chat',
            'floating-chat.donateButton.text': 'Support me',
            'floating-chat.donateButton.background-color': '#323842',
            'floating-chat.donateButton.text-color': '#fff'
        });
    }

    function syncThroneWidgetUrl() {
        if (typeof window.setDollThroneUrl === 'function') {
            window.setDollThroneUrl(getPublicLink('throne'));
        } else {
            window.dollThroneUrl = getPublicLink('throne');
        }
    }

    function openKofiOverlay() {
        let attempts = 0;
        const maxAttempts = 36;

        function tryOpen() {
            attempts += 1;
            if (typeof window.openKofiOverlay === 'function') {
                window.openKofiOverlay();
                return;
            }
            if (attempts < maxAttempts) {
                window.setTimeout(tryOpen, 80);
            } else {
                window.open(getPublicLink('kofi'), '_blank', 'noopener,noreferrer');
            }
        }

        tryOpen();
    }

    // The social panel is now internally scrollable (see .social-links-panel
    // in styles.css) and its own box can still overlap the doll.gg footer
    // pill below .toggle-container -- same problem, same fix, as the
    // wishlist's syncReservedHeight in throne-mockup-widget.js: measure the
    // panel's real rendered bottom and reserve exactly that much room via a
    // custom property, rather than a hand-picked min-height that would go
    // stale the moment the icon row above it collapses/expands (which
    // shifts the panel's own top without changing the panel's own height).
    function syncSocialReservedHeight(force = false) {
        if (!socialLinksPanel || !socialLinksShell) return;
        if (!force && !socialLinksShell.classList.contains('active')) return;
        const host = socialLinksPanel.closest('.toggle-container');
        if (!host) return;
        // Establish the base fill cap, then allocate the final viewport once.
        // The shell's stationary bottom is what the host reserves.
        setPanelFillMax(socialLinksPanel, { reservedPad: 4, openMargin: 10, bottomGap: 16 });
        configureScrollMotion(socialLinksShell, socialLinksPanel, socialLinksPanel);
        const panelRect = socialLinksShell.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
        const neededHeight = Math.max(60, Math.ceil(panelRect.bottom - hostRect.top + 4));
        host.style.setProperty('--dwl-social-height', `${neededHeight}px`);
    }
    window.dollSyncSocialReservedHeight = (force = false) => syncSocialReservedHeight(force);

    function updateSocialEdgeFade(el) {
        updateScrollEdgeState(el, socialLinksShell);
    }
    function onSocialPanelScroll(event) {
        queuePanelScrollUpdate(event.currentTarget, socialLinksShell);
    }
    socialLinksPanel?.addEventListener('scroll', onSocialPanelScroll, { passive: true });

    function closeSocialsMenu({ restoreNote = true } = {}) {
        if (!socialsButton) return;
        const wasOpen = socialsButton.classList.contains('open');
        pauseSocialCardVideos();
        socialsButton.classList.remove('open');
        socialsButton.setAttribute('aria-expanded', 'false');
        socialsButton.setAttribute('aria-label', 'Open socials');
        socialLinksShell?.classList.remove('active');
        socialLinksPanel?.setAttribute('aria-hidden', 'true');
        clearScrollMotion(socialLinksShell);
        document.body.classList.remove('has-social-panel-open');
        resetIconsCollapse();
        if (socialLinksPanel) {
            socialLinksPanel.scrollTop = 0;
            updateSocialEdgeFade(socialLinksPanel);
        }
        socialLinksPanel?.closest('.toggle-container')?.style.removeProperty('--dwl-social-height');
        socialLinksPanel?.style.removeProperty('--panel-fill-max');
        if (wasOpen && typeof window.closeKofiOverlay === 'function') {
            window.closeKofiOverlay();
        }
        getVisibleSocialOptions().forEach(option => {
            option.setAttribute('tabindex', '-1');
        });
        if (wasOpen && restoreNote) {
            notePeelTarget?.classList.remove('hidden');
            noteImage?.classList.remove('hidden');
        }
    }

    function closeSupportMenu() {
        if (!supportMenuButton) return;
        supportMenuButton.classList.remove('open');
        if (typeof window.closeThroneOverlay === 'function') {
            window.closeThroneOverlay();
        }
        if (typeof window.closeThroneMockup === 'function') {
            window.closeThroneMockup();
        }
    }

    function closeActionMenu() {
        if (!actionMenuButton) return;
        const wasOpen = actionMenuButton.classList.contains('open');
        actionMenuButton.classList.remove('open');
        actionMenuButton.setAttribute('aria-expanded', 'false');
        actionOptions?.setAttribute('aria-hidden', 'true');
        if (wasOpen) {
            closeActionPanels();
        }
        actionMenuButton.querySelectorAll('.action-option').forEach(option => {
            option.setAttribute('tabindex', '-1');
        });
    }

    function addMenuActivation(element, handler) {
        if (!element) return;

        element.addEventListener('click', function(e) {
            // Mobile browsers no longer need a touch fast-path here. Opening on
            // pointerdown reshaped the row before the tap/click sequence ended.
            handler(e);
        });
    }

    function handleSocialsButtonActivate(e) {
        e.preventDefault();
        e.stopPropagation();
        playUiSound('tap');

        if (socialsButton.classList.contains('open')) {
            closeSocialsMenu();
            return;
        }

        closeSupportMenu();
        closeActionMenu();
        closeDrawingWidget();
        closeQuestionForm();
        closePostsPanel();
        hideNoteImage();
        resetIconsCollapse();
        loadVisibleSocialImages();
        socialsButton.classList.remove('show-glitter');
        socialsButton.classList.add('open');
        socialsButton.setAttribute('aria-expanded', 'true');
        socialsButton.setAttribute('aria-label', 'Close socials');
        // Apply the panel-specific stable icon-row gap before measuring so
        // the reserved height is based on the exact geometry that will stay
        // in force for the whole open session.
        document.body.classList.add('has-social-panel-open');
        if (socialLinksPanel) {
            socialLinksPanel.scrollTop = 0;
            updateSocialEdgeFade(socialLinksPanel);
            // Measure the panel's true open size before starting its
            // transition (see .social-links-shell.measure-open in
            // styles.css) -- measuring mid-transition would reserve a
            // moving, momentarily-too-small target.
            socialLinksShell?.classList.add('measure-open');
            syncSocialReservedHeight(true);
            socialLinksShell?.classList.remove('measure-open');
        }
        socialLinksShell?.classList.add('active');
        socialLinksPanel?.setAttribute('aria-hidden', 'false');
        // Establishes the correct top/bottom fade immediately (e.g. a bottom
        // fade if there are more cards than fit) instead of leaving it fully
        // opaque, undetected, until the user's first scroll event.
        if (socialLinksPanel) {
            window.requestAnimationFrame(() => updateSocialEdgeFade(socialLinksPanel));
        }
        getVisibleSocialOptions().forEach(option => {
            option.setAttribute('tabindex', '0');
        });
        window.requestAnimationFrame(playSocialCardVideos);
    }

    applySiteLinkSettingsToDom = applyPublicLinkSettings;
    applyPublicLinkSettings();
    addMenuActivation(socialsButton, handleSocialsButtonActivate);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pauseSocialCardVideos();
        } else if (socialsButton?.classList.contains('open')) {
            playSocialCardVideos();
        }
        syncPostsMediaPlayback();
    });

    function hasSeenFirstVisitTour() {
        try {
            return localStorage.getItem(FIRST_VISIT_TOUR_KEY) === '1';
        } catch (error) {
            return true;
        }
    }

    function markFirstVisitTourSeen() {
        try {
            localStorage.setItem(FIRST_VISIT_TOUR_KEY, '1');
        } catch (error) {
            // Storage can be unavailable in private browsing.
        }
    }

    function scheduleFirstVisitTour() {
        if (!FIRST_VISIT_TOUR_FORCE) {
            if (hasSeenFirstVisitTour()) return;
            markFirstVisitTourSeen();
        }
        window.setTimeout(startFirstVisitTour, 1250);
    }

    function startFirstVisitTour() {
        if (siteLinkSettings.maintenance_enabled === true) return;
        const steps = [
            { element: socialsButton, label: 'contact', placement: 'up' },
            { element: supportMenuButton, label: 'wishlist', placement: 'down' },
            { element: actionMenuButton, label: ':p', placement: 'up' }
        ].filter(step => step.element && !step.element.classList.contains('site-link-hidden'));
        if (!steps.length) return;

        const overlay = document.createElement('div');
        overlay.className = 'first-visit-tour';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = `
            <div class="tour-veil-layer"></div>
            <span class="tour-bubble tour-bubble-one"></span>
            <span class="tour-bubble tour-bubble-two"></span>
            <span class="tour-bubble tour-bubble-three"></span>
            <span class="tour-bubble tour-bubble-four"></span>
            <span class="tour-bubble tour-bubble-five"></span>
            <span class="tour-bubble tour-bubble-six"></span>
            <div class="tour-step-layer"></div>
        `;
        document.body.appendChild(overlay);
        document.body.classList.add('first-visit-tour-active');
        steps.forEach(step => step.element.classList.add('tour-highlight-target'));

        let tourEndTimer = null;
        let tourFinished = false;
        const tourTotalDuration = 2000;
        const tourExitDuration = 425;
        const veilLayer = overlay.querySelector('.tour-veil-layer');
        const stepLayer = overlay.querySelector('.tour-step-layer');

        function makeHandwrittenLabel(label) {
            const letterTurns = [-3, 1, -1, 2, -2, 1, 3];
            const letterLifts = [1, -1, 0, -2, 1, -1, 0];
            return Array.from(label).map((letter, letterIndex) => {
                if (letter === ' ') {
                    return '<span class="tour-label-letter space">&nbsp;</span>';
                }
                const turn = letterTurns[letterIndex % letterTurns.length];
                const lift = letterLifts[letterIndex % letterLifts.length];
                return `<span class="tour-label-letter" style="--tour-letter-turn:${turn}deg;--tour-letter-lift:${lift}px">${letter}</span>`;
            }).join('');
        }

        function updateTourVeil() {
            if (!veilLayer || veilLayer.firstChild) return;
            // Single full-screen element. The button-group sits at z-index 10006,
            // above this tour overlay at 10005, so each button floats through
            // as a crisp punch-hole in the uniformly blurred background.
            veilLayer.innerHTML = '<span class="tour-veil-piece"></span>';
        }

        function finishTour() {
            if (tourFinished) return;
            tourFinished = true;
            window.clearTimeout(tourEndTimer);
            document.removeEventListener('keydown', handleTourKeydown);
            window.removeEventListener('resize', renderTourScene);
            overlay.classList.add('leaving');
            window.setTimeout(() => {
                document.body.classList.remove('first-visit-tour-active');
                steps.forEach(step => step.element.classList.remove('tour-highlight-target'));
                overlay.remove();
            }, tourExitDuration);
        }

        function handleTourKeydown(event) {
            if (event.key === 'Escape') {
                finishTour();
            }
        }

        document.addEventListener('keydown', handleTourKeydown);
        updateTourVeil();

        function renderTourScene() {
            if (!stepLayer || tourFinished) return;
            stepLayer.innerHTML = steps.map((step, index) => {
                const rect = step.element.getBoundingClientRect();
                const targetX = rect.left + rect.width / 2;
                const labelAbove = step.placement !== 'down';
                const labelX = Math.max(58, Math.min(window.innerWidth - 58, targetX + (index - 1) * 14));
                const labelY = labelAbove
                    ? Math.max(54, rect.top - 72)
                    : Math.min(window.innerHeight - 54, rect.bottom + 68);
                // Start just beyond each highlighted button's circular ring so
                // all three arrowheads stay crisp when the scene draws together.
                const arrowTargetGap = 14;
                const startY = labelAbove ? rect.top - arrowTargetGap : rect.bottom + arrowTargetGap;
                const endY = labelAbove ? labelY + 24 : labelY - 24;
                const curveY = labelAbove ? (startY + endY) / 2 - 26 : (startY + endY) / 2 + 26;

                return `
                    <svg class="tour-arrow-svg" viewBox="0 0 ${window.innerWidth} ${window.innerHeight}" aria-hidden="true">
                        <defs>
                            <marker id="tour-arrow-head-${index}" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                <path d="M0.75 1.25 L4.75 3 L0.75 4.75" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
                            </marker>
                        </defs>
                        <path class="tour-arrow-line" pathLength="1" d="M ${targetX} ${startY} C ${targetX - 32} ${curveY}, ${labelX + 28} ${curveY}, ${labelX} ${endY}" marker-start="url(#tour-arrow-head-${index})"/>
                    </svg>
                    <div class="tour-label tour-label-${index + 1}" style="left:${labelX}px; top:${labelY}px">
                        <span class="tour-label-text">${makeHandwrittenLabel(step.label)}</span>
                    </div>
                `;
            }).join('');
        }

        window.addEventListener('resize', renderTourScene);
        renderTourScene();
        // Begin the gentle 425ms exit soon enough that the overlay is fully
        // gone exactly two seconds after the simultaneous scene begins.
        tourEndTimer = window.setTimeout(finishTour, tourTotalDuration - tourExitDuration);
    }

    const footerBubblePool = [];
    const footerBubbleLimit = 7;

    function clearFooterBubbles(pop = false) {
        if (!footerBubbleField) return;
        const bubbles = Array.from(footerBubbleField.children);
        footerBubblePool.length = 0;
        if (!bubbles.length) return;
        bubbles.forEach((bubble, index) => {
            if (pop) {
                bubble.style.setProperty('--pop-delay', `${index * 38}ms`);
                bubble.classList.add('popping');
                window.setTimeout(() => bubble.remove(), 520 + index * 38);
            } else {
                bubble.remove();
            }
        });
    }

    function addFooterBubble() {
        if (!footerBubbleField) return;
        if (footerBubblePool.length >= footerBubbleLimit) {
            clearFooterBubbles(true);
            return;
        }

        const bubble = document.createElement('span');
        const size = Math.round(34 + Math.random() * 86);
        const x = Math.round(8 + Math.random() * 84);
        const y = Math.round(46 + Math.random() * 44);
        const drift = Math.round((Math.random() - 0.5) * 84);
        const duration = (4.8 + Math.random() * 2.6).toFixed(2);
        bubble.className = 'footer-play-bubble';
        bubble.style.cssText = `--bubble-size:${size}px;--bubble-x:${x}vw;--bubble-y:${y}vh;--bubble-drift:${drift}px;--bubble-duration:${duration}s;`;
        footerBubbleField.appendChild(bubble);
        footerBubblePool.push(bubble);
        window.setTimeout(() => bubble.classList.add('settled'), 560);
    }

    siteBrandButton?.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        playUiSound('tap');
        addFooterBubble();
    });

    socialsButton?.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === socialsButton) {
            e.preventDefault();
            socialsButton.click();
        }
    });

    const SOCIAL_CARD_POP_ACTION_DELAY = 300;
    const SOCIAL_CARD_POP_RESET_DELAY = 1080;
    let socialCardPopPending = false;

    function resetSocialCardPopState() {
        socialCardPopPending = false;
        document.querySelectorAll('.social-card-source-popping').forEach(card => {
            card.classList.remove('social-card-source-popping');
            card.removeAttribute('aria-busy');
        });
        document.querySelectorAll('.social-card-pop-clone').forEach(clone => clone.remove());
        document.querySelectorAll('.social-card-bubble-burst').forEach(burst => burst.remove());
    }

    function createSocialCardPopClone(option) {
        const rect = option.getBoundingClientRect();
        const clone = option.cloneNode(true);
        clone.removeAttribute('id');
        clone.removeAttribute('href');
        clone.removeAttribute('target');
        clone.removeAttribute('rel');
        clone.removeAttribute('tabindex');
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
        // A cloned <video> does not retain the source element's decoded frame
        // reliably on iPhone. The card's own glass background is a cleaner pop
        // than a clone that flashes black for one frame.
        clone.querySelector('.social-link-preview')?.remove();
        clone.classList.remove('has-social-preview', 'site-link-hidden');
        clone.classList.add('social-card-pop-clone');
        clone.style.setProperty('--social-pop-left', `${rect.left}px`);
        clone.style.setProperty('--social-pop-top', `${rect.top}px`);
        clone.style.setProperty('--social-pop-width', `${rect.width}px`);
        clone.style.setProperty('--social-pop-height', `${rect.height}px`);
        document.body.appendChild(clone);
        return clone;
    }

    function popSocialCardThen(option, action) {
        if (!option || socialCardPopPending) return false;
        socialCardPopPending = true;
        const clone = createSocialCardPopClone(option);
        option.classList.add('social-card-source-popping');
        option.setAttribute('aria-busy', 'true');
        createEntryBubbleBurst(option, document.body, 'social-card-bubble-burst');
        // Start both parts together so the whole card swells and ruptures with
        // the exact loading-bubble ring, flash, droplets, and film fragments.
        window.requestAnimationFrame(() => clone.classList.add('popping'));
        playUiSound('link');

        window.setTimeout(() => {
            try {
                action();
            } catch (error) {
                resetSocialCardPopState();
            }
        }, SOCIAL_CARD_POP_ACTION_DELAY);
        window.setTimeout(resetSocialCardPopState, SOCIAL_CARD_POP_RESET_DELAY);
        return true;
    }

    window.addEventListener('pageshow', resetSocialCardPopState);

    function openSocialDestinationInNewTab(destination) {
        const link = document.createElement('a');
        link.href = destination;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.hidden = true;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    function reserveSocialDestinationTab() {
        try {
            // Reserve the tab inside the trusted tap. Safari may block a new
            // window created only after the 300ms card-pop animation.
            const reservedTab = window.open('about:blank', '_blank');
            if (reservedTab) reservedTab.opener = null;
            return reservedTab;
        } catch (error) {
            return null;
        }
    }

    socialCardDefinitions
        .filter(({ key }) => key !== 'kofi')
        .forEach(({ key, option }) => option?.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (siteLinkSettings.maintenance_enabled === true) return;
            if (!isPublicLinkEnabled(key)) return;
            if (socialCardPopPending) return;
            const destination = getPublicLink(key);
            const reservedTab = reserveSocialDestinationTab();
            const popStarted = popSocialCardThen(option, () => {
                if (!reservedTab || reservedTab.closed) return;
                try {
                    reservedTab.location.replace(destination);
                } catch (error) {
                    reservedTab.close();
                    throw error;
                }
            });
            if (!popStarted) {
                reservedTab?.close();
                return;
            }
            // Extremely locked-down browsers can refuse even a synchronous
            // window.open(). Keep the link functional there; this fallback is
            // still invoked during the original trusted click.
            if (!reservedTab) openSocialDestinationInNewTab(destination);
        }));

    function handleWishlistButtonActivate(e) {
        e.preventDefault();
        e.stopPropagation();
        if (siteLinkSettings.maintenance_enabled === true) return;
        closeSocialsMenu({ restoreNote: false });
        closeActionMenu();
        if (!isPublicLinkEnabled('throne')) return;
        const useMockup = siteLinkSettings.throne_checkout_mode !== 'widget';
        // Second press while the mockup panel is open toggles it closed.
        const wishlistPanel = document.getElementById('doll-wishlist-panel');
        if (useMockup && wishlistPanel?.classList.contains('active')) {
            window.closeThroneMockup();
            return;
        }
        playUiSound('link');
        if (useMockup && typeof window.openThroneMockup === 'function') {
            window.openThroneMockup();
        } else if (typeof window.openThroneOverlay === 'function') {
            window.openThroneOverlay();
        } else {
            window.open(getPublicLink('throne'), '_blank', 'noopener,noreferrer');
        }
    }

    addMenuActivation(supportMenuButton, handleWishlistButtonActivate);

    supportMenuButton?.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === supportMenuButton) {
            e.preventDefault();
            supportMenuButton.click();
        }
    });

    donateOption?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (siteLinkSettings.maintenance_enabled === true) return;
        if (!isPublicLinkEnabled('kofi')) return;
        popSocialCardThen(donateOption, openKofiOverlay);
    });

    function handleActionMenuActivate(e) {
        if (e.target.closest('.action-option')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        if (!actionMenuButton.classList.contains('open')) {
            closeSocialsMenu();
            closeSupportMenu();
        }

        playUiSound('tap');
        const isOpen = actionMenuButton.classList.toggle('open');
        actionMenuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        actionOptions?.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        if (!isOpen) {
            closeActionPanels();
        }
        actionMenuButton.querySelectorAll('.action-option').forEach(option => {
            option.setAttribute('tabindex', isOpen ? '0' : '-1');
        });
    }

    addMenuActivation(actionMenuButton, handleActionMenuActivate);

    actionMenuButton?.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === actionMenuButton) {
            e.preventDefault();
            actionMenuButton.click();
        }
    });

    [...socialCardDefinitions.map(({ option }) => option), toggleButton].forEach(option => {
        option?.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                option.click();
            }
        });
    });

    // ===== ICON GLITTER ANIMATION =====
    // Pink glitter animation cycle: show 2s after icon appears, stay 2s, then repeat every 10 seconds (2s show + 8s hide)
    function showGlitter(button) {
        if (!button) return;
        
        button.classList.add('show-glitter');
        
        // Hide after 2 seconds
        setTimeout(function() {
            button.classList.remove('show-glitter');
            
            // Show again after 8 seconds (total cycle: 10 seconds)
            setTimeout(function() {
                showGlitter(button); // Recursive call to repeat cycle
            }, 8000);
        }, 2000);
    }
    
    // Wait for icon container to be visible (after paw and all initial page elements load), then start animation after 2 seconds
    function startGlitterCycle() {
        const iconContainer = document.querySelector('.icon-container');
        const mailButton = document.getElementById('support-menu-button');
        const mainScreen = document.getElementById('main-screen');
        
        if (iconContainer) {
            // Check if icon is visible and main screen is displayed (paw popup closed)
            const checkVisibility = function() {
                const computedStyle = window.getComputedStyle(iconContainer);
                const mainScreenStyle = mainScreen ? window.getComputedStyle(mainScreen) : null;
                const isVisible = computedStyle.visibility !== 'hidden' && 
                                 computedStyle.opacity !== '0' &&
                                 iconContainer.offsetParent !== null &&
                                 (!mainScreen || mainScreenStyle.display !== 'none');
                
                if (isVisible) {
                    // Icons are visible and page is loaded, start animation after 2 seconds
                    setTimeout(function() {
                        if (mailButton) {
                            showGlitter(mailButton);
                        }
                    }, 2000);
                } else {
                    // Check again in 200ms
                    setTimeout(checkVisibility, 200);
                }
            };
            
            // Start checking after a small delay to ensure page elements are loaded
            setTimeout(checkVisibility, 500);
        }
    }
    
    // Start the cycle
    startGlitterCycle();

    // ===== DRAWING WIDGET =====
    const MAX_DRAWING_HISTORY_STATES = 40;
    let canvas, ctx, drawingHistory = [], historyIndex = -1, currentColor = "#000000", brushSize = 5;
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    if (document.getElementById("drawing-canvas")) {
        canvas = document.getElementById("drawing-canvas");
        ctx = canvas.getContext("2d");

        function initCanvas() {
            canvas.width = 330;
            canvas.height = 230;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveState();
        }

        function resetCanvasHistory() {
            drawingHistory = [];
            historyIndex = -1;
            saveState();
        }

        function saveState() {
            if (historyIndex < drawingHistory.length - 1) {
                drawingHistory.splice(historyIndex + 1);
            }
            drawingHistory.push(canvas.toDataURL());
            if (drawingHistory.length > MAX_DRAWING_HISTORY_STATES) {
                drawingHistory.splice(0, drawingHistory.length - MAX_DRAWING_HISTORY_STATES);
            }
            historyIndex = drawingHistory.length - 1;
        }

        function getCursorPos(e) {
            const rect = canvas.getBoundingClientRect();
            const isTouch = e.type.includes('touch');
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const pos = getCursorPos(e);
            lastX = pos.x;
            lastY = pos.y;
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            
            const pos = getCursorPos(e);
            const currentX = pos.x;
            const currentY = pos.y;
            
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = brushSize;
            
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            lastX = currentX;
            lastY = currentY;
        }

        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                saveState();
            }
        }

        function setupEventListeners() {
            // Mouse events
            canvas.addEventListener("mousedown", startDrawing);
            canvas.addEventListener("mousemove", draw);
            canvas.addEventListener("mouseup", stopDrawing);
            canvas.addEventListener("mouseout", stopDrawing);

            // Touch events
            canvas.addEventListener("touchstart", function(e) {
                startDrawing(e);
            }, { passive: false });

            canvas.addEventListener("touchmove", function(e) {
                draw(e);
            }, { passive: false });

            canvas.addEventListener("touchend", stopDrawing);
            canvas.addEventListener("touchcancel", stopDrawing);
        }

        document.getElementById("undo-button")?.addEventListener("click", () => {
            if (historyIndex > 0) {
                historyIndex--;
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = drawingHistory[historyIndex];
            }
        });

        document.getElementById("brush-size")?.addEventListener("input", e => {
            brushSize = Number(e.target.value);
        });

        // Fixed color picker - works on both desktop and mobile
        const colorPicker = document.getElementById("color-picker");
        if (colorPicker) {
            colorPicker.addEventListener("change", function(e) {
                currentColor = e.target.value;
            });

            colorPicker.addEventListener("input", function(e) {
                currentColor = e.target.value;
            });

            // For mobile devices, ensure the color picker opens properly
            colorPicker.addEventListener("click", function(e) {
                // Force the color picker to open on mobile
                this.focus();
            });

            // Prevent any parent element clicks from interfering
            colorPicker.addEventListener("touchstart", function(e) {
                e.stopPropagation();
            });

            colorPicker.addEventListener("touchend", function(e) {
                e.stopPropagation();
                // Small delay to ensure mobile color picker opens
                setTimeout(() => {
                    this.click();
                }, 10);
            });
        }

        document.getElementById("clear-canvas")?.addEventListener("click", () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveState();
        });

        function getDrawingQualityError() {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let inkPixels = 0;
            let minX = canvas.width;
            let minY = canvas.height;
            let maxX = 0;
            let maxY = 0;

            for (let i = 0; i < imageData.length; i += 4) {
                const alpha = imageData[i + 3];
                if (alpha < 18) continue;

                const red = imageData[i];
                const green = imageData[i + 1];
                const blue = imageData[i + 2];
                const distanceFromWhite = (255 - red) + (255 - green) + (255 - blue);
                if (distanceFromWhite < 52) continue;

                const pixelIndex = i / 4;
                const x = pixelIndex % canvas.width;
                const y = Math.floor(pixelIndex / canvas.width);

                inkPixels += 1;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }

            if (inkPixels < 95) {
                return "Draw a little something first ^-^";
            }

            const inkWidth = maxX - minX + 1;
            const inkHeight = maxY - minY + 1;
            const inkSpread = Math.hypot(inkWidth, inkHeight);

            if (inkPixels < 150 || inkSpread < 44 || (inkWidth < 18 && inkHeight < 18)) {
                return "Make your doodle a tiny bit bigger ^-^";
            }

            return "";
        }

        document.getElementById("send-drawing")?.addEventListener("click", async function() {
            const sendButton = this;
            if (sendButton.disabled) return;
            if (siteLinkSettings.drawings_enabled === false) {
                showSubmitPopup("Doodles are paused for a bit.");
                showNoteImage();
                return;
            }
            const qualityError = getDrawingQualityError();
            if (qualityError) {
                showSubmitPopup(qualityError);
                return;
            }

            const dataUrl = canvas.toDataURL("image/png");
            const base64Data = dataUrl.split(',')[1];
            
            if (base64Data.length > 20 * 1024 * 1024) {
                showSubmitPopup("Drawing is too large. Please make it smaller.");
                return;
            }
            
            playUiSound('submit');
            setSendButtonLoading(sendButton, true);
            const submitSoundMinimum = wait(1000);
            try {
                let ipAddress = 'unknown';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ipAddress = ipData.ip;
                } catch (ipError) {
                    // IP address fetch failed
                }

                const { error } = await window.supabase
                    .from('drawings')
                    .insert([{ 
                        imageData: base64Data,
                        ip_address: ipAddress
                    }]);

                if (error) throw error;
                markSubmissionsDirty();
                
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                resetCanvasHistory();
                await submitSoundMinimum;
                await showSubmitPopupAndWait("Got it! ^-^");
                showNoteImage();
            } catch (error) {
                console.error("Error submitting drawing:", error);
                showSubmitPopup(`Failed to submit drawing: ${error.message || 'Please try again.'}`);
            } finally {
                setSendButtonLoading(sendButton, false);
            }
        });

        initCanvas();
        setupEventListeners();
    }

    function initApp() {
        // ===== ASK! =====
        const askButton = document.getElementById('ask-button');
        const askFormContainer = document.getElementById('ask-form-container');
        const askTextarea = document.getElementById('ask-textarea');
        const charCount = document.getElementById('char-count');
        const sendQuestionBtn = document.getElementById('send-question');

        if (askButton && askFormContainer) {
            askButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (siteLinkSettings.questions_enabled === false) {
                    showSubmitPopup("Questions are paused for a bit.");
                    return;
                }
                playUiSound('tap');
                const open = askFormContainer.style.display === 'block';
                if (!open) {
                    loadDeferredImage(
                        askFormContainer.querySelector('.ask-corner-mascot'),
                        'questionSrc'
                    );
                    closeDrawingWidget();
                    closePostsPanel();
                    if (typeof window.closeThroneMockup === 'function') window.closeThroneMockup();
                    hideNoteImage();
                } else {
                    notePeelTarget?.classList.remove('hidden');
                    noteImage?.classList.remove('hidden');
                }
                askFormContainer.style.display = open ? 'none' : 'block';
                askButton.textContent = open ? '?' : '×';
                if (!open) askTextarea.focus();
            });

            askButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    askButton.click();
                }
            });

            askTextarea.addEventListener('input', function() {
                const len = this.value.length;
                charCount.textContent = `${len}/200`;
                charCount.style.color = len > 180 ? '#ff6b6b' : 'rgba(255, 132, 187, 0.82)';
                askFormContainer.classList.toggle('has-text', len > 0);
            });

            sendQuestionBtn?.addEventListener('click', async function() {
                const sendButton = this;
                if (sendButton.disabled) return;
                if (siteLinkSettings.questions_enabled === false) {
                    showSubmitPopup("Questions are paused for a bit.");
                    showNoteImage();
                    return;
                }
                const question = askTextarea.value.trim();
                if (!question) {
                    showSubmitPopup("Please enter a question first!");
                    return;
                }

                playUiSound('submit');
                setSendButtonLoading(sendButton, true);
                const submitSoundMinimum = wait(1000);
                try {
                    let ipAddress = 'unknown';
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    } catch (ipError) {
                        // IP address fetch failed
                    }

                    const { error } = await window.supabase
                        .from('questions')
                        .insert([{ 
                            question, 
                            answer: null, 
                            ip_address: ipAddress
                        }]);
                    
                    if (error) throw error;
                    markSubmissionsDirty();
                    
                    askTextarea.value = '';
                    charCount.textContent = '0/200';
                    await submitSoundMinimum;
                    await showSubmitPopupAndWait("Got it! ^-^");
                    showNoteImage();
                } catch (error) {
                    console.error("Error saving question:", error);
                    showSubmitPopup("Failed to submit question. Please try again.");
                } finally {
                    setSendButtonLoading(sendButton, false);
                }
            });
        }

        // ===== POSTS SYSTEM =====
        const postsPopup = postsPanel;
        const drawingsList = document.getElementById('drawings-list');
        const questionsList = document.getElementById('questions-list');
        let renderedSubmissionsKey = '';
        const drawingImageObserver = 'IntersectionObserver' in window
            ? new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const image = entry.target;
                    drawingImageObserver.unobserve(image);
                    const src = image.dataset.drawingSrc;
                    if (!src) return;
                    image.src = src;
                    delete image.dataset.drawingSrc;
                });
            }, {
                root: postsContentEl,
                rootMargin: '220px 0px'
            })
            : null;
        const drawingLikesObserver = 'IntersectionObserver' in window
            ? new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const item = entry.target;
                    drawingLikesObserver.unobserve(item);
                    const likeSticker = item.querySelector('.like-sticker');
                    const drawingId = likeSticker?.dataset.drawingId;
                    if (!drawingId || item.dataset.likesReady === 'true') return;
                    item.dataset.likesReady = 'true';
                    initLikeSystem(item, drawingId);
                });
            }, {
                root: postsPopup,
                rootMargin: '160px 0px'
            })
            : null;

        function getSubmissionsRenderKey(drawings, questions) {
            const drawingKey = drawings.map(drawing => drawing.id || drawing.created_at || '').join(',');
            const questionKey = questions.map(question => question.id || question.created_at || '').join(',');
            return `${drawings.length}:${drawingKey}|${questions.length}:${questionKey}`;
        }

        function submissionsStatusMarkup(message, failed = false) {
            return `
                <div class="posts-fetch-state${failed ? ' is-error' : ''}" role="status">
                    <span class="loading-paw-print posts-fetch-paw" aria-hidden="true"></span>
                    <span>${escapeHtml(message)}</span>
                </div>
            `;
        }

        function showSubmissionsLoadingState() {
            if (renderedSubmissionsKey) return;
            const markup = submissionsStatusMarkup('fetching the latest...');
            if (drawingsList) drawingsList.innerHTML = markup;
            if (questionsList) questionsList.innerHTML = markup;
        }

        function showSubmissionsLoadError() {
            if (renderedSubmissionsKey) return;
            const markup = submissionsStatusMarkup('couldn\'t fetch yet — close and tap :3 to retry', true);
            if (drawingsList) drawingsList.innerHTML = markup;
            if (questionsList) questionsList.innerHTML = markup;
        }

        async function initPostsSystem() {
            postsButton?.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                playUiSound('tap');
                const open = postsPopup?.classList.contains('active');
                if (open) {
                    showNoteImage();
                } else {
                    closeDrawingWidget();
                    closeQuestionForm();
                    if (typeof window.closeThroneMockup === 'function') window.closeThroneMockup();
                    hideNoteImage();
                    const openGeneration = ++postsOpenGeneration;
                    postsPopup?.classList.add('active');
                    setPostsPanelLayoutOpen(true);
                    postsButton.textContent = '×';
                    showSubmissionsLoadingState();
                    try {
                        await renderSubmissions();
                    } catch (error) {
                        if (openGeneration !== postsOpenGeneration) return;
                        console.error('Error fetching public submissions:', error);
                        showSubmissionsLoadError();
                    }
                    if (openGeneration !== postsOpenGeneration
                        || !postsPopup?.classList.contains('active')) return;
                    syncPostsMediaPlayback();
                    syncPostsPanelSpace();
                }
            });

            postsButton?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    postsButton.click();
                }
            });

        }

// Add tab switching functionality
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                playUiSound('tap');
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
                this.closest('.posts-tabs')?.classList.toggle('questions-active', this.dataset.tab === 'questions-tab');
                if (this.dataset.tab === 'questions-tab') hydrateTenorAnswerEmbeds();
                syncPostsMediaPlayback();
            });
        });

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function parseAnswerUrl(href) {
            try {
                const url = new URL(href);
                return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
            } catch (error) {
                return null;
            }
        }

        function decodeTenorShortCode(code) {
            const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            if (!code || !/^[a-zA-Z0-9]+$/.test(code)) return '';
            let value = 0n;
            for (const character of code) {
                const digit = alphabet.indexOf(character);
                if (digit < 0) return '';
                value = (value * 62n) + BigInt(digit);
            }
            return value.toString();
        }

        function getTenorPostId(url) {
            const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
            if (hostname !== 'tenor.com') return '';
            const pathname = decodeURIComponent(url.pathname);
            const embedMatch = pathname.match(/\/embed\/(\d+)/i);
            if (embedMatch) return embedMatch[1];
            const viewMatch = pathname.match(/-(\d+)\/?$/);
            if (viewMatch) return viewMatch[1];
            const shortMatch = pathname.match(/^\/([a-zA-Z0-9]+)\.gif\/?$/i);
            return shortMatch ? decodeTenorShortCode(shortMatch[1]) : '';
        }

        function getGiphyPostId(url) {
            const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
            if (hostname !== 'giphy.com') return '';
            const pathname = decodeURIComponent(url.pathname).replace(/\/$/, '');
            const embedMatch = pathname.match(/\/embed\/([a-zA-Z0-9]+)/i);
            if (embedMatch) return embedMatch[1];
            const lastSegment = pathname.split('/').filter(Boolean).pop() || '';
            const id = lastSegment.split('-').pop() || '';
            return /^[a-zA-Z0-9]+$/.test(id) ? id : '';
        }

        // Direct media URLs avoid Tenor's oversized branded player. Keep
        // resolved share links here so saved answers remain compact and the
        // GIF itself loops immediately.
        const resolvedTenorMedia = Object.freeze({
            '4349555': 'https://media1.tenor.com/m/4uTXyXwtUB8AAAAC/excited-bob.gif'
        });

        function renderAnswerEmbed(provider, postId, originalHref) {
            if (provider === 'Tenor') {
                const directMediaUrl = resolvedTenorMedia[postId];
                if (directMediaUrl) {
                    const safeMediaUrl = escapeHtml(directMediaUrl);
                    return `<a href="${escapeHtml(originalHref)}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-gif-link answer-gif-link-small"><img data-posts-src="${safeMediaUrl}" alt="GIF reply" class="answer-gif" loading="lazy" referrerpolicy="no-referrer" data-media-url="${safeMediaUrl}"></a>`;
                }
                return `<span class="answer-media-frame answer-tenor-frame"><span class="tenor-gif-embed" data-postid="${escapeHtml(postId)}" data-share-method="host" data-aspect-ratio="1.333333" data-width="100%"><a href="${escapeHtml(originalHref)}">Tenor GIF</a></span></span>`;
            }
            const embedHref = `https://giphy.com/embed/${encodeURIComponent(postId)}`;
            return `<span class="answer-media-frame"><iframe src="about:blank" data-posts-src="${escapeHtml(embedHref)}" title="Giphy GIF reply" loading="lazy" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin"></iframe><a href="${escapeHtml(originalHref)}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-media-source">Giphy</a></span>`;
        }

        function hydrateTenorAnswerEmbeds() {
            if (!questionsList?.querySelector('.tenor-gif-embed')) return;
            const existingLoader = document.querySelector('script[data-answer-tenor-loader]');
            if (existingLoader) return;
            const loader = document.createElement('script');
            loader.src = 'https://tenor.com/embed.js';
            loader.async = true;
            loader.dataset.answerTenorLoader = 'true';
            loader.addEventListener('load', () => loader.remove(), { once: true });
            loader.addEventListener('error', () => {
                questionsList.querySelectorAll('.answer-tenor-frame').forEach(frame => {
                    const link = frame.querySelector('a[href]');
                    if (!link) return;
                    link.className = 'answer-link answer-media-unavailable';
                    link.textContent = 'Tenor link';
                    frame.replaceWith(link);
                });
                loader.remove();
            }, { once: true });
            document.body.appendChild(loader);
        }

        function isDirectAnswerImage(url) {
            return /\.(?:gif|png|jpe?g|webp|avif)(?:$|[?#])/i.test(`${url.pathname}${url.search}${url.hash}`);
        }

        function getDirectAnswerVideoUrl(url) {
            if (/\.gifv$/i.test(url.pathname) && /(^|\.)imgur\.com$/i.test(url.hostname)) {
                const mp4Url = new URL(url.href);
                mp4Url.pathname = mp4Url.pathname.replace(/\.gifv$/i, '.mp4');
                return mp4Url.href;
            }
            return /\.(?:mp4|webm)(?:$|[?#])/i.test(`${url.pathname}${url.search}${url.hash}`)
                ? url.href
                : '';
        }

        function renderAnswerVideo(href) {
            const safeHref = escapeHtml(href);
            return `<span class="answer-video-frame"><video data-posts-src="${safeHref}" muted loop playsinline preload="none" aria-label="Video reply" data-media-url="${safeHref}"></video></span>`;
        }

        function linkifyText(str) {
            const urlPattern = /(\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+\.[^\s<>"']+|\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/g;
            let html = '';
            let lastIndex = 0;
            String(str).replace(urlPattern, (match, _url, offset) => {
                html += escapeHtml(String(str).slice(lastIndex, offset));
                const trailingPunctuation = match.match(/[),.!?;:]+$/)?.[0] || '';
                const cleanMatch = trailingPunctuation ? match.slice(0, -trailingPunctuation.length) : match;
                const href = /^https?:\/\//i.test(cleanMatch) ? cleanMatch : 'https://' + cleanMatch;
                const safeHref = escapeHtml(href);
                const safeText = escapeHtml(cleanMatch);
                const parsedUrl = parseAnswerUrl(href);
                const tenorPostId = parsedUrl ? getTenorPostId(parsedUrl) : '';
                const giphyPostId = parsedUrl ? getGiphyPostId(parsedUrl) : '';
                const videoUrl = parsedUrl ? getDirectAnswerVideoUrl(parsedUrl) : '';
                const answerContainsOnlyThisUrl = String(str).trim() === match;
                if (tenorPostId) {
                    html += renderAnswerEmbed('Tenor', tenorPostId, href);
                } else if (giphyPostId) {
                    html += renderAnswerEmbed('Giphy', giphyPostId, href);
                } else if (videoUrl) {
                    html += renderAnswerVideo(videoUrl);
                } else if (parsedUrl && (isDirectAnswerImage(parsedUrl) || answerContainsOnlyThisUrl)) {
                    html += `<a href="${safeHref}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-gif-link"><img data-posts-src="${safeHref}" alt="Image reply" class="answer-gif" loading="lazy" referrerpolicy="no-referrer" data-media-url="${safeHref}"></a>`;
                } else {
                    html += `<a href="${safeHref}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-link">${safeText}</a>`;
                }
                html += escapeHtml(trailingPunctuation);
                lastIndex = offset + match.length;
                return match;
            });
            html += escapeHtml(String(str).slice(lastIndex));
            return html;
        }

        function getDrawingSrc(imageData) {
            const cleanData = String(imageData || '').replace(/\s/g, '');
            if (!cleanData || !/^[A-Za-z0-9+/=]+$/.test(cleanData)) return '';
            return `data:image/png;base64,${cleanData}`;
        }

        async function renderSubmissions() {
            if (!preloadedSubmissions.loaded || preloadedSubmissions.error) {
                await loadSubmissionsFromSupabase();
            }

            // The fetch may have completed in the same moment another panel
            // closed :3. Keep the bounded result cached, but do not attach any
            // drawing src or start media work until :3 is opened again.
            if (!postsPopup?.classList.contains('active')) return;

            const drawings = preloadedSubmissions.drawings;
            const questions = preloadedSubmissions.questions;
            const nextRenderKey = getSubmissionsRenderKey(drawings, questions);
            if (nextRenderKey === renderedSubmissionsKey) return;

            renderedSubmissionsKey = nextRenderKey;
            renderDrawings(drawings);
            renderQuestions(questions);
        }

        function renderDrawings(drawings) {
            try {
                drawingImageObserver?.disconnect();
                drawingLikesObserver?.disconnect();
                drawingsList.innerHTML = '';
                const fragment = document.createDocumentFragment();
                const drawingImagesToObserve = [];
                const drawingsToObserve = [];
                drawings.forEach((drawing, index) => {
                    const el = document.createElement('div');
                    el.className = 'post-item';
                    const drawingSrc = getDrawingSrc(drawing.imageData);
                    if (!drawingSrc) return;
                    const image = document.createElement('img');
                    image.alt = 'User drawing';
                    image.loading = index < 4 ? 'eager' : 'lazy';
                    image.decoding = 'async';
                    if (index < 4 || !drawingImageObserver) {
                        image.src = drawingSrc;
                    } else {
                        image.dataset.drawingSrc = drawingSrc;
                        drawingImagesToObserve.push(image);
                    }
                    el.appendChild(image);
                    el.insertAdjacentHTML('beforeend', `
                        <div class="like-sticker" data-drawing-id="${drawing.id}">
                            <div class="like-button">
                                <img src="site-images/reactions.png" alt="Like" class="like-icon" width="96" height="88" decoding="async">
                            </div>
                        </div>
                    `);
                    fragment.appendChild(el);

                    if (drawingLikesObserver) {
                        drawingsToObserve.push(el);
                    } else {
                        initLikeSystem(el, drawing.id);
                    }
                });
                drawingsList.appendChild(fragment);
                drawingImagesToObserve.forEach(image => drawingImageObserver.observe(image));
                drawingsToObserve.forEach(el => drawingLikesObserver.observe(el));
            } catch (error) {
                console.error("Error loading drawings:", error);
                drawingsList.innerHTML = '<p>Error loading drawings. Please refresh.</p>';
            }
        }

        function renderQuestions(questions) {
            try {
                postsMediaObserver?.disconnect();
                questionsList.innerHTML = '';
                const fragment = document.createDocumentFragment();
                questions.forEach(q => {
                    const el = document.createElement('div');
                    el.className = 'question-item';
                    const answerHtml = q.answer ? `<p class="answer-text">${linkifyText(q.answer)}</p>` : '';
                    el.innerHTML = `
                        <p class="question-text">"${escapeHtml(q.question)}"</p>
                        ${answerHtml}
                    `;
                    fragment.appendChild(el);
                });
                questionsList.appendChild(fragment);
                observePostsMedia();
                if (shouldPlayPostsMedia()) hydrateTenorAnswerEmbeds();
                questionsList.querySelectorAll('img.answer-gif').forEach(image => {
                    image.addEventListener('error', () => {
                        if (!image.getAttribute('src')
                            && (image.dataset.postsPausedSrc || image.dataset.postsSrc)) return;
                        const link = image.closest('.answer-gif-link');
                        const href = image.dataset.mediaUrl || link?.href || '';
                        if (!link || !href) return;
                        const replacement = document.createElement('a');
                        replacement.href = href;
                        replacement.target = '_blank';
                        replacement.rel = 'nofollow ugc noopener noreferrer';
                        replacement.className = 'answer-link answer-media-unavailable';
                        replacement.textContent = 'image link';
                        link.replaceWith(replacement);
                    }, { once: true });
                });
                questionsList.querySelectorAll('video[data-media-url]').forEach(video => {
                    video.addEventListener('error', () => {
                        if (!video.getAttribute('src')
                            && (video.dataset.postsPausedSrc || video.dataset.postsSrc)) return;
                        const frame = video.closest('.answer-video-frame');
                        const href = video.dataset.mediaUrl || '';
                        if (!frame || !href) return;
                        const replacement = document.createElement('a');
                        replacement.href = href;
                        replacement.target = '_blank';
                        replacement.rel = 'nofollow ugc noopener noreferrer';
                        replacement.className = 'answer-link answer-media-unavailable';
                        replacement.textContent = 'media link';
                        frame.replaceWith(replacement);
                    }, { once: true });
                });
                syncPostsMediaPlayback();
            } catch (error) {
                console.error("Error loading questions:", error);
                questionsList.innerHTML = '<p>Error loading Mi. Please refresh.</p>';
            }
        }

        // ===== LIKE SYSTEM =====
        const reactionIcons = {
            'happy': 'site-images/happy.png',
            'cool': 'site-images/cool.png',
            'meh': 'site-images/meh.png',
            'sad': 'site-images/sad.png'
        };
        const defaultReactionIcon = 'site-images/reactions.png';
        let currentOpenPicker = null; // Track currently open picker
        let currentOpenPickerCleanup = null;
        let lastClickTime = 0; // Prevent rapid-fire clicks
        let lastTouchReactionTime = 0;

        async function initLikeSystem(drawingElement, drawingId) {
            const likeSticker = drawingElement.querySelector('.like-sticker');
            const likeButton = likeSticker.querySelector('.like-button');
            const likeIcon = likeButton.querySelector('.like-icon');
            
            // Load current likes for this drawing
            await loadDrawingLikes(drawingId, likeIcon);
            
            // Set up click and touch handlers for mobile compatibility
            const handleReactionClick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.type === 'click' && Date.now() - lastTouchReactionTime < 500) {
                    return;
                }
                
                // Prevent double-tap zoom on mobile
                if (e.type === 'touchstart') {
                    e.preventDefault();
                    lastTouchReactionTime = Date.now();
                }
                playUiSound('tap');
                
                // Prevent rapid-fire clicks (debounce)
                const now = Date.now();
                if (now - lastClickTime < 300) {
                    return;
                }
                lastClickTime = now;
                
                // Check if this picker is already open
                const existingPicker = document.querySelector('.reaction-picker');
                if (existingPicker && existingPicker.dataset.drawingId === drawingId) {
                    // Close this picker
                    closeReactionPicker();
                    return;
                }
                
                // Close any other open picker first
                if (currentOpenPicker) {
                    closeReactionPicker();
                }
                
                // Get user's IP
                let ipAddress = 'unknown';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ipAddress = ipData.ip;
                } catch (ipError) {
                    // IP address fetch failed
                }
                
                // Check if user already liked this drawing
                const { data: existingLike, error: checkError } = await window.supabase
                    .from('drawing_likes')
                    .select('*')
                    .eq('drawing_id', drawingId)
                    .eq('ip_address', ipAddress)
                    .single();
                
                if (checkError && checkError.code !== 'PGRST116') {
                    console.error("Error checking existing like:", checkError);
                    return;
                }
                
                // Show the new picker immediately
                if (existingLike) {
                    // User already liked - show picker with current reaction highlighted
                    showReactionPickerInternal(likeButton, drawingId, ipAddress, likeIcon, existingLike.reaction_type);
                } else {
                    // Show reaction picker
                    showReactionPickerInternal(likeButton, drawingId, ipAddress, likeIcon);
                }
            };
            
            // Add both click and touch event listeners
            likeButton.addEventListener('click', handleReactionClick);
            likeButton.addEventListener('touchstart', handleReactionClick, { passive: false });
        }

        async function loadDrawingLikes(drawingId, likeIconElement) {
            try {
                const { data: likes, error } = await window.supabase
                    .from('drawing_likes')
                    .select('reaction_type')
                    .eq('drawing_id', drawingId);
                
                if (error) throw error;
                
                // Update icon to show most common reaction or default
                if (likes.length > 0) {
                    const reactionCounts = {};
                    likes.forEach(like => {
                        reactionCounts[like.reaction_type] = (reactionCounts[like.reaction_type] || 0) + 1;
                    });
                    
                    const mostCommonReaction = Object.keys(reactionCounts).reduce((a, b) => 
                        reactionCounts[a] > reactionCounts[b] ? a : b
                    );
                    
                    likeIconElement.src = reactionIcons[mostCommonReaction];
                } else {
                    likeIconElement.src = defaultReactionIcon;
                }
            } catch (error) {
                console.error("Error loading likes:", error);
            }
        }

        function showReactionPickerInternal(likeButton, drawingId, ipAddress, likeIconElement, currentReaction = null) {
            // Create reaction picker overlay
            const picker = document.createElement('div');
            picker.className = 'reaction-picker';
            picker.dataset.drawingId = drawingId;
            picker.innerHTML = `
                <div class="reaction-options">
                    <div class="reaction-option" data-reaction="happy">
                        <img src="site-images/happy.png" alt="Happy" width="96" height="94" decoding="async">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="cool">
                        <img src="site-images/cool.png" alt="Cool" width="96" height="94" decoding="async">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="meh">
                        <img src="site-images/meh.png" alt="Meh" width="96" height="94" decoding="async">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="sad">
                        <img src="site-images/sad.png" alt="Sad" width="96" height="94" decoding="async">
                        <span class="reaction-count">0</span>
                    </div>
                </div>
            `;
            
            // Position picker centered within the canvas boundaries
            const drawingElement = likeButton.closest('.post-item');
            const drawingRect = drawingElement.getBoundingClientRect();
            
            // Center the picker horizontally, keep it at the bottom
            const pickerWidth = 112;
            const pickerHeight = 35;
            
            // Center horizontally, position at bottom
            let left = (drawingRect.width - pickerWidth) / 2;
            const top = drawingRect.height - pickerHeight - 10; // 10px from bottom
            
            // Ensure picker stays within canvas boundaries
            if (left < 5) left = 5;
            if (left + pickerWidth > drawingRect.width - 5) {
                left = drawingRect.width - pickerWidth - 5;
            }
            
            picker.style.position = 'absolute';
            picker.style.left = `${left}px`;
            picker.style.top = `${top}px`;
            picker.style.zIndex = '10000';
            picker.style.transform = 'translateX(100%) scale(0.8)';
            picker.style.opacity = '0';
            
            // Append to the drawing element instead of body
            drawingElement.appendChild(picker);
            currentOpenPicker = picker;
            if (currentOpenPickerCleanup) {
                currentOpenPickerCleanup();
                currentOpenPickerCleanup = null;
            }
            
                            // Animate the roll transition with improved timing
            setTimeout(() => {
                // Reset all other buttons first
                const allButtons = document.querySelectorAll('.like-button');
                allButtons.forEach(button => {
                    if (button !== likeButton) {
                        button.style.transform = 'translateX(0) rotate(0deg)';
                        button.style.opacity = '1';
                    }
                });
                
                    // Animate like button rolling away with bounce effect
                    likeButton.style.transform = 'translateX(-100%) rotate(-180deg) scale(0.8)';
                likeButton.style.opacity = '0';
                
                    // Animate picker sliding in with spring effect
                picker.style.transform = 'translateX(0) scale(1)';
                picker.style.opacity = '1';
            }, 50);
            
            // Load and display reaction counts
            loadReactionCounts(drawingId, picker, currentReaction);
            
            // Add click and touch handlers for reactions
            picker.querySelectorAll('.reaction-option').forEach(option => {
                const handleReactionOptionClick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.type === 'click' && Date.now() - lastTouchReactionTime < 500) {
                        return;
                    }
                    
                    // Prevent double-tap zoom on mobile
                    if (e.type === 'touchstart') {
                        e.preventDefault();
                        lastTouchReactionTime = Date.now();
                    }
                    
                    const reaction = option.dataset.reaction;
                    playUiSound('tap');
                    
                    // Check if user already has this reaction
                    let ipAddress = 'unknown';
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    } catch (ipError) {
                        // IP address fetch failed
                    }
                    
                    const { data: existingLike } = await window.supabase
                        .from('drawing_likes')
                        .select('*')
                        .eq('drawing_id', drawingId)
                        .eq('ip_address', ipAddress)
                        .single();
                    
                    if (existingLike && existingLike.reaction_type === reaction) {
                        // User clicked same reaction - remove it (undo)
                        await removeLike(drawingId, ipAddress, likeIconElement);
                    } else {
                        // Add new reaction or change existing one (overwrite)
                        if (existingLike) {
                            // Update existing reaction
                            await updateLike(drawingId, ipAddress, reaction, likeIconElement);
                        } else {
                            // Add new reaction
                            await addLike(drawingId, ipAddress, reaction, likeIconElement);
                        }
                    }
                    
                    closeReactionPicker();
                };
                
                // Add both click and touch event listeners
                option.addEventListener('click', handleReactionOptionClick);
                option.addEventListener('touchstart', handleReactionOptionClick, { passive: false });
            });
            
            // Close picker when clicking outside
            let outsideClickHandler = null;
            const cleanupPickerListeners = () => {
                if (outsideClickHandler) {
                    document.removeEventListener('click', outsideClickHandler);
                }
                document.removeEventListener('scroll', scrollHandler);
            };

            setTimeout(() => {
                if (currentOpenPicker !== picker) return;
                outsideClickHandler = (e) => {
                    if (!picker.contains(e.target) && !likeButton.contains(e.target)) {
                        closeReactionPicker();
                    }
                };
                document.addEventListener('click', outsideClickHandler);
            }, 100);
            
            // Close picker on scroll
            const scrollHandler = () => {
                closeReactionPicker();
            };
            document.addEventListener('scroll', scrollHandler);
            currentOpenPickerCleanup = cleanupPickerListeners;
        }

        function closeReactionPicker() {
            if (currentOpenPickerCleanup) {
                currentOpenPickerCleanup();
                currentOpenPickerCleanup = null;
            }
            if (currentOpenPicker && currentOpenPicker.parentElement) {
                // Find the original like button
                const drawingId = currentOpenPicker.dataset.drawingId;
                const originalButton = document.querySelector(`[data-drawing-id="${drawingId}"] .like-button`);
                
                if (originalButton) {
                    // Reset button to normal state immediately
                    originalButton.style.transform = 'translateX(0) rotate(0deg)';
                    originalButton.style.opacity = '1';
                }
                    
                    // Remove picker immediately
                    currentOpenPicker.parentElement.removeChild(currentOpenPicker);
                    currentOpenPicker = null;
            }
            
            // Always reset all buttons to normal state
            const allButtons = document.querySelectorAll('.like-button');
            allButtons.forEach(button => {
                button.style.transform = 'translateX(0) rotate(0deg)';
                button.style.opacity = '1';
            });
        }

        async function loadReactionCounts(drawingId, picker, currentReaction) {
            try {
                const { data: likes, error } = await window.supabase
                    .from('drawing_likes')
                    .select('reaction_type')
                    .eq('drawing_id', drawingId);
                
                if (error) throw error;
                
                // Count each reaction type
                const reactionCounts = {};
                likes.forEach(like => {
                    reactionCounts[like.reaction_type] = (reactionCounts[like.reaction_type] || 0) + 1;
                });
                
                // Update display
                picker.querySelectorAll('.reaction-option').forEach(option => {
                    const reaction = option.dataset.reaction;
                    const count = reactionCounts[reaction] || 0;
                    const countElement = option.querySelector('.reaction-count');
                    
                    // Only show count if greater than 0
                    if (count > 0) {
                        countElement.textContent = count;
                        countElement.style.display = 'flex';
                    } else {
                        countElement.style.display = 'none';
                    }
                    
                    // Highlight current user's reaction
                    if (currentReaction === reaction) {
                        option.classList.add('current-reaction');
                    }
                });
            } catch (error) {
                console.error("Error loading reaction counts:", error);
            }
        }

        async function addLike(drawingId, ipAddress, reactionType, likeIconElement) {
            try {
                const { error } = await window.supabase
                    .from('drawing_likes')
                    .insert([{
                        drawing_id: drawingId,
                        reaction_type: reactionType,
                        ip_address: ipAddress
                    }]);
                
                if (error) throw error;
                
                // Update UI with animation
                likeIconElement.src = reactionIcons[reactionType];
                
                // Facebook-like animation
                animateLikeButton(likeIconElement);
                
            } catch (error) {
                console.error("Error adding like:", error);
                showSubmitPopup("Failed to add reaction. Please try again.");
            }
        }

        async function updateLike(drawingId, ipAddress, newReactionType, likeIconElement) {
            try {
                const { error } = await window.supabase
                    .from('drawing_likes')
                    .update({ reaction_type: newReactionType })
                    .eq('drawing_id', drawingId)
                    .eq('ip_address', ipAddress);
                
                if (error) throw error;
                
                // Update UI with animation
                likeIconElement.src = reactionIcons[newReactionType];
                
                // Facebook-like animation
                animateLikeButton(likeIconElement);
                
            } catch (error) {
                console.error("Error updating like:", error);
                showSubmitPopup("Failed to update reaction. Please try again.");
            }
        }

        async function removeLike(drawingId, ipAddress, likeIconElement) {
            try {
                const { error } = await window.supabase
                    .from('drawing_likes')
                    .delete()
                    .eq('drawing_id', drawingId)
                    .eq('ip_address', ipAddress);
                
                if (error) throw error;
                
                // Reset icon if no likes left
                const { data: remainingLikes } = await window.supabase
                    .from('drawing_likes')
                    .select('reaction_type')
                    .eq('drawing_id', drawingId);
                
                if (!remainingLikes?.length) {
                    likeIconElement.src = defaultReactionIcon;
                } else {
                    // Update to most common remaining reaction
                    const reactionCounts = {};
                    remainingLikes.forEach(like => {
                        reactionCounts[like.reaction_type] = (reactionCounts[like.reaction_type] || 0) + 1;
                    });
                    const mostCommonReaction = Object.keys(reactionCounts).reduce((a, b) => 
                        reactionCounts[a] > reactionCounts[b] ? a : b
                    );
                    likeIconElement.src = reactionIcons[mostCommonReaction];
                }
                
            } catch (error) {
                console.error("Error removing like:", error);
                showSubmitPopup("Failed to remove reaction. Please try again.");
            }
        }

        function animateLikeButton(iconElement) {
            // Facebook-like animation
            iconElement.style.transform = 'scale(1.3) rotate(15deg)';
            iconElement.style.transition = 'all 0.3s ease';
            
            setTimeout(() => {
                iconElement.style.transform = 'scale(1) rotate(0deg)';
            }, 300);
        }

        initPostsSystem();
    }
});
