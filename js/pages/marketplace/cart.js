/**
 * GharSe - Cart page.
 *
 * Shows the buyer's cart from GET /v1/cart. Quantity changes, removals and
 * clear-cart go to the server and the page redraws from the returned CartView.
 * The browser does not calculate totals (NFR15).
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/cartService.js, toast.js, nav.js.
 */
var CartPage = {

    cart: null,
    busy: false,
    el: {},

    init: async function () {
        this.el.container = document.getElementById("cartContainer");
        if (!this.el.container) return;

        if (!Auth.isLoggedIn()) {
            showLoginPrompt("guest");
            this.renderMessage("Log in to see your cart", "Your cart is saved to your account.", true);
            return;
        }

        this.bindEvents();
        await this.load();
    },

    bindEvents: function () {
        var page = this;
        this.el.container.addEventListener("click", function (event) {
            var target = event.target.closest ? event.target : null;
            if (!target) return;

            var remove = target.closest("[data-remove]");
            if (remove) { page.remove(remove.getAttribute("data-remove")); return; }

            var step = target.closest("[data-step]");
            if (step) {
                var productId = step.getAttribute("data-product-id");
                var delta = parseInt(step.getAttribute("data-step"), 10);
                page.changeQuantity(productId, delta);
                return;
            }

            if (target.closest("[data-action='clear-cart']")) { page.clearCart(); return; }
            if (target.closest("[data-action='retry']")) { page.load(); }
        });

        this.el.container.addEventListener("change", function (event) {
            if (event.target && event.target.hasAttribute("data-qty")) {
                var qty = parseInt(event.target.value, 10);
                page.setQuantity(event.target.getAttribute("data-qty"), qty, event.target);
            }
        });
    },

    load: async function () {
        this.el.container.innerHTML = '<div class="state-box"><p>Loading your cart...</p></div>';
        try {
            this.cart = await CartService.get();
        } catch (error) {
            if (error.status === 401) {
                showLoginPrompt("guest");
                this.renderMessage("Log in to see your cart", "Your session has ended.", true);
                return;
            }
            this.renderError(error);
            return;
        }
        this.render();
    },

    /** Applies a server response and redraws. The buyer's last action wins. */
    apply: function (cart) {
        this.cart = cart;
        this.render();
    },

    // ---------------------------------------------------------------
    // Actions. Each one waits for the server before redrawing.
    // ---------------------------------------------------------------

    changeQuantity: async function (productId, delta) {
        var line = this.findLine(productId);
        if (!line) return;
        var next = line.quantity + delta;
        if (next < 1) return;   // removing is a separate action
        await this.setQuantity(productId, next, null);
    },

    setQuantity: async function (productId, quantity, input) {
        if (this.busy) return;
        if (isNaN(quantity) || quantity < 1) {
            showToast("Quantity must be at least 1. To remove the item, use Remove.", "error");
            this.render();
            return;
        }
        this.setBusy(true);
        try {
            this.apply(await CartService.updateQuantity(productId, quantity));
        } catch (error) {
            showToast(error.message, "error");
            this.render();
        } finally {
            this.setBusy(false);
        }
    },

    remove: async function (productId) {
        if (this.busy) return;
        this.setBusy(true);
        try {
            this.apply(await CartService.removeItem(productId));
            showToast("Item removed.", "success");
            updateCartCount();
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            this.setBusy(false);
        }
    },

    clearCart: async function () {
        if (this.busy) return;
        if (!window.confirm("Remove all items from your cart?")) return;
        this.setBusy(true);
        try {
            this.apply(await CartService.clear());
            showToast("Cart cleared.", "success");
            updateCartCount();
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            this.setBusy(false);
        }
    },

    setBusy: function (on) {
        this.busy = on;
        this.el.container.setAttribute("aria-busy", on ? "true" : "false");
    },

    findLine: function (productId) {
        if (!this.cart) return null;
        var wanted = String(productId);
        return this.cart.items.filter(function (line) {
            return String(line.productId) === wanted;
        })[0] || null;
    },

    // ---------------------------------------------------------------
    // Rendering
    // ---------------------------------------------------------------

    render: function () {
        var cart = this.cart;
        if (!cart || cart.items.length === 0) {
            this.renderMessage(
                "Your cart is empty",
                "Find something you love in the marketplace.",
                false,
                '<a href="marketplace.html" class="btn btn-primary">Browse products</a>'
            );
            return;
        }

        var page = this;
        var lines = cart.items.map(function (line) {
            return page.lineHTML(line);
        }).join("");

        this.el.container.innerHTML =
            '<div class="cart-header">' +
                '<h1>Your cart</h1>' +
                (cart.sellerName
                    ? '<p>From <strong>' + escapeHTML(cart.sellerName) + '</strong>. A cart holds items from one seller only.</p>'
                    : '') +
            '</div>' +
            '<div class="cart-layout">' +
                '<ul class="cart-lines" aria-label="Items in your cart">' + lines + '</ul>' +
                '<aside class="cart-summary">' +
                    '<h2>Summary</h2>' +
                    '<p class="cart-subtotal"><span>Subtotal</span><strong>' + formatCurrency(cart.subtotal) + '</strong></p>' +
                    '<p class="cart-note">Delivery and payment are confirmed at checkout.</p>' +
                    '<a href="checkout.html" class="btn btn-primary btn-large" id="checkoutLink" aria-disabled="true">Checkout</a>' +
                    '<button type="button" class="btn btn-secondary" data-action="clear-cart">Clear cart</button>' +
                '</aside>' +
            '</div>';
    },

    lineHTML: function (line) {
        var id = escapeAttr(line.productId);
        var unavailable = !line.available;
        var stepper =
            '<div class="qty-stepper" role="group" aria-label="Quantity for ' + escapeAttr(line.name) + '">' +
                '<button type="button" data-step="-1" data-product-id="' + id + '" aria-label="Decrease quantity"' +
                    (line.quantity <= 1 || unavailable ? ' disabled' : '') + '>&minus;</button>' +
                '<input type="number" min="1" data-qty="' + id + '" value="' + escapeAttr(line.quantity) + '"' +
                    (unavailable ? ' disabled' : '') + ' aria-label="Quantity">' +
                '<button type="button" data-step="1" data-product-id="' + id + '" aria-label="Increase quantity"' +
                    (unavailable ? ' disabled' : '') + '>+</button>' +
            '</div>';

        return '<li class="cart-line' + (unavailable ? ' is-unavailable' : '') + '">' +
                '<div class="cart-line-main">' +
                    '<h3>' + escapeHTML(line.name) + '</h3>' +
                    '<p class="cart-line-price">' + formatCurrency(line.unitPrice) + ' each</p>' +
                    (unavailable ? '<p class="cart-line-warning">This item is no longer available. Remove it to check out.</p>' : '') +
                '</div>' +
                stepper +
                '<div class="cart-line-total">' +
                    '<strong>' + formatCurrency(line.lineTotal) + '</strong>' +
                    '<button type="button" class="text-link" data-remove="' + id + '">Remove</button>' +
                '</div>' +
            '</li>';
    },

    renderMessage: function (title, text, showLogin, extraHTML) {
        var action = extraHTML || (showLogin
            ? '<a href="auth/login.html" class="btn btn-primary">Log in</a>'
            : '');
        this.el.container.innerHTML =
            '<div class="state-box">' +
                '<h2>' + escapeHTML(title) + '</h2>' +
                '<p>' + escapeHTML(text) + '</p>' +
                action +
            '</div>';
    },

    renderError: function (error) {
        this.el.container.innerHTML =
            '<div class="state-box">' +
                '<h2>We couldn\'t load your cart</h2>' +
                '<p>' + escapeHTML(error.message || "Please try again.") + '</p>' +
                '<button class="btn btn-secondary" type="button" data-action="retry">Try again</button>' +
            '</div>';
    }
};

document.addEventListener("DOMContentLoaded", function () {
    CartPage.init();
});