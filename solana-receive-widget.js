(() => {
    'use strict';
    const placeholder = 'your Solana wallet address';
    const copyGlyph = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="6" y="6" width="10" height="11" rx="2"/><path d="M12 6V4c0-1-.5-2-2-2H4c-1 0-2 .5-2 2v7c0 1 .5 2 2 2h2"/></svg>';
    const tickGlyph = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-9"/></svg>';
    const heart = '<svg viewBox="0 0 20 20"><path d="M10 17C5 13 1.5 10 2 6.5 2.7 2 7.5 2 10 5c2.5-3 7.3-3 8 1.5.5 3.5-3 6.5-8 10.5Z" fill="var(--heart-fill)" stroke="var(--heart-line)" stroke-width="1.1"/></svg>';
    let state = window.DollSolana.normalize(), dialog, copy, opener, preview = false, resetTimer = 0, copyGeneration = 0, scrollState;
    const particles = new Set();
    const isConfigured = () => window.DollSolana.isValidAddress(state.solana_wallet_address);
    function cleanupHearts() {
        for (const particle of particles) { particle.getAnimations().forEach(a => a.cancel()); particle.remove(); }
        particles.clear();
    }
    function resetCopy() {
        if (!copy) return;
        copy.classList.remove('is-copied', 'is-error');
        copy.querySelector('.solana-copy-status').textContent = '';
        copy.querySelector('.solana-copy-glyph').innerHTML = copyGlyph;
    }
    function update() {
        copyGeneration++; clearTimeout(resetTimer); cleanupHearts(); resetCopy();
        if (!dialog) return;
        const configured = isConfigured();
        copy.querySelector('.solana-wallet-value').textContent = configured ? state.solana_wallet_address : placeholder;
        const payload = configured ? 'solana:' + state.solana_wallet_address : 'DESIGN PREVIEW ONLY - no receiving wallet configured.';
        const qr = window.qrcode(0, 'M'); qr.addData(payload); qr.make();
        const code = dialog.querySelector('.solana-code'); code.dataset.payload = payload;
        code.innerHTML = qr.createSvgTag({ cellSize:4, margin:16, scalable:true });
        code.querySelector('svg').setAttribute('role', 'img');
        code.querySelector('svg').setAttribute('aria-label', configured ? 'Scan to send SOL' : 'Demo QR code');
        if (dialog.open && !preview && (!state.solana_enabled || !configured)) close();
    }
    function burst(event) {
        if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
        const box = copy.getBoundingClientRect();
        const x = event.clientX > box.left && event.clientX < box.right ? event.clientX : box.left + box.width * .75;
        const y = event.clientY > box.top && event.clientY < box.bottom ? event.clientY : box.top + box.height / 2;
        while (particles.size > 12) { const old = particles.values().next().value; old.getAnimations().forEach(a => a.cancel()); old.remove(); particles.delete(old); }
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('span'); particle.className = 'solana-copy-heart'; particle.setAttribute('aria-hidden', 'true'); particle.innerHTML = heart;
            const angle = (-170 + i * 30 + Math.random() * 12) * Math.PI / 180;
            const distance = 36 + Math.random() * 44, dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance - 25;
            const size = 7 + Math.random() * 8, rotation = (Math.random() - .5) * 65;
            const dialogBox = dialog.getBoundingClientRect();
            particle.style.cssText = `left:${x-dialogBox.left}px;top:${y-dialogBox.top}px;width:${size}px;height:${size}px;--heart-fill:${i%3?'#f9c4df':'#fff6fb'};--heart-line:${i%2?'#db8bb5':'#e4a3c5'};`;
            dialog.append(particle); particles.add(particle);
            const animation = particle.animate([
                { opacity:0, transform:'translate(-50%,-50%) scale(.25) rotate(0deg)' },
                { offset:.2, opacity:1, transform:`translate(calc(-50% + ${dx*.25}px),calc(-50% + ${dy*.35}px)) scale(1) rotate(${rotation*.4}deg)` },
                { offset:.7, opacity:.85, transform:`translate(calc(-50% + ${dx*.85}px),calc(-50% + ${dy}px)) scale(.95) rotate(${rotation}deg)` },
                { opacity:0, transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy+16}px)) scale(.4) rotate(${rotation+20}deg)` }
            ], { duration:650+Math.random()*250, delay:i*9, easing:'cubic-bezier(.15,.6,.3,1)', fill:'both' });
            animation.onfinish = () => { particles.delete(particle); particle.remove(); };
        }
    }
    async function copyAddress(event) {
        event.stopPropagation();
        const generation = copyGeneration;
        const value = isConfigured() ? state.solana_wallet_address : placeholder;
        try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
            else {
                const input = document.createElement('textarea'); input.value = value; input.style.cssText = 'position:fixed;left:-9999px;font-size:16px;'; dialog.append(input);
                let copied = false;
                try { input.select(); copied = document.execCommand('copy'); }
                finally { input.remove(); if (dialog.open) copy.focus({ preventScroll:true }); }
                if (!copied) throw new Error('Copy unavailable');
            }
            if (!dialog.open || generation !== copyGeneration) return;
            clearTimeout(resetTimer); copy.classList.remove('is-copied', 'is-error'); void copy.offsetWidth; copy.classList.add('is-copied');
            copy.querySelector('.solana-copy-status').textContent = 'copied ♡'; copy.querySelector('.solana-copy-glyph').innerHTML = tickGlyph; burst(event);
            resetTimer = setTimeout(resetCopy, 1700);
        } catch {
            if (!dialog.open || generation !== copyGeneration) return;
            clearTimeout(resetTimer); copy.classList.remove('is-copied'); copy.classList.add('is-error');
            copy.querySelector('.solana-copy-glyph').innerHTML = copyGlyph;
            copy.querySelector('.solana-copy-status').textContent = 'couldn’t copy';
            const range = document.createRange(); range.selectNodeContents(copy.querySelector('.solana-wallet-value'));
            const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
            resetTimer = setTimeout(resetCopy, 3000);
        }
    }
    function unlockScroll() {
        if (!scrollState) return;
        document.body.style.overflow = scrollState.body;
        document.documentElement.style.overflow = scrollState.html;
        scrollState = null;
    }
    function close() {
        if (!dialog) return;
        copyGeneration++; clearTimeout(resetTimer); cleanupHearts(); resetCopy();
        if (dialog.open) dialog.close();
        unlockScroll();
    }
    function mount() {
        if (dialog) return;
        dialog = document.createElement('dialog'); dialog.className = 'solana-sheet'; dialog.setAttribute('aria-label', 'Solana receiving address'); dialog.tabIndex = -1;
        dialog.innerHTML = `<button type="button" class="solana-sheet-close" aria-label="Close Solana"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="m3 3 10 10M13 3 3 13"/></svg></button><div class="solana-code-paper"><div class="solana-code"></div></div><button type="button" class="solana-copy" aria-label="Copy Solana wallet address"><span class="solana-wallet-value"></span><span class="solana-copy-glyph" aria-hidden="true">${copyGlyph}</span><span class="solana-copy-status" role="status" aria-live="polite"></span></button>`;
        document.body.append(dialog); copy = dialog.querySelector('.solana-copy'); copy.addEventListener('click', copyAddress);
        dialog.querySelector('.solana-sheet-close').addEventListener('click', close);
        dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
        dialog.addEventListener('click', event => { if (event.target !== dialog) return; const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close(); });
        dialog.addEventListener('close', () => {
            if (dialog.open) return;
            copyGeneration++; clearTimeout(resetTimer); cleanupHearts(); resetCopy(); unlockScroll();
            if (opener?.isConnected && !opener.closest('[inert]') && opener.getClientRects().length) opener.focus({ preventScroll:true });
        });
        document.addEventListener('keydown', event => {
            if (!dialog.open) return;
            if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close(); return; }
            if (event.key === 'Tab') {
                const first = dialog.querySelector('.solana-sheet-close'), last = copy;
                if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus({ preventScroll:true }); }
                else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus({ preventScroll:true }); }
            }
        }, true);
    }
    function configure(settings) {
        state = window.DollSolana.normalize(settings);
        update();
    }
    function open(trigger, options = {}) {
        preview = options.preview === true;
        if ((!preview && (!state.solana_enabled || !isConfigured())) || typeof window.qrcode !== 'function') return false;
        mount(); update(); if (dialog.open) return true;
        opener = trigger instanceof HTMLElement ? trigger : document.activeElement;
        scrollState = { body:document.body.style.overflow, html:document.documentElement.style.overflow };
        document.body.style.overflow = 'hidden'; document.documentElement.style.overflow = 'hidden';
        dialog.showModal(); dialog.focus({ preventScroll:true }); return true;
    }
    window.addEventListener('pagehide', close);
    window.DollSolanaReceive = Object.freeze({ configure, open, close });
})();
