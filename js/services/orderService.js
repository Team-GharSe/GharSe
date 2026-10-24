/**
 * GharSe - Buyer order service.
 *
 * Wraps: GET /v1/orders/me, GET /v1/orders/{orderId}.
 * Totals are not computed here (NFR15). The server sends none, so the page
 * shows item price and quantity only.
 *
 * Needs: js/config.js, js/api.js.
 */
var OrderService = (function () {

    var STATUS_STEPS = ["CONFIRMED", "IN_PRODUCTION", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

    function toNumber(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        var n = Number(value);
        return isNaN(n) ? fallback : n;
    }

    function normalizeItem(raw) {
        return {
            orderItemId: raw.orderItemId,
            productId: raw.productId,
            name: String(raw.productNameSnapshot || ""),
            unitPrice: toNumber(raw.priceSnapshot, 0),
            quantity: toNumber(raw.quantity, 0)
        };
    }

    function normalizeOrder(raw) {
        return {
            orderId: raw.orderId,
            status: String(raw.status || ""),
            fulfilmentMode: String(raw.fulfilmentModeSelected || ""),
            deliveryAddress: raw.deliveryAddressSnapshot || "",
            createdAt: raw.createdAt ? new Date(raw.createdAt) : null,
            updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : null,
            items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : []
        };
    }

    return {
        STATUS_STEPS: STATUS_STEPS,

        listMine: async function () {
            var data = await Api.get("/orders/me");
            return Array.isArray(data) ? data.map(normalizeOrder) : [];
        },

        getById: async function (orderId) {
            return normalizeOrder(await Api.get("/orders/" + encodeURIComponent(orderId)));
        }
    };
})();