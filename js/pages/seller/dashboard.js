/**
 * GharSe - seller dashboard. Shows the store from GET /v1/seller/me and the
 * five most recent orders from GET /v1/seller/me/orders.
 * Revenue and units stay as dashes: the server sends no totals and the
 * browser must not compute them (NFR15).
 *
 * Needs: config.js, api.js, auth.js, nav.js, core/utils.js, services/orderService.js.
 */
var SellerDashboard = {

    STATUS_LABELS: {
        CONFIRMED: "Confirmed",
        IN_PRODUCTION: "In production",
        READY: "Ready",
        OUT_FOR_DELIVERY: "Out for delivery",
        DELIVERED: "Delivered"
    },

    init: async function () {
        if (!Auth.isLoggedIn() || Auth.getRole() !== "SELLER") {
            window.location.href = "../auth/login.html";
            return;
        }
            await Promise.all([this.loadStore(), this.loadRecentOrders(), this.loadActiveCount()]);
    },

    loadStore: async function () {
        var nameEl = document.getElementById("storeName");
        var locationEl = document.getElementById("storeLocation");

        try {
            var store = await Api.get("/seller/me");
            nameEl.textContent = store.businessName;
            locationEl.textContent = "Location: " + store.latitude + ", " + store.longitude;
        } catch (error) {
            nameEl.textContent = "Your store";
            this.showAlert(error.message);
        }
    },

    loadRecentOrders: async function () {
        var box = document.getElementById("recentOrders");
        if (!box) return;

        var orders;
        try {
            orders = await Api.get("/seller/me/orders");
        } catch (error) {
            box.setAttribute("aria-busy", "false");
            box.innerHTML = '<p style="color: var(--color-text-muted);">Recent orders couldn\'t be loaded.</p>';
            return;
        }

        box.setAttribute("aria-busy", "false");

        if (!Array.isArray(orders) || orders.length === 0) {
            box.innerHTML = '<p style="color: var(--color-text-muted);">Sales appear here once orders are live.</p>';
            return;
        }

        var page = this;
        var rows = orders.slice(0, 5).map(function (raw) {
            var o = normalizeSellerOrder(raw);
            var label = page.STATUS_LABELS[o.status] || o.status;
            var date = o.createdAt && !isNaN(o.createdAt.getTime())
                ? o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "";
            var count = o.items.reduce(function (n, item) { return n + item.quantity; }, 0);
            return '<li class="seller-order-row">' +
                '<span><strong>Order #' + escapeHTML(o.orderId) + '</strong> &middot; ' +
                escapeHTML(date) + ' &middot; ' + escapeHTML(count) + ' item(s)</span>' +
                '<span class="badge badge-neutral">' + escapeHTML(label) + '</span>' +
                '<a class="text-link" href="orders.html">Manage</a>' +
            '</li>';
        }).join("");

        box.innerHTML = '<ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px;">' +
            rows + '</ul>' +
            '<p style="margin-top: 12px;"><a class="text-link" href="orders.html">View all orders &rarr;</a></p>';
    },

    loadActiveCount: async function () {
        var el = document.getElementById("activeProductsCount");
        if (!el) return;
        try {
            var list = await ProductService.getMine();
            el.textContent = String(list.filter(function (p) { return p.active; }).length);
        } catch (error) {
            el.textContent = "—";
        }
    },

    showAlert: function (message) {
        var el = document.getElementById("pageAlert");
        el.textContent = message;
        el.hidden = !message;
    }
};

/** Shapes a seller order from the server into what the dashboard reads. */
function normalizeSellerOrder(raw) {
    return {
        orderId: raw.orderId,
        status: String(raw.status || ""),
        createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
        items: Array.isArray(raw.items) ? raw.items.map(function (item) {
            return { quantity: Number(item.quantity) || 0 };
        }) : []
    };
}

document.addEventListener("DOMContentLoaded", function () {
    SellerDashboard.init();
});