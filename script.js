document.addEventListener("DOMContentLoaded", function () {
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

    // Paw Popup
    const popup = document.getElementById("popup");
    popup.style.display = "flex";
    document.getElementById("close-popup").onclick = function () {
        popup.style.opacity = 0;
        document.getElementById("main-screen").style.display = "block";
        setTimeout(() => popup.style.display = "none", 500);
        new Audio('hehe.mp3').play();
    };

    // Email Confirmation Popup
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

    // Dropdown Click Functionality
    const dropdownButton = document.querySelector(".dropdown-button");
    const dropdownContent = document.querySelector(".dropdown-content");

    dropdownButton.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent default button behavior
        dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (event) {
        if (!event.target.closest(".dropdown")) {
            dropdownContent.style.display = "none";
        }
    });
});
