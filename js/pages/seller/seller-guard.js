/**
 * GharSe - page guard for seller pages that are still placeholders.
 * Sends anyone who isn't a logged-in seller to the login page.
 * Needs: config.js, auth.js.
 */
document.addEventListener("DOMContentLoaded", function () {
    if (!Auth.isLoggedIn() || Auth.getRole() !== "SELLER") {
        window.location.href = "../auth/login.html";
    }
});