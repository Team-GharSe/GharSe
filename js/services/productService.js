/**
 * GharSe - Product / catalog service.
 *
 * Wraps: GET /v1/products/search, /v1/products/{id}, /v1/products/{id}/eta,
 *        /v1/products/{id}/reviews, /v1/categories,
 *        GET /v1/seller/me/products, DELETE /v1/products/{id}.
 *
 * All knowledge of the backend's field names lives in this file. If the backend
 * names a field differently, fix it in the normalize* functions below and no
 * page needs to change. Each field is read by camelCase name first, then by its
 * snake_case twin (productId, then product_id).
 *
 * Needs: js/api.js.
 */
var ProductService = (function () {

    function toSnake(name) {
        return name.replace(/([A-Z])/g, "_$1").toLowerCase();
    }

    /** First defined, non-null value among the given field names. */
    function pick(obj, names, fallback) {
        if (!obj) return fallback;
        for (var i = 0; i < names.length; i++) {
            var camel = names[i];
            if (obj[camel] !== undefined && obj[camel] !== null) return obj[camel];
            var snake = toSnake(camel);
            if (obj[snake] !== undefined && obj[snake] !== null) return obj[snake];
        }
        return fallback;
    }

    function toNumber(value, fallback) {
        if (value === null || value === undefined || value === "") return fallback;
        var n = Number(value);
        return isNaN(n) ? fallback : n;
    }

    /** Accepts a bare array or a paged wrapper ({items} / {content}). */
    function toList(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
        if (data && Array.isArray(data.content)) return data.content;
        return [];
    }

    function normalizeSummary(raw) {
        return {
            id: pick(raw, ["productId", "id"], null),
            name: String(pick(raw, ["name"], "")),
            price: toNumber(pick(raw, ["price"], null), 0),
            categoryId: pick(raw, ["categoryId"], null),
            categoryName: String(pick(raw, ["categoryName", "category"], "")),
            sellerId: pick(raw, ["sellerProfileId", "sellerId"], null),
            sellerName: String(pick(raw, ["sellerName", "businessName"], "")),
            fulfilmentType: String(pick(raw, ["fulfilmentType"], "")),
            inStock: pick(raw, ["inStock"], true) !== false,
            imageUrl: pick(raw, ["imageUrl", "primaryImageUrl"], null),
            isVerified: pick(raw, ["isVerified", "verified"], false) === true,
            averageRating: toNumber(pick(raw, ["averageRating"], null), 0),
            reviewCount: toNumber(pick(raw, ["reviewCount"], null), 0),
            distanceKm: toNumber(pick(raw, ["distanceKm"], null), null)
        };
    }

    function normalizeDetail(raw) {
        var product = normalizeSummary(raw);

        var images = [];
        var rawImages = pick(raw, ["images"], []);
        if (Array.isArray(rawImages)) {
            rawImages = rawImages.slice().sort(function (a, b) {
                return toNumber(pick(a, ["displayOrder"], 0), 0) - toNumber(pick(b, ["displayOrder"], 0), 0);
            });
            rawImages.forEach(function (img) {
                var url = (typeof img === "string") ? img : pick(img, ["imageUrl", "url"], null);
                if (url) images.push(url);
            });
        }
        if (images.length === 0 && product.imageUrl) images.push(product.imageUrl);

        product.images = images;
        product.description = String(pick(raw, ["description"], ""));
        product.supportsSelfDelivery = pick(raw, ["supportsSelfDelivery"], false) === true;
        product.supportsPickup = pick(raw, ["supportsPickup"], false) === true;
        product.supportsPostal = pick(raw, ["supportsPostal"], false) === true;
        product.deliveryRadiusKm = toNumber(pick(raw, ["deliveryRadiusKm"], null), null);
        product.productionTimeMinutesPerUnit = toNumber(pick(raw, ["productionTimeMinutesPerUnit"], null), null);
        return product;
    }

    /** Seller's own listing: adds the active flag and the stock/production fields the form needs. */
    function normalizeOwn(raw) {
        var product = normalizeSummary(raw);
        product.description = String(pick(raw, ["description"], ""));
        product.active = pick(raw, ["active"], true) !== false;
        product.inventoryQty = toNumber(pick(raw, ["inventoryQty"], null), null);
        product.productionTimeMinutesPerUnit = toNumber(pick(raw, ["productionTimeMinutesPerUnit"], null), null);
        product.supportsSelfDelivery = pick(raw, ["supportsSelfDelivery"], false) === true;
        product.supportsPickup = pick(raw, ["supportsPickup"], false) === true;
        product.supportsPostal = pick(raw, ["supportsPostal"], false) === true;
        product.deliveryRadiusKm = toNumber(pick(raw, ["deliveryRadiusKm"], null), null);
        return product;
    }

    function normalizeEta(raw) {
        return {
            inStock: pick(raw, ["inStock"], null),
            quantityRemaining: toNumber(pick(raw, ["quantityRemaining"], null), null),
            estimatedReadyDate: pick(raw, ["estimatedReadyDate"], null)
        };
    }

    function normalizeReview(raw) {
        return {
            id: pick(raw, ["reviewId", "id"], null),
            rating: toNumber(pick(raw, ["rating"], null), 0),
            comment: String(pick(raw, ["comment"], "")),
            createdAt: pick(raw, ["createdAt"], null),
            reviewerName: String(pick(raw, ["reviewerName", "buyerName"], ""))
        };
    }

    function normalizeCategory(raw) {
        return {
            id: pick(raw, ["categoryId", "id"], null),
            name: String(pick(raw, ["name"], ""))
        };
    }

    function productPath(productId) {
        return "/products/" + encodeURIComponent(productId);
    }

    return {

        /**
         * options: { q, categoryId, minPrice, maxPrice, lat, lng, radiusKm,
         *            sort, page (1-based), pageSize }
         * Returns { items, page, pageSize, totalItems, totalPages }.
         */
        search: async function (options) {
            options = options || {};
            var requestedPage = toNumber(options.page, 1);
            var requestedSize = toNumber(options.pageSize, 12);

            var data = await Api.get("/products/search", {
                q: options.q,
                category_id: options.categoryId,
                min_price: options.minPrice,
                max_price: options.maxPrice,
                lat: options.lat,
                lng: options.lng,
                radius_km: options.radiusKm,
                sort: options.sort,
                page: requestedPage,
                page_size: requestedSize
            });

            var items = toList(data).map(normalizeSummary);
            var pageSize = toNumber(pick(data, ["pageSize"], null), requestedSize);
            var totalItems = toNumber(pick(data, ["totalItems", "totalElements"], null), items.length);
            var totalPages = toNumber(pick(data, ["totalPages"], null), Math.ceil(totalItems / pageSize));

            return {
                items: items,
                page: toNumber(pick(data, ["page"], null), requestedPage),
                pageSize: pageSize,
                totalItems: totalItems,
                totalPages: Math.max(1, totalPages)
            };
        },

        getById: async function (productId) {
            return normalizeDetail(await Api.get(productPath(productId)));
        },

        /** READY_STOCK -> { inStock, quantityRemaining }; MADE_TO_ORDER -> { estimatedReadyDate } */
        getEta: async function (productId) {
            return normalizeEta(await Api.get(productPath(productId) + "/eta"));
        },

        getReviews: async function (productId) {
            return toList(await Api.get(productPath(productId) + "/reviews")).map(normalizeReview);
        },

        getCategories: async function () {
            return toList(await Api.get("/categories")).map(normalizeCategory);
        },

        /** Seller's own listings, active and removed (includes is_active = false). */
        getMine: async function () {
            return toList(await Api.get("/seller/me/products")).map(normalizeOwn);
        },

        /** Create: POST /v1/products. Body is ProductRequest. */
        create: async function (payload) {
            return Api.post("/products", payload);
        },

        /** Edit: PUT /v1/products/{id}. Body is ProductRequest. */
        update: async function (productId, payload) {
            return Api.put(productPath(productId), payload);
        },

        /** Soft delete: DELETE /v1/products/{id}. The server sets is_active = false. */
        deactivate: async function (productId) {
            return Api.del(productPath(productId));
        }
    };
})();