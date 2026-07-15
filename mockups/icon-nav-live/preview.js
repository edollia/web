const variants = {
    glyphs: {
        kicker: "direction 01",
        title: "Paw-puff seals",
        copy: "Chunky, frosted shapes borrow the header's white outline, pink depth and paw-scallop rhythm. They are clearly buttons without falling back to circles.",
        details: [
            "As much presence as the current buttons",
            "Irregular cushion silhouette—not a circle",
            "Each action gets its own tiny illustration"
        ]
    },
    charms: {
        kicker: "direction 02",
        title: "Resin charms",
        copy: "Three glossy, translucent charms hang from the paw scallops like toy jewellery: a sparkle, a beribboned heart and a magic pencil star.",
        details: [
            "Pearl beads and asymmetric drops",
            "Real highlight, depth and candy color",
            "A small sway makes hover feel alive"
        ]
    },
    links: {
        kicker: "direction 03",
        title: "Character tabs",
        copy: "A kitten, bow bunny and doodle pup peek over three soft name tabs. This treats the actions as part of the site's little cast instead of generic interface symbols.",
        details: [
            "Strongest character-site identity",
            "Labels remain instantly readable",
            "Each mascot reacts on hover"
        ]
    }
};

const sharedPuffShape = `<path class="puff-edge" d="M45 5c7 0 10 7 16 8 6 2 12-2 17 3 5 5 1 11 3 17 2 6 8 8 6 15-2 7-10 7-14 12-4 5-2 13-9 16-6 3-12-3-19-2-7-1-13 5-19 2-7-3-5-11-9-16-4-5-12-5-14-12-2-7 4-9 6-15 2-6-2-12 3-17 5-5 11-1 17-3 6-1 9-8 16-8Z"/>`;

const iconMarkup = {
    socials: `
        <span class="preview-main-icon menu-main-icon" aria-hidden="true">
            <span class="preview-art preview-art-puff">
                <svg viewBox="0 0 90 82" focusable="false">
                    <defs><linearGradient id="social-puff" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2f9"/><stop offset=".5" stop-color="#ffd0e5"/><stop offset="1" stop-color="#ed9fc4"/></linearGradient></defs>
                    <g fill="url(#social-puff)">${sharedPuffShape}</g>
                    <path class="puff-shine" d="M25 20c8-7 20-9 29-5"/>
                    <path class="puff-symbol" d="M44 19c1 7 3 9 10 10-7 1-9 4-10 11-1-7-3-10-10-11 7-1 9-3 10-10Zm15 18c.5 4 2 5 6 6-4 .5-5.5 2-6 6-.7-4-2-5.5-6-6 4-.7 5.3-2 6-6ZM30 39c.5 3 1.5 4 4.5 4.5-3 .5-4 1.5-4.5 4.5-.5-3-1.5-4-4.5-4.5 3-.5 4-1.5 4.5-4.5Z"/>
                    <text class="puff-label" x="45" y="66">socials</text>
                </svg>
            </span>
            <span class="preview-art preview-art-charm">
                <svg viewBox="0 0 82 96" focusable="false">
                    <defs><linearGradient id="social-resin" x1=".2" y1=".1" x2=".8" y2=".9"><stop stop-color="#fff8fd"/><stop offset=".42" stop-color="#ffc6e1"/><stop offset="1" stop-color="#e784b4"/></linearGradient></defs>
                    <path class="charm-string" d="M41 0v18"/><circle class="charm-pearl" cx="41" cy="19" r="4"/>
                    <path class="resin-shape" fill="url(#social-resin)" d="m41 23 8 16 18 3-13 13 3 18-16-8-16 8 3-18-13-13 18-3 8-16Z"/>
                    <path class="resin-highlight" d="M30 42c4-7 10-10 17-8"/>
                    <path class="resin-symbol" d="M41 40c.6 5 2.3 6.6 7.3 7.3-5 .7-6.7 2.4-7.3 7.4-.8-5-2.4-6.7-7.4-7.4 5-.7 6.6-2.3 7.4-7.3Z"/>
                    <text class="charm-label" x="41" y="90">socials</text>
                </svg>
            </span>
            <span class="preview-art preview-art-character">
                <svg viewBox="0 0 96 82" focusable="false">
                    <path class="tab-shadow" d="M12 49h72v25H12z"/>
                    <path class="cat-ear" d="m27 35 2-20 15 11m25 9-2-20-15 11"/>
                    <path class="character-head" d="M28 39c0-15 9-23 20-23s20 8 20 23c0 12-8 19-20 19s-20-7-20-19Z"/>
                    <path class="character-face" d="M38 38v1m20-1v1M44 46c3 2 5 2 8 0M33 44l-8-2m9 7-8 2m37-7 8-2m-9 7 8 2"/>
                    <path class="character-blush" d="M32 45h6m20 0h6"/>
                    <path class="name-tab" d="M8 51c0-5 4-8 9-8h62c5 0 9 3 9 8v22c0 4-3 7-7 7H15c-4 0-7-3-7-7V51Z"/>
                    <text class="character-label" x="48" y="68">socials</text>
                </svg>
            </span>
        </span>`,
    wishlist: `
        <span class="preview-main-icon menu-main-icon" aria-hidden="true">
            <span class="preview-art preview-art-puff">
                <svg viewBox="0 0 90 82" focusable="false">
                    <defs><linearGradient id="wish-puff" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff8fc"/><stop offset=".48" stop-color="#f7cedf"/><stop offset="1" stop-color="#d9a4bd"/></linearGradient></defs>
                    <g fill="url(#wish-puff)">${sharedPuffShape}</g>
                    <path class="puff-shine" d="M25 20c8-7 20-9 29-5"/>
                    <path class="puff-symbol" d="M30 37h30v20H30zm-3-8h36v10H27zm18 0v28m-.5-28c-8 .5-14-2-14-7 0-3 3-5 6-4 4 1 7 6 8 11Zm1 0c8 .5 14-2 14-7 0-3-3-5-6-4-4 1-7 6-8 11Z"/>
                    <text class="puff-label" x="45" y="70">wishlist</text>
                </svg>
            </span>
            <span class="preview-art preview-art-charm">
                <svg viewBox="0 0 82 101" focusable="false">
                    <defs><linearGradient id="wish-resin" x1=".15" y1=".1" x2=".85" y2=".9"><stop stop-color="#fff8fd"/><stop offset=".4" stop-color="#f6c7da"/><stop offset="1" stop-color="#ce86a9"/></linearGradient></defs>
                    <path class="charm-string" d="M41 0v23"/><circle class="charm-pearl" cx="41" cy="24" r="4"/>
                    <path class="resin-shape" fill="url(#wish-resin)" d="M41 72S17 58 17 42c0-9 6-15 14-15 5 0 9 3 10 7 2-4 6-7 11-7 8 0 14 6 14 15 0 16-25 30-25 30Z"/>
                    <path class="resin-highlight" d="M25 39c2-5 6-7 11-7"/>
                    <path class="resin-symbol" d="M31 31c-6-8-13-6-12-1 1 5 8 7 18 7m14-6c6-8 13-6 12-1-1 5-8 7-18 7m-4-3v30"/>
                    <circle class="resin-knot" cx="41" cy="35" r="5"/>
                    <text class="charm-label" x="41" y="94">wishlist</text>
                </svg>
            </span>
            <span class="preview-art preview-art-character">
                <svg viewBox="0 0 96 82" focusable="false">
                    <path class="tab-shadow" d="M12 49h72v25H12z"/>
                    <path class="bunny-ear" d="M37 31C24 27 19 8 28 5c8-2 13 15 14 25m12 1C67 27 73 8 64 5c-8-2-13 15-14 25"/>
                    <path class="character-head" d="M28 41c0-14 9-22 20-22s20 8 20 22c0 11-8 18-20 18s-20-7-20-18Z"/>
                    <path class="character-face" d="M39 40v1m18-1v1M45 48c2 2 4 2 6 0"/>
                    <path class="character-blush" d="M33 46h6m18 0h6"/>
                    <path class="character-bow" d="M48 27c-7-7-13-5-12 1 1 5 6 6 12 3 6 3 11 2 12-3 1-6-5-8-12-1Z"/>
                    <circle class="bow-knot" cx="48" cy="29" r="3"/>
                    <path class="name-tab" d="M8 51c0-5 4-8 9-8h62c5 0 9 3 9 8v22c0 4-3 7-7 7H15c-4 0-7-3-7-7V51Z"/>
                    <text class="character-label" x="48" y="68">wishlist</text>
                </svg>
            </span>
        </span>`,
    create: `
        <span class="preview-main-icon menu-main-icon" aria-hidden="true">
            <span class="preview-art preview-art-puff">
                <svg viewBox="0 0 90 82" focusable="false">
                    <defs><linearGradient id="make-puff" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4fa"/><stop offset=".5" stop-color="#ffc7df"/><stop offset="1" stop-color="#e98ab8"/></linearGradient></defs>
                    <g fill="url(#make-puff)">${sharedPuffShape}</g>
                    <path class="puff-shine" d="M25 20c8-7 20-9 29-5"/>
                    <path class="puff-symbol" d="m29 51-2 8 8-2 23-23-6-6-23 23Zm18-18 6 6M31 19c.7 5 2.3 6.5 7 7.2-4.7.7-6.3 2.3-7 7-.8-4.7-2.4-6.3-7.2-7 4.8-.7 6.4-2.2 7.2-7.2Zm30 31c.5 3 1.5 4 4.5 4.5-3 .5-4 1.5-4.5 4.5-.5-3-1.5-4-4.5-4.5 3-.5 4-1.5 4.5-4.5Z"/>
                    <text class="puff-label" x="45" y="71">create</text>
                </svg>
            </span>
            <span class="preview-art preview-art-charm">
                <svg viewBox="0 0 82 96" focusable="false">
                    <defs><linearGradient id="make-resin" x1=".15" y1=".05" x2=".85" y2=".95"><stop stop-color="#fff8fd"/><stop offset=".4" stop-color="#ffbadb"/><stop offset="1" stop-color="#df71aa"/></linearGradient></defs>
                    <path class="charm-string" d="M41 0v17"/><circle class="charm-pearl" cx="41" cy="18" r="4"/>
                    <path class="resin-shape" fill="url(#make-resin)" d="M41 22c3 12 7 16 19 19-12 3-16 7-19 20-3-13-7-17-19-20 12-3 16-7 19-19Z"/>
                    <path class="resin-highlight" d="M32 36c2-5 5-7 9-8"/>
                    <path class="resin-symbol" d="m34 52-4 14 14-4 18-18-10-10-18 18Zm14-14 10 10"/>
                    <text class="charm-label" x="41" y="88">create</text>
                </svg>
            </span>
            <span class="preview-art preview-art-character">
                <svg viewBox="0 0 96 82" focusable="false">
                    <path class="tab-shadow" d="M12 49h72v25H12z"/>
                    <path class="pup-ear" d="M31 28C20 26 18 13 23 10c6-4 13 8 15 17m27 1c11-2 13-15 8-18-6-4-13 8-15 17"/>
                    <path class="character-head" d="M28 40c0-14 9-22 20-22s20 8 20 22c0 12-8 19-20 19s-20-7-20-19Z"/>
                    <path class="character-face" d="M39 39v1m18-1v1M44 46c3 3 5 3 8 0"/>
                    <path class="character-blush" d="M33 45h6m18 0h6"/>
                    <path class="tiny-pencil" d="m58 27 9-9 4 4-9 9-5 1 1-5Z"/>
                    <path class="name-tab" d="M8 51c0-5 4-8 9-8h62c5 0 9 3 9 8v22c0 4-3 7-7 7H15c-4 0-7-3-7-7V51Z"/>
                    <text class="character-label" x="48" y="68">create</text>
                </svg>
            </span>
        </span>`
};

const preview = document.getElementById("site-preview");
const tabs = [...document.querySelectorAll(".variant-tab")];
const noteKicker = document.getElementById("note-kicker");
const noteTitle = document.getElementById("note-title");
const noteCopy = document.getElementById("note-copy");
const noteDetails = document.getElementById("note-details");
let selectedVariant = new URLSearchParams(window.location.search).get("variant") || "glyphs";

if (!variants[selectedVariant]) {
    selectedVariant = "glyphs";
}

function insertPreviewIcons(doc) {
    const buttons = [
        [doc.getElementById("socials-button"), iconMarkup.socials],
        [doc.getElementById("support-menu-button"), iconMarkup.wishlist],
        [doc.getElementById("action-menu-button"), iconMarkup.create]
    ];

    buttons.forEach(([button, markup]) => {
        if (!button || button.querySelector(".preview-main-icon")) return;
        button.querySelector(":scope > .menu-main-icon")?.classList.add("preview-original-icon");
        button.insertAdjacentHTML("afterbegin", markup);
    });
}

function preparePreview() {
    const doc = preview.contentDocument;
    if (!doc?.body) return;

    if (!doc.getElementById("icon-nav-variant-styles")) {
        const stylesheet = doc.createElement("link");
        stylesheet.id = "icon-nav-variant-styles";
        stylesheet.rel = "stylesheet";
        stylesheet.href = "/mockups/icon-nav-live/variants.css";
        doc.head.append(stylesheet);
    }

    insertPreviewIcons(doc);

    const suppressLiveOverlays = () => {
        doc.body.classList.add("site-links-ready");
        doc.body.classList.remove("site-maintenance-active", "first-visit-tour-active");
        doc.querySelectorAll(".first-visit-tour").forEach(tour => tour.remove());
    };

    suppressLiveOverlays();
    new MutationObserver(suppressLiveOverlays).observe(doc.body, {
        attributes: true,
        attributeFilter: ["class"],
        childList: true
    });
    doc.getElementById("main-screen")?.classList.add("ui-ready", "note-ready");

    const wishlist = doc.getElementById("support-menu-button");
    wishlist?.addEventListener("click", event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        wishlist.classList.remove("preview-pressed");
        void wishlist.offsetWidth;
        wishlist.classList.add("preview-pressed");
        window.setTimeout(() => wishlist.classList.remove("preview-pressed"), 420);
    }, true);

    applyVariant(selectedVariant, false);
}

function applyVariant(name, updateUrl = true) {
    selectedVariant = variants[name] ? name : "glyphs";
    const content = variants[selectedVariant];

    tabs.forEach(tab => {
        const selected = tab.dataset.variant === selectedVariant;
        tab.classList.toggle("is-selected", selected);
        tab.setAttribute("aria-pressed", String(selected));
    });

    noteKicker.textContent = content.kicker;
    noteTitle.textContent = content.title;
    noteCopy.textContent = content.copy;
    noteDetails.replaceChildren(...content.details.map(detail => {
        const item = document.createElement("li");
        item.textContent = detail;
        return item;
    }));

    if (preview.contentDocument?.body) {
        preview.contentDocument.body.dataset.iconNavMockup = selectedVariant;
        preview.contentDocument.querySelectorAll(".support-menu-button.open").forEach(button => button.classList.remove("open"));
    }

    if (updateUrl) {
        const url = new URL(window.location.href);
        url.searchParams.set("variant", selectedVariant);
        window.history.replaceState({}, "", url);
    }
}

tabs.forEach(tab => tab.addEventListener("click", () => applyVariant(tab.dataset.variant)));
preview.addEventListener("load", preparePreview);
applyVariant(selectedVariant, false);
