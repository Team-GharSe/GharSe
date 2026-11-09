/**
 * GharSe - Toast notifications and the login/role prompt modal.
 *
 * Moved out of js/cart/cart-ux.js. Behaviour is unchanged except that the
 * "Log Out" button now calls Auth.logout() (the old AuthController is gone)
 * and the link prefix comes from Nav.getRootPrefix().
 *
 * Needs: js/core/utils.js (escapeHTML), js/auth.js (Auth).
 * Uses the .modal-backdrop / .modal-content / .toast-stack CSS in components.css.
 */

function showToast(message, type) {
    type = type || "info";

    var stack = document.querySelector(".toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.className = "toast-stack";
        document.body.appendChild(stack);
    }

    var toast = document.createElement("div");
    toast.className = "toast toast-" + type;
    toast.textContent = message;
    stack.appendChild(toast);

    requestAnimationFrame(function () { toast.classList.add("show"); });

    setTimeout(function () {
        toast.classList.remove("show");
        setTimeout(function () { toast.remove(); }, 250);
    }, 3500);
}

/**
 * Shows a blocking modal explaining why Add to Cart isn't available.
 * reason: "guest" | "seller"
 */
function showLoginPrompt(reason) {
    var backdrop = document.getElementById("cartBlockModal");
    if (backdrop) backdrop.remove();

    var rootPrefix = (typeof Nav !== "undefined") ? Nav.getRootPrefix() : "../../";

    var isGuest = reason === "guest";

    var title = isGuest ? "Log in to shop" : "Switch to a buyer account";
    var message = isGuest
        ? "Create a buyer account or log in to add items to your cart and checkout."
        : "Seller accounts can't purchase items. Log out and create or use a buyer account to shop.";

    var actionsHTML = isGuest
        ? '<a href="' + rootPrefix + 'pages/auth/signup.html?role=buyer" class="btn btn-primary">Create Buyer Account</a>' +
          '<a href="' + rootPrefix + 'pages/auth/login.html" class="btn btn-secondary">Log In</a>'
        : '<button class="btn btn-primary" type="button" onclick="Auth.logout()">Log Out</button>' +
          '<a href="' + rootPrefix + 'pages/auth/signup.html?role=buyer" class="btn btn-secondary">Create Buyer Account</a>';

    backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.id = "cartBlockModal";
    backdrop.innerHTML =
        '<div class="modal-content" style="text-align: center;">' +
            '<h3 style="font-size: 1.4rem; margin-bottom: 10px;">' + escapeHTML(title) + '</h3>' +
            '<p style="color: var(--color-text-secondary); margin-bottom: 24px; line-height: 1.6;">' + escapeHTML(message) + '</p>' +
            '<div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">' +
                actionsHTML +
            '</div>' +
        '</div>';

    backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) backdrop.remove();
    });

    document.body.appendChild(backdrop);
    requestAnimationFrame(function () { backdrop.classList.add("active"); });
}