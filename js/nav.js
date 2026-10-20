/**
 * GharSe - Navigation renderer.
 *
 * Fills <nav class="main-nav"> with the right links for guest, buyer, seller
 * or admin, based on the role in the JWT (Auth.getRole()). The role only picks
 * which links are shown. The backend still enforces access on every request.
 *
 * For logged-in users the Account button shows "Hi, <first name>", fetched
 * from GET /v1/users/me. If that fails, it keeps the label "Account".
 *
 * Needs: js/auth.js and js/api.js loaded first.
 */

var Nav = {

    /**
     * How many "../" segments are needed to get back to the project root
     * from the current page. Works wherever the site is hosted.
     */
    getRootPrefix: function () {
        var path = window.location.pathname;
        if (path.indexOf("/pages/auth/") !== -1 ||
            path.indexOf("/pages/seller/") !== -1 ||
            path.indexOf("/pages/buyer/") !== -1 ||
            path.indexOf("/pages/admin/") !== -1 ||
            path.indexOf("/pages/marketplace/") !== -1 ||
            path.indexOf("/pages/account/") !== -1) {
            return "../../";
        }
        if (path.indexOf("/pages/") !== -1) {
            return "../";
        }
        return "";
    },

    /** Filename of the current page, used to hide the matching nav link. */
    getCurrentFile: function () {
        var path = window.location.pathname;
        return path.substring(path.lastIndexOf("/") + 1) || "index.html";
    },

    guestLinks: function (root) {
        return '' +
            '<a href="' + root + 'index.html" class="nav-link">Home</a>' +
            '<a href="' + root + 'pages/marketplace/marketplace.html" class="nav-link">Explore</a>' +
            '<a href="' + root + 'pages/auth/login.html" class="nav-link">Login</a>' +
            '<a href="' + root + 'pages/auth/signup.html?role=seller" class="btn btn-primary nav-cta">Start Selling</a>' +
            '<a href="' + root + 'pages/auth/signup.html?role=buyer" class="btn btn-secondary nav-cta">Become a Buyer</a>';
    },

    // Add back when built: Cart (pages/marketplace/cart.html), My Orders (pages/buyer/orders.html).
    // The cart badge is set with Nav.setCartCount(n).
    buyerLinks: function (root) {
        return '' +
            '<a href="' + root + 'index.html" class="nav-link">Home</a>' +
            '<a href="' + root + 'pages/marketplace/marketplace.html" class="nav-link">Explore</a>' +
            '<div class="nav-profile-dropdown">' +
                '<button class="nav-link nav-profile-trigger" id="navProfileTrigger" type="button">Account</button>' +
                '<div class="nav-profile-menu" id="navProfileMenu">' +
                    '<a class="nav-profile-link" href="' + root + 'pages/account/profile.html">My profile</a>' +
                    '<hr>' +
                    '<button class="nav-profile-link" onclick="Auth.logout()" type="button">Logout</button>' +
                '</div>' +
            '</div>';
    },

    // Add back when built: Analytics (pages/seller/analytics.html), Reports (pages/seller/reports.html).
    sellerLinks: function (root) {
        return '' +
            '<a href="' + root + 'index.html" class="nav-link">Home</a>' +
            '<a href="' + root + 'pages/seller/dashboard.html" class="nav-link">Dashboard</a>' +
            '<a href="' + root + 'pages/seller/products.html" class="nav-link">Products</a>' +
            '<div class="nav-profile-dropdown">' +
                '<button class="nav-link nav-profile-trigger" id="navProfileTrigger" type="button">Account</button>' +
                '<div class="nav-profile-menu" id="navProfileMenu">' +
                    '<a class="nav-profile-link" href="' + root + 'pages/account/profile.html">My profile</a>' +
                    '<hr>' +
                    '<button class="nav-profile-link" onclick="Auth.logout()" type="button">Logout</button>' +
                '</div>' +
            '</div>';
    },

    // No admin pages exist yet. Add their links here when they do.
    adminLinks: function (root) {
        return '' +
            '<a href="' + root + 'index.html" class="nav-link">Home</a>' +
            '<a href="' + root + 'pages/marketplace/marketplace.html" class="nav-link">Explore</a>' +
            '<div class="nav-profile-dropdown">' +
                '<button class="nav-link nav-profile-trigger" id="navProfileTrigger" type="button">Account</button>' +
                '<div class="nav-profile-menu" id="navProfileMenu">' +
                    '<button class="nav-profile-link" onclick="Auth.logout()" type="button">Logout</button>' +
                '</div>' +
            '</div>';
    },

    /**
     * Remove any nav link whose href points at the current page.
     * Compares just the filename so relative-depth differences don't matter.
     */
    hideCurrentPageLink: function (navEl) {
        var currentFile = this.getCurrentFile();
        var links = navEl.querySelectorAll("a[href]");
        for (var i = 0; i < links.length; i++) {
            var href = links[i].getAttribute("href");
            var file = href.split("/").pop().split("?")[0];
            if (file === currentFile) {
                links[i].style.display = "none";
            }
        }
    },

    setupProfileDropdown: function (navEl) {
        var trigger = navEl.querySelector("#navProfileTrigger");
        var menu = navEl.querySelector("#navProfileMenu");
        if (!trigger || !menu) return;

        trigger.addEventListener("click", function (e) {
            e.stopPropagation();
            menu.classList.toggle("open");
        });

        document.addEventListener("click", function () {
            menu.classList.remove("open");
        });
    },

    /**
     * Replaces the "Account" label with "Hi, <first name>".
     * Uses textContent, so the name is never parsed as HTML.
     * On failure the label stays "Account".
     */
    setGreeting: async function (navEl) {
        var trigger = navEl.querySelector("#navProfileTrigger");
        if (!trigger) return;
        try {
            var user = await Api.get("/users/me");
            var firstName = String(user.name || "").trim().split(/\s+/)[0];
            if (firstName) {
                trigger.textContent = "Hi, " + firstName;
            }
        } catch (error) {
            // Keep "Account". Api already logs the user out if the token is rejected.
        }
    },

    /** Show or hide the cart badge. Call this once the cart backend exists. */
    setCartCount: function (count) {
        var els = document.querySelectorAll("#cartCount");
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = count;
            els[i].style.display = count > 0 ? "" : "none";
        }
    },

    render: function () {
        var navEl = document.querySelector(".main-nav");
        if (!navEl) return;

        var root = this.getRootPrefix();

        if (!Auth.isLoggedIn()) {
            navEl.innerHTML = this.guestLinks(root);
        } else {
            var role = Auth.getRole();
            if (role === "SELLER") {
                navEl.innerHTML = this.sellerLinks(root);
            } else if (role === "ADMIN") {
                navEl.innerHTML = this.adminLinks(root);
            } else {
                navEl.innerHTML = this.buyerLinks(root);
            }
            this.setGreeting(navEl);
        }

        this.hideCurrentPageLink(navEl);
        this.setupProfileDropdown(navEl);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    Nav.render();
});