/**
 * GharSe - Seller product list.
 *
 * Data: GET /v1/seller/me/products (active and removed listings; split here).
 * Remove: DELETE /v1/products/{id}, a soft delete (the server sets is_active = false).
 * Edit: links to product-form.html?id=... (module C step 2).
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/productService.js, toast.js, nav.js, seller-guard.js.
 */
var SellerProductsPage = {

    products: [],
    filter: "active",   // "active" | "removed"
    el: {},

    init: function () {
        var page = this;
        page.el.list = document.getElementById("productList");
        page.el.counts = document.getElementById("productCounts");
        page.el.tabs = Array.prototype.slice.call(document.querySelectorAll("[data-filter]"));
        if (!page.el.list) return;

        page.el.tabs.forEach(function (tab) {
            tab.addEventListener("click", function () {
                page.filter = tab.getAttribute("data-filter");
                page.renderTabs();
                page.render();
            });
        });

        // One listener for the whole list (cards are re-rendered often).
        page.el.list.addEventListener("click", function (event) {
            var btn = event.target.closest ? event.target.closest("[data-remove]") : null;
            if (!btn) return;
            page.remove(page.findProduct(btn.getAttribute("data-remove")));
        });

        page.load();
    },

    load: async function () {
        var page = this;
        page.el.list.innerHTML = '<div class="state-box"><p>Loading your products...</p></div>';

        try {
            page.products = await ProductService.getMine();
        } catch (error) {
            page.el.list.innerHTML =
                '<div class="state-box">' +
                    '<h2>We couldn\'t load your products</h2>' +
                    '<p>' + escText(error.message || "Please try again.") + '</p>' +
                    '<button class="btn btn-secondary" type="button" id="retryProducts">Try again</button>' +
                '</div>';
            document.getElementById("retryProducts").addEventListener("click", function () {
                page.load();
            });
            return;
        }

        page.renderTabs();
        page.render();
    },

    findProduct: function (id) {
        for (var i = 0; i < this.products.length; i++) {
            if (String(this.products[i].id) === String(id)) return this.products[i];
        }
        return null;
    },

    visibleProducts: function () {
        var wantActive = this.filter === "active";
        return this.products.filter(function (p) { return p.active === wantActive; });
    },

    renderTabs: function () {
        var activeCount = this.products.filter(function (p) { return p.active; }).length;
        var removedCount = this.products.length - activeCount;
        var counts = { active: activeCount, removed: removedCount };

        this.el.tabs.forEach(function (tab) {
            var key = tab.getAttribute("data-filter");
            var label = key === "active" ? "Active" : "Removed";
            tab.textContent = label + " (" + counts[key] + ")";
            tab.setAttribute("aria-selected", key === this.filter ? "true" : "false");
        }, this);

        if (this.el.counts) {
            this.el.counts.textContent = this.products.length + (this.products.length === 1 ? " product" : " products") + " in total";
        }
    },

    render: function () {
        var shown = this.visibleProducts();

        if (shown.length === 0) {
            this.el.list.innerHTML = this.filter === "active"
                ? '<div class="state-box">' +
                    '<h2>No active products</h2>' +
                    '<p>Add your first product and buyers will be able to find it in the marketplace.</p>' +
                    '<a href="product-form.html" class="btn btn-primary">Add product</a>' +
                  '</div>'
                : '<div class="state-box"><h2>No removed products</h2><p>Products you remove will appear here.</p></div>';
            return;
        }

        this.el.list.innerHTML =
            '<div class="seller-product-grid">' +
            shown.map(this.cardHTML, this).join("") +
            '</div>';
    },

    cardHTML: function (p) {
        var thumb = p.imageUrl
            ? '<img src="' + escAttr(p.imageUrl) + '" alt="' + escAttr(p.name) + '">'
            : '<span>' + escText(p.categoryName || "No photo") + '</span>';

        var badges = '';
        badges += p.active
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-neutral">Removed</span>';
        if (p.isVerified) badges += ' <span class="badge badge-success">Verified</span>';

        var stock = this.stockText(p);

        var actions = '<a class="btn btn-secondary" href="product-form.html?id=' + encodeURIComponent(p.id) + '">Edit</a>';
        if (p.active) {
            actions += '<button class="btn btn-secondary" type="button" data-remove="' + escAttr(p.id) + '">Remove</button>';
        }

        return '<article class="metric-card seller-product-card' + (p.active ? '' : ' is-removed') + '">' +
            '<div class="seller-product-thumb">' + thumb + '</div>' +
            '<div>' + badges + '</div>' +
            '<h2 style="font-size: 1.15rem;">' + escText(p.name) + '</h2>' +
            '<p class="seller-product-meta">' + escText(p.categoryName || "") + '</p>' +
            '<p><strong>' + money(p.price) + '</strong></p>' +
            (stock ? '<p class="seller-product-meta">' + escText(stock) + '</p>' : '') +
            '<div class="seller-product-actions">' + actions + '</div>' +
        '</article>';
    },

    /** Stock line from the server's fields only. Ready-stock shows quantity, made-to-order shows production time. */
    stockText: function (p) {
        if (p.fulfilmentType === "MADE_TO_ORDER") {
            return p.productionTimeMinutesPerUnit !== null
                ? "Made to order, about " + p.productionTimeMinutesPerUnit + " min per item"
                : "Made to order";
        }
        if (p.fulfilmentType === "READY_STOCK") {
            return p.inventoryQty !== null ? p.inventoryQty + " in stock" : "Ready stock";
        }
        return "";
    },

    remove: async function (product) {
        if (!product) return;

        var ok = window.confirm(
            'Remove "' + product.name + '" from your store?\n\n' +
            "Buyers will no longer see it. It will move to the Removed tab."
        );
        if (!ok) return;

        try {
            await ProductService.deactivate(product.id);
        } catch (error) {
            notify(error.message || "The product could not be removed. Please try again.", "error");
            return;
        }

        product.active = false;
        notify("Product removed.", "success");
        this.renderTabs();
        this.render();
    }
};

/* ---------- small helpers, local to this page ---------- */

function escText(value) {
    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escAttr(value) {
    return escText(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function money(amount) {
    var n = Number(amount);
    if (isNaN(n)) return "";
    return "\u20B9" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function notify(message, type) {
    if (typeof showToast === "function") {
        showToast(message, type);
    } else {
        window.alert(message);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    SellerProductsPage.init();
});