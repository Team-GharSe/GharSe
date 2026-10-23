/**
 * GharSe - Cart service.
 *
 * Wraps: GET /v1/cart, POST /v1/cart/items, PUT /v1/cart/items/{productId},
 *        DELETE /v1/cart/items/{productId}, DELETE /v1/cart.
 * Every call returns the full CartView from the server. The browser never
 * recalculates totals (NFR15).
 *
 * Needs: js/config.js, js/api.js.
 */
var CartService = (function () {

    function toNumber(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        var n = Number(value);
        return isNaN(n) ? fallback : n;
    }

    function normalizeLine(raw) {
        return {
            productId: toNumber(raw.productId, null),
            name: String(raw.name || ""),
            unitPrice: toNumber(raw.unitPrice, 0),
            quantity: toNumber(raw.quantity, 0),
            lineTotal: toNumber(raw.lineTotal, 0),
            available: raw.available !== false
        };
    }

    function normalizeCart(raw) {
        var items = Array.isArray(raw && raw.items) ? raw.items : [];
        return {
            sellerProfileId: raw && raw.sellerProfileId !== undefined ? raw.sellerProfileId : null,
            sellerName: raw && raw.sellerName ? String(raw.sellerName) : "",
            items: items.map(normalizeLine),
            subtotal: toNumber(raw && raw.subtotal, 0)
        };
    }

    function itemPath(productId) {
        return "/cart/items/" + encodeURIComponent(productId);
    }

    return {
        /** Returns the normalized CartView. An empty cart has items: []. */
        get: async function () {
            return normalizeCart(await Api.get("/cart"));
        },

        /** Rejects with a 409 error whose message is the server's text (another seller's cart). */
        addItem: async function (productId, quantity) {
            return normalizeCart(await Api.post("/cart/items", {
                productId: Number(productId),
                quantity: Number(quantity) || 1
            }));
        },

        updateQuantity: async function (productId, quantity) {
            return normalizeCart(await Api.put(itemPath(productId), { quantity: Number(quantity) }));
        },

        removeItem: async function (productId) {
            return normalizeCart(await Api.del(itemPath(productId)));
        },

        clear: async function () {
            return normalizeCart(await Api.del("/cart"));
        }
    };
})();