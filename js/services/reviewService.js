/**
 * GharSe - Review service (buyer side).
 *
 * Wraps: POST /v1/order-items/{orderItemId}/review.
 * The server checks ownership, DELIVERED status and one review per item.
 * Needs: js/config.js, js/api.js.
 */
var ReviewService = (function () {
    return {
        /** rating: integer 1-5. comment: optional text up to 1000 characters. */
        create: async function (orderItemId, rating, comment) {
            var raw = await Api.post("/order-items/" + encodeURIComponent(orderItemId) + "/review", {
                rating: Number(rating),
                comment: comment ? String(comment) : null
            });
            return raw;
        }
    };
})();