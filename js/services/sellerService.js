/**
 * GharSe - Seller service (public side).
 *
 * Wraps: GET /v1/seller/{sellerProfileId}  (public, see SecurityConfig)
 * Needs: js/config.js, js/api.js.
 */
var SellerService = (function () {
    return {
        /** Returns { id, businessName, latitude, longitude }. Rejects with status 404 if not found. */
        getPublic: async function (sellerProfileId) {
            var raw = await Api.get("/seller/" + encodeURIComponent(sellerProfileId));
            return {
                id: raw.id,
                businessName: String(raw.businessName || ""),
                latitude: raw.latitude,
                longitude: raw.longitude
            };
        }
    };
})();