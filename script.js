document.addEventListener("DOMContentLoaded", async function() {
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
        telegram_url: 'https://t.me/wuufles',
        telegram_enabled: true,
        telegram_card_video_url: '',
        telegram_card_video_path: '',
        throne_url: 'https://throne.com/edoll',
        throne_enabled: true,
        throne_checkout_mode: 'mockup',
        wishlist_view_mode: 'masonry',
        homepage_note_text: '',
        homepage_note_font_size: 13.25,
        latest_note_enabled: false,
        latest_note_title: 'latest note',
        latest_note_body: '',
        maintenance_enabled: false,
        maintenance_title: '',
        maintenance_message: '',
        maintenance_eta: '',
        entrance_mode: 'paw',
        drawings_enabled: true,
        questions_enabled: true,
        rooms_enabled: true,
        seo_title: 'Lia | doll.gg',
        seo_description: "Lia's little space for messages, posts, socials and more.",
        site_tagline: "Lia's little space for messages, posts, socials and more."
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
    audio.loop = true;
    const backgroundMusicVolume = 0.4;
    const backgroundFadeInDuration = 6;
    const backgroundFadeOutDuration = 4;
    let backgroundMusicRequestedVolume = backgroundMusicVolume;
    let backgroundFadeLevel = 0;
    let backgroundFadeFrame = null;
    let audioPlayed = false;
    const uiSounds = {
        tap: 'CUT1.mp3',
        link: 'CUT2.mp3',
        submit: 'CUT3.mp3'
    };
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const uiAudioContext = AudioContextClass ? new AudioContextClass() : null;
    let backgroundMusicGain = null;
    if (uiAudioContext) {
        try {
            const backgroundMusicSource = uiAudioContext.createMediaElementSource(audio);
            backgroundMusicGain = uiAudioContext.createGain();
            backgroundMusicSource.connect(backgroundMusicGain);
            backgroundMusicGain.connect(uiAudioContext.destination);
        } catch (error) {
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

    const uiSoundBuffersReady = loadUiSoundBuffers();

    async function warmUiSounds() {
        if (uiSoundsWarmed) return;
        uiSoundsWarmed = true;

        if (uiAudioContext && uiAudioContext.state !== 'running') {
            try {
                await uiAudioContext.resume();
            } catch (error) {
                // HTMLAudioElement fallback below still works.
            }
        }

        Object.values(uiSoundPlayers).forEach(sound => {
            if (!sound.paused) return;
            const previousVolume = sound.volume;
            sound.volume = 0;
            sound.currentTime = 0;
            sound.play()
                .then(() => {
                    sound.pause();
                    sound.currentTime = 0;
                    sound.volume = previousVolume;
                })
                .catch(() => {
                    sound.volume = previousVolume;
                });
        });
    }

    function playUiSound(type) {
        if (uiAudioContext && uiAudioContext.state === 'running' && uiSoundBuffers[type]) {
            const source = uiAudioContext.createBufferSource();
            const gain = uiAudioContext.createGain();
            source.buffer = uiSoundBuffers[type];
            gain.gain.value = 1;
            source.connect(gain);
            gain.connect(uiAudioContext.destination);
            source.start(0);
            return;
        }

        const sound = uiSoundPlayers[type];
        if (!sound) return;

        sound.pause();
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }

    window.dollPlayUiSound = playUiSound;

    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function createUnavailableSupabaseClient() {
        const unavailableError = {
            message: 'Connection is unavailable right now. Please try again.'
        };

        function createSelectQuery(single = false) {
            const query = {
                eq: () => query,
                not: () => query,
                order: () => query,
                single: () => createSelectQuery(true),
                then: (resolve, reject) => Promise.resolve({
                    data: single ? null : [],
                    error: single ? { code: 'PGRST116', message: 'No rows found' } : null
                }).then(resolve, reject),
                catch: callback => Promise.resolve({
                    data: single ? null : [],
                    error: single ? { code: 'PGRST116', message: 'No rows found' } : null
                }).catch(callback)
            };

            return query;
        }

        return {
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

    function initNoteRoomsPeel() {
        const noteTarget = document.getElementById('note-peel-target');
        const note = document.querySelector('.note-image');
        const peelHandle = noteTarget?.querySelector('.note-peel-handle');
        if (!noteTarget || !note || !peelHandle) return;

        let startX = 0;
        let startY = 0;
        let currentProgress = 0;
        let dragging = false;
        let detaching = false;
        let openDistance = 190;

        function roomsAreEnabled() {
            return siteLinkSettings.rooms_enabled !== false;
        }

        function updatePeelMetrics() {
            const noteRect = noteTarget.getBoundingClientRect();
            openDistance = Math.max(150, Math.min(245, Math.hypot(noteRect.width, noteRect.height) * 0.62));
        }

        function setPeelProgress(progress) {
            currentProgress = Math.max(0, Math.min(1, progress));
            const eased = 1 - Math.pow(1 - currentProgress, 2.05);
            const foldSize = 28 + eased * 64;
            const foldX = eased * -42;
            const foldY = eased * -34;

            noteTarget.style.setProperty('--note-peel-progress', eased.toFixed(3));
            noteTarget.style.setProperty('--note-fold-size', `${foldSize.toFixed(1)}px`);
            noteTarget.style.setProperty('--note-fold-x', `${foldX.toFixed(1)}px`);
            noteTarget.style.setProperty('--note-fold-y', `${foldY.toFixed(1)}px`);
            noteTarget.style.transform = `translateX(-50%) translate3d(${-eased * 44}px, ${-4 - eased * 30}px, 0) rotate(${-eased * 7.5}deg) scale(${1.015 + eased * 0.014})`;
        }

        function resetPeel() {
            if (detaching) return;
            dragging = false;
            noteTarget.classList.remove('peeling', 'completing', 'detached');
            setPeelProgress(0);
            window.setTimeout(() => {
                if (dragging || detaching || currentProgress > 0.01) return;
                noteTarget.style.removeProperty('transform');
            }, 320);
        }

        function detachNote() {
            if (detaching || !roomsAreEnabled()) return;
            detaching = true;
            playUiSound('link');
            noteTarget.classList.remove('peeling');
            noteTarget.classList.add('completing');
            window.requestAnimationFrame(() => {
                setPeelProgress(1);
                window.setTimeout(() => {
                    noteTarget.classList.add('detached');
                    window.requestAnimationFrame(() => {
                        noteTarget.style.transform = 'translateX(-50%) translate3d(-72px, calc(100vh + 140px), 0) rotate(-26deg) scale(0.985)';
                    });
                    window.setTimeout(() => {
                        noteTarget.classList.add('peeled-away');
                        noteTarget.setAttribute('aria-hidden', 'true');
                    }, 860);
                }, 190);
            });
        }

        updatePeelMetrics();
        window.addEventListener('resize', function() {
            updatePeelMetrics();
            if (!dragging && !detaching) resetPeel();
        });

        peelHandle.addEventListener('pointerdown', function(e) {
            if (detaching || !roomsAreEnabled() || !e.isPrimary || note.classList.contains('hidden')) return;
            if (noteTarget.classList.contains('editing')) return;
            dragging = true;
            startX = e.clientX;
            startY = e.clientY;
            updatePeelMetrics();
            noteTarget.classList.add('peeling');
            peelHandle.setPointerCapture?.(e.pointerId);
            e.preventDefault();
        });

        peelHandle.addEventListener('pointermove', function(e) {
            if (!dragging || detaching) return;
            const dx = startX - e.clientX;
            const dy = startY - e.clientY;
            const distance = Math.max(0, dx * 0.78 + dy * 0.58);
            if (distance > 5) {
                e.preventDefault();
            }
            setPeelProgress(distance / openDistance);
        });

        function finishPeel(e) {
            if (!dragging || detaching) return;
            dragging = false;
            peelHandle.releasePointerCapture?.(e.pointerId);

            if (currentProgress >= 0.82) {
                detachNote();
                return;
            }

            resetPeel();
        }

        peelHandle.addEventListener('pointerup', finishPeel);
        peelHandle.addEventListener('pointercancel', resetPeel);
    }

    initNoteRoomsPeel();
    
    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById("loading-screen");
    const loadingBarContainer = document.getElementById("loading-bar-container");
    const loadingBarFill = document.getElementById("loading-bar-fill");
    const loadingProgressElement = loadingBarFill?.closest('[role="progressbar"]');
    const loadingPawPrints = Array.from(document.querySelectorAll('.loading-paw-print'));
    const prefersReducedLoadingMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const minLoadingTime = 2000;
    const submissionsPreloadTimeout = 10000;
    let loadingBarShown = false;
    let loadingProgress = 0;
    let displayedLoadingProgress = 0;
    let loadingVisualFrame = null;
    let loadingVisualFrameTime = null;
    const preloadedSubmissions = {
        drawings: [],
        questions: [],
        loaded: false,
        error: null
    };

    function markSubmissionsDirty() {
        preloadedSubmissions.loaded = false;
        preloadedSubmissions.error = null;
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

    function decodeImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = resolve;
            img.src = src;
        });
    }

    async function loadSubmissionsFromSupabase({ decodeDrawings = false } = {}) {
        const [drawingsResult, questionsResult] = await Promise.all([
            window.supabase
                .from('drawings')
                .select('*')
                .eq('approved', true)
                .order('created_at', { ascending: false }),
            window.supabase
                .from('questions')
                .select('*')
                .not('answer', 'is', null)
                .order('created_at', { ascending: false })
        ]);

        if (drawingsResult.error) throw drawingsResult.error;
        if (questionsResult.error) throw questionsResult.error;

        const drawings = drawingsResult.data || [];
        const questions = questionsResult.data || [];

        if (decodeDrawings) {
            await Promise.all(drawings.map(drawing =>
                decodeImage(`data:image/png;base64,${drawing.imageData}`)
            ));
        }

        preloadedSubmissions.drawings = drawings;
        preloadedSubmissions.questions = questions;
        preloadedSubmissions.error = null;
        preloadedSubmissions.loaded = true;

        return { drawings, questions };
    }

    async function preloadSubmissionsData() {
        try {
            await loadSubmissionsFromSupabase({ decodeDrawings: true });
        } catch (error) {
            preloadedSubmissions.error = error;
            preloadedSubmissions.loaded = true;
            console.error("Error preloading submissions:", error);
        }
    }

    async function preloadSubmissionsWithTimeout() {
        let timedOut = false;
        await Promise.race([
            preloadSubmissionsData(),
            new Promise(resolve => {
                setTimeout(() => {
                    timedOut = true;
                    resolve();
                }, submissionsPreloadTimeout);
            })
        ]);

        if (timedOut && !preloadedSubmissions.loaded) {
            console.warn("Submissions preload timed out; will retry when :3 opens.");
        }
    }

    function normalizeSiteLinkSettings(value) {
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
            telegram_url: String(settings.telegram_url || DEFAULT_LINK_SETTINGS.telegram_url),
            telegram_enabled: settings.telegram_enabled !== false,
            telegram_card_video_url: String(settings.telegram_card_video_url || ''),
            telegram_card_video_path: String(settings.telegram_card_video_path || ''),
            throne_url: String(settings.throne_url || DEFAULT_LINK_SETTINGS.throne_url),
            throne_enabled: settings.throne_enabled !== false,
            throne_checkout_mode: settings.throne_checkout_mode === 'widget' ? 'widget' : 'mockup',
            wishlist_view_mode: ['grid', 'list', 'masonry'].includes(settings.wishlist_view_mode) ? settings.wishlist_view_mode : 'masonry',
            homepage_note_text: String(settings.homepage_note_text || '').slice(0, 220),
            homepage_note_font_size: Math.min(17, Math.max(9, Number(settings.homepage_note_font_size) || 13.25)),
            latest_note_enabled: settings.latest_note_enabled === true,
            latest_note_title: String(settings.latest_note_title || DEFAULT_LINK_SETTINGS.latest_note_title),
            latest_note_body: String(settings.latest_note_body || ''),
            maintenance_enabled: settings.maintenance_enabled === true,
            maintenance_title: String(settings.maintenance_title || DEFAULT_LINK_SETTINGS.maintenance_title),
            maintenance_message: String(settings.maintenance_message || DEFAULT_LINK_SETTINGS.maintenance_message),
            maintenance_eta: String(settings.maintenance_eta || ''),
            entrance_mode: settings.entrance_mode === 'bubbles' ? 'bubbles' : 'paw',
            drawings_enabled: settings.drawings_enabled !== false,
            questions_enabled: settings.questions_enabled !== false,
            rooms_enabled: settings.rooms_enabled !== false,
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
            siteLinkSettings = normalizeSiteLinkSettings(data[0].value);
        } catch (error) {
            siteLinkSettings = { ...DEFAULT_LINK_SETTINGS };
        } finally {
            if (!siteSettingsLoadExpired && typeof applySiteLinkSettingsToDom === 'function') {
                applySiteLinkSettingsToDom();
            }
        }
    }

    async function loadSiteLinkSettingsWithTimeout() {
        await Promise.race([
            loadSiteLinkSettings(),
            wait(3000).then(() => { siteSettingsLoadExpired = true; })
        ]);
    }

    // Enhanced loading logic: wait for min time, window load, AND ALL critical resources
    Promise.all([
        new Promise(resolve => setTimeout(resolve, minLoadingTime)),
        new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }

            window.addEventListener('load', resolve, { once: true });
        }),
        // Wait for DOM to be fully ready
        new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        }),
        Promise.race([
            uiSoundBuffersReady.catch(() => {}),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]),
        waitForKofiOverlayReady(),
        // Wait for critical resources to load
        new Promise(resolve => {
            const criticalResources = [
                'background1.png',
                'dropdown1.png',
                'note-paper-v4.png',
                'loading.gif',
                'wishlist.png',
                'question-bunny.png',
                'reactions.png',
                'happy.png',
                'cool.png',
                'meh.png',
                'sad.png',
                'CUT1.mp3',
                'CUT2.mp3',
                'CUT3.mp3',
                'hehe.mp3'
            ];
            
            let loadedCount = 0;
            const totalResources = criticalResources.length;
            
            if (totalResources === 0) {
                resolve();
                return;
            }
            
            // Load each resource and track completion
            criticalResources.forEach(src => {
                const fileExtension = src.split('.').pop().toLowerCase();
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
                
                if (fileExtension === 'mp3') {
                    // Handle audio files - mobile optimized
                    const audio = new Audio();
                    audio.preload = 'metadata'; // Mobile browsers prefer metadata only

                    audio.addEventListener('canplaythrough', markResourceLoaded);
                    audio.addEventListener('loadedmetadata', markResourceLoaded);
                    audio.addEventListener('canplay', markResourceLoaded);
                    audio.onerror = markResourceLoaded;
                    
                    // Mobile timeout for audio loading
                    setTimeout(() => {
                        if (audio.readyState < 1) { // Not loaded yet
                            markResourceLoaded();
                        }
                    }, 3000); // 3 second timeout for mobile
                    
                    audio.src = src;
                } else if (fileExtension === 'mp4') {
                    // Handle video files - mobile optimized
                    const video = document.createElement('video');
                    video.muted = true; // Mobile browsers require muted for autoload
                    video.preload = 'metadata'; // Only load metadata on mobile

                    video.addEventListener('loadedmetadata', markResourceLoaded);
                    video.addEventListener('loadeddata', markResourceLoaded);
                    video.addEventListener('canplay', markResourceLoaded);
                    video.onerror = markResourceLoaded;
                    
                    // Mobile timeout for video loading
                    setTimeout(() => {
                        if (video.readyState < 1) { // Not loaded yet
                            markResourceLoaded();
                        }
                    }, 5000); // 5 second timeout for mobile
                    
                    video.src = src;
                } else {
                    // Handle image files
                    const resource = new Image();
                    resource.onload = markResourceLoaded;
                    resource.onerror = markResourceLoaded;
                    resource.src = src;
                }
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

        await Promise.all([
            preloadSubmissionsWithTimeout(),
            loadSiteLinkSettingsWithTimeout()
        ]);
        clearInterval(progressTick);
        setLoadingProgress(100);

        // Let the far-right paw finish pressing in before revealing the site.
        await waitForLoadingPawTrail();
        await wait(prefersReducedLoadingMotion ? 80 : 360);
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
            loadingScreen.style.display = "none";
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
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
            loadingScreen.style.display = "none";
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
    const legacyIOSMatch = navigator.userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) (\d+)[._]/);
    const isLegacyIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        && legacyIOSMatch
        && Number(legacyIOSMatch[1]) <= 15;
    if (popup) popup.style.display = "flex";

    function dismissEntryGate(trigger = null) {
        if (!popup || entryDismissalInProgress) return;
        entryDismissalInProgress = true;
        // iOS 15 can briefly make the muted pre-warm sounds audible. Keep the
        // established warm-up on newer browsers, but never start CUT1/CUT3 here
        // on the affected older phones.
        if (!isLegacyIOS) warmUiSounds();

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
            window.setTimeout(() => {
                if (audioPlayed) return;
                audioPlayed = true;
                backgroundFadeLevel = 0;
                applyBackgroundMusicVolume();
                audio.play()
                    .then(startBackgroundFadeLoop)
                    .catch(e => {
                        audioPlayed = false;
                    });
            }, isLegacyIOS ? 900 : 700);
        }, trigger ? 420 : 80);
    }

    function clearEntryBubbles() {
        if (!entryBubbleField) return;
        entryBubbleField.replaceChildren();
        entryBubbleField.inert = false;
        entryBubbleRemaining = 0;
    }

    function createEntryBubbleBurst(bubble) {
        if (!entryBubbleField) return;
        const rect = bubble.getBoundingClientRect();
        const burst = document.createElement('span');
        const fragment = document.createDocumentFragment();
        const particleCount = 18;
        const fragmentCount = 6;
        burst.className = 'entry-bubble-burst';
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
        entryBubbleField.appendChild(burst);
        window.setTimeout(() => burst.remove(), 1080);
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

            bubble.addEventListener('click', () => {
                if (bubble.classList.contains('popping') || entryDismissalInProgress) return;
                createEntryBubbleBurst(bubble);
                bubble.classList.add('popping');
                bubble.disabled = true;
                entryBubbleRemaining -= 1;
                playUiSound('tap');
                entryBubbleField.setAttribute('aria-label', entryBubbleRemaining
                    ? `${entryBubbleRemaining} bubble${entryBubbleRemaining === 1 ? '' : 's'} left to pop`
                    : 'All bubbles popped. Entering the site.');
                window.setTimeout(() => bubble.remove(), 620);

                if (entryBubbleRemaining === 0) {
                    entryBubbleField.inert = true;
                    window.setTimeout(() => dismissEntryGate(), 900);
                }
            });

            entryBubbleField.appendChild(bubble);
        });
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
    const supportMenuButton = document.getElementById('support-menu-button');
    const actionMenuButton = document.getElementById('action-menu-button');
    const actionOptions = actionMenuButton?.querySelector('.action-options');
    const publicAskButton = document.getElementById('ask-button');
    const donateOption = document.getElementById('donate-option');
    const siteBrandButton = document.getElementById('site-brand-button');
    const footerBubbleField = document.getElementById('footer-bubble-field');
    const latestNote = document.getElementById('latest-note');
    const latestNoteToggle = document.getElementById('latest-note-toggle');
    const latestNoteTitle = document.getElementById('latest-note-title');
    const latestNoteBody = document.getElementById('latest-note-body');
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

    function getSocialCardVideoEntries() {
        return [
            ['snapchat', snapchatOption],
            ['instagram', instagramOption],
            ['kofi', donateOption],
            ['telegram', telegramOption]
        ];
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

    function syncSocialCardVideo(key, card) {
        if (!card) return;
        const url = String(siteLinkSettings[`${key}_card_video_url`] || '').trim();
        if (!url) {
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
            if (preview instanceof HTMLVideoElement) preview.pause();
            preview.dataset.source = url;
            preview.src = url;
            if (preview instanceof HTMLVideoElement) preview.load();
        }

        if (preview instanceof HTMLVideoElement && socialsButton?.classList.contains('open') && !document.hidden) {
            preview.play().catch(() => {});
        }
    }

    function syncSocialCardVideos() {
        getSocialCardVideoEntries().forEach(([key, card]) => syncSocialCardVideo(key, card));
    }

    function playSocialCardVideos() {
        if (document.hidden) return;
        getVisibleSocialOptions().forEach(card => {
            card.querySelector('video.social-link-preview')?.play().catch(() => {});
        });
    }

    function pauseSocialCardVideos() {
        getSocialCardVideoEntries().forEach(([, card]) => {
            card?.querySelector('video.social-link-preview')?.pause();
        });
    }

    function getPublicLink(key) {
        return siteLinkSettings[`${key}_url`] || DEFAULT_LINK_SETTINGS[`${key}_url`];
    }

    function isPublicLinkEnabled(key) {
        return siteLinkSettings[`${key}_enabled`] !== false;
    }

    // The card's handle (the <small> line, and the "Open X: handle" aria-label)
    // used to be static markup, so changing a link in the admin dashboard
    // updated the href but left the old handle showing -- this derives it
    // fresh from whatever URL is currently active instead.
    function getSocialCardHandle(urlString) {
        try {
            const url = new URL(urlString);
            const segment = url.pathname.split('/').filter(Boolean).pop() || '';
            return segment.replace(/^@/, '');
        } catch (error) {
            return '';
        }
    }

    function updateSocialCardDisplay(option, key, platformLabel, withAt = false) {
        if (!option) return;
        const handle = getSocialCardHandle(getPublicLink(key));
        if (!handle) return;
        const small = option.querySelector('.social-link-copy small');
        if (small) small.textContent = withAt ? `@${handle}` : handle;
        option.setAttribute('aria-label', `Open ${platformLabel}: ${handle}`);
    }

    function getVisibleSocialOptions() {
        return Array.from(socialLinksPanel?.querySelectorAll('.social-link-card') || [])
            .filter(option => !option.classList.contains('site-link-hidden'));
    }

    function syncStructuredDataLinks() {
        const structuredData = document.getElementById('site-structured-data');
        if (!structuredData) return;

        try {
            const data = JSON.parse(structuredData.textContent);
            const graph = Array.isArray(data['@graph']) ? data['@graph'] : [];
            const websiteNode = graph.find(node => node['@type'] === 'WebSite');
            const pageTitle = siteLinkSettings.seo_title || DEFAULT_LINK_SETTINGS.seo_title;
            const pageDescription = siteLinkSettings.seo_description || DEFAULT_LINK_SETTINGS.seo_description;
            const sameAs = ['instagram', 'snapchat', 'kofi', 'telegram', 'throne']
                .filter(isPublicLinkEnabled)
                .map(getPublicLink)
                .filter(Boolean);

            if (websiteNode) {
                websiteNode.sameAs = sameAs;
                websiteNode.description = pageDescription;
            }
            graph
                .filter(node => node['@type'] === 'Person')
                .forEach(node => {
                    node.sameAs = sameAs;
                });
            graph
                .filter(node => node['@type'] === 'WebPage' || node['@type'] === 'ProfilePage')
                .forEach(node => {
                    node.name = pageTitle;
                    node.description = pageDescription;
                });
            structuredData.textContent = JSON.stringify(data, null, 2);
        } catch (error) {
            // Keep the static structured data if parsing ever fails.
        }
    }

    function renderLatestNote() {
        if (!latestNote || !latestNoteTitle || !latestNoteBody || !latestNoteToggle) return;
        const enabled = siteLinkSettings.latest_note_enabled === true && siteLinkSettings.latest_note_body.trim();
        latestNote.hidden = !enabled;
        latestNoteToggle.setAttribute('aria-expanded', latestNoteBody.hidden ? 'false' : 'true');
        if (!enabled) {
            latestNoteBody.hidden = true;
            latestNote.classList.remove('open');
            return;
        }

        latestNoteTitle.textContent = siteLinkSettings.latest_note_title || DEFAULT_LINK_SETTINGS.latest_note_title;
        latestNoteBody.textContent = siteLinkSettings.latest_note_body;
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

            const rect = homepageNoteTarget.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const isPeelCorner = x >= rect.width - 82 && y >= rect.height - 92;
            if (!isPeelCorner) beginHomepageNoteEditing();
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

        const revisionBeforeSave = homepageNoteSaveRevision;
        const fallbackSettings = getHomepageNoteSettingsSnapshot();
        if (homepageNoteEditor && !homepageNoteEditor.hidden) finishHomepageNoteEditing();
        flushHomepageNoteSizeSave();
        if (revisionBeforeSave === homepageNoteSaveRevision) {
            queueHomepageNoteSave(fallbackSettings);
        }

        await homepageNoteSaveQueue;
        homepageNoteExplicitSavePending = false;
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
        const client = await siteClientReady;
        if (!client?.auth?.getUser) {
            setHomepageNoteAdminAccess(false);
            return;
        }

        try {
            const { data, error } = await client.auth.getUser();
            setHomepageNoteAdminAccess(!error && data?.user?.id === HOMEPAGE_NOTE_ADMIN_UID);
        } catch (error) {
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
        const roomsEnabled = siteLinkSettings.rooms_enabled !== false;
        const noteRoomsTarget = document.getElementById('note-peel-target');
        noteRoomsTarget?.classList.toggle('rooms-disabled', !roomsEnabled);
        noteRoomsTarget?.setAttribute('aria-disabled', roomsEnabled ? 'false' : 'true');
        noteRoomsTarget?.setAttribute('aria-label', roomsEnabled
            ? 'Pull the note corner to peel it off'
            : 'Rooms are currently unavailable');
        if (snapchatOption) {
            snapchatOption.href = getPublicLink('snapchat');
            snapchatOption.classList.toggle('site-link-hidden', !isPublicLinkEnabled('snapchat'));
            snapchatOption.setAttribute('aria-hidden', isPublicLinkEnabled('snapchat') ? 'false' : 'true');
            snapchatOption.setAttribute('tabindex', '-1');
            updateSocialCardDisplay(snapchatOption, 'snapchat', 'Snapchat');
        }
        if (instagramOption) {
            instagramOption.href = getPublicLink('instagram');
            instagramOption.classList.toggle('site-link-hidden', !isPublicLinkEnabled('instagram'));
            instagramOption.setAttribute('aria-hidden', isPublicLinkEnabled('instagram') ? 'false' : 'true');
            instagramOption.setAttribute('tabindex', '-1');
            updateSocialCardDisplay(instagramOption, 'instagram', 'Instagram', true);
        }
        if (donateOption) {
            donateOption.href = getPublicLink('kofi');
            donateOption.classList.toggle('site-link-hidden', !isPublicLinkEnabled('kofi'));
            donateOption.setAttribute('aria-hidden', isPublicLinkEnabled('kofi') ? 'false' : 'true');
            donateOption.setAttribute('tabindex', '-1');
            updateSocialCardDisplay(donateOption, 'kofi', 'Ko-fi');
            syncKofiWidgetHandle();
            setKofiWidgetVisibility(isPublicLinkEnabled('kofi'));
        }
        if (telegramOption) {
            telegramOption.href = getPublicLink('telegram');
            telegramOption.classList.toggle('site-link-hidden', !isPublicLinkEnabled('telegram'));
            telegramOption.setAttribute('aria-hidden', isPublicLinkEnabled('telegram') ? 'false' : 'true');
            telegramOption.setAttribute('tabindex', '-1');
            updateSocialCardDisplay(telegramOption, 'telegram', 'Telegram');
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
        }
        syncStructuredDataLinks();
        renderSeoSettings();
        renderSubmissionControls();
        renderHomepageNoteText();
        renderLatestNote();
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

        let index = 0;
        let stepTimer = null;
        let tourFinished = false;
        const tourStepDuration = 1281;
        const finalTourHoldDuration = 1938;
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
                const delay = letterIndex * 0.028125;
                return `<span class="tour-label-letter" style="--tour-letter-turn:${turn}deg;--tour-letter-lift:${lift}px;--tour-letter-delay:${delay}s">${letter}</span>`;
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
            window.clearTimeout(stepTimer);
            document.removeEventListener('keydown', handleTourKeydown);
            window.removeEventListener('resize', updateTourVeil);
            overlay.classList.add('leaving');
            document.body.classList.remove('first-visit-tour-active');
            steps.forEach(step => step.element.classList.remove('tour-highlight-target'));
            window.setTimeout(() => overlay.remove(), 225);
        }

        function handleTourKeydown(event) {
            if (event.key === 'Escape') {
                finishTour();
            }
        }

        document.addEventListener('keydown', handleTourKeydown);
        window.addEventListener('resize', updateTourVeil);
        updateTourVeil();

        function showStep() {
            const step = steps[index];
            if (!step) {
                finishTour();
                return;
            }

            const rect = step.element.getBoundingClientRect();
            const targetX = rect.left + rect.width / 2;
            const labelAbove = step.placement !== 'down';
            const labelX = Math.max(58, Math.min(window.innerWidth - 58, targetX + (index - 1) * 14));
            const labelY = labelAbove
                ? Math.max(54, rect.top - 72)
                : Math.min(window.innerHeight - 54, rect.bottom + 68);
            // Start just beyond the highlighted button's circular ring, rather
            // than underneath it, so the arrowhead stays clearly visible.
            const arrowTargetGap = 14;
            const startY = labelAbove ? rect.top - arrowTargetGap : rect.bottom + arrowTargetGap;
            const endY = labelAbove ? labelY + 24 : labelY - 24;
            const curveY = labelAbove ? (startY + endY) / 2 - 26 : (startY + endY) / 2 + 26;

            stepLayer.insertAdjacentHTML('beforeend', `
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
            `);

            index += 1;
            // Let each arrow finish, its label finish drawing, and the last
            // scene linger before the existing gentle tour fade-out begins.
            stepTimer = window.setTimeout(
                showStep,
                index >= steps.length ? finalTourHoldDuration : tourStepDuration
            );
        }

        showStep();
    }

    latestNoteToggle?.addEventListener('click', () => {
        if (!latestNote || !latestNoteBody) return;
        const nextOpen = latestNoteBody.hidden;
        latestNoteBody.hidden = !nextOpen;
        latestNote.classList.toggle('open', nextOpen);
        latestNoteToggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    });

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

    snapchatOption?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (siteLinkSettings.maintenance_enabled === true) return;
        if (!isPublicLinkEnabled('snapchat')) return;
        playUiSound('link');
        window.open(getPublicLink('snapchat'), '_blank', 'noopener,noreferrer');
    });

    instagramOption?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (siteLinkSettings.maintenance_enabled === true) return;
        if (!isPublicLinkEnabled('instagram')) return;
        playUiSound('link');
        window.open(getPublicLink('instagram'), '_blank', 'noopener,noreferrer');
    });

    telegramOption?.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (siteLinkSettings.maintenance_enabled === true) return;
        if (!isPublicLinkEnabled('telegram')) return;
        playUiSound('link');
        window.open(getPublicLink('telegram'), '_blank', 'noopener,noreferrer');
    });

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
        playUiSound('link');
        openKofiOverlay();
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

    [snapchatOption, instagramOption, donateOption, toggleButton].forEach(option => {
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
            historyIndex++;
            if (historyIndex < drawingHistory.length) {
                drawingHistory.length = historyIndex;
            }
            drawingHistory.push(canvas.toDataURL());
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
                    postsPopup?.classList.add('active');
                    setPostsPanelLayoutOpen(true);
                    postsButton.textContent = '×';
                    await renderSubmissions();
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

        function linkifyText(str) {
            const urlPattern = /(\bhttps?:\/\/[^\s<>"']+|\bwww\.[^\s<>"']+\.[^\s<>"']+|\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/g;
            let html = '';
            let lastIndex = 0;
            String(str).replace(urlPattern, (match, _url, offset) => {
                html += escapeHtml(String(str).slice(lastIndex, offset));
                const href = /^https?:\/\//i.test(match) ? match : 'https://' + match;
                const safeHref = escapeHtml(href);
                const safeText = escapeHtml(match);
                if (/\.gif(?:[?#].*)?$/i.test(href)) {
                    html += `<a href="${safeHref}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-gif-link"><img src="${safeHref}" alt="" class="answer-gif" loading="lazy" referrerpolicy="no-referrer"></a>`;
                } else {
                    html += `<a href="${safeHref}" target="_blank" rel="nofollow ugc noopener noreferrer" class="answer-link">${safeText}</a>`;
                }
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
                drawingLikesObserver?.disconnect();
                drawingsList.innerHTML = '';
                const fragment = document.createDocumentFragment();
                const drawingsToObserve = [];
                drawings.forEach(drawing => {
                    const el = document.createElement('div');
                    el.className = 'post-item';
                    const drawingSrc = getDrawingSrc(drawing.imageData);
                    if (!drawingSrc) return;
                    el.innerHTML = `
                        <img src="${drawingSrc}" alt="User drawing">
                        <div class="like-sticker" data-drawing-id="${drawing.id}">
                            <div class="like-button">
                                <img src="reactions.png" alt="Like" class="like-icon">
                            </div>
                        </div>
                    `;
                    fragment.appendChild(el);

                    if (drawingLikesObserver) {
                        drawingsToObserve.push(el);
                    } else {
                        initLikeSystem(el, drawing.id);
                    }
                });
                drawingsList.appendChild(fragment);
                drawingsToObserve.forEach(el => drawingLikesObserver.observe(el));
            } catch (error) {
                console.error("Error loading drawings:", error);
                drawingsList.innerHTML = '<p>Error loading drawings. Please refresh.</p>';
            }
        }

        function renderQuestions(questions) {
            try {
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
            } catch (error) {
                console.error("Error loading questions:", error);
                questionsList.innerHTML = '<p>Error loading Mi. Please refresh.</p>';
            }
        }

        // ===== LIKE SYSTEM =====
        const reactionIcons = {
            'happy': 'happy.png',
            'cool': 'cool.png', 
            'meh': 'meh.png',
            'sad': 'sad.png'
        };
        const defaultReactionIcon = 'reactions.png';
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
                        <img src="happy.png" alt="Happy">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="cool">
                        <img src="cool.png" alt="Cool">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="meh">
                        <img src="meh.png" alt="Meh">
                        <span class="reaction-count">0</span>
                    </div>
                    <div class="reaction-option" data-reaction="sad">
                        <img src="sad.png" alt="Sad">
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
