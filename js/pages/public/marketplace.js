/**
 * GharSe - Marketplace page: search, filter, sort, "near me" and pagination.
 *
 * Replaces js/pages/marketplace.js (delete the old file once this page works).
 * All filtering, sorting, distance and paging happen on the backend through
 * GET /v1/products/search. This file only collects the inputs and draws the result.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/productService.js, toast.js, cart-action.js, nav.js.
 */
var MarketplacePage = {

    PAGE_SIZE: 12,
    SORTS: ["recommended", "newest", "price_asc", "price_desc"],
    SEARCH_DELAY_MS: 350,

    state: {
        q: "",
        categoryId: "",
        sort: "recommended",
        minPrice: "",
        maxPrice: "",
        near: null,        // { lat, lng } once the buyer shares a location
        radiusKm: "",
        page: 1
    },

    categories: [],
    pendingCategoryName: "",
    seq: 0,                // guards against out-of-order responses
    timer: null,
    el: {},

    init: async function () {
        var el = this.el;
        el.search = document.getElementById("searchInput");
        el.category = document.getElementById("categoryFilter");
        el.sort = document.getElementById("sortFilter");
        el.minPrice = document.getElementById("minPrice");
        el.maxPrice = document.getElementById("maxPrice");
        el.nearBtn = document.getElementById("nearMeBtn");
        el.radius = document.getElementById("radiusFilter");
        el.clear = document.getElementById("clearFilters");
        el.message = document.getElementById("filterMessage");
        el.summary = document.getElementById("resultsSummary");
        el.grid = document.getElementById("marketplaceGrid");
        el.pagination = document.getElementById("pagination");
        if (!el.grid) return;

        this.readUrl();
        await this.loadCategories();
        this.syncControls();
        this.bindEvents();
        this.search();
    },

    // ---------------------------------------------------------------
    // URL <-> state
    // ---------------------------------------------------------------

    cleanNumber: function (value) {
        if (value === null || value === undefined || value === "") return "";
        var n = Number(value);
        return (isFinite(n) && n >= 0) ? String(n) : "";
    },

    /**
     * Accepts ?category=Food (links from the home page use the category name),
     * ?category_id=3, ?q=, ?sort=, ?min_price=, ?max_price=, ?page=.
     */
    readUrl: function () {
        var params = new URLSearchParams(window.location.search);
        var s = this.state;

        s.q = (params.get("q") || "").trim();
        s.categoryId = params.get("category_id") || "";
        this.pendingCategoryName = (params.get("category") || "").trim();

        var sort = params.get("sort");
        s.sort = this.SORTS.indexOf(sort) !== -1 ? sort : "recommended";

        s.minPrice = this.cleanNumber(params.get("min_price"));
        s.maxPrice = this.cleanNumber(params.get("max_price"));

        var page = parseInt(params.get("page"), 10);
        s.page = page > 0 ? page : 1;
    },

    /** Keeps the address bar in step with the filters so refresh and Back work. */
    writeUrl: function () {
        var s = this.state;
        var params = new URLSearchParams();
        if (s.q) params.set("q", s.q);
        if (s.categoryId) params.set("category_id", s.categoryId);
        if (s.sort !== "recommended") params.set("sort", s.sort);
        if (s.minPrice !== "") params.set("min_price", s.minPrice);
        if (s.maxPrice !== "") params.set("max_price", s.maxPrice);
        if (s.page > 1) params.set("page", String(s.page));

        var query = params.toString();
        var url = window.location.pathname + (query ? "?" + query : "");
        try { window.history.replaceState(null, "", url); } catch (e) { /* ignore */ }
    },

    // ---------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------

    loadCategories: async function () {
        var page = this;
        try {
            page.categories = await ProductService.getCategories();
        } catch (error) {
            page.categories = [];   // the search itself still works without the dropdown
        }

        page.el.category.innerHTML = '<option value="">All Categories</option>' +
            page.categories.map(function (c) {
                return '<option value="' + escapeAttr(c.id) + '">' + escapeHTML(c.name) + '</option>';
            }).join("");

        if (!page.state.categoryId && page.pendingCategoryName) {
            var wanted = page.pendingCategoryName.toLowerCase();
            var match = page.categories.filter(function (c) {
                return c.name.toLowerCase() === wanted;
            })[0];
            if (match) page.state.categoryId = String(match.id);
        }

        // Drop a category id the dropdown doesn't know about.
        var known = page.categories.some(function (c) {
            return String(c.id) === String(page.state.categoryId);
        });
        if (!known) page.state.categoryId = "";
    },

    syncControls: function () {
        var s = this.state;
        var el = this.el;
        el.search.value = s.q;
        el.category.value = s.categoryId;
        el.sort.value = s.sort;
        el.minPrice.value = s.minPrice;
        el.maxPrice.value = s.maxPrice;
        el.radius.value = s.radiusKm;
        this.syncNearUi();
    },

    syncNearUi: function () {
        var on = !!this.state.near;
        this.el.nearBtn.textContent = on ? "Near me: on" : "Near me";
        this.el.nearBtn.classList.toggle("btn-primary", on);
        this.el.nearBtn.classList.toggle("btn-secondary", !on);
        this.el.nearBtn.setAttribute("aria-pressed", on ? "true" : "false");
        this.el.radius.hidden = !on;
    },

    bindEvents: function () {
        var page = this;
        var el = page.el;

        el.search.addEventListener("input", function () { page.onFilterChange(true); });
        el.minPrice.addEventListener("input", function () { page.onFilterChange(true); });
        el.maxPrice.addEventListener("input", function () { page.onFilterChange(true); });
        el.category.addEventListener("change", function () { page.onFilterChange(false); });
        el.sort.addEventListener("change", function () { page.onFilterChange(false); });

        el.radius.addEventListener("change", function () {
            page.state.radiusKm = el.radius.value;
            page.state.page = 1;
            page.search();
        });

        el.nearBtn.addEventListener("click", function () { page.toggleNear(); });
        el.clear.addEventListener("click", function () { page.clearFilters(); });

        el.pagination.addEventListener("click", function (event) {
            var btn = event.target.closest("[data-page]");
            if (!btn || btn.disabled) return;
            page.state.page = parseInt(btn.getAttribute("data-page"), 10) || 1;
            page.search();
            el.summary.scrollIntoView({ block: "start" });
        });

        el.grid.addEventListener("click", function (event) {
            var retry = event.target.closest("[data-action='retry']");
            if (retry) { page.search(); return; }

            var clear = event.target.closest("[data-action='clear']");
            if (clear) { page.clearFilters(); return; }

            var add = event.target.closest("[data-add-to-cart]");
            if (add && !add.disabled) {
                handleAddToCart(add.getAttribute("data-product-id"), 1);
            }
        });
    },

    // ---------------------------------------------------------------
    // Filters
    // ---------------------------------------------------------------

    /** Reads the inputs into state, then searches (after a short pause while typing). */
    onFilterChange: function (debounce) {
        var s = this.state;
        var el = this.el;
        s.q = el.search.value.trim();
        s.categoryId = el.category.value;
        s.sort = el.sort.value;
        s.minPrice = this.cleanNumber(el.minPrice.value);
        s.maxPrice = this.cleanNumber(el.maxPrice.value);
        s.page = 1;

        var page = this;
        clearTimeout(page.timer);
        if (debounce) {
            page.timer = setTimeout(function () { page.search(); }, page.SEARCH_DELAY_MS);
        } else {
            page.search();
        }
    },

    clearFilters: function () {
        clearTimeout(this.timer);
        var s = this.state;
        s.q = "";
        s.categoryId = "";
        s.sort = "recommended";
        s.minPrice = "";
        s.maxPrice = "";
        s.near = null;
        s.radiusKm = "";
        s.page = 1;
        this.syncControls();
        this.search();
    },

    setMessage: function (text) {
        this.el.message.textContent = text;
        this.el.message.hidden = !text;
    },

    validate: function () {
        var s = this.state;
        var message = "";
        if (s.minPrice !== "" && s.maxPrice !== "" && Number(s.minPrice) > Number(s.maxPrice)) {
            message = "The minimum price can't be higher than the maximum price.";
        }
        this.setMessage(message);
        return message === "";
    },

    // ---------------------------------------------------------------
    // Near me (browser GPS)
    // ---------------------------------------------------------------

    toggleNear: function () {
        var page = this;

        if (page.state.near) {
            page.state.near = null;
            page.state.radiusKm = "";
            page.el.radius.value = "";
            page.state.page = 1;
            page.syncNearUi();
            page.search();
            return;
        }

        if (!navigator.geolocation) {
            showToast("Your browser can't share a location.", "error");
            return;
        }

        var btn = page.el.nearBtn;
        btn.disabled = true;
        btn.textContent = "Locating...";

        navigator.geolocation.getCurrentPosition(
            function (position) {
                btn.disabled = false;
                page.state.near = {
                    lat: Number(position.coords.latitude.toFixed(5)),
                    lng: Number(position.coords.longitude.toFixed(5))
                };
                page.state.page = 1;
                page.syncNearUi();
                page.search();
            },
            function (error) {
                btn.disabled = false;
                page.syncNearUi();
                var text = "We couldn't get your location.";
                if (error && error.code === 1) {
                    text = "Location permission was denied. Allow it in your browser to sort by distance.";
                } else if (error && error.code === 3) {
                    text = "Finding your location took too long. Please try again.";
                }
                showToast(text, "error");
            },
            { timeout: 10000, maximumAge: 300000 }
        );
    },

    // ---------------------------------------------------------------
    // Search + render
    // ---------------------------------------------------------------

    buildParams: function () {
        var s = this.state;
        return {
            q: s.q,
            categoryId: s.categoryId,
            minPrice: s.minPrice,
            maxPrice: s.maxPrice,
            lat: s.near ? s.near.lat : "",
            lng: s.near ? s.near.lng : "",
            radiusKm: s.near ? s.radiusKm : "",
            sort: s.sort === "recommended" ? "" : s.sort,   // recommended is the backend default
            page: s.page,
            pageSize: this.PAGE_SIZE
        };
    },

    search: async function () {
        var page = this;
        if (!page.validate()) return;

        page.writeUrl();
        var seq = ++page.seq;
        page.setLoading(true);

        var result;
        try {
            result = await ProductService.search(page.buildParams());
        } catch (error) {
            if (seq !== page.seq) return;
            page.setLoading(false);
            page.renderError(error);
            return;
        }
        if (seq !== page.seq) return;   // a newer search is already running
        page.setLoading(false);

        // Asked for a page past the end (old link, or the filters shrank the list).
        if (result.items.length === 0 && page.state.page > result.totalPages) {
            page.state.page = result.totalPages;
            page.search();
            return;
        }

        page.render(result);
    },

    setLoading: function (on) {
        var grid = this.el.grid;
        grid.setAttribute("aria-busy", on ? "true" : "false");
        grid.classList.toggle("is-loading", on);
        if (on && !grid.querySelector(".preview-product-card")) {
            grid.innerHTML = '<div class="state-box"><p>Loading products...</p></div>';
        }
    },

    render: function (result) {
        var page = this;
        var el = page.el;

        if (result.items.length === 0) {
            el.summary.textContent = "No products match your filters.";
            el.pagination.innerHTML = "";
            el.grid.innerHTML =
                '<div class="state-box">' +
                    '<h3>No products found</h3>' +
                    '<p>Try a different search, or remove some filters.</p>' +
                    '<button class="btn btn-secondary" type="button" data-action="clear">Clear filters</button>' +
                '</div>';
            return;
        }

        var first = (result.page - 1) * result.pageSize + 1;
        var last = first + result.items.length - 1;
        // Only say "nearest" when the sort really is the distance-aware default.
        var nearNote = page.state.near && page.state.sort === "recommended"
            ? ", verified sellers first, then nearest"
            : "";
        el.summary.textContent = "Showing " + first + "-" + last + " of " + result.totalItems +
            (result.totalItems === 1 ? " product" : " products") + nearNote;

        el.grid.innerHTML = result.items.map(function (p) { return page.cardHTML(p); }).join("");

        // A broken image URL falls back to the plain tile instead of a broken icon.
        Array.prototype.forEach.call(el.grid.querySelectorAll(".preview-product-image img"), function (img) {
            img.addEventListener("error", function () {
                img.parentNode.classList.remove("has-image");
                img.remove();
            });
        });

        page.renderPagination(result);
    },

    cardHTML: function (p) {
        var typeLabel = p.fulfilmentType === "MADE_TO_ORDER" ? "Made to order"
                      : p.fulfilmentType === "READY_STOCK" ? "Ready stock" : "";

        var meta = [];
        if (p.isVerified) {
            meta.push('<span class="badge badge-success">Lab-tested</span>');
        }
        if (p.reviewCount > 0) {
            meta.push('<span class="rating" aria-label="Rated ' + escapeAttr(p.averageRating.toFixed(1)) +
                ' out of 5 from ' + escapeAttr(p.reviewCount) + ' reviews">' +
                '<span class="star" aria-hidden="true">&#9733;</span> ' + escapeHTML(p.averageRating.toFixed(1)) +
                ' (' + escapeHTML(p.reviewCount) + ')</span>');
        }
        if (typeLabel) {
            meta.push('<span>' + typeLabel + '</span>');
        }
        if (p.distanceKm !== null) {
            meta.push('<span>' + (p.distanceKm < 1 ? "Under 1 km away" : p.distanceKm.toFixed(1) + " km away") + '</span>');
        }

        var image = p.imageUrl
            ? '<img src="' + escapeAttr(p.imageUrl) + '" alt="' + escapeAttr(p.name) + '" loading="lazy">'
            : '';

        var detailsHref = 'product.html?id=' + encodeURIComponent(p.id);
        var cartButton = p.inStock
            ? '<button class="btn btn-primary" type="button" style="font-size: 0.8rem; flex: 1;" data-add-to-cart data-product-id="' +
                escapeAttr(p.id) + '">Add to Cart</button>'
            : '<button class="btn btn-secondary" type="button" style="font-size: 0.8rem; flex: 1;" disabled>Out of stock</button>';

        return '' +
            '<article class="preview-product-card">' +
                '<div class="preview-product-image' + (p.imageUrl ? ' has-image' : '') + '">' +
                    image +
                    '<span class="product-category">' + escapeHTML(p.categoryName || "General") + '</span>' +
                '</div>' +
                '<div class="preview-product-info">' +
                    '<p style="font-size: 0.78rem; color: var(--color-text-muted);">' + escapeHTML(p.sellerName || "Independent Maker") + '</p>' +
                    '<h3>' + escapeHTML(p.name) + '</h3>' +
                    '<strong>' + formatCurrency(p.price) + '</strong>' +
                    (meta.length ? '<div class="card-meta">' + meta.join("") + '</div>' : '') +
                    '<div style="margin-top: 14px; display: flex; gap: 8px;">' +
                        '<a href="' + escapeAttr(detailsHref) + '" class="btn btn-secondary" style="font-size: 0.8rem; flex: 1; text-align: center;">View Details</a>' +
                        cartButton +
                    '</div>' +
                '</div>' +
            '</article>';
    },

    renderPagination: function (result) {
        var el = this.el;
        if (result.totalPages <= 1) {
            el.pagination.innerHTML = "";
            return;
        }
        var current = result.page;
        el.pagination.innerHTML =
            '<button class="btn btn-secondary" type="button" data-page="' + (current - 1) + '"' +
                (current <= 1 ? ' disabled' : '') + '>Previous</button>' +
            '<span class="pagination-info">Page ' + current + ' of ' + result.totalPages + '</span>' +
            '<button class="btn btn-secondary" type="button" data-page="' + (current + 1) + '"' +
                (current >= result.totalPages ? ' disabled' : '') + '>Next</button>';
    },

    renderError: function (error) {
        var el = this.el;
        var notBuiltYet = error.status === 404 || error.status === 501;

        el.summary.textContent = "";
        el.pagination.innerHTML = "";
        el.grid.innerHTML =
            '<div class="state-box">' +
                '<h3>' + (notBuiltYet ? "Product search isn't available yet" : "We couldn't load products") + '</h3>' +
                '<p>' + escapeHTML(notBuiltYet
                    ? "This part of the marketplace is still being built. Please check back soon."
                    : error.message) + '</p>' +
                '<button class="btn btn-secondary" type="button" data-action="retry">Try again</button>' +
            '</div>';
    }
};

document.addEventListener("DOMContentLoaded", function () {
    MarketplacePage.init();
});