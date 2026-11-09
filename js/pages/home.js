/**
 * GharSe - Home page sections.
 *
 * Fills three areas on index.html from the backend:
 *   #homeCategoryGrid  categories from GET /v1/categories, each linking to
 *                      marketplace.html?category_id=<id>, with a drawing
 *   #trendingProducts  products, sort "newest"; products without a photo
 *                      show the drawing for their category
 * Each area shows a short message if it has no data or the request fails.
 *
 * Needs (in this order): core/utils.js, config.js, api.js, auth.js,
 * services/productService.js, toast.js, nav.js.
 */

var ART_BASE = "images/illustrations/";

// Keyword (lowercase) -> drawing file. The first keyword found in the
// category name wins. Anything unmatched gets ART_DEFAULT.
var CATEGORY_ART = [
    ["spice",    "spice-bowl.webp"],
    ["masala",   "spice-bowl.webp"],
    ["bakery",   "sourdough-loaf.webp"],
    ["bread",    "sourdough-loaf.webp"],
    ["cake",     "sourdough-loaf.webp"],
    ["tailor",   "needle-fabric.webp"],
    ["sew",      "needle-fabric.webp"],
    ["fabric",   "needle-fabric.webp"],
    ["bag",      "jute-bag.webp"],
    ["craft",    "jute-bag.webp"],
    ["pottery",  "clay-pot.webp"],
    ["clay",     "clay-pot.webp"],
    ["kitchen",  "clay-pot.webp"],
    ["gift",     "basket-gift.webp"],
    ["pack",     "parcel-olive.webp"]
];
var ART_DEFAULT = "leaf.webp";

function artFor(name) {
    var n = String(name || "").toLowerCase();
    for (var i = 0; i < CATEGORY_ART.length; i++) {
        if (n.indexOf(CATEGORY_ART[i][0]) !== -1) {
            return ART_BASE + CATEGORY_ART[i][1];
        }
    }
    return ART_BASE + ART_DEFAULT;
}

var HomePage = {

    init: function () {
        this.fillCategories();
        this.fill("trendingProducts", "newest");
    },

    fillCategories: async function () {
        var grid = document.getElementById("homeCategoryGrid");
        if (!grid) return;

        try {
            var categories = await ProductService.getCategories();
            grid.setAttribute("aria-busy", "false");
            if (categories.length === 0) {
                grid.innerHTML = '<p class="state-message">Categories will appear here soon.</p>';
                return;
            }
            grid.innerHTML = categories.map(this.categoryHTML, this).join("");
        } catch (error) {
            grid.setAttribute("aria-busy", "false");
            grid.innerHTML = '<p class="state-message">Categories are unavailable right now.</p>';
        }
    },

    categoryHTML: function (c) {
        var href = "pages/marketplace/marketplace.html?category_id=" + encodeURIComponent(c.id);
        return '<a href="' + escapeAttr(href) + '" class="category-card">' +
                   '<img class="category-art" src="' + escapeAttr(artFor(c.name)) +
                   '" alt="" loading="lazy">' +
                   '<span>' + escapeHTML(c.name) + '</span>' +
               '</a>';
    },

    fill: async function (gridId, sort) {
        var grid = document.getElementById(gridId);
        if (!grid) return;

        try {
            var result = await ProductService.search({ sort: sort, page: 1, pageSize: 4 });
            if (result.items.length === 0) {
                grid.innerHTML = '<p class="state-message">No products yet. Check back soon.</p>';
                return;
            }
            grid.innerHTML = result.items.map(this.cardHTML, this).join("");
        } catch (error) {
            grid.innerHTML = '<p class="state-message">Products are unavailable right now.</p>';
        }
    },

    cardHTML: function (p) {
        var image = p.imageUrl
            ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) + '" loading="lazy">'
            : '<img class="card-art" src="' + escapeAttr(artFor(p.categoryName)) +
              '" alt="" loading="lazy">';

        var badge = p.isVerified
            ? '<span class="badge badge-success">Verified</span>'
            : '';

        return '<a class="product-card" href="pages/marketplace/product.html?id=' + encodeURIComponent(p.id) + '">' +
            '<div class="product-card-media">' + image + '</div>' +
            '<div class="product-card-body">' +
                badge +
                '<h3 class="product-card-title">' + escapeHTML(p.name) + '</h3>' +
                '<p class="product-card-seller">' + escapeHTML(p.sellerName || "") + '</p>' +
                '<p class="product-card-price">' + formatCurrency(p.price) + '</p>' +
            '</div>' +
        '</a>';
    }
};

document.addEventListener("DOMContentLoaded", function () {
    HomePage.init();
});