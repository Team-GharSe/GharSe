/**
 * GharSe - Home page sections.
 *
 * Fills three areas on index.html from the backend:
 *   #homeCategoryGrid  categories from GET /v1/categories, each linking to
 *                      marketplace.html?category_id=<id>
 *   #homeTrendingGrid  products, sort "recommended" (verified first)
 *   #trendingProducts  products, sort "newest"
 * Each area shows a short message if it has no data or the request fails.
 *
 * Needs (in this order): core/utils.js, config.js, api.js, auth.js,
 * services/productService.js, toast.js, nav.js.
 */
var HomePage = {

    init: function () {
        this.fillCategories();
        this.fill("homeTrendingGrid", "recommended");
        this.fill("trendingProducts", "newest");
    },

    fillCategories: async function () {
        var grid = document.getElementById("homeCategoryGrid");
        if (!grid) return;

        try {
            var categories = await ProductService.getCategories();
            grid.setAttribute("aria-busy", "false");
            if (categories.length === 0) {
                grid.innerHTML = '<p style="color: var(--color-text-muted);">Categories will appear here soon.</p>';
                return;
            }
            grid.innerHTML = categories.map(this.categoryHTML, this).join("");
        } catch (error) {
            grid.setAttribute("aria-busy", "false");
            grid.innerHTML = '<p style="color: var(--color-text-muted);">Categories are unavailable right now.</p>';
        }
    },

    categoryHTML: function (c) {
        var href = "pages/marketplace/marketplace.html?category_id=" + encodeURIComponent(c.id);
        return '<a href="' + escapeAttr(href) + '" class="category-card">' +
                   '<span class="category-icon" aria-hidden="true">&#10022;</span>' +
                   '<span>' + escapeHTML(c.name) + '</span>' +
               '</a>';
    },

    fill: async function (gridId, sort) {
        var grid = document.getElementById(gridId);
        if (!grid) return;

        try {
            var result = await ProductService.search({ sort: sort, page: 1, pageSize: 4 });
            if (result.items.length === 0) {
                grid.innerHTML = '<p style="color: var(--color-text-muted);">No products yet. Check back soon.</p>';
                return;
            }
            grid.innerHTML = result.items.map(this.cardHTML, this).join("");
        } catch (error) {
            grid.innerHTML = '<p style="color: var(--color-text-muted);">Products are unavailable right now.</p>';
        }
    },

    cardHTML: function (p) {
        var image = p.imageUrl
            ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) +
              '" style="width: 100%; height: 100%; object-fit: cover;">'
            : '<span style="color: var(--color-text-muted);">' + escapeHTML(p.categoryName || "Handcrafted") + '</span>';

        return '<a class="metric-card" href="pages/marketplace/product.html?id=' + encodeURIComponent(p.id) +
            '" style="display: block; padding: 12px; text-decoration: none; color: inherit;">' +
                '<div style="aspect-ratio: 4 / 3; border-radius: 8px; background: #f3efe9; display: flex; ' +
                    'align-items: center; justify-content: center; overflow: hidden;">' + image + '</div>' +
                '<h3 style="font-size: 1rem; margin-top: 10px;">' + escapeHTML(p.name) + '</h3>' +
                '<p style="font-size: 0.88rem; color: var(--color-text-muted);">' + escapeHTML(p.sellerName || "") + '</p>' +
                '<p><strong>' + formatCurrency(p.price) + '</strong></p>' +
        '</a>';
    }
};

document.addEventListener("DOMContentLoaded", function () {
    HomePage.init();
});