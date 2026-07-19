/*
 * Social-card background hosting switch.
 *
 * Current mode: GitHub Pages / same-origin files from this repository.
 * Supabase URL/path settings, Storage objects, upload code, and SQL are kept
 * intact but intentionally ignored while this mode is "github".
 *
 * See SOCIAL_CARD_MEDIA_RESTORATION.md before changing this file.
 */
window.DOLL_SOCIAL_CARD_MEDIA = Object.freeze({
    mode: 'github',
    localVideos: Object.freeze({
        snapchat: 'snapchat-1784102765481-7fb97d0c-c389-4352-a44b-bc59182d0d14.mp4?v=2',
        instagram: 'instagram-1784157862017-5c21bdee-1cdb-49d4-b6fb-8ff7d571a618.mp4?v=2',
        kofi: 'kofi-1784080551947-443af2fb-e7a3-49ee-a4cc-488a5acdeb37.mp4?v=2',
        telegram: 'telegram-1784148350733-7a473db5-d8ee-4b22-a548-646280fcb89c-2.mp4?v=2'
    })
});
