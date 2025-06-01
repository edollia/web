document.addEventListener("DOMContentLoaded", async function() {
    // ===== AUDIO HANDLING =====
    const audio = new Audio('hehe.mp3');
    audio.loop = true;
    let audioPlayed = false;

    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById("loading-screen");
    const minLoadingTime = 2000;

    // Wait for both min time and window load event
    Promise.all([
        new Promise(resolve => setTimeout(resolve, minLoadingTime)),
        new Promise(resolve => window.addEventListener('load', resolve))
    ]).then(async () => {
        // Load Supabase only after the initial loading is complete
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
    }).catch(e => console.error("Error during loading:", e));

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
                audio.play().catch(e => console.log("Audio play blocked:", e));
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
            toggleButton.textContent = showingNote ? ':3' : '↻';
        });
    }

    // ===== EMAIL POPUPS =====
    const emailIcon = document.getElementById("email-icon");
    const confirmPopup = document.getElementById("confirmation-popup");
    const emailPopup = document.getElementById("email-popup");

    if (emailIcon && confirmPopup && emailPopup) {
        emailIcon.addEventListener("click", function(e) {
            e.preventDefault();
            confirmPopup.style.display = "flex";
            setTimeout(() => confirmPopup.style.opacity = 1, 10);
        });

        document.getElementById("cancel-email-request")?.addEventListener("click", function() {
            confirmPopup.style.opacity = 0;
            setTimeout(() => confirmPopup.style.display = "none", 500);
        });

        document.getElementById("confirm-email-request")?.addEventListener("click", function() {
            confirmPopup.style.opacity = 0;
            setTimeout(() => {
                confirmPopup.style.display = "none";
                emailPopup.style.display = "flex";
                setTimeout(() => emailPopup.style.opacity = 1, 10);
            }, 500);
        });

        document.getElementById("close-email-popup")?.addEventListener("click", function() {
            emailPopup.style.opacity = 0;
            setTimeout(() => emailPopup.style.display = "none", 500);
        });
    }

    // ===== DROPDOWN MENU =====
    const dropdownButton = document.querySelector(".dropdown-button");
    const dropdownContent = document.querySelector(".dropdown-content");

    if (dropdownButton && dropdownContent) {
        dropdownButton.addEventListener("click", function(e) {
            e.preventDefault();
            dropdownContent.style.display =
                dropdownContent.style.display === "block" ? "none" : "block";
        });

        document.addEventListener("click", function(e) {
            if (!e.target.closest(".dropdown")) {
                dropdownContent.style.display = "none";
            }
        });
    }

    // ===== DRAWING WIDGET =====
    let canvas, ctx, drawingHistory = [], historyIndex = -1, currentColor = "#000000", brushSize = 5;

    if (document.getElementById("drawing-canvas")) {
        canvas = document.getElementById("drawing-canvas");
        ctx = canvas.getContext("2d");
        let isDrawing = false;

        function initCanvas() {
            canvas.width = 330;
            canvas.height = 273;
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
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const pos = getCursorPos(e);
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            draw(e);
        }

        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = brushSize;
            const pos = getCursorPos(e);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
        }

        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                ctx.beginPath();
                saveState();
            }
        }

        function setupEventListeners() {
            canvas.addEventListener("mousedown", startDrawing);
            canvas.addEventListener("mousemove", draw);
            canvas.addEventListener("mouseup", stopDrawing);
            canvas.addEventListener("mouseout", stopDrawing);

            canvas.addEventListener("touchstart", e => {
                const t = e.touches[0];
                startDrawing(new MouseEvent("mousedown", { clientX: t.clientX, clientY: t.clientY }));
            }, { passive: false });

            canvas.addEventListener("touchmove", e => {
                const t = e.touches[0];
                draw(new MouseEvent("mousemove", { clientX: t.clientX, clientY: t.clientY }));
            }, { passive: false });

            canvas.addEventListener("touchend", () => stopDrawing(new MouseEvent("mouseup")));
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

        document.getElementById("brush-size")?.addEventListener("input", e => brushSize = e.target.value);

        const colorPickerBtn = document.getElementById("color-picker-button");
        const colorPickerPopup = document.getElementById("color-picker-popup");

        if (colorPickerBtn && colorPickerPopup) {
            colorPickerBtn.addEventListener("click", () => colorPickerPopup.style.display = "block");
            document.getElementById("close-color-picker").addEventListener("click", () => colorPickerPopup.style.display = "none");
            document.getElementById("rgb-color-picker").addEventListener("input", e => {
                currentColor = e.target.value;
                colorPickerBtn.style.background = currentColor;
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
                    console.log("Couldn't get IP address", ipError);
                }

                const { error } = await window.supabase
                    .from('drawings')
                    .insert([{ 
                        imageData: base64Data,  // Changed to match your column name
                        ip_address: ipAddress
                        // created_at and approved will use their default values
                    }]);

                if (error) throw error;
                
                alert("Drawing submitted for approval!");
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
        // ===== ASK ME ANYTHING =====
        const askButton = document.getElementById('ask-button');
        const askFormContainer = document.getElementById('ask-form-container');
        const askTextarea = document.getElementById('ask-textarea');
        const charCount = document.getElementById('char-count');
        const sendQuestionBtn = document.getElementById('send-question');

        if (askButton && askFormContainer) {
            askButton.addEventListener('click', () => {
                const open = askFormContainer.style.display === 'block';
                askFormContainer.style.display = open ? 'none' : 'block';
                askButton.textContent = open ? 'Ask me anything!' : 'Cancel';
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
                    const { data, error } = await window.supabase
                        .from('questions')
                        .insert([{ 
                            question, 
                            answer: null, 
                            created_at: new Date().toISOString() 
                        }]);
                    
                    if (error) throw error;
                    
                    askTextarea.value = '';
                    charCount.textContent = '0/200';
                    askFormContainer.style.display = 'none';
                    askButton.textContent = 'Ask me anything!';
                    alert("Question received! I'll answer it soon.");
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

            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                    document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
                });
            });
        }

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
                drawings.forEach((drawing) => {
                    const el = document.createElement('div');
                    el.className = 'post-item';
                    el.innerHTML = `
                        <img src="data:image/png;base64,${drawing.imageData}" alt="User drawing">
                        <button class="delete-btn" data-id="${drawing.id}">✕</button>
                    `;
                    drawingsList.appendChild(el);
                });

                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        if (confirm("Are you sure you want to delete this drawing?")) {
                            try {
                                const { error } = await window.supabase
                                    .from('drawings')
                                    .delete()
                                    .eq('id', this.dataset.id);
                                
                                if (error) throw error;
                                await renderDrawings();
                            } catch (error) {
                                console.error("Error deleting drawing:", error);
                                alert("Failed to delete drawing.");
                            }
                        }
                    });
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
                questions.forEach((q) => {
                    const el = document.createElement('div');
                    el.className = 'question-item';
                    el.innerHTML = `
                        <p class="question-text">"${q.question}"</p>
                        <p class="answer-text">${q.answer}</p>
                        <button class="delete-btn" data-id="${q.id}">✕</button>
                    `;
                    questionsList.appendChild(el);
                });

                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', async function() {
                        if (confirm("Are you sure you want to delete this Q&A?")) {
                            try {
                                const { error } = await window.supabase
                                    .from('questions')
                                    .delete()
                                    .eq('id', this.dataset.id);
                                
                                if (error) throw error;
                                await renderQuestions();
                            } catch (error) {
                                console.error("Error deleting question:", error);
                                alert("Failed to delete Q&A.");
                            }
                        }
                    });
                });
            } catch (error) {
                console.error("Error loading questions:", error);
                questionsList.innerHTML = '<p>Error loading Q&A. Please refresh.</p>';
            }
        }

        initPostsSystem();
    }
});
