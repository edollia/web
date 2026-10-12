(() => {
    'use strict';
    // Establish this independent tab before an installed app can intercept
    // the external URL. Cancelling its prompt must not navigate the site tab.
    const domains = ['snapchat.com', 't.me', 'telegram.me', 'telegram.org', 'twitch.tv'];
    let destination;
    try {
        destination = new URL(new URLSearchParams(location.search).get('to'));
        if (destination.protocol !== 'https:' || destination.username || destination.password
            || destination.port || !domains.some(domain => destination.hostname === domain
                || destination.hostname.endsWith('.' + domain))) throw new Error('Invalid destination');
    } catch (error) {
        document.querySelector('[role="status"]').remove();
        const home = document.getElementById('destination');
        home.href = './';
        home.textContent = 'back to doll.gg';
        home.hidden = false;
        return;
    }
    const link = document.getElementById('destination');
    link.href = destination.href;
    // Leave a usable destination if an app opens, or navigation is cancelled.
    window.setTimeout(() => { link.hidden = false; }, 1500);
    // Use a task rather than an animation frame: a background tab must also
    // continue the handoff without waiting to become visible.
    window.setTimeout(() => {
        location.replace(destination.href);
    }, 0);
})();
