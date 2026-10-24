/**
 * GharSe - Order detail page.
 *
 * Shows one order from GET /v1/orders/{id} with a status tracker. When the
 * order is DELIVERED, each item gets a review form (POST /v1/order-items/{id}/review).
 * Also the landing page after a successful checkout (?id=...&placed=1).
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/orderService.js, services/reviewService.js, toast.js, nav.js.
 */
var OrderDetailPage = {

    STATUS_LABELS: {
        CONFIRMED: "Confirmed",
        IN_PRODUCTION: "In production",
        READY: "Ready",
        OUT_FOR_DELIVERY: "Out for delivery",
        DELIVERED: "Delivered"
    },

    order: null,
    el: {},

    init: async function () {
        this.el.container = document.getElementById("orderContainer");
        if (!this.el.container) return;

        var id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            this.renderMessage("Order not found", '<a href="orders.html" class="btn btn-primary">Back to my orders</a>');
            return;
        }
        if (!Auth.isLoggedIn()) {
            this.renderMessage("Log in to see this order", '<a href="../auth/login.html" class="btn btn-primary">Log in</a>');
            return;
        }

        this.bindEvents();
        this.placed = new URLSearchParams(window.location.search).get("placed") === "1";
        await this.load(id);
    },

    bindEvents: function () {
        var page = this;
        this.el.container.addEventListener("submit", function (event) {
            if (event.target && event.target.id && event.target.id.indexOf("reviewForm-") === 0) {
                event.preventDefault();
                page.submitReview(event.target);
            }
        });
        this.el.container.addEventListener("click", function (event) {
            var star = event.target.closest ? event.target.closest("[data-star]") : null;
            if (star) {
                page.pickStar(star);
                return;
            }
            if (event.target.closest && event.target.closest("[data-action='retry']")) {
                page.load(new URLSearchParams(window.location.search).get("id"));
            }
        });
    },

    load: async function (id) {
        this.el.container.innerHTML = '<div class="state-box"><p>Loading order...</p></div>';
        try {
            this.order = await OrderService.getById(id);
        } catch (error) {
            if (error.status === 404) {
                this.renderMessage("Order not found", '<a href="orders.html" class="btn btn-primary">Back to my orders</a>');
            } else if (error.status === 401) {
                this.renderMessage("Your session has ended", '<a href="../auth/login.html" class="btn btn-primary">Log in again</a>');
            } else {
                this.el.container.innerHTML =
                    '<div class="state-box"><h2>We couldn\'t load this order</h2>' +
                    '<p>' + escapeHTML(error.message || "Please try again.") + '</p>' +
                    '<button class="btn btn-secondary" type="button" data-action="retry">Try again</button></div>';
            }
            return;
        }
        this.render();
    },

    render: function () {
        var o = this.order;
        var label = this.STATUS_LABELS[o.status] || o.status;
        var date = o.createdAt && !isNaN(o.createdAt.getTime())
            ? o.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "";

        var banner = this.placed
            ? '<div class="detail-card review-done">Thank you! Your order is confirmed.</div>'
            : "";

        this.el.container.innerHTML =
            '<a href="orders.html" class="text-link">&larr; Back to my orders</a>' +
            banner +
            '<section class="detail-card">' +
                '<div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;">' +
                    '<h1 style="font-size: 1.4rem;">Order #' + escapeHTML(o.orderId) + '</h1>' +
                    '<span class="badge badge-neutral">' + escapeHTML(label) + '</span>' +
                '</div>' +
                '<p style="font-size: 0.85rem; color: var(--color-text-muted);">Placed ' + escapeHTML(date) + '</p>' +
                this.trackerHTML(o.status) +
                (o.fulfilmentMode ? '<p style="margin-top: 16px;">Fulfilment: ' + escapeHTML(this.fulfilmentLabel(o.fulfilmentMode)) + '</p>' : '') +
                (o.deliveryAddress ? '<p>Delivery address: ' + escapeHTML(o.deliveryAddress) + '</p>' : '') +
            '</section>' +
            '<section class="detail-card">' +
                '<h2 style="font-size: 1.1rem;">Items</h2>' +
                this.itemsHTML(o) +
            '</section>';
    },

    trackerHTML: function (status) {
        var steps = OrderService.STATUS_STEPS;
        var current = steps.indexOf(status);
        var items = steps.map(function (step, i) {
            var cls = i < current ? "done" : (i === current ? "done current" : "");
            return '<li class="' + cls + '">' + escapeHTML(OrderDetailPage.STATUS_LABELS[step]) + '</li>';
        }).join("");
        return '<ol class="tracker" aria-label="Order progress">' + items + '</ol>';
    },

    fulfilmentLabel: function (mode) {
        if (mode === "SELF_DELIVERY") return "Delivered by the seller";
        if (mode === "PICKUP") return "Pick up from the seller";
        if (mode === "POSTAL") return "Sent by post";
        return mode;
    },

    itemsHTML: function (o) {
        var page = this;
        var delivered = o.status === "DELIVERED";
        if (o.items.length === 0) {
            return '<p style="color: var(--color-text-muted);">No items on this order.</p>';
        }
        return o.items.map(function (item) {
            var line = '<div class="review-item">' +
                '<div><strong>' + escapeHTML(item.name) + '</strong><br>' +
                '<span style="font-size: 0.85rem; color: var(--color-text-muted);">' +
                    escapeHTML(item.quantity) + ' &times; ' + formatCurrency(item.unitPrice) + '</span></div>' +
                '</div>';
            if (delivered) {
                line += page.reviewBlockHTML(item);
            }
            return line;
        }).join("");
    },

    reviewBlockHTML: function (item) {
        var key = String(item.orderItemId);
        return '<form class="review-form" id="reviewForm-' + escapeAttr(key) + '" novalidate>' +
            '<strong style="font-size: 0.95rem;">Rate this item</strong>' +
            '<div class="stars" role="radiogroup" aria-label="Rating">' +
                [1, 2, 3, 4, 5].map(function (n) {
                    return '<button type="button" data-star="' + n + '" aria-label="' + n + ' star' + (n > 1 ? "s" : "") + '">&#9733;</button>';
                }).join("") +
            '</div>' +
            '<input type="hidden" name="rating" value="">' +
            '<label for="comment-' + escapeAttr(key) + '" class="sr-only">Comment</label>' +
            '<textarea id="comment-' + escapeAttr(key) + '" name="comment" class="form-control" rows="3" maxlength="1000" placeholder="Share your experience (optional)"></textarea>' +
            '<p class="form-error" data-review-error hidden></p>' +
            '<button type="submit" class="btn btn-primary">Submit review</button>' +
        '</form>';
    },

    pickStar: function (star) {
        var form = star.closest("form");
        if (!form) return;
        var value = parseInt(star.getAttribute("data-star"), 10);
        form.querySelector('input[name="rating"]').value = String(value);
        Array.prototype.forEach.call(form.querySelectorAll("[data-star]"), function (btn) {
            btn.classList.toggle("on", parseInt(btn.getAttribute("data-star"), 10) <= value);
        });
    },

    submitReview: async function (form) {
        var orderItemId = form.id.replace("reviewForm-", "");
        var rating = form.querySelector('input[name="rating"]').value;
        var comment = form.querySelector('textarea[name="comment"]').value.trim();
        var errorEl = form.querySelector("[data-review-error]");
        errorEl.hidden = true;

        if (!rating) {
            errorEl.textContent = "Choose a rating from 1 to 5 stars.";
            errorEl.hidden = false;
            return;
        }

        var button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Submitting...";

        try {
            await ReviewService.create(orderItemId, rating, comment);
            form.outerHTML = '<p class="review-done">Thanks for your review.</p>';
            showToast("Review submitted.", "success");
        } catch (error) {
            // 409 means a review already exists for this item; the server message says so.
            errorEl.textContent = error.message || "Your review couldn't be saved. Please try again.";
            errorEl.hidden = false;
            button.disabled = false;
            button.textContent = "Submit review";
        }
    },

    renderMessage: function (title, actionHTML) {
        this.el.container.innerHTML =
            '<div class="state-box"><h2>' + escapeHTML(title) + '</h2>' +
            '<div style="margin-top: 12px;">' + (actionHTML || "") + '</div></div>';
    }
};

document.addEventListener("DOMContentLoaded", function () {
    OrderDetailPage.init();
});