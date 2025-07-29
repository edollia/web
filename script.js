document.addEventListener("DOMContentLoaded", async function() {
    // ===== AUDIO HANDLING =====
    const audio = new Audio('hehe.mp3');
    audio.loop = true;
    let audioPlayed = false;

    // ===== LOADING SCREEN =====
    const loadingScreen = document.getElementById("loading-screen");
    const loadingBarContainer = document.getElementById("loading-bar-container");
    const loadingBarFill = document.getElementById("loading-bar-fill");
    const minLoadingTime = 2000;
    const loadingBarDelay = 4000; // Show loading bar after 4 seconds
    let loadingBarShown = false;
    let loadingStartTime = Date.now();

    // Enhanced loading logic: wait for min time, window load, AND ALL critical resources
    Promise.all([
        new Promise(resolve => setTimeout(resolve, minLoadingTime)),
        new Promise(resolve => window.addEventListener('load', resolve)),
        // Wait for ALL critical resources to load
        new Promise(resolve => {
            const criticalResources = [
                // Core website images
                'background1.png',
                'dropdown1.png',
                'notee.jpg',
                'loading.gif',
                'dropdown-icon.png',
                'paw1.png',
                'gatito.gif',
                
                // Social media icons
                'snap.png',
                'insta.png',
                'amz.png',
                'kofi.png',
                'mail.png',
                
                // Contact form icons
                'igpf.png',
                'fbpf.png',
                'ttpf.png',
                'scpf.png',
                'twtpf.png',
                'ytpf.png',
                'attpf.png',
                
                // Reaction system icons
                'reactions.png',
                'happy.png',
                'cool.png',
                'meh.png',
                'sad.png',
                
                // Profile photos (will be dynamically loaded)
                'pfp1.jpg',
                'pfp2.jpg',
                'pfp3.jpg',
                'pfp1.gif',
                'pfp2.gif',
                'pfp3.gif',
                'pfp1.png',
                'pfp2.png',
                'pfp3.png',
                'pfp1.mp4',
                'pfp2.mp4',
                'pfp3.mp4'
            ];
            
            let loadedCount = 0;
            const totalResources = criticalResources.length;
            
            if (totalResources === 0) {
                resolve();
                return;
            }
            
            // Load each resource and track completion
            criticalResources.forEach(src => {
                const resource = new Image();
                resource.onload = () => {
                    loadedCount++;
                    console.log(`Loaded: ${src} (${loadedCount}/${totalResources})`);
                    
                    // Update loading bar if it's shown
                    if (loadingBarShown) {
                        const progress = (loadedCount / totalResources) * 100;
                        loadingBarFill.style.width = `${progress}%`;
                    }
                    
                    if (loadedCount === totalResources) {
                        console.log('All critical resources loaded!');
                        resolve();
                    }
                };
                resource.onerror = () => {
                    loadedCount++;
                    console.log(`Failed to load: ${src} (${loadedCount}/${totalResources})`);
                    
                    // Update loading bar if it's shown
                    if (loadingBarShown) {
                        const progress = (loadedCount / totalResources) * 100;
                        loadingBarFill.style.width = `${progress}%`;
                    }
                    
                    if (loadedCount === totalResources) {
                        console.log('All critical resources processed!');
                        resolve();
                    }
                };
                resource.src = src;
            });
            
            // Check if we need to show loading bar after 4 seconds
            setTimeout(() => {
                const elapsedTime = Date.now() - loadingStartTime;
                if (elapsedTime >= loadingBarDelay && !loadingBarShown) {
                    loadingBarShown = true;
                    loadingBarContainer.style.display = 'flex';
                    
                    // Set initial progress based on current loaded count
                    const currentProgress = (loadedCount / totalResources) * 100;
                    loadingBarFill.style.width = `${currentProgress}%`;
                    
                    console.log('Loading bar shown after 4 seconds');
                }
            }, loadingBarDelay);
        })
    ]).then(async () => {
        console.log('🎉 All resources loaded successfully! Initializing app...');
        
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

        console.log('🚀 Hiding loading screen and showing main content...');
        loadingScreen.style.opacity = 0;
        setTimeout(() => {
            loadingScreen.style.display = "none";
            const iconContainer = document.querySelector('.icon-container');
            if (iconContainer) {
                iconContainer.style.visibility = "visible";
                iconContainer.style.opacity = 1;
            }
            console.log('✨ App fully initialized!');
            initApp();
        }, 500);
    }).catch(e => console.error("❌ Error during loading:", e));

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
            toggleButton.textContent = showingNote ? ':3' : '✖';
        });
    }

    // ===== CONTACT FORM =====
    const emailIcon = document.getElementById("email-icon");

    if (emailIcon) {
        emailIcon.addEventListener("click", function(e) {
            e.preventDefault();
            showContactForm();
        });
    }

    // Contact form functionality
    function showContactForm() {
        // Create contact form modal
        const contactModal = document.createElement('div');
        contactModal.className = 'contact-modal';
        contactModal.innerHTML = `
            <div class="contact-overlay"></div>
            <div class="contact-form">
                <img src="" alt="Profile" class="contact-profile-pic" id="dynamic-profile-pic">
                <button class="contact-close-btn">×</button>
                <div class="contact-header">
                    <h3 class="contact-title">Share your info with me</h3>
                </div>
                <div class="contact-form-scroll">
                    <form class="contact-form-content">
                    <div class="name-phone-row">
                        <div class="form-group">
                            <input type="text" id="contact-name" placeholder="Name" maxlength="30">
                        </div>
                        <div class="form-group">
                            <input type="tel" id="contact-phone" placeholder="Phone" maxlength="30">
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="email" id="contact-email" placeholder="Email" maxlength="30">
                    </div>
                    <div class="form-group social-group">
                        <div class="social-selector">
                            <img src="igpf.png" alt="Instagram" class="social-icon active" data-social="instagram">
                            <div class="social-dropdown">
                                <img src="igpf.png" alt="Instagram" data-social="instagram" class="social-option active">
                                <img src="fbpf.png" alt="Facebook" data-social="facebook" class="social-option">
                                <img src="ttpf.png" alt="TikTok" data-social="tiktok" class="social-option">
                                <img src="scpf.png" alt="Snapchat" data-social="snapchat" class="social-option">
                                <img src="twtpf.png" alt="X" data-social="x" class="social-option">
                                <img src="ytpf.png" alt="YouTube" data-social="youtube" class="social-option">
                            </div>
                        </div>
                        <input type="text" id="contact-username" placeholder="Username" maxlength="30">
                    </div>
                    <div class="form-group">
                        <textarea id="contact-notes" placeholder="Notes" maxlength="200"></textarea>
                        <div class="attachment-icons">
                            <img src="attpf.png" alt="Attachments" class="attachment-icon">
                        </div>
                        <div class="attachment-preview" id="attachment-preview"></div>
                    </div>
                    <button type="submit" class="connect-btn">CONNECT</button>
                    </form>
                    <p class="contact-disclaimer">By selecting "connect" you acknowledge that you have read, understood, and agree to be bound by our <span class="clickable-link" data-link="privacy">Privacy Policy</span> and <span class="clickable-link" data-link="terms">Terms & Conditions</span>.</p>
                </div>
            </div>
        </div>
        `;
        
        document.body.appendChild(contactModal);
        
        // Load and cycle through profile photos
        loadProfilePhotos(contactModal);
        
        // Initialize contact form functionality
        initContactForm(contactModal);
    }

    function initContactForm(modal) {
        const overlay = modal.querySelector('.contact-overlay');
        const closeBtn = modal.querySelector('.contact-close-btn');
        const form = modal.querySelector('.contact-form-content');
        const socialSelector = modal.querySelector('.social-selector');
        const socialDropdown = modal.querySelector('.social-dropdown');
        const socialIcon = modal.querySelector('.social-icon');
        const socialOptions = modal.querySelectorAll('.social-option');
        
        let selectedSocial = 'instagram';
        
        // Close modal functions
        function closeModal() {
            // Advance to next photo for next time form opens
            if (globalProfilePhotos.length > 0) {
                globalProfileIndex = (globalProfileIndex + 1) % globalProfilePhotos.length;
            }
            
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
            }, 300);
        }
        
        // Close on overlay click
        overlay.addEventListener('click', closeModal);
        
        // Close on X button
        closeBtn.addEventListener('click', closeModal);
        
        // Social media dropdown
        socialSelector.addEventListener('click', function(e) {
            e.stopPropagation();
            socialDropdown.classList.toggle('active');
        });
        
        // Select social media option
        socialOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.stopPropagation();
                const social = this.dataset.social;
                selectedSocial = social;
                
                // Update main icon
                socialIcon.src = this.src;
                socialIcon.dataset.social = social;
                
                // Update active state
                socialOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                
                // Close dropdown
                socialDropdown.classList.remove('active');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            socialDropdown.classList.remove('active');
        });
        
        // Attachment functionality
        const contactAttachmentIcon = modal.querySelector('.attachment-icon');
        const attachmentPreview = modal.querySelector('#attachment-preview');
        let selectedFiles = [];
        
        // Function to update form spacing based on attachments
        function updateFormSpacing() {
            const textareaGroup = modal.querySelector('.form-group textarea').closest('.form-group');
            if (selectedFiles.length > 0) {
                textareaGroup.style.marginBottom = '80px';
                console.log('Added margin for attachments');
            } else {
                textareaGroup.style.marginBottom = '0px';
                console.log('Removed margin - no attachments');
            }
        }
        
        // Function to check IP-based attachment limits
        async function checkIPAttachmentLimit() {
            try {
                const ipAddress = await getIPAddress();
                const { data, error } = await window.supabase
                    .from('contact_attachments')
                    .select('id')
                    .eq('ip_address', ipAddress);
                
                if (error) {
                    console.error('Error checking attachment limit:', error);
                    return false; // Allow if we can't check
                }
                
                const currentCount = data ? data.length : 0;
                return currentCount < 5;
            } catch (error) {
                console.error('Error checking IP attachment limit:', error);
                return false; // Allow if we can't check
            }
        }
        
        contactAttachmentIcon.addEventListener('click', async function() {
            // Check if already at 5 attachments limit for this session
            if (selectedFiles.length >= 5) {
                showConfirmation('Maximum 5 attachments allowed per session.');
                return;
            }
            
            // Check IP-based attachment limit
            const canAddMore = await checkIPAttachmentLimit();
            if (!canAddMore) {
                showConfirmation('Maximum 5 attachments reached for your IP address. Please wait before adding more.');
                return;
            }
            
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.pdf,.doc,.docx,.txt';
            input.multiple = true;
            
            input.addEventListener('change', function(e) {
                const files = Array.from(e.target.files);
                
                files.forEach(async file => {
                    // Check if we've reached the 5 attachment limit for this session
                    if (selectedFiles.length >= 5) {
                        showConfirmation('Maximum 5 attachments reached for this session. Remove some files first.');
                        return;
                    }
                    
                    // Check IP-based attachment limit for each file
                    const canAddMore = await checkIPAttachmentLimit();
                    if (!canAddMore) {
                        showConfirmation('Maximum 5 attachments reached for your IP address. Please wait before adding more.');
                        return;
                    }
                    
                    // Check file size (max 5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        showConfirmation('File too large. Maximum size is 5MB.');
                        return;
                    }
                    
                    // Create preview item
                    const previewItem = document.createElement('div');
                    previewItem.className = 'attachment-preview-item';
                    previewItem.dataset.filename = file.name;
                    
                    if (file.type.startsWith('image/')) {
                        // Image preview
                        const img = document.createElement('img');
                        img.src = URL.createObjectURL(file);
                        previewItem.appendChild(img);
                    } else {
                        // File icon for non-images
                        const fileIcon = document.createElement('div');
                        fileIcon.className = 'file-icon';
                        fileIcon.innerHTML = '📄';
                        fileIcon.style.fontSize = '20px';
                        previewItem.appendChild(fileIcon);
                    }
                    
                    // Remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-attachment';
                    removeBtn.innerHTML = '×';
                    removeBtn.addEventListener('click', function() {
                        selectedFiles = selectedFiles.filter(f => f.name !== file.name);
                        previewItem.remove();
                        updateFormSpacing();
                    });
                    previewItem.appendChild(removeBtn);
                    
                    attachmentPreview.appendChild(previewItem);
                    selectedFiles.push(file);
                    
                    // Update form spacing
                    updateFormSpacing();
                    
                    // Don't upload immediately - just show preview
                    console.log('File added to preview:', file.name);
                });
            });
            
            input.click();
        });
        
        // Form submission with validation
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const phone = document.getElementById('contact-phone').value.trim();
            const username = document.getElementById('contact-username').value.trim();
            const notes = document.getElementById('contact-notes').value.trim();
            
            // Check if at least one field has 2+ characters
            const filledFields = [name, email, phone, username, notes].filter(field => field.length >= 2);
            
            if (filledFields.length === 0) {
                showConfirmation('Please fill at least one field with 2 or more characters.');
                return;
            }
            
            const formData = {
                name: name,
                email: email,
                phone: phone,
                social_media: selectedSocial,
                username: username,
                notes: notes,
                ip_address: await getIPAddress(),
                created_at: new Date().toISOString()
            };
            
            try {
                // First save the contact information
                const { data, error } = await window.supabase
                    .from('contacts')
                    .insert([formData]);
                
                if (error) throw error;
                
                // Then upload any selected files
                if (selectedFiles.length > 0) {
                    const ipAddress = await getIPAddress();
                    
                    for (const file of selectedFiles) {
                        try {
                            const base64 = await fileToBase64(file);
                            await window.supabase
                                .from('contact_attachments')
                                .insert([{
                                    filename: file.name,
                                    file_type: 'attachment',
                                    file_size: file.size,
                                    mime_type: file.type,
                                    file_data: base64,
                                    ip_address: ipAddress,
                                    created_at: new Date().toISOString()
                                }]);
                        } catch (uploadError) {
                            console.error('Error uploading file:', file.name, uploadError);
                            // Continue with other files even if one fails
                        }
                    }
                }
                
                // Show success message
                showConfirmation('Contact information and attachments sent successfully!');
                closeModal();
                
            } catch (error) {
                console.error('Error saving contact:', error);
                showConfirmation('Error sending contact information. Please try again.');
            }
        });
        
        // Clickable links functionality
        modal.querySelectorAll('.clickable-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                showTermsPrivacyPopup();
            });
        });
        

    }

    // Helper function to get IP address
    async function getIPAddress() {
        try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            return ipData.ip;
        } catch (ipError) {
            console.log("Couldn't get IP address", ipError);
            return 'unknown';
        }
    }

    // Global variable to track current profile photo index
    let globalProfileIndex = 0;
    let globalProfilePhotos = [];

    // Profile photo cycling functionality
    async function loadProfilePhotos(modal) {
        try {
            console.log('Loading profile photos...');
            
            // Get list of profile photos from pfps folder
            if (globalProfilePhotos.length === 0) {
                globalProfilePhotos = await getProfilePhotosList();
                console.log('Found profile photos:', globalProfilePhotos);
            }
            
            if (globalProfilePhotos.length === 0) {
                console.log('No profile photos found, using fallback');
                // Fallback if no photos found
                const profilePic = modal.querySelector('#dynamic-profile-pic');
                profilePic.src = 'pfp.png'; // Fallback to original
                return;
            }
            
            const profilePic = modal.querySelector('#dynamic-profile-pic');
            
            // Function to set profile media
            function setProfileMedia() {
                const currentFile = globalProfilePhotos[globalProfileIndex];
                const fileExtension = currentFile.split('.').pop().toLowerCase();
                
                if (['mp4', 'webm', 'mov'].includes(fileExtension)) {
                    // Handle video files
                    profilePic.style.display = 'none';
                    
                    // Remove existing video if any
                    const existingVideo = modal.querySelector('.profile-video');
                    if (existingVideo) {
                        existingVideo.remove();
                    }
                    
                    // Create video element
                    const video = document.createElement('video');
                    video.className = 'profile-video';
                    video.src = currentFile;
                    video.autoplay = true;
                    video.muted = true;
                    video.loop = true;
                    video.controls = false;
                    video.style.cssText = `
                        width: 96px;
                        height: 96px;
                        border-radius: 50%;
                        object-fit: cover;
                        border: 3px solid rgba(255, 182, 193, 0.5);
                        box-shadow: 0 4px 15px rgba(255, 182, 193, 0.3), 0 0 25px rgba(255, 182, 193, 0.4), 0 0 40px rgba(255, 182, 193, 0.2);
                        position: absolute;
                        top: -68px;
                        left: 50%;
                        transform: translateX(-50%);
                        z-index: 10;
                    `;
                    
                    // Insert video before the profile pic
                    profilePic.parentNode.insertBefore(video, profilePic);
                    
                } else {
                    // Handle image files
                    const existingVideo = modal.querySelector('.profile-video');
                    if (existingVideo) {
                        existingVideo.remove();
                    }
                    
                    profilePic.style.display = 'block';
                    profilePic.src = currentFile;
                }
            }
            
            // Set current media (advances to next photo each time form opens)
            setProfileMedia();
            
        } catch (error) {
            console.error('Error loading profile photos:', error);
            // Fallback to original
            const profilePic = modal.querySelector('#dynamic-profile-pic');
            profilePic.src = 'pfp.png';
        }
    }

    // Get list of profile photos from pfps folder - now supports any name and any supported format
    async function getProfilePhotosList() {
        const profilePhotos = [];
        const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov'];
        
        // Try to get a list of files from the pfps directory
        // Since we can't directly list directory contents from client-side,
        // we'll use a more robust approach that tries common patterns
        // and also allows for any filename with supported extensions
        
        // First, try the existing specific files we know about
        const knownFiles = [
            'pfp1.jpg', 'pfp2.jpg', 'pfp3.jpg',
            'pfp1.gif', 'pfp2.gif', 'pfp3.gif',
            'pfp1.png', 'pfp2.png', 'pfp3.png',
            'pfp1.mp4', 'pfp2.mp4', 'pfp3.mp4'
        ];
        
        // Test known files first
        for (const filename of knownFiles) {
            const filePath = `pfps/${filename}`;
            try {
                const response = await fetch(filePath, { method: 'HEAD' });
                if (response.ok) {
                    profilePhotos.push(filePath);
                    console.log(`Found known profile photo: ${filePath}`);
                }
            } catch (error) {
                console.log(`Known profile photo not found: ${filePath}`);
            }
        }
        
        // If we found files, return them
        if (profilePhotos.length > 0) {
            return profilePhotos;
        }
        
        // Fallback: try to find any files with supported extensions
        // This is a more generic approach that will work with any filename
        const genericPatterns = [
            'profile.jpg', 'profile.jpeg', 'profile.png', 'profile.gif', 'profile.mp4',
            'avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.gif', 'avatar.mp4',
            'pic.jpg', 'pic.jpeg', 'pic.png', 'pic.gif', 'pic.mp4',
            'photo.jpg', 'photo.jpeg', 'photo.png', 'photo.gif', 'photo.mp4',
            'img.jpg', 'img.jpeg', 'img.png', 'img.gif', 'img.mp4',
            'me.jpg', 'me.jpeg', 'me.png', 'me.gif', 'me.mp4',
            'selfie.jpg', 'selfie.jpeg', 'selfie.png', 'selfie.gif', 'selfie.mp4',
            'portrait.jpg', 'portrait.jpeg', 'portrait.png', 'portrait.gif', 'portrait.mp4'
        ];
        
        for (const filename of genericPatterns) {
            const filePath = `pfps/${filename}`;
            try {
                const response = await fetch(filePath, { method: 'HEAD' });
                if (response.ok) {
                    profilePhotos.push(filePath);
                    console.log(`Found generic profile photo: ${filePath}`);
                }
            } catch (error) {
                console.log(`Generic profile photo not found: ${filePath}`);
            }
        }
        
        // If still no files found, try any file with supported extensions
        // This is the most flexible approach - will work with ANY filename
        const fallbackPatterns = [
            'a.jpg', 'a.jpeg', 'a.png', 'a.gif', 'a.mp4',
            'b.jpg', 'b.jpeg', 'b.png', 'b.gif', 'b.mp4',
            'c.jpg', 'c.jpeg', 'c.png', 'c.gif', 'c.mp4',
            '1.jpg', '1.jpeg', '1.png', '1.gif', '1.mp4',
            '2.jpg', '2.jpeg', '2.png', '2.gif', '2.mp4',
            '3.jpg', '3.jpeg', '3.png', '3.gif', '3.mp4'
        ];
        
        for (const filename of fallbackPatterns) {
            const filePath = `pfps/${filename}`;
            try {
                const response = await fetch(filePath, { method: 'HEAD' });
                if (response.ok) {
                    profilePhotos.push(filePath);
                    console.log(`Found fallback profile photo: ${filePath}`);
                }
            } catch (error) {
                console.log(`Fallback profile photo not found: ${filePath}`);
            }
        }
        
        return profilePhotos;
    }

    // Helper function to show confirmation
    function showConfirmation(message) {
        const confirmation = document.createElement('div');
        confirmation.className = 'confirmation-message';
        confirmation.textContent = message;
        confirmation.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 182, 193, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(confirmation);
        
        setTimeout(() => {
            confirmation.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (confirmation.parentElement) {
                    document.body.removeChild(confirmation);
                }
            }, 300);
        }, 3000);
    }

    // File upload handling
    async function handleFileUpload(file, type) {
        try {
            console.log('Starting file upload:', file.name, file.size, file.type);
            
            // Check file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showConfirmation('File too large. Maximum size is 5MB.');
                return;
            }
            
            // Convert file to base64
            console.log('Converting file to base64...');
            const base64 = await fileToBase64(file);
            console.log('Base64 conversion complete, length:', base64.length);
            
            // Get IP address
            console.log('Getting IP address...');
            const ipAddress = await getIPAddress();
            console.log('IP address:', ipAddress);
            
            // Save to Supabase
            console.log('Saving to Supabase...');
            const { data, error } = await window.supabase
                .from('contact_attachments')
                .insert([{
                    filename: file.name,
                    file_type: type,
                    file_size: file.size,
                    mime_type: file.type,
                    file_data: base64,
                    ip_address: ipAddress,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }
            
            console.log('Upload successful!');
            showConfirmation('File uploaded successfully!');
            
        } catch (error) {
            console.error('Error uploading file:', error);
            
            // More specific error messages
            let errorMessage = 'Error uploading file. Please try again.';
            
            if (error.message) {
                if (error.message.includes('relation "contact_attachments" does not exist')) {
                    errorMessage = 'Database table not found. Please create the contact_attachments table in Supabase.';
                } else if (error.message.includes('permission denied')) {
                    errorMessage = 'Permission denied. Please check Supabase policies.';
                } else if (error.message.includes('network')) {
                    errorMessage = 'Network error. Please check your internet connection.';
                } else {
                    errorMessage = `Upload failed: ${error.message}`;
                }
            }
            
            showConfirmation(errorMessage);
        }
    }
    
    // Convert file to base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    // Terms & Privacy popup
    function showTermsPrivacyPopup() {
        const popup = document.createElement('div');
        popup.className = 'terms-privacy-modal';
        popup.innerHTML = `
            <div class="contact-overlay"></div>
            <div class="contact-form">
                <div class="contact-header">
                    <button class="contact-close-btn">×</button>
                </div>
                <h3 class="contact-title">Terms & Conditions & Privacy Policy</h3>
                <div class="terms-content">
                    <p>This is a placeholder for your Terms & Conditions and Privacy Policy content.</p>
                    <p>You can add your actual legal text here later.</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Close functionality
        const overlay = popup.querySelector('.contact-overlay');
        const closeBtn = popup.querySelector('.contact-close-btn');
        
        function closePopup() {
            popup.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(popup);
            }, 300);
        }
        
        overlay.addEventListener('click', closePopup);
        closeBtn.addEventListener('click', closePopup);
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
                    console.log("Couldn't get IP address", ipError);
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
                    let ipAddress = 'unknown';
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    } catch (ipError) {
                        console.log("Couldn't get IP address", ipError);
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
                    askButton.textContent = 'Ask me anything!';
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

        async function initLikeSystem(drawingElement, drawingId) {
            const likeSticker = drawingElement.querySelector('.like-sticker');
            const likeButton = likeSticker.querySelector('.like-button');
            const likeIcon = likeButton.querySelector('.like-icon');
            
            // Load current likes for this drawing
            await loadDrawingLikes(drawingId, likeIcon);
            
            // Set up click handler
            likeButton.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Reaction button clicked!'); // Debug log
                
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
                
                console.log('About to get IP address...'); // Debug log
                
                // Get user's IP
                let ipAddress = 'unknown';
                try {
                    const ipResponse = await fetch('https://api.ipify.org?format=json');
                    const ipData = await ipResponse.json();
                    ipAddress = ipData.ip;
                } catch (ipError) {
                    console.log("Couldn't get IP address", ipError);
                }
                
                console.log('Checking existing like...'); // Debug log
                
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
                
                console.log('About to show reaction picker...'); // Debug log
                
                // Show the new picker immediately
                if (existingLike) {
                    // User already liked - show picker with current reaction highlighted
                    showReactionPickerInternal(likeButton, drawingId, ipAddress, likeIcon, existingLike.reaction_type);
                } else {
                    // Show reaction picker
                    showReactionPickerInternal(likeButton, drawingId, ipAddress, likeIcon);
                }
            });
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
            console.log('showReactionPickerInternal called!'); // Debug log
            
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
            
            console.log('Picker created, positioning...'); // Debug log
            
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
            
            console.log('Starting animation...'); // Debug log
            
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
            }, 10);
            
            // Load and display reaction counts
            loadReactionCounts(drawingId, picker, currentReaction);
            
            console.log('Picker setup complete!'); // Debug log
            
            // Add click handlers for reactions
            picker.querySelectorAll('.reaction-option').forEach(option => {
                option.addEventListener('click', async () => {
                    const reaction = option.dataset.reaction;
                    
                    // Check if user already has this reaction
                    let ipAddress = 'unknown';
                    try {
                        const ipResponse = await fetch('https://api.ipify.org?format=json');
                        const ipData = await ipResponse.json();
                        ipAddress = ipData.ip;
                    } catch (ipError) {
                        console.log("Couldn't get IP address", ipError);
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
                });
            });
            
            // Close picker when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function closePicker(e) {
                    if (!picker.contains(e.target) && !likeButton.contains(e.target)) {
                        closeReactionPicker();
                        document.removeEventListener('click', closePicker);
                    }
                });
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
                    
                    // Remove picker immediately
                    currentOpenPicker.parentElement.removeChild(currentOpenPicker);
                    currentOpenPicker = null;
                } else {
                    // Fallback if button not found
                    if (currentOpenPicker.parentElement) {
                        currentOpenPicker.parentElement.removeChild(currentOpenPicker);
                    }
                    currentOpenPicker = null;
                }
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
