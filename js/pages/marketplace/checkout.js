/**
 * GharSe - Checkout page.
 *
 * Flow:
 *   1. Show the cart from GET /v1/cart (server totals, display only).
 *   2. Buyer picks a fulfilment mode and address.
 *   3. POST /v1/checkout/initiate creates a PENDING payment on the server.
 *   4. Razorpay Checkout JS takes the payment. Its success callback is UI only.
 *   5. Poll GET /v1/payments/{id}/status until SUCCESS with an order_id,
 *      then go to that order. The order exists only once the webhook booked it.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/cartService.js, services/checkoutService.js, toast.js, nav.js,
 * and the Razorpay script.
 */
var CheckoutPage = {

    POLL_INTERVAL_MS: 2000,
    POLL_ATTEMPTS: 30,        // about one minute
    cart: null,
    busy: false,
    el: {},

    init: async function () {
        this.el.container = document.getElementById("checkoutContainer");
        if (!this.el.container) return;

        if (!Auth.isLoggedIn()) {
            this.renderMessage("Log in to check out", '<a href="../auth/login.html" class="btn btn-primary">Log in</a>');
            return;
        }

        this.el.container.addEventListener("submit", this.onSubmit.bind(this));
        await this.load();
    },

    load: async function () {
        this.el.container.innerHTML = '<div class="state-box"><p>Loading checkout...</p></div>';
        try {
            this.cart = await CartService.get();
        } catch (error) {
            this.renderMessage("We couldn't load your cart", '<p>' + escapeHTML(error.message || "") + '</p>');
            return;
        }
        if (this.cart.items.length === 0) {
            this.renderMessage("Your cart is empty", '<a href="marketplace.html" class="btn btn-primary">Browse products</a>');
            return;
        }
        this.render();
    },

    render: function () {
        var cart = this.cart;
        var lines = cart.items.map(function (line) {
            return '<li class="checkout-summary-line"><span>' + escapeHTML(line.name) + ' &times; ' +
                escapeHTML(line.quantity) + '</span><strong>' + formatCurrency(line.lineTotal) + '</strong></li>';
        }).join("");

        this.el.container.innerHTML =
            '<h1>Checkout</h1>' +
            '<form id="checkoutForm" class="checkout-layout" novalidate>' +
                '<section class="checkout-card">' +
                    '<h2>How would you like to receive it?</h2>' +
                    '<label><input type="radio" name="fulfilmentMode" value="SELF_DELIVERY" checked> Delivered by the seller</label>' +
                    '<label><input type="radio" name="fulfilmentMode" value="PICKUP"> Pick up from the seller</label>' +
                    '<label><input type="radio" name="fulfilmentMode" value="POSTAL"> Sent by post</label>' +
                    '<div>' +
                        '<label for="deliveryAddress">Delivery address</label>' +
                        '<textarea id="deliveryAddress" name="deliveryAddress" class="form-control" rows="3" maxlength="255"></textarea>' +
                        '<p class="form-error" id="addressError" hidden></p>' +
                    '</div>' +
                '</section>' +
                '<aside class="checkout-card">' +
                    '<h2>Order summary</h2>' +
                    '<ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px;">' + lines + '</ul>' +
                    '<p class="checkout-summary-line"><span>Subtotal</span><strong>' + formatCurrency(cart.subtotal) + '</strong></p>' +
                    '<p style="font-size: 0.85rem; color: var(--color-text-muted);">Final amount is confirmed by the payment provider.</p>' +
                    '<p class="form-error" id="checkoutError" role="alert" hidden></p>' +
                    '<button type="submit" class="btn btn-primary btn-large" id="payBtn">Pay now</button>' +
                '</aside>' +
            '</form>';

        this.toggleAddressRequirement();
        var page = this;
        Array.prototype.forEach.call(this.el.container.querySelectorAll('input[name="fulfilmentMode"]'), function (r) {
            r.addEventListener("change", function () { page.toggleAddressRequirement(); });
        });
    },

    /** Address is needed for delivery and postal, not for pickup. Hint only; the server decides. */
    toggleAddressRequirement: function () {
        var mode = this.selectedMode();
        var needed = mode !== "PICKUP";
        var area = document.getElementById("deliveryAddress");
        if (area) area.required = needed;
    },

    selectedMode: function () {
        var checked = this.el.container.querySelector('input[name="fulfilmentMode"]:checked');
        return checked ? checked.value : "SELF_DELIVERY";
    },

    onSubmit: function (event) {
        event.preventDefault();
        if (this.busy) return;

        var mode = this.selectedMode();
        var address = (document.getElementById("deliveryAddress").value || "").trim();
        var addressError = document.getElementById("addressError");
        addressError.hidden = true;

        if (mode !== "PICKUP" && address === "") {
            addressError.textContent = "Enter a delivery address, or choose pickup.";
            addressError.hidden = false;
            return;
        }

        this.startPayment(mode, address);
    },

    startPayment: async function (mode, address) {
        this.setBusy(true);
        this.showError("");

        var order;
        try {
            order = await CheckoutService.initiate(mode, address);
        } catch (error) {
            this.setBusy(false);
            this.showError(error.message || "Checkout couldn't start. Please try again.");
            return;
        }

        if (typeof Razorpay === "undefined") {
            this.setBusy(false);
            this.showError("The payment service couldn't load. Check your connection and try again.");
            return;
        }

        var page = this;
        var rzp = new Razorpay({
            key: order.razorpayKeyId,
            amount: order.amount,
            currency: order.currency,
            order_id: order.razorpayOrderId,
            name: "Artisan",
            description: "Your order",
            handler: function () {
                // UI feedback only. The order is confirmed by the status poll below.
                page.renderWaiting();
                page.pollUntilBooked(order.paymentId);
            },
            modal: {
                ondismiss: function () {
                    page.setBusy(false);
                    page.showError("Payment was cancelled. Your cart is unchanged.");
                }
            },
            theme: { color: "#2f6f5e" }
        });

        rzp.on("payment.failed", function (response) {
            var reason = response && response.error && response.error.description
                ? response.error.description
                : "The payment didn't go through.";
            page.setBusy(false);
            page.showError(reason + " Your cart is unchanged; you can try again.");
        });

        rzp.open();
    },

    /** Polls until the webhook has booked the order, then goes to the order page. */
    pollUntilBooked: async function (paymentId) {
        for (var i = 0; i < this.POLL_ATTEMPTS; i++) {
            try {
                var status = await CheckoutService.status(paymentId);
                if (status.status === "SUCCESS" && status.orderId) {
                    window.location.href = "../buyer/order-detail.html?id=" + encodeURIComponent(status.orderId) + "&placed=1";
                    return;
                }
                if (status.status === "FAILED" || status.status === "REFUNDED") {
                    this.renderMessage("Payment didn't complete",
                        '<a href="cart.html" class="btn btn-primary">Back to cart</a>');
                    return;
                }
            } catch (error) {
                // A failed poll is retried; the next attempt may succeed.
            }
            await new Promise(function (resolve) { setTimeout(resolve, this.POLL_INTERVAL_MS); }.bind(this));
        }
        this.renderMessage("Payment received, confirming your order",
            '<p>This is taking longer than usual. Check your orders in a minute.</p>' +
            '<a href="../buyer/orders.html" class="btn btn-primary">View my orders</a>');
    },

    renderWaiting: function () {
        this.el.container.innerHTML =
            '<div class="state-box checkout-status"><h2>Confirming your payment...</h2>' +
            '<p>Please keep this page open.</p></div>';
    },

    renderMessage: function (title, actionHTML) {
        this.el.container.innerHTML =
            '<div class="state-box"><h2>' + escapeHTML(title) + '</h2>' +
            '<div style="margin-top: 12px;">' + (actionHTML || "") + '</div></div>';
    },

    setBusy: function (on) {
        this.busy = on;
        var btn = document.getElementById("payBtn");
        if (btn) {
            btn.disabled = on;
            btn.textContent = on ? "Opening payment..." : "Pay now";
        }
    },

    showError: function (message) {
        var el = document.getElementById("checkoutError");
        if (!el) return;
        el.textContent = message || "";
        el.hidden = !message;
    }
};

document.addEventListener("DOMContentLoaded", function () {
    CheckoutPage.init();
});