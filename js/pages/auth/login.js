/**
 * GharSe - Login page.
 * After login, sellers go to the seller dashboard. Everyone else goes to the marketplace,
 * including ADMIN, because no admin pages exist yet.
 *
 * Needs: config.js, api.js, auth.js, services/... (AuthService is in js/services/authService.js).
 */
document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("loginForm");
    var alertEl = document.getElementById("authAlert");
    if (!form) return;

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        alertEl.style.display = "none";

        try {
            await AuthService.login(
                document.getElementById("email").value,
                document.getElementById("password").value
            );
            // The role comes from the token that login just stored.
            var role = Auth.getRole();
            window.location.href = role === "SELLER"
                ? "../seller/dashboard.html"
                : "../marketplace/marketplace.html";
        } catch (error) {
            alertEl.textContent = error.message;
            alertEl.style.display = "block";
        }
    });
});