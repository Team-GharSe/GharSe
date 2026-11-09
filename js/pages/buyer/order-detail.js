/**
 * GharSe - Buyer order detail page.
 * Reads GET /v1/orders/{orderId} and shows the status tracker and the items.
 * Each item gets a review form once the order is DELIVERED: POST /v1/order-items/{id}/review.
 * The server decides everything that matters (ownership, DELIVERED, one review per item).
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js, toast.js, nav.js.
 */
var OrderDetailPage = {

    STEPS: [
        { code: "CONFIRMED", label: "Confirmed" },
        { code: "IN_PRODUCTION", label: "In production" },
        { code: "READY", label: "Ready" },
        { code: "OUT_FOR_DELIVERY", label: "Out for delivery" },
        { code: "DELIVERED", label: "Delivered" }
    ],

    orderId: null,

    init: function () {
        var params = new URLSearchParams(window.location.search);
        this.orderId = params.get("id");

        if (!this.orderId) {
            this.setAlert("No order was specified.");
            return;
        }
        this.load();
    },

    load: async function () {
        try {
            var order = await Api.get("/orders/" + encodeURIComponent(this.orderId));
            this.render(order);
        } catch (error) {
            this.setAlert(error.message || "This order couldn't be loaded.");
        }
    },

    render: function (order) {
        document.getElementById("orderTitle").textContent = "Order #" + order.orderId;
        document.getElementById("orderMeta").textContent =
            "Placed on " + formatDate(order.createdAt) + " · " + modeLabel(order.fulfilmentModeSelected);

        this.renderTracker(order.status);

        var items = order.items || [];
        var delivered = order.status === "DELIVERED";
        document.getElementById("items").innerHTML = items.map(function (item) {
            return OrderDetailPage.itemHTML(item, delivered);
        }).join("");

        this.bindReviewForms();
    },

    renderTracker: function (status) {
        var tracker = document.getElementById("tracker");
        var currentIndex = this.STEPS.findIndex(function (s) { return s.code === status; });

        tracker.hidden = false;
        tracker.innerHTML = this.STEPS.map(function (step, i) {
            var cls = "step";
            if (i < currentIndex) cls += " done";
            if (i === currentIndex) cls += " current";
            return '<div class="' + cls + '">' + escapeHTML(step.label) + "</div>";
        }).join("");
    },

    itemHTML: function (item, delivered) {
        var reviewBlock = delivered
            ? '<form class="review-form" data-item-id="' + escapeAttr(item.orderItemId) + '" novalidate>' +
                '<label>Your rating' +
                    '<select name="rating" required>' +
                        '<option value="">Choose 1 to 5</option>' +
                        '<option value="5">5 - Excellent</option>' +
                        '<option value="4">4 - Good</option>' +
                        '<option value="3">3 - Okay</option>' +
                        '<option value="2">2 - Poor</option>' +
                        '<option value="1">1 - Very poor</option>' +
                    '</select>' +
                '</label>' +
                '<label>Comment (optional)' +
                    '<textarea name="comment" rows="3" maxlength="1000"></textarea>' +
                '</label>' +
                '<span class="field-error" data-error-for="rating"></span>' +
                '<div><button type="submit" class="btn btn-primary">Submit review</button></div>' +
              '</form>'
            : "";

        return '<div class="order-item">' +
            '<strong>' + escapeHTML(item.productNameSnapshot) + '</strong>' +
            '<div class="muted">' + escapeHTML(String(item.quantity)) + ' × ' +
                escapeHTML(formatCurrency(item.priceSnapshot)) + '</div>' +
            reviewBlock +
        '</div>';
    },

    bindReviewForms: function () {
        Array.prototype.forEach.call(document.querySelectorAll(".review-form"), function (form) {
            form.addEventListener("submit", function (event) {
                event.preventDefault();
                OrderDetailPage.submitReview(form);
            });
        });
    },

    submitReview: async function (form) {
        var rating = form.elements["rating"].value;
        var comment = form.elements["comment"].value.trim();
        var errorSpan = form.querySelector('[data-error-for="rating"]');
        errorSpan.textContent = "";

        if (!rating) {
            errorSpan.textContent = "Choose a rating from 1 to 5.";
            return;
        }

        var button = form.querySelector("button[type=submit]");
        button.disabled = true;
        try {
            await Api.post("/order-items/" + encodeURIComponent(form.dataset.itemId) + "/review", {
                rating: Number(rating),
                comment: comment || null
            });
            showToast("Thanks for your review.", "success");
            form.outerHTML = '<p class="muted">You have reviewed this item.</p>';
        } catch (error) {
            // 409 means a review already exists for this item; the server message says so.
            errorSpan.textContent = error.message || "The review could not be saved. Please try again.";
            button.disabled = false;
        }
    },

    setAlert: function (message) {
        var el = document.getElementById("pageAlert");
        el.textContent = message || "";
        el.hidden = !message;
    }
};

function formatDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function modeLabel(mode) {
    return { SELF_DELIVERY: "Delivered by the seller", PICKUP: "Pickup", POSTAL: "Sent by post" }[mode] || "";
}

document.addEventListener("DOMContentLoaded", function () {
    OrderDetailPage.init();
});