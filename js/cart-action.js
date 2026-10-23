/**
 * GharSe - the one "Add to cart" entry point used by the marketplace and
 * product pages.
 *
 * Who may buy is decided here (guest -> log in, seller/admin -> blocked) and the
 * server enforces it again. On a 409 from the single-seller lock (FR11) the buyer
 * is offered to clear the cart first.
 *
 * Needs: js/auth.js, js/toast.js, js/services/cartService.js.
 */
async function handleAddToCart(productId, quantity) {
    if (!Auth.isLoggedIn()) {
        showLoginPrompt("guest");
        return false;
    }

    var role = Auth.getRole();
    if (role === "SELLER") {
        showLoginPrompt("seller");
        return false;
    }
    if (role === "ADMIN") {
        showToast("Admin accounts can't purchase items.", "error");
        return false;
    }

    try {
        await CartService.addItem(productId, quantity || 1);
        showToast("Added to cart.", "success");
        return true;
    } catch (error) {
        if (error.status === 409) {
            showClearCartPrompt(productId, quantity || 1, error.message);
        } else {
            showToast(error.message, "error");
        }
        return false;
    }
}

/**
 * Asks the buyer to clear the cart. If they agree, the cart is cleared and the
 * item is added again.
 */
function showClearCartPrompt(productId, quantity, message) {
    var existing = document.getElementById("clearCartPrompt");
    if (existing) existing.remove();

    var box = document.createElement("div");
    box.id = "clearCartPrompt";
    box.className = "toast toast-info";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-live", "assertive");
    box.innerHTML =
        '<p style="margin-bottom: 10px;">' + escapeHTML(message) + '</p>' +
        '<div style="display: flex; gap: 8px;">' +
            '<button type="button" class="btn btn-primary" id="clearCartConfirm">Clear cart and add</button>' +
            '<button type="button" class="btn btn-secondary" id="clearCartCancel">Keep my cart</button>' +
        '</div>';
    document.body.appendChild(box);

    document.getElementById("clearCartCancel").addEventListener("click", function () {
        box.remove();
    });

    document.getElementById("clearCartConfirm").addEventListener("click", async function () {
        box.remove();
        try {
            await CartService.clear();
            await CartService.addItem(productId, quantity);
            showToast("Cart cleared. Item added.", "success");
            updateCartCount();
        } catch (error) {
            showToast(error.message, "error");
        }
    });
}

/** Refreshes the cart count badge in the nav, if the nav has one. */
async function updateCartCount() {
    var badge = document.getElementById("cartCount");
    if (!badge || !Auth.isLoggedIn() || Auth.getRole() !== "BUYER") return;
    try {
        var cart = await CartService.get();
        badge.textContent = String(cart.items.reduce(function (n, line) { return n + line.quantity; }, 0));
        badge.hidden = cart.items.length === 0;
    } catch (error) {
        badge.hidden = true;
    }
}