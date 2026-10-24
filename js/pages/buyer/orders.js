/**
 * GharSe - Buyer order history.
 *
 * Lists GET /v1/orders/me, newest first (the server already sorts this way).
 * Each card links to the order detail page.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/orderService.js, toast.js, nav.js.
 */
var BuyerOrdersPage = {

    STATUS_LABELS: {
        CONFIRMED: "Confirmed",
        IN_PRODUCTION: "In production",
        READY: "Ready",
        OUT_FOR_DELIVERY: "Out for delivery",
        DELIVERED: "Delivered"
    },

    init: async function () {
        this.list = document.getElementById("ordersList");
        this.alert = document.getElementById("ordersAlert");
        if (!this.list) return;

        if (!Auth.isLoggedIn()) {
            this.renderMessage("Log in to see your orders", '<a href="../auth/login.html" class="btn btn-primary">Log in</a>');
            return;
        }

        await this.load();
    },

    load: async function () {
        this.list.setAttribute("aria-busy", "true");
        this.list.innerHTML = '<div class="state-box"><p>Loading your orders...</p></div>';
        this.alert.hidden = true;

        var orders;
        try {
            orders = await OrderService.listMine();
        } catch (error) {
            this.list.setAttribute("aria-busy", "false");
            if (error.status === 401) {
                this.renderMessage("Your session has ended", '<a href="../auth/login.html" class="btn btn-primary">Log in again</a>');
                return;
            }
            this.alert.textContent = error.message || "Your orders couldn't be loaded.";
            this.alert.hidden = false;
            this.list.innerHTML = '<div class="state-box"><button class="btn btn-secondary" type="button" data-action="retry">Try again</button></div>';
            return;
        }

        this.list.setAttribute("aria-busy", "false");

        if (orders.length === 0) {
            this.renderMessage(
                "You haven't placed any orders yet",
                '<a href="../marketplace/marketplace.html" class="btn btn-primary">Browse products</a>'
            );
            return;
        }

        var page = this;
        this.list.innerHTML = orders.map(function (o) { return page.cardHTML(o); }).join("");
    },

    cardHTML: function (order) {
        var label = this.STATUS_LABELS[order.status] || order.status;
        var date = order.createdAt && !isNaN(order.createdAt.getTime())
            ? order.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "";

        var items = order.items.map(function (item) {
            return '<li>' + escapeHTML(item.name) + ' &times; ' + escapeHTML(item.quantity) +
                ' <span style="color: var(--color-text-muted);">(' + formatCurrency(item.unitPrice) + ' each)</span></li>';
        }).join("");

        return '<article class="order-card">' +
            '<div class="order-head">' +
                '<strong>Order #' + escapeHTML(order.orderId) + '</strong>' +
                '<span class="badge badge-neutral">' + escapeHTML(label) + '</span>' +
            '</div>' +
            '<p style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px;">' + escapeHTML(date) + '</p>' +
            '<ul class="order-items">' + items + '</ul>' +
            '<a class="text-link order-link" href="order-detail.html?id=' + encodeURIComponent(order.orderId) + '">View order details &rarr;</a>' +
        '</article>';
    },

    renderMessage: function (title, actionHTML) {
        this.list.innerHTML =
            '<div class="state-box"><h3>' + escapeHTML(title) + '</h3>' +
            '<div style="margin-top: 12px;">' + (actionHTML || "") + '</div></div>';
    }
};

// Retry button
document.addEventListener("click", function (event) {
    var retry = event.target.closest ? event.target.closest("[data-action='retry']") : null;
    if (retry) BuyerOrdersPage.load();
});

document.addEventListener("DOMContentLoaded", function () {
    BuyerOrdersPage.init();
});