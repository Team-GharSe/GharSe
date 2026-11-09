/**
 * GharSe - Checkout service.
 *
 * Wraps: POST /v1/checkout/initiate, GET /v1/payments/{paymentId}/status.
 * Totals are server values only (NFR15). The browser never confirms payment:
 * only the status poll decides when the order exists (NFR4).
 *
 * Needs: js/config.js, js/api.js.
 */
var CheckoutService = (function () {

    function toNumber(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        var n = Number(value);
        return isNaN(n) ? fallback : n;
    }

    return {
        /** fulfilmentMode: SELF_DELIVERY | PICKUP | POSTAL. Returns the Razorpay order details. */
        initiate: async function (fulfilmentMode, deliveryAddress) {
            var raw = await Api.post("/checkout/initiate", {
                fulfilment_mode: fulfilmentMode,
                delivery_address: deliveryAddress || null
            });
            return {
                paymentId: toNumber(raw.payment_id, null),
                razorpayOrderId: String(raw.razorpay_order_id || ""),
                razorpayKeyId: String(raw.razorpay_key_id || ""),
                amount: toNumber(raw.amount, 0),
                currency: String(raw.currency || "INR")
            };
        },

        /** Returns { status, orderId }. orderId is null until the webhook books the order. */
        status: async function (paymentId) {
            var raw = await Api.get("/payments/" + encodeURIComponent(paymentId) + "/status");
            return {
                paymentId: toNumber(raw.payment_id, null),
                status: String(raw.status || ""),
                orderId: raw.order_id === null || raw.order_id === undefined ? null : toNumber(raw.order_id, null)
            };
        }
    };
})();