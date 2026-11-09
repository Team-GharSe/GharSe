/**
 * GharSe - Seller storefront.
 *
 * Shows one seller's name and their active products.
 * Seller: GET /v1/seller/{id}. Products: the public search, filtered to this seller
 * on the page. Pages through all search results so no product is missed.
 *
 * Needs (in this order): core/utils.js, config.js, api.js, auth.js,
 * services/productService.js, services/sellerService.js, toast.js, nav.js.
 */
var SellerStorePage = {

    init: async function () {
        this.container = document.getElementById("storeContainer");
        if (!this.container) return;

        var id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            this.renderNotFound();
            return;
        }
        await this.load(id);
    },

    load: async function (id) {
        var page = this;
        page.container.innerHTML = '<div class="state-box"><p>Loading store...</p></div>';

        var seller;
        try {
            seller = await SellerService.getPublic(id);
        } catch (error) {
            if (error.status === 404) {
                page.renderNotFound();
            } else {
                page.renderError(error, id);
            }
            return;
        }

        document.title = seller.businessName + " - GharSe";
        var ratingText = seller.averageRating === null
            ? "No reviews yet"
            : seller.averageRating.toFixed(1) + " average from " + seller.reviewCount +
              (seller.reviewCount === 1 ? " review" : " reviews");

        page.container.innerHTML =
            '<a href="marketplace.html" class="text-link back-link">&larr; Back to marketplace</a>' +
            '<header style="margin-top: 12px;">' +
                '<span class="eyebrow">Independent maker</span>' +
                '<h1 style="font-size: 2rem; margin-top: 6px;">' + escapeHTML(seller.businessName) + '</h1>' +
                '<p style="color: var(--color-text-muted); margin-top: 6px;">&#9733; ' + escapeHTML(ratingText) + '</p>' +
            '</header>' +
            '<h2 style="font-size: 1.3rem; margin-top: 28px;">Products</h2>' +
            '<div id="storeProducts" style="margin-top: 14px;">' +
                '<p style="color: var(--color-text-muted);">Loading products...</p>' +
            '</div>';

        try {
            var products = await page.productsFor(seller.id);
            page.renderProducts(products);
        } catch (error) {
            document.getElementById("storeProducts").innerHTML =
                '<p style="color: var(--color-text-muted);">Products couldn\'t be loaded right now.</p>';
        }
    },

    /** Walks every page of the public search and keeps this seller's products. */
    productsFor: async function (sellerId) {
        var matches = [];
        var pageNo = 1;
        while (true) {
            var result = await ProductService.search({ sort: "newest", page: pageNo, pageSize: 50 });
            result.items.forEach(function (p) {
                if (String(p.sellerId) === String(sellerId)) matches.push(p);
            });
            if (result.items.length === 0 || pageNo >= result.totalPages) break;
            pageNo++;
        }
        return matches;
    },

    renderProducts: function (products) {
        var box = document.getElementById("storeProducts");
        if (products.length === 0) {
            box.innerHTML = '<p style="color: var(--color-text-muted);">No products listed yet.</p>';
            return;
        }
        box.innerHTML =
            '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">' +
            products.map(this.cardHTML, this).join("") +
            '</div>';
    },

    cardHTML: function (p) {
        var image = p.imageUrl
            ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) +
              '" style="width: 100%; height: 100%; object-fit: cover;">'
            : '<span style="color: var(--color-text-muted);">' + escapeHTML(p.categoryName || "Handcrafted") + '</span>';

        return '<a class="metric-card" href="product.html?id=' + encodeURIComponent(p.id) +
            '" style="display: block; padding: 12px; text-decoration: none; color: inherit;">' +
                '<div style="aspect-ratio: 4 / 3; border-radius: 8px; background: #f3efe9; display: flex; ' +
                    'align-items: center; justify-content: center; overflow: hidden;">' + image + '</div>' +
                '<h3 style="font-size: 1rem; margin-top: 10px;">' + escapeHTML(p.name) + '</h3>' +
                (p.inStock === false ? '<p style="font-size: 0.85rem; color: #b42318;">Out of stock</p>' : '') +
                '<p><strong>' + formatCurrency(p.price) + '</strong></p>' +
        '</a>';
    },

    renderNotFound: function () {
        this.container.innerHTML =
            '<div class="state-box">' +
                '<h2>Store not found</h2>' +
                '<p>This maker may no longer be on GharSe.</p>' +
                '<a href="marketplace.html" class="btn btn-secondary">Return to marketplace</a>' +
            '</div>';
    },

    renderError: function (error, id) {
        var page = this;
        page.container.innerHTML =
            '<div class="state-box">' +
                '<h2>We couldn\'t load this store</h2>' +
                '<p>' + escapeHTML(error.message) + '</p>' +
                '<button class="btn btn-secondary" type="button" id="retryStore">Try again</button>' +
            '</div>';
        document.getElementById("retryStore").addEventListener("click", function () {
            page.load(id);
        });
    }
};

document.addEventListener("DOMContentLoaded", function () {
    SellerStorePage.init();
});