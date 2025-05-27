document.addEventListener("DOMContentLoaded", function () {
    // Audio handling - FIXED VERSION
    const audio = new Audio('hehe.mp3');
    audio.loop = true; // Ensure continuous looping
    let audioPlayed = false; // Track if audio has been played

    // Loading screen functionality
    const loadingScreen = document.getElementById("loading-screen");
    const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 2000));
    const pageLoaded = new Promise((resolve) => window.onload = resolve);
    
    Promise.all([minLoadingTime, pageLoaded]).then(() => {
        loadingScreen.style.display = "none";
        document.body.style.visibility = "visible";
        document.querySelector('.icon-container').style.visibility = "visible";
        document.querySelector('.icon-container').style.opacity = 1;
    });

    // Paw Popup - Modified audio handling
    const popup = document.getElementById("popup");
    popup.style.display = "flex";
    
    document.getElementById("close-popup").onclick = function () {
        popup.style.opacity = 0;
        document.getElementById("main-screen").style.display = "block";
        setTimeout(() => popup.style.display = "none", 500);
        
        // Only play audio if it hasn't been played yet
        if (!audioPlayed) {
            audio.play().catch(e => console.log("Audio play blocked:", e));
            audioPlayed = true;
        }
    };

    // Remove any existing autoplay audio elements to prevent Instagram autoplay
    const autoplayElements = document.querySelectorAll("audio[autoplay]");
    autoplayElements.forEach(el => el.remove());

    // Email Confirmation Popup (unchanged)
    document.getElementById("email-icon").onclick = function (event) {
        event.preventDefault();
        const confirmationPopup = document.getElementById("confirmation-popup");
        confirmationPopup.style.display = "flex";
        setTimeout(() => confirmationPopup.style.opacity = 1, 10);
    };

    document.getElementById("cancel-email-request").onclick = function () {
        const confirmationPopup = document.getElementById("confirmation-popup");
        confirmationPopup.style.opacity = 0;
        setTimeout(() => confirmationPopup.style.display = "none", 500);
    };

    document.getElementById("confirm-email-request").onclick = function () {
        const confirmationPopup = document.getElementById("confirmation-popup");
        confirmationPopup.style.opacity = 0;
        setTimeout(() => {
            confirmationPopup.style.display = "none";
            const emailPopup = document.getElementById("email-popup");
            emailPopup.style.display = "flex";
            setTimeout(() => emailPopup.style.opacity = 1, 10);
        }, 500);
    };

    document.getElementById("close-email-popup").onclick = function () {
        const emailPopup = document.getElementById("email-popup");
        emailPopup.style.opacity = 0;
        setTimeout(() => emailPopup.style.display = "none", 500);
    };

    // Dropdown Click Functionality (unchanged)
    const dropdownButton = document.querySelector(".dropdown-button");
    const dropdownContent = document.querySelector(".dropdown-content");

    dropdownButton.addEventListener("click", function (event) {
        event.preventDefault();
        dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside (unchanged)
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".dropdown")) {
            dropdownContent.style.display = "none";
        }
    });
});
