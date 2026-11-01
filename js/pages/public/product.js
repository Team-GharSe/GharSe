/**
 * GharSe - Product detail page.
 *
 * Data comes from three public endpoints:
 *   GET /v1/products/{id}          the listing
 *   GET /v1/products/{id}/eta      stock (ready-stock) or estimated ready date (made-to-order)
 *   GET /v1/products/{id}/reviews  reviews
 * The page never works out stock, ETA or ratings itself; it only displays them.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/productService.js, toast.js, cart-action.js, nav.js.
 */
var ProductPage = {

    product: null,
    stockBlocked: false,   // set from the ETA response (ready-stock and none left)
    el: {},

    init: async function () {
        this.el.container = document.getElementById("productContainer");
        if (!this.el.container) return;

        var id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            this.renderNotFound();
            return;
        }
        await this.load(id);
    },

    // In load(), right after page.product = await ProductService.getById(id) succeeds,
// add a reset at the start of load(). Replace the first lines of load() with:

    load: async function (id) {
        var page = this;
        page.stockBlocked = false;   // reset on every load (audit: stale flag)
        page.el.container.innerHTML = '<div class="state-box"><p>Loading product...</p></div>';

        try {
            page.product = await ProductService.getById(id);
        } catch (error) {
            if (error.status === 404) {
                page.renderNotFound();
            } else {
                page.renderError(error, id);
            }
            return;
        }

        document.title = page.product.name + " - GharSe";
        page.render();

        // Availability and reviews load after the page is shown; a failure in
        // either must not break the rest of the page.
        page.loadEta();
        page.loadReviews();
    },

    // ---------------------------------------------------------------
    // Main render
    // ---------------------------------------------------------------

    render: function () {
        var p = this.product;

        var sellerLink = p.sellerId !== null && p.sellerId !== undefined
            ? '<a href="seller-store.html?id=' + escapeAttr(encodeURIComponent(p.sellerId)) + '" class="text-link"><strong>' +
                escapeHTML(p.sellerName || "Independent GharSe") + '</strong></a>'
            : '<strong>' + escapeHTML(p.sellerName || "Independent GharSe") + '</strong>';

        var badges = '<span class="badge badge-success">' + escapeHTML(p.categoryName || "General") + '</span>';
        if (p.isVerified) badges += '<span class="badge badge-success">Lab-tested &amp; verified</span>';
        if (p.fulfilmentType === "MADE_TO_ORDER") badges += '<span class="badge badge-neutral">Made to order</span>';
        if (p.fulfilmentType === "READY_STOCK") badges += '<span class="badge badge-neutral">Ready stock</span>';

        var rating = p.reviewCount > 0
            ? '<p class="rating" style="margin-top: 10px;" aria-label="Rated ' + escapeAttr(p.averageRating.toFixed(1)) +
                ' out of 5 from ' + escapeAttr(p.reviewCount) + ' reviews">' +
                '<span class="star" aria-hidden="true">&#9733;</span> ' + escapeHTML(p.averageRating.toFixed(1)) +
                ' <span style="font-weight: 400; color: var(--color-text-muted);">(' + escapeHTML(p.reviewCount) +
                (p.reviewCount === 1 ? ' review' : ' reviews') + ')</span></p>'
            : '<p style="margin-top: 10px; font-size: 0.9rem; color: var(--color-text-muted);">No reviews yet</p>';

        this.el.container.innerHTML =
            '<a href="marketplace.html" class="text-link back-link">&larr; Back to marketplace</a>' +
            '<div class="product-detail-grid">' +
                '<div>' +
                    '<div class="gallery-main" id="galleryMain"></div>' +
                    '<div class="gallery-thumbs" id="galleryThumbs"></div>' +
                '</div>' +
                '<div>' +
                    '<div class="product-badges">' + badges + '</div>' +
                    '<h1 class="product-title">' + escapeHTML(p.name) + '</h1>' +
                    '<p style="margin-top: 8px;">Made by ' + sellerLink + '</p>' +
                    rating +
                    '<h2 class="product-price">' + formatCurrency(p.price) + '</h2>' +
                    '<p class="availability" id="availability" aria-live="polite">Checking availability...</p>' +
                    '<p style="margin-top: 20px; line-height: 1.6;">' +
                        escapeHTML(p.description || "Authentic product handcrafted by independent women entrepreneurs.") + '</p>' +
                    this.fulfilmentHTML(p) +
                    '<div class="purchase-box">' +
                        '<input type="number" id="productQty" class="form-control" min="1" value="1" inputmode="numeric" aria-label="Quantity">' +
                        '<button class="btn btn-primary btn-large" id="addToCartBtn" type="button" style="flex: 1;">Add to Cart</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<section class="reviews-section" aria-labelledby="reviewsHeading">' +
                '<h2 id="reviewsHeading" style="font-size: 1.6rem;">Reviews</h2>' +
                '<div id="reviewsList" style="margin-top: 12px;"><p style="color: var(--color-text-muted);">Loading reviews...</p></div>' +
            '</section>';

        this.renderGallery(0);
        this.bindPurchase();

        // The listing says ready-stock is sold out: block the button right away.
                if (p.inStock === false) this.el.container.querySelector("#availability").classList.add("is-out");
    },

    fulfilmentHTML: function (p) {
        var rows = [];
        if (p.supportsSelfDelivery) {
            rows.push("Delivered by the seller" +
                (p.deliveryRadiusKm !== null ? " within " + p.deliveryRadiusKm + " km" : ""));
        }
        if (p.supportsPickup) rows.push("Pick up from the seller");
        if (p.supportsPostal) rows.push("Sent by post");
        if (p.fulfilmentType === "MADE_TO_ORDER" && p.productionTimeMinutesPerUnit !== null) {
            rows.push("Prepared to order: about " + this.formatDuration(p.productionTimeMinutesPerUnit) + " per item");
        }
        if (rows.length === 0) return "";

        return '<ul class="info-list">' +
            rows.map(function (r) { return '<li>' + escapeHTML(r) + '</li>'; }).join("") +
            '</ul>';
    },

    formatDuration: function (minutes) {
        if (minutes < 60) return minutes + " min";
        var hours = Math.floor(minutes / 60);
        var rest = minutes % 60;
        return hours + " hr" + (rest ? " " + rest + " min" : "");
    },

    // ---------------------------------------------------------------
    // Gallery
    // ---------------------------------------------------------------

    renderGallery: function (index) {
        var p = this.product;
        var main = document.getElementById("galleryMain");
        var thumbs = document.getElementById("galleryThumbs");
        if (!main || !thumbs) return;

        if (p.images.length === 0) {
            main.innerHTML = '<span class="gallery-placeholder">' + escapeHTML(p.categoryName || "Handcrafted") + '</span>';
            thumbs.innerHTML = "";
            return;
        }

        var page = this;
        main.innerHTML = '<img src="' + escapeAttr(p.images[index]) + '" alt="' + escapeAttr(p.name) + '">';
        var mainImg = main.querySelector("img");
        mainImg.addEventListener("error", function () {
            main.innerHTML = '<span class="gallery-placeholder">' + escapeHTML(p.categoryName || "Handcrafted") + '</span>';
        });

        if (p.images.length < 2) {
            thumbs.innerHTML = "";
            return;
        }

        thumbs.innerHTML = p.images.map(function (url, i) {
            return '<button type="button" class="gallery-thumb' + (i === index ? ' active' : '') +
                '" data-index="' + i + '" aria-label="Show photo ' + (i + 1) + '">' +
                '<img src="' + escapeAttr(url) + '" alt=""></button>';
        }).join("");

        Array.prototype.forEach.call(thumbs.querySelectorAll(".gallery-thumb"), function (btn) {
            btn.addEventListener("click", function () {
                page.renderGallery(parseInt(btn.getAttribute("data-index"), 10));
            });
        });
    },

    // ---------------------------------------------------------------
    // Availability (ETA)
    // ---------------------------------------------------------------

    loadEta: async function () {
        var page = this;
        var el = document.getElementById("availability");
        if (!el) return;

        var eta;
        try {
            eta = await ProductService.getEta(page.product.id);
        } catch (error) {
            el.textContent = "Availability will be confirmed at checkout.";
            return;
        }

        if (page.product.fulfilmentType === "MADE_TO_ORDER" || eta.estimatedReadyDate) {
            var date = page.formatDate(eta.estimatedReadyDate);
            el.textContent = date
                ? "Made to order. Estimated ready by " + date + "."
                : "Made to order. We'll confirm the ready date at checkout.";
            return;
        }

        if (eta.inStock === false) {
            el.textContent = "Out of stock";
            el.classList.add("is-out");
            return;
        }

        if (eta.quantityRemaining !== null) {
            el.textContent = "In stock: " + eta.quantityRemaining + " available";
        } else {
            el.textContent = "In stock";
        }
    },

    /** "2026-10-20" or an ISO timestamp -> "20 Oct 2026". Returns "" if unreadable. */
    formatDate: function (value) {
        if (!value) return "";
        var text = String(value);
        var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
        var date = match
            ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
            : new Date(text);
        if (isNaN(date.getTime())) return "";
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    },

    // ---------------------------------------------------------------
    // Purchase box
    // ---------------------------------------------------------------

    // Replace bindPurchase() entirely:

    bindPurchase: function () {
        var page = this;
        var btn = document.getElementById("addToCartBtn");
        if (!btn) return;

        btn.addEventListener("click", function () {
            if (page.stockBlocked) return;
            var input = document.getElementById("productQty");
            var qty = parseInt(input.value, 10);
            if (isNaN(qty) || qty < 1) qty = 1;

            // No stock check here: the backend owns stock and answers at cart/checkout (NFR15).
            handleAddToCart(page.product.id, qty);
        });
    },

    blockPurchase: function (label) {
        this.stockBlocked = true;
        var btn = document.getElementById("addToCartBtn");
        var qty = document.getElementById("productQty");
        if (btn) {
            btn.disabled = true;
            btn.textContent = label;
            btn.classList.remove("btn-primary");
            btn.classList.add("btn-secondary");
        }
        if (qty) qty.disabled = true;
    },

    // ---------------------------------------------------------------
    // Reviews
    // ---------------------------------------------------------------

    loadReviews: async function () {
        var list = document.getElementById("reviewsList");
        if (!list) return;

        var reviews;
        try {
            reviews = await ProductService.getReviews(this.product.id);
        } catch (error) {
            list.innerHTML = '<p style="color: var(--color-text-muted);">Reviews couldn\'t be loaded right now.</p>';
            return;
        }

        if (reviews.length === 0) {
            list.innerHTML = '<p style="color: var(--color-text-muted);">No reviews yet. Reviews appear here once a buyer has received this product.</p>';
            return;
        }

        var page = this;
        list.innerHTML = reviews.map(function (r) {
            var rating = Math.max(0, Math.min(5, Math.round(r.rating)));
            var stars = "&#9733;".repeat(rating) + "&#9734;".repeat(5 - rating);
            var date = page.formatDate(r.createdAt);

            return '<div class="review-item">' +
                '<div class="review-head">' +
                    '<span class="review-stars" role="img" aria-label="' + rating + ' out of 5">' + stars + '</span>' +
                    '<span style="font-size: 0.82rem; color: var(--color-text-muted);">' +
                        escapeHTML([r.reviewerName, date].filter(Boolean).join(" · ")) + '</span>' +
                '</div>' +
                (r.comment ? '<p style="margin-top: 6px;">' + escapeHTML(r.comment) + '</p>' : '') +
            '</div>';
        }).join("");
    },

    // ---------------------------------------------------------------
    // Error states
    // ---------------------------------------------------------------

    renderNotFound: function () {
        this.el.container.innerHTML =
            '<div class="state-box">' +
                '<h2>Product not found</h2>' +
                '<p>This product may have been removed.</p>' +
                '<a href="marketplace.html" class="btn btn-secondary">Return to marketplace</a>' +
            '</div>';
    },

    renderError: function (error, id) {
        var page = this;
        page.el.container.innerHTML =
            '<div class="state-box">' +
                '<h2>We couldn\'t load this product</h2>' +
                '<p>' + escapeHTML(error.message) + '</p>' +
                '<button class="btn btn-secondary" type="button" id="retryProduct">Try again</button>' +
            '</div>';
        document.getElementById("retryProduct").addEventListener("click", function () {
            page.load(id);
        });
    }
};

document.addEventListener("DOMContentLoaded", function () {
    ProductPage.init();
});