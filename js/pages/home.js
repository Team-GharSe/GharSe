/**
 * GharSe - Home page product sections.
 *
 * Fills two grids on index.html from the public search endpoint:
 *   #homeTrendingGrid  sort "recommended" (verified first)
 *   #trendingProducts  sort "newest"
 * Shows a short message if there are no products or the request fails.
 *
 * Needs (in this order): core/utils.js, config.js, api.js, auth.js,
 * services/productService.js, toast.js, nav.js.
 */
var HomePage = {

    init: function () {
        this.fill("homeTrendingGrid", "recommended");
        this.fill("trendingProducts", "newest");
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