/**
 * GharSe - Navigation renderer.
 *
 * Fills <nav class="main-nav"> with the right links for guest, buyer, seller
 * or admin, based on the role in the JWT (Auth.getRole()). The role only picks
 * which links are shown. The backend still enforces access on every request.
 *
 * Buyers get Cart (with a count badge) and My Orders.
 * For logged-in users the Account button shows a greeting:
 *   buyers  -> "Hi, <first name>"     from GET /v1/users/me
 *   sellers -> "<business name>"      from GET /v1/seller/me
 * If the request fails, the label stays "Account".
 *
 * Needs: js/auth.js and js/api.js loaded first.
 * Cart badge needs js/services/cartService.js and js/cart-action.js.
 */

var Nav = {

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

    buyerLinks: function (root) {
        return '' +
            '<a href="' + root + 'index.html" class="nav-link">Home</a>' +
            '<a href="' + root + 'pages/marketplace/marketplace.html" class="nav-link">Explore</a>' +
            '<a href="' + root + 'pages/marketplace/cart.html" class="nav-link nav-cart">Cart' +
                ' <span class="nav-badge" id="cartCount" style="display: none;">0</span></a>' +
            '<a href="' + root + 'pages/buyer/orders.html" class="nav-link">My Orders</a>' +
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
            '<a href="' + root + 'pages/seller/orders.html" class="nav-link">Orders</a>' +
            '<div class="nav-profile-dropdown">' +
                '<button class="nav-link nav-profile-trigger" id="navProfileTrigger" type="button">Account</button>' +
                '<div class="nav-profile-menu" id="navProfileMenu">' +
                    '<a class="nav-profile-link" href="' + root + 'pages/account/profile.html">My profile</a>' +
                    '<hr>' +
                    '<button class="nav-profile-link" onclick="Auth.logout()" type="button">Logout</button>' +
                '</div>' +
            '</div>';
    },

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

    setGreeting: async function (navEl, role) {
        var trigger = navEl.querySelector("#navProfileTrigger");
        if (!trigger) return;
        try {
            if (role === "SELLER") {
                var seller = await Api.get("/seller/me");
                var businessName = String(seller.businessName || "").trim();
                if (businessName) trigger.textContent = businessName;
            } else {
                var user = await Api.get("/users/me");
                var firstName = String(user.name || "").trim().split(/\s+/)[0];
                if (firstName) trigger.textContent = "Hi, " + firstName;
            }
        } catch (error) {
            // Keep "Account". Api already logs the user out if the token is rejected.
        }
    },

    /** Shows the cart count. Hidden when the count is zero. */
    setCartCount: function (count) {
        var els = document.querySelectorAll("#cartCount");
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = String(count);
            els[i].style.display = count > 0 ? "" : "none";
        }
    },

    /** Loads the real count from the server for buyers. */
    loadCartCount: async function () {
        if (typeof CartService === "undefined") return;
        try {
            var cart = await CartService.get();
            var total = cart.items.reduce(function (n, line) { return n + line.quantity; }, 0);
            this.setCartCount(total);
        } catch (error) {
            this.setCartCount(0);
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
                this.loadCartCount();
            }
            this.setGreeting(navEl, role);
        }

        this.hideCurrentPageLink(navEl);
        this.setupProfileDropdown(navEl);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    Nav.render();
});