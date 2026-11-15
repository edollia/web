(() => {
    'use strict';
    const names = Object.freeze({
        snapchat: 'snapchat', instagram: 'instagram', kofi: 'kofi',
        solana: 'solana', telegram: 'telegram', email: 'email', x: 'x',
        tiktok: 'tiktok', twitch: 'twitch', discord: 'discord',
        onlyfans: 'onlyfans', spotify: 'spotify', throne_link: 'throne'
    });
    const defaults = Object.freeze(Object.fromEntries(
        Object.entries(names).map(([key, name]) => [`${key}_title`, name])
    ));
    function get(settings, key) {
        const value = settings?.[`${key}_title`];
        return (typeof value === 'string' ? value.trim().slice(0, 40) : '') || names[key];
    }
    function normalize(settings) {
        return Object.fromEntries(Object.keys(names).map(key => [`${key}_title`, get(settings, key)]));
    }
    window.DollSocialTitles = Object.freeze({ defaults, get, normalize });
})();
