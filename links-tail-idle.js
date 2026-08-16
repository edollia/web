(() => {
    'use strict';

    const canvases = [...document.querySelectorAll('.links-tail-canvas')];
    if (!canvases.length || !window.requestAnimationFrame) return;

    const TAU = Math.PI * 2;
    const SOURCE_WIDTH = 738;
    const SOURCE_HEIGHT = 1069;
    const DURATION_MS = 32000;
    const DURATION_SECONDS = DURATION_MS / 1000;
    const FRAME_INTERVAL = 1000 / 40;
    const mainScreen = document.getElementById('main-screen');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sourceImage = new Image();
    sourceImage.decoding = 'async';

    const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
    const smooth = value => {
        const t = clamp(value);
        return t * t * (3 - 2 * t);
    };
    const range = (value, start, end) => smooth((value - start) / (end - start));
    const cycleAge = (seconds, eventTime, delay = 0) =>
        (seconds - eventTime - delay + DURATION_SECONDS) % DURATION_SECONDS;

    function springValue(age, frequency, damping, lifetime, attack = 0) {
        if (age < 0 || age > lifetime) return 0;
        const onset = attack > 0 ? smooth(age / attack) : 1;
        return onset * Math.exp(-damping * age) * Math.sin(age * frequency * TAU);
    }

    function springSignal(t, events, options = {}, delay = 0) {
        const seconds = t * DURATION_SECONDS;
        let value = 0;
        events.forEach(event => {
            value += springValue(
                cycleAge(seconds, event.at, delay),
                options.frequency ?? 2.6,
                options.damping ?? 2.8,
                options.lifetime ?? 2.1,
                options.attack ?? 0
            ) * event.force;
        });
        return value;
    }

    function chainSpring(t, u, events, options = {}, delays = {}) {
        const root = springSignal(t, events, options, delays.root ?? 0);
        const middle = springSignal(t, events, options, delays.middle ?? .03);
        const tip = springSignal(t, events, options, delays.tip ?? .065);
        const middleBlend = range(u, .2, .66);
        const tipBlend = range(u, .58, 1);
        return (root + (middle - root) * middleBlend + (tip - middle) * tipBlend)
            * u ** (options.anchorPower ?? 1.16);
    }

    function gestureEnvelope(t, eventTime, rise, hold, release) {
        const age = cycleAge(t * DURATION_SECONDS, eventTime);
        if (age < rise) return smooth(age / rise);
        if (age < rise + hold) return 1;
        if (age < rise + hold + release) {
            return 1 - smooth((age - rise - hold) / release);
        }
        return 0;
    }

    const eventActivity = (t, events, rise, hold, release) => clamp(
        events.reduce((total, event) =>
            total + gestureEnvelope(t, event.at, rise, hold, release) * Math.abs(event.force), 0)
    );

    let randomState = (() => {
        if (window.crypto?.getRandomValues) {
            const seed = new Uint32Array(1);
            window.crypto.getRandomValues(seed);
            return seed[0] || 1;
        }
        return (Math.random() * 0xffffffff) >>> 0;
    })();

    function motionRandom() {
        randomState = (randomState * 1664525 + 1013904223) >>> 0;
        return randomState / 0x100000000;
    }

    function buildPerformance() {
        const stretches = [
            { at: 10.1 + motionRandom() * 2.15, force: .88 + motionRandom() * .11 }
        ];
        const happy = [];
        const startled = [];
        const micro = [];
        const isClear = (time, events, distance) =>
            events.every(event => Math.abs(time - event.at) >= distance);

        [
            2 + motionRandom() * 1.8,
            17.4 + motionRandom() * 1.7,
            26.5 + motionRandom() * 1.25
        ].forEach(time => {
            if (isClear(time, stretches, 4.35)) {
                happy.push({ at: time, force: .82 + motionRandom() * .22 });
            }
        });

        [6.15 + motionRandom() * 1.9, 21.7 + motionRandom() * 2.15].forEach((candidate, index) => {
            let time = candidate;
            if (!isClear(time, stretches, 4.1) || !isClear(time, happy, 2.55)) time += 2.75;
            if (time < 29.4 && isClear(time, stretches, 3.9) && isClear(time, happy, 2.3)) {
                startled.push({
                    at: time,
                    force: (index % 2 ? -1 : 1) * (.76 + motionRandom() * .18)
                });
            }
        });

        let cursor = 1.1 + motionRandom() * 1.4;
        while (cursor < 30.1) {
            if (isClear(cursor, [...stretches, ...happy, ...startled], 1.45)) {
                micro.push({
                    at: cursor,
                    force: (motionRandom() > .5 ? 1 : -1) * (.34 + motionRandom() * .3)
                });
            }
            cursor += 3.4 + motionRandom() * 3.25;
        }

        return {
            stretches,
            happy,
            startled,
            micro,
            releases: stretches.map(event => ({
                at: event.at + 3.55,
                force: event.force * .5
            }))
        };
    }

    const performancePlan = buildPerformance();

    function livingDrift(u, t) {
        const broad = t * TAU * 8;
        const uneven = t * TAU * 5 + 1.08;
        const verySlow = t * TAU * 3 - .7;
        const sway = Math.sin(broad) * 5.5
            + Math.sin(uneven) * 1.85
            + Math.sin(verySlow) * .72;
        const curlLag = (Math.sin(broad - .44) - Math.sin(broad) * .18)
            * range(u, .57, 1) * 2.35;
        return {
            x: sway * u ** 1.53 + curlLag,
            y: (Math.cos(broad) * .42 + Math.sin(uneven - .3) * .13) * u ** 1.42
        };
    }

    const motion = {
        stretch(t) {
            return performancePlan.stretches.reduce((total, event) =>
                total + gestureEnvelope(t, event.at, 1.2, .5, 1.7) * event.force, 0);
        },
        happy(t, u) {
            const primary = chainSpring(t, u, performancePlan.happy, {
                frequency: 2.42,
                damping: 2.65,
                lifetime: 2.05,
                attack: .12,
                anchorPower: 1.14
            }, { root: 0, middle: .028, tip: .06 });
            const softTissue = chainSpring(t, u, performancePlan.happy, {
                frequency: 1.18,
                damping: 3.25,
                lifetime: 1.85,
                attack: .18,
                anchorPower: 1.28
            }, { root: .025, middle: .055, tip: .095 });
            return primary + softTissue * .17;
        },
        release(t, u) {
            return chainSpring(t, u, performancePlan.releases, {
                frequency: 1.9,
                damping: 4.1,
                lifetime: 1.22,
                attack: .12,
                anchorPower: 1.3
            }, { root: 0, middle: .018, tip: .035 });
        },
        startled(t) {
            return springSignal(t, performancePlan.startled, {
                frequency: 4.35,
                damping: 5.15,
                lifetime: 1.28,
                attack: .035
            });
        },
        micro(t) {
            return springSignal(t, performancePlan.micro, {
                frequency: 4.05,
                damping: 6.1,
                lifetime: .92,
                attack: .055
            });
        },
        activity(t) {
            return {
                happy: eventActivity(t, performancePlan.happy, .16, .28, 1.55),
                startled: eventActivity(t, performancePlan.startled, .035, .08, .82),
                stretch: clamp(this.stretch(t))
            };
        },
        anticipation(t) {
            return performancePlan.happy.reduce((total, event) =>
                total + gestureEnvelope(t, event.at - .28, .12, .035, .15)
                    * Math.sign(event.force), 0);
        },
        pose(u, t) {
            const idle = livingDrift(u, t);
            const happy = this.happy(t, u);
            const stretch = this.stretch(t);
            const release = this.release(t, u);
            const startled = this.startled(t);
            const micro = this.micro(t);
            const activity = this.activity(t);
            const anticipation = this.anticipation(t);
            const upper = range(u, .48, 1) ** 1.38;
            const tip = range(u, .67, 1) ** 1.65;
            const idleWeight = clamp(
                1 - activity.happy * .34 - activity.startled * .28 - activity.stretch * .16,
                .56,
                1
            );
            return {
                x: idle.x * idleWeight
                    + happy * 24
                    + release * 4
                    + startled * upper * 20
                    + micro * tip * 8
                    - stretch * tip * 1.25
                    - anticipation * upper * 1.15,
                y: idle.y * idleWeight
                    - activity.happy * .82 * u ** 1.35
                    - activity.startled * upper * 1.15
                    - stretch * 2.7 * u ** 1.7
                    - Math.abs(release)
                    - anticipation * upper * .72
            };
        },
        body(t) {
            const stretch = this.stretch(t);
            const activity = this.activity(t);
            const breath = Math.sin(t * TAU * 13 - .34);
            return {
                width: 1 + breath * .003 - stretch * .026 - activity.happy * .0015,
                length: 1 + breath * .0015 + stretch * .055
                    + activity.happy * .0025 + activity.startled * .0015
            };
        }
    };

    const neutralMotion = {
        pose() { return { x: 0, y: 0 }; },
        body() { return { width: 1, length: 1 }; }
    };

    const entries = canvases.map(canvas => ({
        canvas,
        host: canvas.parentElement,
        miniature: canvas.classList.contains('links-tail-canvas--mini'),
        context: canvas.getContext('2d', { alpha: true, willReadFrequently: true }),
        source: null,
        frame: null,
        dirty: true
    })).filter(entry => entry.context);

    function sizeEntry(entry) {
        const cssWidth = entry.canvas.clientWidth;
        const cssHeight = entry.canvas.clientHeight;
        if (!cssWidth || !cssHeight) return null;
        const scale = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(cssWidth * scale));
        const height = Math.max(1, Math.round(cssHeight * scale));
        if (entry.canvas.width !== width || entry.canvas.height !== height) {
            entry.canvas.width = width;
            entry.canvas.height = height;
            entry.source = null;
            entry.frame = null;
        }
        return {
            width,
            height,
            scale,
            tailHeight: (entry.miniature ? 12.8 : 33) * scale,
            baseX: width * .5,
            // Two transparent pixels sit beneath the painted anchor. Since
            // the larger canvas is center-aligned over the original slot,
            // this preserves the visible base position while adding room at
            // the top and sides for peak stretch/wag frames.
            baseY: height - 2 * scale
        };
    }

    function prepareSource(entry, geometry) {
        const { width, height, baseX, baseY, tailHeight } = geometry;
        const key = `${width}x${height}:${tailHeight.toFixed(2)}`;
        if (entry.source?.key === key) return;

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = width;
        sourceCanvas.height = height;
        const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
        const tailWidth = tailHeight * SOURCE_WIDTH / SOURCE_HEIGHT;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(
            sourceImage,
            baseX - tailWidth * .5,
            baseY - tailHeight,
            tailWidth,
            tailHeight
        );
        entry.source = {
            key,
            data: context.getImageData(0, 0, width, height).data
        };
        entry.frame = entry.context.createImageData(width, height);
    }

    function writeFrame(entry, t, geometry, activeMotion) {
        const { width, height, baseX, baseY, tailHeight } = geometry;
        const source = entry.source.data;
        const output = entry.frame.data;
        const body = activeMotion.body(t);
        const unit = tailHeight / 220;
        const epsilon = .003;
        output.fill(0);

        for (let y = 0; y < height; y += 1) {
            let u = (baseY - y) / (tailHeight * body.length);

            for (let iteration = 0; iteration < 2; iteration += 1) {
                const sampleU = clamp(u);
                const pose = activeMotion.pose(sampleU, t);
                const before = activeMotion.pose(clamp(sampleU - epsilon), t);
                const after = activeMotion.pose(clamp(sampleU + epsilon), t);
                const centerY = baseY - sampleU * tailHeight * body.length + pose.y * unit;
                const derivativeY = -tailHeight * body.length
                    + (after.y - before.y) * unit / (2 * epsilon);
                if (Math.abs(derivativeY) > .001) u -= (centerY - y) / derivativeY;
            }

            if (u < 0 || u > 1) continue;
            const pose = activeMotion.pose(u, t);
            const before = activeMotion.pose(clamp(u - epsilon), t);
            const after = activeMotion.pose(clamp(u + epsilon), t);
            const rawBendX = (after.x - before.x) * unit / (2 * epsilon);
            const bendY = (after.y - before.y) * unit / (2 * epsilon);
            const vertical = tailHeight * body.length - bendY;
            const bendLimit = Math.abs(vertical) * .48;
            const bendX = clamp(rawBendX, -bendLimit, bendLimit);
            const tangentLength = Math.hypot(vertical, bendX) || 1;
            const sinAngle = bendX / tangentLength;
            const cosAngle = vertical / tangentLength;
            const centerX = baseX + pose.x * unit;
            const sourceCenterY = baseY - u * tailHeight;

            for (let x = 0; x < width; x += 1) {
                const relativeX = x - centerX;
                const sourceX = baseX + relativeX * cosAngle / body.width;
                const sourceY = sourceCenterY - relativeX * sinAngle / body.width;
                const x0 = Math.floor(sourceX);
                const y0 = Math.floor(sourceY);
                if (x0 < 0 || y0 < 0 || x0 >= width - 1 || y0 >= height - 1) continue;

                const fx = sourceX - x0;
                const fy = sourceY - y0;
                const w00 = (1 - fx) * (1 - fy);
                const w10 = fx * (1 - fy);
                const w01 = (1 - fx) * fy;
                const w11 = fx * fy;
                const i00 = (y0 * width + x0) * 4;
                const i10 = i00 + 4;
                const i01 = i00 + width * 4;
                const i11 = i01 + 4;
                const alpha = source[i00 + 3] * w00
                    + source[i10 + 3] * w10
                    + source[i01 + 3] * w01
                    + source[i11 + 3] * w11;
                if (alpha < .5) continue;

                const target = (y * width + x) * 4;
                output[target] = (
                    source[i00] * source[i00 + 3] * w00
                    + source[i10] * source[i10 + 3] * w10
                    + source[i01] * source[i01 + 3] * w01
                    + source[i11] * source[i11 + 3] * w11
                ) / alpha;
                output[target + 1] = (
                    source[i00 + 1] * source[i00 + 3] * w00
                    + source[i10 + 1] * source[i10 + 3] * w10
                    + source[i01 + 1] * source[i01 + 3] * w01
                    + source[i11 + 1] * source[i11 + 3] * w11
                ) / alpha;
                output[target + 2] = (
                    source[i00 + 2] * source[i00 + 3] * w00
                    + source[i10 + 2] * source[i10 + 3] * w10
                    + source[i01 + 2] * source[i01 + 3] * w01
                    + source[i11 + 2] * source[i11 + 3] * w11
                ) / alpha;
                output[target + 3] = alpha;
            }
        }

        entry.context.putImageData(entry.frame, 0, 0);
    }

    function isVisible(entry) {
        if (!entry.canvas.isConnected || !entry.canvas.clientWidth || !entry.canvas.clientHeight) {
            return false;
        }
        const opacityHost = entry.miniature
            ? entry.canvas.closest('.dwl-icons-pill')
            : entry.canvas.closest('.dwl-icons-row');
        if (opacityHost && Number.parseFloat(getComputedStyle(opacityHost).opacity) < .01) return false;
        const rect = entry.canvas.getBoundingClientRect();
        return rect.bottom > 0
            && rect.right > 0
            && rect.top < window.innerHeight
            && rect.left < window.innerWidth;
    }

    function drawEntry(entry, elapsed, { force = false, neutral = false } = {}) {
        if (!force && !isVisible(entry)) return false;
        const geometry = sizeEntry(entry);
        if (!geometry) return false;
        prepareSource(entry, geometry);
        const t = neutral ? 0 : ((elapsed % DURATION_MS) + DURATION_MS) % DURATION_MS / DURATION_MS;
        writeFrame(entry, t, geometry, neutral ? neutralMotion : motion);
        entry.host?.classList.add('tail-renderer-ready');
        entry.dirty = false;
        return true;
    }

    let clockOrigin = 0;
    let hiddenAt = 0;
    let hiddenDuration = 0;
    let animationFrame = 0;
    let lastFrameAt = 0;
    let started = false;
    let sourceReady = false;

    function elapsedAt(timestamp) {
        return started ? Math.max(0, timestamp - clockOrigin - hiddenDuration) : 0;
    }

    function render(timestamp) {
        animationFrame = 0;
        if (!sourceReady || document.hidden || reducedMotion.matches || !started) return;
        if (timestamp - lastFrameAt >= FRAME_INTERVAL) {
            const elapsed = elapsedAt(timestamp);
            entries.forEach(entry => drawEntry(entry, elapsed));
            lastFrameAt = timestamp;
        }
        animationFrame = requestAnimationFrame(render);
    }

    function startLoop() {
        if (animationFrame || !sourceReady || document.hidden || reducedMotion.matches || !started) return;
        animationFrame = requestAnimationFrame(render);
    }

    function stopLoop() {
        if (!animationFrame) return;
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
    }

    function setStarted() {
        if (started || !mainScreen?.classList.contains('ui-ready')) return;
        started = true;
        clockOrigin = performance.now();
        hiddenDuration = 0;
        startLoop();
    }

    function drawFallbackSafeInitialFrame() {
        if (sourceReady) return;
        try {
            entries.forEach(entry => drawEntry(entry, 0, { force: true, neutral: reducedMotion.matches }));
            sourceReady = true;
            setStarted();
            startLoop();
        } catch (error) {
            // Keep the original raster visible if canvas pixel access fails.
            sourceReady = false;
            console.warn('Living tail renderer unavailable; using raster fallback.', error);
        }
    }

    function handleReducedMotionChange() {
        if (!sourceReady) return;
        stopLoop();
        if (reducedMotion.matches) {
            entries.forEach(entry => drawEntry(entry, 0, { force: true, neutral: true }));
        } else {
            lastFrameAt = 0;
            entries.forEach(entry => { entry.dirty = true; });
            startLoop();
        }
    }

    document.addEventListener('visibilitychange', () => {
        const now = performance.now();
        if (document.hidden) {
            hiddenAt = now;
            stopLoop();
        } else {
            if (hiddenAt) hiddenDuration += now - hiddenAt;
            hiddenAt = 0;
            lastFrameAt = 0;
            startLoop();
        }
    });

    reducedMotion.addEventListener?.('change', handleReducedMotionChange);

    if ('ResizeObserver' in window) {
        const resizeObserver = new ResizeObserver(changed => {
            changed.forEach(({ target }) => {
                const entry = entries.find(candidate => candidate.canvas === target);
                if (entry) entry.dirty = true;
            });
            lastFrameAt = 0;
        });
        entries.forEach(entry => resizeObserver.observe(entry.canvas));
    }

    if (mainScreen) {
        new MutationObserver(() => setStarted()).observe(mainScreen, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    sourceImage.addEventListener('load', drawFallbackSafeInitialFrame, { once: true });
    sourceImage.src = 'site-images/links-tail-remake-alpha.png?v=2';
    if (sourceImage.complete && sourceImage.naturalWidth) drawFallbackSafeInitialFrame();
})();
