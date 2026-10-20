/**
 * GharSe - Login page.
 * After login, the user goes to ?next=<path> if it is a safe relative path inside
 * the site. Otherwise sellers go to the seller dashboard and everyone else to the marketplace.
 *
 * Needs: config.js, api.js, auth.js, services/authService.js.
 */
var LoginPage = {

    /**
     * Accepts only a relative path such as "pages/account/profile.html".
     * Rejects absolute URLs, protocol-relative "//host" links, and backslash tricks.
     */
    safeNext: function (value) {
        if (!value) return "";
        if (!/^[A-Za-z0-9_\-\/]+(\.html)?(\?[A-Za-z0-9_=&%\-]*)?$/.test(value)) return "";
        if (value.indexOf("//") !== -1 || value.indexOf("..") !== -1) return "";
        return value;
    },

    /** Where to send the user after a successful login, relative to this page. */
    destination: function (role) {
        var params = new URLSearchParams(window.location.search);
        var next = this.safeNext(params.get("next"));
        if (next) return "../../" + next;
        return role === "SELLER"
            ? "../seller/dashboard.html"
            : "../marketplace/marketplace.html";
    },

    init: function () {
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
                window.location.href = LoginPage.destination(Auth.getRole());
            } catch (error) {
                alertEl.textContent = error.message;
                alertEl.style.display = "block";
            }
        });
    }
};

document.addEventListener("DOMContentLoaded", function () {
    LoginPage.init();
});