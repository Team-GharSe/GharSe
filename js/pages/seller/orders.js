/**
 * GharSe - Seller incoming orders.
 * Lists GET /v1/seller/me/orders (optional ?status=) and advances an order one
 * step with PATCH /v1/orders/{id}/status. The server enforces the status chain;
 * this page only offers the next step.
 *
 * Needs: core/utils.js, config.js, auth.js, api.js, toast.js, nav.js.
 */
var SellerOrdersPage = {

    // Must match OrderStatus.java and the server's status chain.
    CHAIN: ["CONFIRMED", "IN_PRODUCTION", "READY", "OUT_FOR_DELIVERY", "DELIVERED"],

    LABELS: {
        CONFIRMED: "Confirmed",
        IN_PRODUCTION: "In production",
        READY: "Ready",
        OUT_FOR_DELIVERY: "Out for delivery",
        DELIVERED: "Delivered"
    },

    NEXT_ACTION: {
        CONFIRMED: "Start production",
        IN_PRODUCTION: "Mark ready",
        READY: "Mark out for delivery",
        OUT_FOR_DELIVERY: "Mark delivered"
    },

    init: function () {
        if (!Auth.isLoggedIn() || Auth.getRole() !== "SELLER") {
            window.location.href = "../auth/login.html";
            return;
        }

        var self = this;
        document.getElementById("statusFilter").addEventListener("change", function () {
            self.load();
        });
        document.getElementById("refreshOrders").addEventListener("click", function () {
            self.load();
        });
        document.getElementById("ordersList").addEventListener("click", function (event) {
            var btn = event.target.closest("[data-advance]");
            if (btn) self.advance(btn.getAttribute("data-order-id"), btn.getAttribute("data-advance"));
        });

        this.load();
    },

    setAlert: function (text) {
        var el = document.getElementById("pageAlert");
        el.textContent = text;
        el.hidden = !text;
    },

    load: async function () {
        var list = document.getElementById("ordersList");
        var status = document.getElementById("statusFilter").value;
        list.setAttribute("aria-busy", "true");
        this.setAlert("");

        try {
            var orders = await Api.get("/seller/me/orders", status ? { status: status } : null);
            this.render(orders || []);
        } catch (error) {
            list.innerHTML = '<div class="state-box"><p>' + escapeHTML(error.message) + '</p></div>';
            document.getElementById("ordersSummary").textContent = "";
        } finally {
            list.setAttribute("aria-busy", "false");
        }
    },

    render: function (orders) {
        var list = document.getElementById("ordersList");
        var summary = document.getElementById("ordersSummary");

        if (orders.length === 0) {
            summary.textContent = "";
            list.innerHTML = '<div class="state-box"><h3>No orders here yet</h3>' +
                '<p>New orders will appear once buyers check out.</p></div>';
            return;
        }

        summary.textContent = orders.length === 1 ? "1 order" : orders.length + " orders";
        list.innerHTML = orders.map(this.cardHTML, this).join("");
    },

    cardHTML: function (order) {
        var self = this;
        var label = this.LABELS[order.status] || order.status;
        var next = this.NEXT_ACTION[order.status];

        var items = (order.items || []).map(function (item) {
            var line = formatCurrency(item.priceSnapshot) + " × " + item.quantity;
            return '<li>' + escapeHTML(item.productNameSnapshot) + ' — ' + escapeHTML(line) + '</li>';
        }).join("");

        var action = next
            ? '<button class="btn btn-primary" type="button" data-advance="' + escapeAttr(self.nextStatus(order.status)) +
              '" data-order-id="' + escapeAttr(order.orderId) + '">' + escapeHTML(next) + '</button>'
            : '<span class="badge badge-success">Completed</span>';

        return '<article class="metric-card order-card">' +
                '<div class="order-head">' +
                    '<strong>Order #' + escapeHTML(order.orderId) + '</strong>' +
                    '<span class="badge">' + escapeHTML(label) + '</span>' +
                '</div>' +
                '<p style="font-size: 0.88rem; color: var(--color-text-muted);">Buyer #' + escapeHTML(order.buyerId) +
                    (order.fulfilmentModeSelected ? ' · ' + escapeHTML(order.fulfilmentModeSelected) : '') + '</p>' +
                (order.deliveryAddressSnapshot ? '<p style="font-size: 0.88rem;">Deliver to: ' + escapeHTML(order.deliveryAddressSnapshot) + '</p>' : '') +
                '<ul class="order-items">' + items + '</ul>' +
                '<div class="order-actions">' + action + '</div>' +
            '</article>';
    },

    /** The status one step after the current one, or null at the end of the chain. */
    nextStatus: function (current) {
        var i = this.CHAIN.indexOf(current);
        return (i === -1 || i === this.CHAIN.length - 1) ? null : this.CHAIN[i + 1];
    },

    advance: async function (orderId, newStatus) {
        var label = this.LABELS[newStatus] || newStatus;
        if (!window.confirm("Move order #" + orderId + " to \"" + label + "\"? This can't be undone.")) return;

        this.setAlert("");
        try {
            await Api.patch("/orders/" + encodeURIComponent(orderId) + "/status", { status: newStatus });
            showToast("Order updated.", "success");
            this.load();
        } catch (error) {
            // A 409 means the order changed elsewhere; reload so the seller sees the current status.
            this.setAlert(error.message);
            if (error.status === 409) this.load();
        }
    }
};

document.addEventListener("DOMContentLoaded", function () {
    SellerOrdersPage.init();
});