document.addEventListener("DOMContentLoaded", async function() {
    // ===== ENHANCED AUDIO HANDLING =====
    const audio = new Audio('hehe.mp3');
    audio.loop = true;
    let audioPlayed = false;
    
    // Global prevention of video fullscreen on mobile
    document.addEventListener('webkitbeginfullscreen', (e) => {
        e.preventDefault();
        if (e.target.webkitExitFullscreen) {
            e.target.webkitExitFullscreen();
        }
    }, true);
    
    document.addEventListener('webkitendfullscreen', (e) => {
        e.preventDefault();
    }, true);
    
    // Prevent any video from entering fullscreen
    document.addEventListener('fullscreenchange', (e) => {
        if (document.fullscreenElement && document.fullscreenElement.tagName === 'VIDEO') {
            document.exitFullscreen();
        }
    });
    
    // Audio management system for MP4 files
    let currentVideoAudio = null;
    let backgroundAudioMuted = false;
    let backgroundAudioWasPlaying = false; // Track if audio was playing before muting
    
    // Function to mute background music
    function muteBackgroundMusic() {
        if (audioPlayed) {
            // Track if audio was playing before muting
            backgroundAudioWasPlaying = !audio.paused;
            audio.volume = 0;
            backgroundAudioMuted = true;
        }
    }
    
    // Function to unmute background music
    function unmuteBackgroundMusic() {
        if (backgroundAudioMuted) {
            audio.volume = 1;
            backgroundAudioMuted = false;
            
            // Resume audio if it was playing before and is now paused
            if (backgroundAudioWasPlaying && audio.paused) {
                audio.play().catch(e => {});
            }
        } else {
            // Even if not muted, ensure audio is playing if it should be
            if (audioPlayed && audio.paused) {
                audio.play().catch(e => {});
            }
        }
    }
    
    // Function to handle video audio
    function handleVideoAudio(videoElement) {
        if (!videoElement) return;
        
        // Remove any existing audio handler
        if (currentVideoAudio) {
            currentVideoAudio.removeEventListener('play', muteBackgroundMusic);
            currentVideoAudio.removeEventListener('pause', unmuteBackgroundMusic);
            currentVideoAudio.removeEventListener('ended', unmuteBackgroundMusic);
        }
        
        // Set up new audio handler
        currentVideoAudio = videoElement;
        
        // Mute background when video starts
        videoElement.addEventListener('play', () => {
            muteBackgroundMusic();
        });
        
        // Unmute background when video pauses
        videoElement.addEventListener('pause', () => {
            unmuteBackgroundMusic();
        });
        
        // Unmute background when video ends
        videoElement.addEventListener('ended', () => {
            unmuteBackgroundMusic();
        });
        
        // Handle video state changes
        videoElement.addEventListener('canplay', () => {
            if (!videoElement.paused) {
                muteBackgroundMusic();
            }
        });
        
        // Simple audio state management
        const audioCheckInterval = setInterval(() => {
            if (videoElement.paused || videoElement.ended) {
                unmuteBackgroundMusic();
                clearInterval(audioCheckInterval);
            } else if (!videoElement.paused && videoElement.volume > 0) {
                muteBackgroundMusic();
            }
        }, 1000);
    }

    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById("loading-screen");
    const loadingBarContainer = document.getElementById("loading-bar-container");
    const loadingBarFill = document.getElementById("loading-bar-fill");
    const minLoadingTime = 2000;
    const loadingBarDelay = 4000; // Show loading bar after 4 seconds
    let loadingBarShown = false;
    let loadingStartTime = Date.now();
    
    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Helper function to update loading bar with mobile optimization
    function updateLoadingBar(loadedCount, totalResources) {
        if (loadingBarShown) {
            const progress = (loadedCount / totalResources) * 100;
            loadingBarFill.style.width = `${progress}%`;
            // Force repaint on mobile
            if (isMobile) {
                loadingBarFill.offsetHeight;
            }
        }
    }

    // Enhanced loading logic: wait for min time, window load, AND ALL critical resources
    Promise.all([
        new Promise(resolve => setTimeout(resolve, minLoadingTime)),
        new Promise(resolve => window.addEventListener('load', resolve)),
        // Wait for DOM to be fully ready
        new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        }),
        // Wait for critical resources to load
        new Promise(resolve => {
            const criticalResources = [
                'background1.png',
                'dropdown1.png',
                'notee.jpg',
                'loading.gif',
                'paw1.png',
                'gatito.gif',
                'snap.png',
                'insta.png',
                'amz.png',
                'mail.png',
                'kofi.png',
                'igpf.png',
                'fbpf.png',
                'ttpf.png',
                'scpf.png',
                'twtpf.png',
                'ytpf.png',
                'attpf.png',
                'reactions.png',
                'happy.png',
                'cool.png',
                'meh.png',
                'sad.png',
                'hehe.mp3',
                'pfps/pfp1.jpg',
                'pfps/pfp2.jpg',
                'pfps/pfp4.jpg',
                'pfps/pfp3.gif',
                'pfps/pfp9.gif',
                'pfps/pfp7.mp4',
                'pfps/pfp8.mp4'
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
                
                if (fileExtension === 'mp3') {
                    // Handle audio files - mobile optimized
                    const audio = new Audio();
                    audio.preload = 'metadata'; // Mobile browsers prefer metadata only
                    
                    // Multiple event listeners for mobile compatibility
                    const audioLoaded = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    
                    audio.addEventListener('canplaythrough', audioLoaded);
                    audio.addEventListener('loadedmetadata', audioLoaded);
                    audio.addEventListener('canplay', audioLoaded);
                    
                    audio.onerror = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    
                    // Mobile timeout for audio loading
                    setTimeout(() => {
                        if (audio.readyState < 1) { // Not loaded yet
                            audioLoaded();
                        }
                    }, 3000); // 3 second timeout for mobile
                    
                    audio.src = src;
                } else if (fileExtension === 'mp4') {
                    // Handle video files - mobile optimized
                    const video = document.createElement('video');
                    video.muted = true; // Mobile browsers require muted for autoload
                    video.preload = 'metadata'; // Only load metadata on mobile
                    
                    // Multiple event listeners for mobile compatibility
                    const videoLoaded = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    
                    video.addEventListener('loadedmetadata', videoLoaded);
                    video.addEventListener('loadeddata', videoLoaded);
                    video.addEventListener('canplay', videoLoaded);
                    
                    video.onerror = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    
                    // Mobile timeout for video loading
                    setTimeout(() => {
                        if (video.readyState < 1) { // Not loaded yet
                            videoLoaded();
                        }
                    }, 5000); // 5 second timeout for mobile
                    
                    video.src = src;
                } else {
                    // Handle image files
                    const resource = new Image();
                    resource.onload = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    resource.onerror = () => {
                        loadedCount++;
                        
                        // Update loading bar if it's shown
                        updateLoadingBar(loadedCount, totalResources);
                        
                        if (loadedCount === totalResources) {
                            resolve();
                        }
                    };
                    resource.src = src;
                }
            });
            
            // Check if we need to show loading bar after 4 seconds
            setTimeout(() => {
                const elapsedTime = Date.now() - loadingStartTime;
                if (elapsedTime >= loadingBarDelay && !loadingBarShown) {
                    loadingBarShown = true;
                    loadingBarContainer.style.display = 'flex';
                    
                    // Set initial progress based on current loaded count
                    updateLoadingBar(loadedCount, totalResources);
                }
            }, loadingBarDelay);
            
            // Mobile-specific: Force show loading bar after 3 seconds if still loading
            setTimeout(() => {
                if (!loadingBarShown) {
                    loadingBarShown = true;
                    loadingBarContainer.style.display = 'flex';
                }
            }, 3000);
            
            // Mobile-specific: Force completion after 8 seconds to prevent infinite loading
            setTimeout(() => {
                if (loadedCount < totalResources) {
                    loadedCount = totalResources;
                    resolve();
                }
            }, 8000);
        })
    ]).then(async () => {
        // Load Supabase only after the initial loading is complete
        
        try {
            const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
            window.supabase = createClient(
                'https://zvqdodzkhmcptwkjlfeu.supabase.co',
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2cWRvZHpraG1jcHR3a2psZmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NjM1NjAsImV4cCI6MjA2NDMzOTU2MH0.i1xbRIhPHVkDIrnDlQFP0ebNklrx8WVQcQo8Iuo9zG8',
                {
                    db: {
                        schema: 'public'
                    },
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false
                    }
                }
            );
        } catch (supabaseError) {
            // Create a dummy supabase object to prevent errors
            window.supabase = {
                from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
                insert: () => Promise.resolve({ data: null, error: null })
            };
        }

        // Final check - ensure everything is ready
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

    // ===== PAW POPUP =====
    const popup = document.getElementById("popup");
    if (popup) popup.style.display = "flex";

    document.getElementById("close-popup")?.addEventListener("click", function() {
        if (!popup) return;
        popup.style.opacity = 0;
        setTimeout(() => {
            popup.style.display = "none";
            const mainScreen = document.getElementById("main-screen");
            if (mainScreen) mainScreen.style.display = "block";

            if (!audioPlayed) {
                audio.play().catch(e => {});
                audioPlayed = true;
            }
        }, 500);
    });

    // ===== TOGGLE NOTE & DRAWING WIDGET =====
    const toggleButton = document.getElementById('toggle-button');
    const noteImage = document.querySelector('.note-image');
    const drawingWidget = document.querySelector('.drawing-widget');

    if (toggleButton && noteImage && drawingWidget) {
        let showingNote = true;
        toggleButton.addEventListener('click', function() {
            showingNote = !showingNote;
            noteImage.classList.toggle('hidden', !showingNote);
            drawingWidget.classList.toggle('active', !showingNote);
            toggleButton.textContent = showingNote ? ':3' : '✖';
        });
    }

    // ===== CONTACT FORM REMOVED - Now using Ko-fi widget only =====
    // All contact form code has been removed - using Ko-fi widget instead

    // Helper function to get IP address (used by questions and drawings features)
    async function getIPAddress() {
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            return ipData.ip;
        } catch (ipError) {
            return 'unknown';
        }
    }

    // ===== AMAZON ICON WITH GLITTER ANIMATION =====
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
        const amazonButton = document.querySelector('.dropdown-button');
        const mailButton = document.querySelector('.email-button');
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
                        if (amazonButton) {
                            showGlitter(amazonButton);
                        }
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

    // ===== KO-FI OVERLAY INTEGRATION =====
    const kofiIconLink = document.getElementById('kofi-icon-link');
    if (kofiIconLink) {
        kofiIconLink.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Function to open Ko-fi overlay - wait for widget to be ready
            function openKofiOverlay() {
                var maxAttempts = 50;
                var attempt = 0;
                
                var tryOpen = function() {
                    attempt++;
                    
                    // Check if the global function is available
                    if (typeof window.openKofiOverlay === 'function') {
                        try {
                            window.openKofiOverlay();
                            return;
                        } catch(err) {
                            console.error('Error opening Ko-fi overlay:', err);
                        }
                    }
                    
                    // Retry if not ready yet
                    if (attempt < maxAttempts) {
                        setTimeout(tryOpen, 100);
                    } else {
                        console.warn('Ko-fi overlay widget not ready after maximum attempts');
                    }
                };
                
                tryOpen();
            }
            
            openKofiOverlay();
        });
    }

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
            brushSize = e.target.value;
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

        document.getElementById("send-drawing")?.addEventListener("click", async function() {
            const dataUrl = canvas.toDataURL("image/png");
            const base64Data = dataUrl.split(',')[1];
            
            if (base64Data.length > 20 * 1024 * 1024) {
                alert("Drawing is too large. Please make it smaller.");
                return;
            }
            
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
                
                alert("Submitted! ᵇᵘᵗ ᵈᶦᵈ ʸᵒᵘ ˢᵘᵇᵐᶦᵗ ᵗᵒ ᵐᵉ ʸᵉᵗ...");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                saveState();
            } catch (error) {
                console.error("Error submitting drawing:", error);
                alert(`Failed to submit drawing: ${error.message || 'Please try again.'}`);
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
            askButton.addEventListener('click', () => {
                const open = askFormContainer.style.display === 'block';
                askFormContainer.style.display = open ? 'none' : 'block';
                askButton.textContent = open ? 'Ask!' : 'Cancel';
                if (!open) askTextarea.focus();
            });

            askTextarea.addEventListener('input', function() {
                const len = this.value.length;
                charCount.textContent = `${len}/200`;
                charCount.style.color = len > 180 ? '#ff6b6b' : '#888';
            });

            sendQuestionBtn?.addEventListener('click', async function() {
                const question = askTextarea.value.trim();
                if (!question) {
                    alert("Please enter a question first!");
                    return;
                }

                try {
                    let ipAddress = 'unknown';
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    } catch (ipError) {
                        // IP address fetch failed
                    }

                    const { data, error } = await window.supabase
                        .from('questions')
                        .insert([{ 
                            question, 
                            answer: null, 
                            ip_address: ipAddress,
                            created_at: new Date().toISOString() 
                        }]);
                    
                    if (error) throw error;
                    
                    askTextarea.value = '';
                    charCount.textContent = '0/200';
                    askFormContainer.style.display = 'none';
                    askButton.textContent = 'Ask!';
                    alert("Got it! ^-^");
                } catch (error) {
                    console.error("Error saving question:", error);
                    alert("Failed to submit question. Please try again.");
                }
            });
        }

        // ===== POSTS SYSTEM =====
        const postsButton = document.getElementById('posts-button');
        const postsPopup = document.getElementById('posts-popup');
        const closePostsPopup = document.getElementById('close-posts-popup');
        const drawingsList = document.getElementById('drawings-list');
        const questionsList = document.getElementById('questions-list');

        async function initPostsSystem() {
            postsButton?.addEventListener('click', async () => {
                postsPopup.style.display = 'flex';
                await renderSubmissions();
            });

            closePostsPopup?.addEventListener('click', () => {
                postsPopup.style.display = 'none';
            });
            
            // Close popup when clicking outside
            postsPopup?.addEventListener('click', (e) => {
                if (e.target === postsPopup) {
                    postsPopup.style.display = 'none';
                }
            });

        }

        // Add tab switching functionality
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                document.getElementById(this.dataset.tab).classList.add('active');
            });
        });

        async function renderSubmissions() {
            await renderDrawings();
            await renderQuestions();
        }

        async function renderDrawings() {
            try {
                const { data: drawings, error } = await window.supabase
                    .from('drawings')
                    .select('*')
                    .eq('approved', true)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                drawingsList.innerHTML = '';
                drawings.forEach((drawing, index) => {
                    const el = document.createElement('div');
                    el.className = 'post-item';
                    el.style.animationDelay = `${index * 0.1}s`;
                    el.innerHTML = `
                        <img src="data:image/png;base64,${drawing.imageData}" alt="User drawing">
                        <div class="like-sticker" data-drawing-id="${drawing.id}">
                            <div class="like-button">
                                <img src="reactions.png" alt="Like" class="like-icon">
                            </div>
                        </div>
                    `;
                    drawingsList.appendChild(el);
                    
                    // Initialize like system for this drawing
                    initLikeSystem(el, drawing.id);
                });
            } catch (error) {
                console.error("Error loading drawings:", error);
                drawingsList.innerHTML = '<p>Error loading drawings. Please refresh.</p>';
            }
        }

        async function renderQuestions() {
            try {
                const { data: questions, error } = await window.supabase
                    .from('questions')
                    .select('*')
                    .not('answer', 'is', null)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                
                questionsList.innerHTML = '';
                questions.forEach((q, index) => {
                    const el = document.createElement('div');
                    el.className = 'question-item';
                    el.style.animationDelay = `${index * 0.1}s`;
                    el.innerHTML = `
                        <p class="question-text">"${q.question}"</p>
                        <p class="answer-text">${q.answer}</p>
                    `;
                    questionsList.appendChild(el);
                });
            } catch (error) {
                console.error("Error loading questions:", error);
                questionsList.innerHTML = '<p>Error loading Q&A. Please refresh.</p>';
            }
        }

        // ===== LIKE SYSTEM =====
        const reactionTypes = ['happy', 'cool', 'meh', 'sad'];
        const reactionIcons = {
            'happy': 'happy.png',
            'cool': 'cool.png', 
            'meh': 'meh.png',
            'sad': 'sad.png'
        };
        const defaultReactionIcon = 'reactions.png';
        let currentOpenPicker = null; // Track currently open picker
        let lastClickTime = 0; // Prevent rapid-fire clicks

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
                
                // Prevent double-tap zoom on mobile
                if (e.type === 'touchstart') {
                    e.preventDefault();
                }
                
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

        function formatLikeCount(count) {
            if (count === 0) return '';
            if (count === 1) return '1';
            if (count <= 99) return `${count - 1}+`;
            return '99+';
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
            const pickerWidth = 140; // Reduced width to fit within canvas
            const pickerHeight = 44; // Reduced height to match new styling
            
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
                    
                    // Prevent double-tap zoom on mobile
                    if (e.type === 'touchstart') {
                        e.preventDefault();
                    }
                    
                    const reaction = option.dataset.reaction;
                    
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
            setTimeout(() => {
                const closePicker = (e) => {
                    if (!picker.contains(e.target) && !likeButton.contains(e.target)) {
                        closeReactionPicker();
                        document.removeEventListener('click', closePicker);
                    }
                };
                document.addEventListener('click', closePicker);
                
                // Store reference for cleanup
                picker.dataset.closeHandler = 'true';
            }, 100);
            
            // Close picker on scroll
            const scrollHandler = () => {
                closeReactionPicker();
                document.removeEventListener('scroll', scrollHandler);
            };
            document.addEventListener('scroll', scrollHandler);
        }

        function closeReactionPicker() {
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
                alert("Failed to add reaction. Please try again.");
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
                alert("Failed to update reaction. Please try again.");
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
                
                if (remainingLikes.length === 0) {
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
                alert("Failed to remove reaction. Please try again.");
            }
        }

        async function updateLikeCount(drawingId, likeCountElement) {
            try {
                const { data: likes, error } = await window.supabase
                    .from('drawing_likes')
                    .select('*')
                    .eq('drawing_id', drawingId);
                
                if (error) throw error;
                
                likeCountElement.textContent = likes.length > 0 ? likes.length : '';
                
                // Animate count change
                likeCountElement.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    likeCountElement.style.transform = 'scale(1)';
                }, 200);
                
            } catch (error) {
                console.error("Error updating like count:", error);
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
