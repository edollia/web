/* config */

const kofiWidgetOverlayConfig = {
    'floating-chat.core.pageId': '',
    'floating-chat.core.closer': '&times;',
    'floating-chat.core.position.bottom-left': 'position: fixed; bottom: 50px; left: 10px; width: 160px; height: 65px;',

    'floating-chat.cssId': '',
    'floating-chat.notice.text': 'ko-fi.com/%HANDLE%',
    'floating-chat.donatebutton.image': 'https://storage.ko-fi.com/cdn/cup-border.png',
    'floating-chat.donateButton.background-color': '#00b9fe',
    'floating-chat.donateButton.text': 'Support me',
    'floating-chat.donateButton.text-color': '#fff',
    'floating-chat.stylesheets': '["https://fonts.googleapis.com/css?family=Nunito:400,700,800&display=swap"]',
};

var kofiWidgetOverlayFloatingChatBuilder = kofiWidgetOverlayFloatingChatBuilder || function (config, _utils) {

    const _configManager = _utils.getConfigManager(config);
    const _myType = 'floating-chat';
    const _topContainerWrapClass = 'floatingchat-container-wrap';
    const _topMobiContainerWrapClass = 'floatingchat-container-wrap-mobi';

    var widgetPageLoadInitiatedStates = [];

    var closeButtonActionBlocked = false;
   
    function getButtonId() {
        return `${_configManager.getValue(_myType, 'cssId')}-donate-button`;
    };

    function getContainerFrameId() {
        return 'kofi-wo-container' + _configManager.getValue(_myType, 'cssId');
    };

    function getMobiContainerFrameId() {
        return 'kofi-wo-container-mobi' + _configManager.getValue(_myType, 'cssId');
    };

    function getButtonImageId() {
        return `${_configManager.getValue(_myType, 'cssId')}-donate-button-image`
    };

    function createButtonContainerIframe(iframeId, mainStyleSheetFile) {

        var htmlBody = getHtml();
        var buttonBody = '<html>' +
            '<head>' +
            `<link rel="preconnect" href="https://ko-fi.com/">` +
            `<link rel="dns-prefetch" href="https://ko-fi.com/">` +
            `<link rel="preconnect" href="https://storage.ko-fi.com/">` +
            `<link rel="dns-prefetch" href="https://storage.ko-fi.com/">` +
            `<link href="${mainStyleSheetFile}" rel="stylesheet" type="text/css" />` +
            `</head>` +
            `<body style="margin: 0; position: absolute; bottom: 0;">${htmlBody}</body>` +
            '</html>';

        var iframeContainerElement = document.getElementById(iframeId).contentDocument;
        var iframe = document.getElementById(iframeId);

        var _timer = setInterval(function () {

            //delay the display of the button, so that the stylesheets get time to load
            //the stylesheet load event does not appear to work reliably
            //on safari on iOS
            var doc = iframe.contentDocument || iframe.contentWindow;
            if (doc && doc.readyState == 'complete') {
                clearInterval(_timer);

                var parentWrapper = document.getElementsByClassName(_topContainerWrapClass)[0];
                var mobiParentWrapper = document.getElementsByClassName(_topMobiContainerWrapClass)[0];

                // HIDE THE DEFAULT BUTTON - Set opacity to 0 and pointer-events to none
                if (parentWrapper) {
                    parentWrapper.style = 'z-index:10000; opacity:0; pointer-events:none; height: 0px;';
                }
                if (mobiParentWrapper) {
                    mobiParentWrapper.style = 'z-index:10000; opacity:0; pointer-events:none; height: 0px;';
                }

                iframe.style = 'opacity:0; pointer-events:none; height: 0px;';
            }
        }, 300);

        iframeContainerElement.write(buttonBody);
        iframeContainerElement.close();

        return iframeContainerElement;
    };

    function attachDonateButton(iframeContainerElement, iframeId, selectors, heightLimits) {

        const donateButton = iframeContainerElement.getElementById(`${getButtonId()}`);
        if (donateButton) {
            donateButton.addEventListener('click',
                function () {
                    if (donateButton.classList.contains("closed")) {
                        activateKofiIframe(iframeId, selectors, heightLimits);
                    } else if (!closeButtonActionBlocked) {
                        var popupId = _configManager.getValue(_myType, 'cssId') + `-${selectors.popupId}`;
                        var popup = document.getElementById(popupId);
                        closePopup(popup, donateButton);
                    }
                });
        }

        return donateButton;
    };

    var write = function (parentElementId) {

        var docHead = document.head;
        if (!docHead) {
            docHead = document.createElement('head');
            document.prepend(docHead);
        }

        var iframeId = getContainerFrameId();
        var mobiIframeId = getMobiContainerFrameId();


        var iframeHtml = `<div class="${_topContainerWrapClass}" style="height: 0px; transition: all 0.3s ease 0s; opacity:0; pointer-events:none;">` +
            `<iframe class="floatingchat-container" style="height: 0px; transition: all 0.6s ease 0s; opacity:0; pointer-events:none;" id="${iframeId}"></iframe>` +
            '</div>' +
            `<div class="${_topMobiContainerWrapClass}" style="height: 0px; transition: all 0.6s ease 0s; opacity:0; pointer-events:none;">` +
            `<iframe class="floatingchat-container-mobi" style="height: 0px; transition: all 0.6s ease 0s; opacity:0; pointer-events:none;" id="${mobiIframeId}"></iframe>` +
            '</div>';

        var existingPlaceHolder = document.getElementById(parentElementId);
        existingPlaceHolder.innerHTML = iframeHtml;

        var iframeContainerElement = createButtonContainerIframe(iframeId, 'https://storage.ko-fi.com/cdn/scripts/floating-chat-main.css');
        var mobiIframeContainerElement = createButtonContainerIframe(mobiIframeId, 'https://storage.ko-fi.com/cdn/scripts/floating-chat-main.css');

         _utils.loadStyleSheet('https://storage.ko-fi.com/cdn/scripts/floating-chat-wrapper.css', document);
        var styleSheetsValue = _configManager.getValue(_myType, 'stylesheets');

        if ('' !== styleSheetsValue) {

            styleSheets = JSON.parse(styleSheetsValue);

            styleSheets.forEach(stylesheetRef => {
                _utils.loadStyleSheet(stylesheetRef, document);
                _utils.loadStyleSheet(stylesheetRef, iframeContainerElement);
                _utils.loadStyleSheet(stylesheetRef, mobiIframeContainerElement);
            });
        }

        var desktopDonateButton = attachDonateButton(iframeContainerElement, iframeId, {
            popupId: 'kofi-popup-iframe',
            popupIframeContainerIdSuffix: 'popup-iframe-container'
        }, { maxHeight: 690, minHeight: 400, });
        widgetPageLoadInitiatedStates.push([desktopDonateButton, false]);
        var mobileDonateButton = attachDonateButton(mobiIframeContainerElement, mobiIframeId, {
            popupId: 'kofi-popup-iframe-mobi',
            popupIframeContainerIdSuffix: 'popup-iframe-container-mobi'
        }, { maxHeight: 690, minHeight: 350 });
        widgetPageLoadInitiatedStates.push([mobileDonateButton, false]);

        // Already create the widget popup iframe (hidden)
        insertPopupHtmlIntoBody(desktopDonateButton, {
            popupId: 'kofi-popup-iframe',
            popupClass: 'floating-chat-kofi-popup-iframe',
            noticeClass: 'floating-chat-kofi-popup-iframe-notice',
            closerClass: 'floating-chat-kofi-popup-iframe-closer',
            popupIframeContainerClass: 'floating-chat-kofi-popup-iframe-container',
            popupIframeContainerIdSuffix: 'popup-iframe-container',
            popuupKofiIframeHeightOffset: 42
        }, parentElementId);

        insertPopupHtmlIntoBody(mobileDonateButton, {
            popupId: 'kofi-popup-iframe-mobi',
            popupClass: 'floating-chat-kofi-popup-iframe-mobi',
            noticeClass: 'floating-chat-kofi-popup-iframe-notice-mobi',
            closerClass: 'floating-chat-kofi-popup-iframe-closer-mobi',
            popupIframeContainerClass: 'floating-chat-kofi-popup-iframe-container-mobi',
            popupIframeContainerIdSuffix: 'popup-iframe-container-mobi',
            popuupKofiIframeHeightOffset: 100
        }, parentElementId);
        
        // Set up global function to open overlay after widget is initialized
        setTimeout(function() {
            window.openKofiOverlay = function() {
                showKofiScrim();
                var iframeId = getContainerFrameId();
                var mobiIframeId = getMobiContainerFrameId();
                
                // Try desktop first
                var iframe = document.getElementById(iframeId);
                if (iframe && iframe.contentDocument) {
                    try {
                        activateKofiIframe(iframeId, {
                            popupId: 'kofi-popup-iframe',
                            popupIframeContainerIdSuffix: 'popup-iframe-container'
                        }, { maxHeight: 690, minHeight: 400 });
                        return;
                    } catch(e) {
                        // Try mobile if desktop fails
                    }
                }
                
                // Try mobile
                var mobiIframe = document.getElementById(mobiIframeId);
                if (mobiIframe && mobiIframe.contentDocument) {
                    try {
                        activateKofiIframe(mobiIframeId, {
                            popupId: 'kofi-popup-iframe-mobi',
                            popupIframeContainerIdSuffix: 'popup-iframe-container-mobi'
                        }, { maxHeight: 690, minHeight: 350 });
                    } catch(e) {
                        hideKofiScrim();
                        console.error('Error opening Ko-fi overlay:', e);
                    }
                }
            };

            window.closeKofiOverlay = function() {
                var iframeId = getContainerFrameId();
                var mobiIframeId = getMobiContainerFrameId();
                var closeDesktop = function() {
                    var iframe = document.getElementById(iframeId);
                    if (!iframe || !iframe.contentDocument) return false;
                    var donateButton = iframe.contentDocument.getElementById(`${getButtonId()}`);
                    var popup = document.getElementById(`${_configManager.getValue(_myType, 'cssId')}-kofi-popup-iframe`);
                    if (!donateButton || !popup || donateButton.classList.contains('closed')) return false;
                    closePopup(popup, donateButton);
                    return true;
                };
                var closeMobile = function() {
                    var iframe = document.getElementById(mobiIframeId);
                    if (!iframe || !iframe.contentDocument) return false;
                    var donateButton = iframe.contentDocument.getElementById(`${getButtonId()}`);
                    var popup = document.getElementById(`${_configManager.getValue(_myType, 'cssId')}-kofi-popup-iframe-mobi`);
                    if (!donateButton || !popup || donateButton.classList.contains('closed')) return false;
                    closePopup(popup, donateButton);
                    return true;
                };

                closeDesktop() || closeMobile();
                hideKofiScrim();
            };
        }, 500);
    };

    function activateKofiIframe(iframeId, selectors, heightLimits) {

        var iframeContainerElement = document.getElementById(iframeId).contentDocument;

        const donateButton = iframeContainerElement.getElementById(`${getButtonId()}`);
        const kofiIframeState = donateButton.classList.contains('closed') ? 'open' : 'close';
        toggleKofiIframe(iframeId, kofiIframeState, donateButton, selectors, heightLimits);
    };


    function updateClass(element, oldClass, newClass) {

        if (oldClass !== '') {
            element.classList.remove(oldClass);
        }

        if (newClass !== '') {
            element.classList.add(newClass);
        }
    };

    function slidePopupOpen(popup, finalHeight) {
        var displayHeight = Math.min(Math.round(finalHeight * 1.4), Math.round(window.innerHeight * 0.94));
        var topOffset = 0;
        popup.dataset.kofiTopOffset = topOffset;
        popup.style = `z-index:10000;position:fixed!important;top:calc(50% + ${topOffset}px)!important;left:50%!important;right:auto!important;bottom:auto!important;width:328px!important;height:${displayHeight}px!important;max-height:92vh!important;transform:translate(-50%, -50%) scale(0.7)!important;transform-origin:center center!important;transition:height 0.5s ease, opacity 0.3s linear; opacity:1;`;
        var noticeMobi = document.getElementsByClassName("floating-chat-kofi-popup-iframe-notice-mobi")[0];
        var notice = document.getElementsByClassName("floating-chat-kofi-popup-iframe-notice")[0];
        if (noticeMobi) noticeMobi.style.display = "block";
        if (notice) notice.style.display = "block";
    };

    function closePopup(popup, donateButton) {
        // ar popup = document.getElementById(popupId);
        var topOffset = popup.dataset.kofiTopOffset || 0;
        popup.style = `z-index:10000;position:fixed!important;top:calc(50% + ${topOffset}px)!important;left:50%!important;right:auto!important;bottom:auto!important;width:328px!important;height:0px!important;transform:translate(-50%, -50%) scale(0.7)!important;transform-origin:center center!important;transition:height 0.3s ease 0s, opacity 0.3s linear; opacity:0;`;
        updateClass(donateButton, 'open', 'closed');
        var noticeMobi = document.getElementsByClassName("floating-chat-kofi-popup-iframe-notice-mobi")[0];
        var notice = document.getElementsByClassName("floating-chat-kofi-popup-iframe-notice")[0];
        if (noticeMobi) noticeMobi.style.display = "none";
        if (notice) notice.style.display = "none";
        hideKofiScrim();
    }

    function ensureKofiScrim() {
        var scrim = document.getElementById('doll-kofi-scrim');
        if (scrim) return scrim;

        scrim = document.createElement('div');
        scrim.id = 'doll-kofi-scrim';
        scrim.style = 'position:fixed!important;inset:0!important;z-index:9999!important;opacity:0!important;pointer-events:none!important;background:radial-gradient(circle at 50% 44%, rgba(255,214,235,0.72), transparent 34%), rgba(255,247,251,0.3)!important;backdrop-filter:blur(0px)!important;-webkit-backdrop-filter:blur(0px)!important;transition:opacity 0.5s ease, backdrop-filter 0.55s ease, -webkit-backdrop-filter 0.55s ease!important;';
        scrim.addEventListener('click', function() {
            if (typeof window.closeKofiOverlay === 'function') window.closeKofiOverlay();
        });
        document.body.appendChild(scrim);
        return scrim;
    }

    function showKofiScrim() {
        var scrim = ensureKofiScrim();
        document.body.classList.add('has-kofi-overlay-open');
        scrim.style.setProperty('pointer-events', 'auto', 'important');
        window.requestAnimationFrame(function() {
            scrim.style.setProperty('opacity', '1', 'important');
            scrim.style.setProperty('backdrop-filter', 'blur(9px)', 'important');
            scrim.style.setProperty('-webkit-backdrop-filter', 'blur(9px)', 'important');
        });
    }

    function hideKofiScrim() {
        var scrim = document.getElementById('doll-kofi-scrim');
        document.body.classList.remove('has-kofi-overlay-open');
        if (!scrim) return;
        scrim.style.setProperty('opacity', '0', 'important');
        scrim.style.setProperty('backdrop-filter', 'blur(0px)', 'important');
        scrim.style.setProperty('-webkit-backdrop-filter', 'blur(0px)', 'important');
        window.setTimeout(function() {
            if (scrim.style.opacity === '0') {
                scrim.style.setProperty('pointer-events', 'none', 'important');
            }
        }, 520);
    }

    function injectKofiOrnamentStyle() {
        if (document.getElementById('doll-kofi-ornament-style')) return;

        var style = document.createElement('style');
        style.id = 'doll-kofi-ornament-style';
        style.textContent = `
            .doll-kofi-ornaments span,
            .doll-kofi-ornaments i {
                position: absolute;
                display: block;
                pointer-events: none;
                opacity: 0.62;
                will-change: transform, opacity;
            }

            body.has-kofi-overlay-open {
                overflow: hidden;
            }

            .doll-kofi-ornaments::before {
                content: "";
                position: absolute;
                inset: 0;
                border: 8px solid transparent;
                border-radius: 22px;
                background:
                    linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,205,232,0.54), rgba(255,255,255,0.78), rgba(255,174,218,0.42)) border-box;
                box-shadow:
                    inset 0 0 14px rgba(255,255,255,0.82),
                    inset 0 0 24px rgba(255,166,214,0.42),
                    0 0 16px rgba(255,203,229,0.26);
                -webkit-mask:
                    linear-gradient(#000 0 0) padding-box,
                    linear-gradient(#000 0 0);
                -webkit-mask-composite: xor;
                mask:
                    linear-gradient(#000 0 0) padding-box,
                    linear-gradient(#000 0 0);
                mask-composite: exclude;
                pointer-events: none;
            }

            .doll-kofi-ornaments span {
                width: var(--bubble-size);
                height: var(--bubble-size);
                border-radius: 999px;
                background:
                    radial-gradient(circle at 32% 28%, rgba(255,255,255,0.94) 0 16%, transparent 18%),
                    radial-gradient(circle at 68% 72%, rgba(255,168,214,0.28), rgba(255,236,247,0.15));
                border: 1px solid rgba(255,165,211,0.36);
                box-shadow: inset 0 1px 8px rgba(255,255,255,0.72), 0 10px 24px rgba(221,91,158,0.12);
                animation: dollKofiBubbleFloat var(--bubble-speed) ease-in-out infinite alternate;
            }

            .doll-kofi-ornaments span:nth-child(1) { --bubble-size: 58px; --bubble-speed: 3.87s; left: -16px; top: 18%; }
            .doll-kofi-ornaments span:nth-child(2) { --bubble-size: 28px; --bubble-speed: 3.07s; right: 18px; top: 22%; }
            .doll-kofi-ornaments span:nth-child(3) { --bubble-size: 44px; --bubble-speed: 4.67s; right: -10px; bottom: 20%; }
            .doll-kofi-ornaments span:nth-child(4) { --bubble-size: 22px; --bubble-speed: 3.47s; left: 24px; bottom: 14%; }

            .doll-kofi-ornaments i {
                width: 18px;
                height: 18px;
                transform: rotate(45deg);
                background: linear-gradient(135deg, rgba(255,142,199,0.54), rgba(255,221,241,0.74));
                border-radius: 6px 6px 3px 6px;
                filter: drop-shadow(0 8px 12px rgba(209,78,144,0.16));
                animation: dollKofiHeartDrift var(--heart-speed) ease-in-out infinite alternate;
            }

            .doll-kofi-ornaments i::before,
            .doll-kofi-ornaments i::after {
                content: "";
                position: absolute;
                width: 18px;
                height: 18px;
                border-radius: 999px;
                background: inherit;
            }

            .doll-kofi-ornaments i::before { left: -9px; top: 0; }
            .doll-kofi-ornaments i::after { left: 0; top: -9px; }

            .doll-kofi-ornaments i:nth-of-type(1) { --heart-speed: 3.67s; left: 14px; top: 46%; opacity: 0.42; }
            .doll-kofi-ornaments i:nth-of-type(2) { --heart-speed: 4.27s; right: 38px; bottom: 8%; opacity: 0.48; transform: rotate(45deg) scale(0.78); }
            .doll-kofi-ornaments i:nth-of-type(3) { --heart-speed: 3.2s; right: 74px; top: 10%; opacity: 0.34; transform: rotate(45deg) scale(0.62); }

            @keyframes dollKofiBubbleFloat {
                from { transform: translate3d(0, 0, 0) scale(1); opacity: 0.42; }
                to { transform: translate3d(8px, -18px, 0) scale(1.08); opacity: 0.72; }
            }

            @keyframes dollKofiHeartDrift {
                from { translate: 0 0; }
                to { translate: -8px -16px; }
            }
        `;
        document.head.appendChild(style);
    }

    function insertPopupHtmlIntoBody(donateButton, selectors, parentElementId) {
        injectKofiOrnamentStyle();
        var popupId = _configManager.getValue(_myType, 'cssId') + `-${selectors.popupId}`;

        var popup = document.createElement('div');
        popup.id = popupId;
        popup.classList = selectors.popupClass;
        popup.style = `z-index:10000;height: 0px; width:0px; opacity: 0; transition: all 0.6s ease 0s;`;

        if (parentElementId) {
            document.getElementById(parentElementId).appendChild(popup);
        }
        else {
            document.body.appendChild(popup);
        }

        var ornaments = document.createElement('div');
        ornaments.className = 'doll-kofi-ornaments';
        ornaments.setAttribute('aria-hidden', 'true');
        ornaments.style = 'position:absolute!important;inset:0!important;overflow:hidden!important;border-radius:22px!important;pointer-events:none!important;z-index:4!important;';
        ornaments.innerHTML = '<span></span><span></span><span></span><span></span><i></i><i></i><i></i>';
        popup.appendChild(ornaments);

        var notice = document.createElement('div');
        notice.classList = selectors.noticeClass;


        var noticeText = _configManager.getValue(_myType, 'notice.text');
        var pageId = _configManager.getValue(_myType, 'pageId', true);

        noticeText = noticeText.replace("%HANDLE%", pageId);
        handleLink = document.createElement('a');
        handleLink.setAttribute('href', "https://"+ noticeText);
        handleLink.setAttribute('target', "_blank");
        handleLink.setAttribute('class', 'kfds-text-is-link-dark');
        linkText = document.createTextNode(noticeText);
        handleLink.appendChild(linkText);
        notice.appendChild(handleLink);
        popup.appendChild(notice);

        var closer = document.createElement('div');
        var closerContent = document.createElement('span');

        closerContent.innerHTML = _configManager.getValue(_myType, 'closer', true);
        closer.appendChild(closerContent);
        closer.className = selectors.closerClass;
        closer.setAttribute('aria-label', 'Close Ko-fi');
        closer.setAttribute('role', 'button');
        closer.setAttribute('tabindex', '0');
        closer.style = 'position:absolute!important;top:-14px!important;right:-14px!important;width:46px!important;height:46px!important;display:grid!important;place-items:center!important;border-radius:999px!important;background:rgba(255,238,247,0.96)!important;border:1px solid rgba(255,147,197,0.62)!important;box-shadow:0 12px 26px rgba(210,75,142,0.22), inset 0 1px 0 rgba(255,255,255,0.95)!important;color:#b94d84!important;font-family:Georgia, serif!important;font-size:34px!important;line-height:1!important;cursor:pointer!important;z-index:10!important;touch-action:manipulation!important;pointer-events:auto!important;user-select:none!important;-webkit-user-select:none!important;-webkit-tap-highlight-color:transparent!important;';
        closerContent.style = 'display:block!important;transform:translateY(-2px)!important;pointer-events:none!important;';

        closer.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            closePopup(popup, donateButton);
        });
        closer.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                closePopup(popup, donateButton);
            }
        });

        popup.appendChild(closer);

        var popupIFrameContainer = document.createElement('div');
        popupIFrameContainer.classList = selectors.popupIframeContainerClass;
        popupIFrameContainer.style = 'height:100%;position:relative;z-index:2;';
        popupIFrameContainer.id = popupId + selectors.popupIframeContainerIdSuffix;

        popup.appendChild(popupIFrameContainer);
    };

    function toggleKofiIframe(iframeId, state, donateButton, selectors, heightLimits) {

        var popupId = _configManager.getValue(_myType, 'cssId') + `-${selectors.popupId}`;
        var existingPopup = document.getElementById(popupId);

        if (state === 'open') {

            var iframeContainerParent = document.getElementById(iframeId).parentElement;;

            var finalHeight = window.innerHeight - (window.innerHeight - iframeContainerParent.offsetTop) - 60;
            //console.log('final height 1:' + finalHeight);
            if (finalHeight > heightLimits.maxHeight) {
                finalHeight = heightLimits.maxHeight;
            } else if (finalHeight < heightLimits.minHeight) {
                finalHeight = heightLimits.minHeight;
            }
            //console.log('final height 2:' + finalHeight);
            var widgetPageLoadStateIndex = widgetPageLoadInitiatedStates.findIndex(function (s) { return s[0] == donateButton; });
            // var widgetPageLoadState = widgetPageLoadInitiatedStates.find(function(s) { return s[0] == donateButton; });// 
            var widgetPageLoadInitiated = widgetPageLoadInitiatedStates[widgetPageLoadStateIndex][1];
            if (!widgetPageLoadInitiated) {
                var popupIFrameContainerId = popupId + selectors.popupIframeContainerIdSuffix;
                _utils.loadKofiIframe(_configManager.getValue(_myType, 'pageId', true), popupIFrameContainerId, 'width: 100%; height: 98%;');
                widgetPageLoadInitiatedStates[widgetPageLoadStateIndex] = [donateButton, true];
            }

            slidePopupOpen(existingPopup, finalHeight);

            updateClass(donateButton, 'closed', 'open');

            closeButtonActionBlocked = true;
            setTimeout(function () {
                closeButtonActionBlocked = false;
            }, 1000);

        }
    };

    var getHtml = function () {

        var donateButtonImage = _configManager.getValue(_myType, 'donatebutton.image');
        var donateButtonBackgroundColor = _configManager.getValue(_myType, 'donateButton.background-color');
        var donateButtonCTAText = _configManager.getValue(_myType, 'donateButton.text');
        var donateButtonTextColor = _configManager.getValue(_myType, 'donateButton.text-color');
        var body = '<style> .hiddenUntilReady { display: none; } </style>' +
            `<div id="${getButtonId()}" class="hiddenUntilReady closed floatingchat-donate-button" style="z-index:10000; background-color: ${donateButtonBackgroundColor}; display:none;">` +
            `<img id="${getButtonImageId()}" src="${donateButtonImage}" class="kofiimg" data-rotation="0" />` +
            `<span style="margin-left: 8px; color:${donateButtonTextColor}">${donateButtonCTAText}</span>`
        '</div>';
        return body;
    };

    // Expose methods needed for external access
    this.getContainerFrameId = getContainerFrameId;
    this.getMobiContainerFrameId = getMobiContainerFrameId;
    this.activateKofiIframe = activateKofiIframe;
    this.getButtonId = getButtonId;

    return {
        getHtml: getHtml,
        write: write
    }
};

var kofiWidgetOverlayConstants = kofiWidgetOverlayConstants || {
    optionKeys: {
        root: 'root',
        widgetType: 'type',
        pageId: 'pageId',
        ctaText: 'ctaText',
        donateButtonStyle: 'donateButtonStyle',
        ctaTextStyle: 'ctaTextStyle',
        cssId: 'cssid'
    },
    kofiRoot: 'https://ko-fi.com/',
    paymentModalId: 'paymentModal'
};

var kofiWidgetOverlayUtilities = kofiWidgetOverlayUtilities || function () {

    const uuidv4 = function () {
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        )
    };

    const debounce = function (debounceRef, callback) {

        if (debounceRef === null) {
            debounceRef = setTimeout(function () {
                clearTimeout(debounceRef);
                debounceRef = null;
                callback();
            }, 100);
        }
    };

    const loadKofiIframe = function (pageId, parentElementId, iframeStyle) {

        var _iframeLoading = false;
        var _iframeDebounce = null;
        var _showFeed = false;

        const tryLoad = function () {

            if (!_iframeLoading) {

                _iframeLoading = true;
                let url = kofiWidgetOverlayConstants.kofiRoot + pageId + '/?hidefeed=true&widget=true&embed=true';
                if (_showFeed) {
                    url = kofiWidgetOverlayConstants.kofiRoot + pageId + '/?widget=true&embed=true';
                }
                const iframe = document.createElement('iframe');
                const parentElement = document.getElementById(parentElementId);

                iframe.src = url;
                iframe.style = iframeStyle;
                parentElement.appendChild(iframe);

            } else {
                debounce(_iframeDebounce, tryLoad)
            }
        };

        tryLoad();
    };

    const getWindowHeightRatio = function () {
        return (window.outerHeight / 100);
    };

    const getWindowWidthRatio = function () {
        return (window.outerWidth / 100);
    };

    const mergeOptions = function (optionSetA, optionSetB) {

        for (var property in optionSetA) {
            if (optionSetA.hasOwnProperty(property)) {
                optionSetA[property] = optionSetB[property] !== undefined ? optionSetB[property] : optionSetA[property];
            }
        }
    };

    const getConfigManager = function (config) {

        return new function () {

            var _tokens = [];

            const getValue = function (overlayType, key, isCore) {

                const coreElement = isCore ? '.core' : '';
                const configKey = `${overlayType}${coreElement}.${key}`;
                if (config[configKey] !== undefined) {
                    var configdata = config[configKey];

                    if (_tokens.length > 0) {
                        _tokens.forEach(t => {
                            configdata = configdata.replace(t.token, t.value);
                        });
                    }

                    return configdata;
                }

                return '';
            };

            const setToken = function (token, value) {
                _tokens.push({ token: token, value: value });
            };

            const clearTokens = function () {
                _tokens = [];
            };

            return {
                getValue: getValue,
                setToken: setToken,
                clearTokens: clearTokens
            }
        };
    };

    const loadStyleSheet = function (styleSheetHref, targetDocument) {

        var docHead = targetDocument.head;
        if (!docHead) {
            docHead = targetDocument.createElement('head');
            targetDocument.prepend(docHead);
        }

        var styleSheet = targetDocument.querySelectorAll('[href="' + styleSheetHref + '"]')
        if (styleSheet.length === 0) {

            var sslink = targetDocument.createElement('link');
            sslink.href = styleSheetHref;
            sslink.rel = 'stylesheet';
            sslink.type = 'text/css';
            docHead.append(sslink);
        }
    };

    return {
        uuidv4: uuidv4,
        debounce: debounce,
        loadKofiIframe: loadKofiIframe,
        getWindowHeightRatio: getWindowHeightRatio,
        getWindowWidthRatio: getWindowWidthRatio,
        mergeOptions: mergeOptions,
        getConfigManager: getConfigManager,
        loadStyleSheet: loadStyleSheet
    }
};

var kofiWidgetOverlay = kofiWidgetOverlay || (function () {

    const _utils = new kofiWidgetOverlayUtilities();
    var isFirstRender = true;
    var parentButtonWrapperId = null;

    var _root = '';
    var _buildStrategy = {
        'floating-chat': {
            src: _root + 'kofi-widget-overlay-floating-chat-builder.js',
            write: function (parentId, config, utils) { return new kofiWidgetOverlayFloatingChatBuilder(config, utils).write(parentId); },
            getBody: function (config, utils) { return new kofiWidgetOverlayFloatingChatBuilder(config, utils).getHtml(); },
            id: 'kofi-widget-overlay-ribbon-builder'
        },
    };

    function getBuilder(widgetType) {

        var buildStrategy = _buildStrategy[widgetType] === undefined ? 'empty' : widgetType;
        var builder = _buildStrategy[buildStrategy];

        return builder;
    };

    const doWrite = function (builder, instanceId, config) {

        var finalConfig = JSON.parse(JSON.stringify(kofiWidgetOverlayConfig));

        _utils.mergeOptions(finalConfig, config);
        builder.write(instanceId, finalConfig, _utils);
    };

    const setConfigDefaults = function (config, widgetType, pId, instanceId) {

        config[widgetType + '.core.pageId'] = pId;
        config[widgetType + '.cssId'] = config[widgetType + '.cssId'] !== undefined && config[widgetType + '.cssId'] !== '' ? config[widgetType + '.cssId'] : instanceId;
        config[widgetType + '.stylesheets'] = config[widgetType + '.stylesheets'] !== undefined ? config[widgetType + '.stylesheets'] : '["https://fonts.googleapis.com/css?family=Nunito:400,700,800&display=swap"]';

        return config;
    }

    const draw = function (pId, config, containerId) {
        if (isFirstRender) {
            parentButtonWrapperId = 'kofi-widget-overlay-' + _utils.uuidv4();

            if (containerId != null) {
                document.getElementById(containerId).innerHTML += `<div id="${parentButtonWrapperId}"></div>`;
            }
            else {
                var div = document.createElement('div');
                div.setAttribute("id", parentButtonWrapperId);
                document.body.appendChild(div);
            }
            isFirstRender = false;
        }

        var widgetType = config[kofiWidgetOverlayConstants.optionKeys.widgetType];
        config = setConfigDefaults(config, widgetType, pId, parentButtonWrapperId);

        var builder = getBuilder(widgetType);
        if (containerId != null) {
            doWrite(builder, containerId, config);
        }
        else { doWrite(builder, parentButtonWrapperId, config); }
    };

    return {
        draw: draw,
    }
}());

