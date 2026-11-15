(() => {
    'use strict';
    const defaults = Object.freeze({
        solana_enabled: false,
        solana_wallet_address: '',
        solana_heading: 'a little SOL for me ♡',
        solana_caption: 'send a little SOL'
    });
    function isValidAddress(value) {
        if (typeof value !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
        const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
        let number = 0n;
        for (const letter of value) number = number * 58n + BigInt(alphabet.indexOf(letter));
        let bytes = 0;
        while (number) { bytes++; number >>= 8n; }
        return bytes + value.match(/^1*/)[0].length === 32;
    }
    function normalize(value = {}) {
        const source = value && typeof value === 'object' ? value : {};
        const text = (key, max) => (typeof source[key] === 'string' ? source[key].trim() : '').slice(0, max) || defaults[key];
        return {
            solana_enabled: source.solana_enabled === true || source.solana_enabled === 'true',
            solana_wallet_address: typeof source.solana_wallet_address === 'string' ? source.solana_wallet_address.trim().slice(0, 128) : '',
            solana_heading: text('solana_heading', 32),
            solana_caption: text('solana_caption', 60)
        };
    }
    window.DollSolana = Object.freeze({ defaults, isValidAddress, normalize });
})();
