/**
 * GharSe - Seller product form (create and edit).
 *
 * Create: POST /v1/products
 * Edit:   PUT  /v1/products/{id}   (the product is read from GET /v1/seller/me/products)
 * Categories: GET /v1/categories via ProductService.getCategories().
 *
 * The three true/false fields are always sent. Fulfilment fields are sent only
 * for the matching type; the other one is sent as null.
 * Server errors are shown next to the field they name, otherwise in the alert box.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/productService.js, toast.js, nav.js, seller-guard.js.
 */
var ProductFormPage = {

    editId: null,
    product: null,
    saving: false,
    form: null,

    init: async function () {
        this.form = document.getElementById("productForm");
        if (!this.form) return;

        this.editId = new URLSearchParams(window.location.search).get("id");
        this.bindEvents();
        this.toggleFulfilment();
        this.toggleDelivery();

        await this.loadCategories();
        if (this.editId) {
            await this.loadProduct(this.editId);
        }
    },

    bindEvents: function () {
        var page = this;

        page.form.addEventListener("submit", function (event) {
            event.preventDefault();
            page.submit();
        });

        page.radios().forEach(function (radio) {
            radio.addEventListener("change", function () { page.toggleFulfilment(); });
        });

        document.getElementById("supportsSelfDelivery").addEventListener("change", function () {
            page.toggleDelivery();
        });

        // Clear a field's error as soon as the user edits it.
        page.form.addEventListener("input", function (event) {
            page.clearFieldError(event.target.name);
        });
        page.form.addEventListener("change", function (event) {
            page.clearFieldError(event.target.name);
        });
    },

    // ---------------------------------------------------------------
    // Categories and loading the product for edit
    // ---------------------------------------------------------------

    loadCategories: async function () {
        var select = document.getElementById("categoryId");
        try {
            var categories = await ProductService.getCategories();
            select.innerHTML = '<option value="">Choose a category</option>' +
                categories.map(function (c) {
                    return '<option value="' + escapeAttr(c.id) + '">' + escapeHTML(c.name) + '</option>';
                }).join("");
            if (categories.length === 0) {
                this.setAlert("No categories are available yet. Please try again later.");
            }
        } catch (error) {
            select.innerHTML = '<option value="">Categories unavailable</option>';
            this.setAlert(error.message || "Categories couldn't be loaded.");
        }
    },

    loadProduct: async function (id) {
        this.setTitle("Edit product");
        try {
            var all = await ProductService.getMine();
            this.product = all.filter(function (p) { return String(p.id) === String(id); })[0] || null;
        } catch (error) {
            this.setAlert(error.message || "This product couldn't be loaded.");
            this.setSubmitDisabled(true);
            return;
        }

        if (!this.product) {
            this.setAlert("This product couldn't be found in your store.");
            this.setSubmitDisabled(true);
            return;
        }

        this.fill(this.product);
    },

    fill: function (p) {
        this.setValue("name", p.name);
        this.setValue("description", p.description);
        this.setValue("price", p.price);
        this.setValue("categoryId", p.categoryId === null ? "" : String(p.categoryId));
        this.setValue("inventoryQty", p.inventoryQty);
        this.setValue("productionTimeMinutesPerUnit", p.productionTimeMinutesPerUnit);
        this.setValue("deliveryRadiusKm", p.deliveryRadiusKm);

        this.radios().forEach(function (radio) {
            radio.checked = radio.value === p.fulfilmentType;
        });
        this.setChecked("supportsSelfDelivery", p.supportsSelfDelivery);
        this.setChecked("supportsPickup", p.supportsPickup);
        this.setChecked("supportsPostal", p.supportsPostal);

        this.toggleFulfilment();
        this.toggleDelivery();
    },

    // ---------------------------------------------------------------
    // Show and hide fulfilment-specific fields
    // ---------------------------------------------------------------

    toggleFulfilment: function () {
        var type = this.selectedFulfilment();
        document.getElementById("readyStockRow").hidden = type !== "READY_STOCK";
        document.getElementById("madeToOrderRow").hidden = type !== "MADE_TO_ORDER";
    },

    toggleDelivery: function () {
        document.getElementById("radiusRow").hidden = !document.getElementById("supportsSelfDelivery").checked;
    },

    radios: function () {
        return Array.prototype.slice.call(this.form.querySelectorAll('input[name="fulfilmentType"]'));
    },

    selectedFulfilment: function () {
        var checked = this.radios().filter(function (r) { return r.checked; })[0];
        return checked ? checked.value : "";
    },

    // ---------------------------------------------------------------
    // Read, validate, save
    // ---------------------------------------------------------------

    /** Builds the ProductRequest body. Empty number inputs become null. */
    readForm: function () {
        var type = this.selectedFulfilment();
        var selfDelivery = document.getElementById("supportsSelfDelivery").checked;

        return {
            name: this.value("name"),
            description: this.value("description"),
            price: numOrNull(this.value("price")),
            categoryId: numOrNull(this.value("categoryId")),
            fulfilmentType: type || null,
            inventoryQty: type === "READY_STOCK" ? intOrNull(this.value("inventoryQty")) : null,
            productionTimeMinutesPerUnit: type === "MADE_TO_ORDER" ? intOrNull(this.value("productionTimeMinutesPerUnit")) : null,
            supportsSelfDelivery: selfDelivery,
            supportsPickup: document.getElementById("supportsPickup").checked,
            supportsPostal: document.getElementById("supportsPostal").checked,
            deliveryRadiusKm: selfDelivery ? numOrNull(this.value("deliveryRadiusKm")) : null
        };
    },

    /** Client-side checks that mirror ProductRequest. The server still has the final say. */
    validate: function (p) {
        var errors = {};

        if (!p.name) errors.name = "Enter a product name.";
        else if (p.name.length > 150) errors.name = "Keep the name to 150 characters or fewer.";

        if (p.description.length > 5000) errors.description = "Keep the description to 5000 characters or fewer.";

        if (p.price === null || !(p.price >= 0.01)) errors.price = "Enter a price of at least \u20B90.01.";

        if (p.categoryId === null) errors.categoryId = "Choose a category.";

        if (!p.fulfilmentType) {
            errors.fulfilmentType = "Choose how this product is fulfilled.";
        } else if (p.fulfilmentType === "READY_STOCK") {
            if (p.inventoryQty === null || p.inventoryQty < 0) {
                errors.inventoryQty = "Enter how many items are in stock (0 or more).";
            }
        } else if (p.fulfilmentType === "MADE_TO_ORDER") {
            if (p.productionTimeMinutesPerUnit === null || p.productionTimeMinutesPerUnit < 1) {
                errors.productionTimeMinutesPerUnit = "Enter the minutes needed to make one item (at least 1).";
            }
        }

        if (p.supportsSelfDelivery && (p.deliveryRadiusKm === null || !(p.deliveryRadiusKm >= 0.1))) {
            errors.deliveryRadiusKm = "Enter a delivery radius of at least 0.1 km.";
        }

        return errors;
    },

    submit: async function () {
        if (this.saving) return;

        this.clearAllErrors();
        this.setAlert("");

        var payload = this.readForm();
        var errors = this.validate(payload);
        if (Object.keys(errors).length > 0) {
            this.showFieldErrors(errors);
            this.setAlert("Please fix the highlighted fields.");
            this.focusFirstError();
            return;
        }

        this.setSaving(true);
        try {
            if (this.editId) {
                await ProductService.update(this.editId, payload);
            } else {
                await ProductService.create(payload);
            }
            window.location.href = "products.html";
        } catch (error) {
            this.setSaving(false);
            this.handleServerError(error);
        }
    },

    /** Shows the server's field messages next to their fields. Anything unmatched goes to the alert box. */
    handleServerError: function (error) {
        var fieldMessages = this.serverFieldErrors(error);
        var names = Object.keys(fieldMessages);

        if (names.length === 0) {
            this.setAlert(error.message || "The product could not be saved. Please try again.");
            return;
        }

        var matched = {};
        var unmatched = [];
        names.forEach(function (name) {
            if (this.form.querySelector('[data-error-for="' + name + '"]')) {
                matched[name] = fieldMessages[name];
            } else {
                unmatched.push(fieldMessages[name]);
            }
        }, this);

        this.showFieldErrors(matched);
        var message = Object.keys(matched).length ? "Please fix the highlighted fields." : "";
        if (unmatched.length) message = (message ? message + " " : "") + unmatched.join(" ");
        this.setAlert(message || error.message);
        this.focusFirstError();
    },

    /**
     * Reads field messages from the error body. Accepts either
     * {errors: [{field, message}]} or {errors: {field: message}}.
     * Keys are converted from snake_case to camelCase to match the form field names.
     */
    serverFieldErrors: function (error) {
        var list = error && error.body ? error.body.errors : null;
        var map = {};

        if (Array.isArray(list)) {
            list.forEach(function (item) {
                var field = item && (item.field || item.fieldName);
                if (field) map[toCamel(field)] = item.message || item.defaultMessage || "Check this field.";
            });
        } else if (list && typeof list === "object") {
            Object.keys(list).forEach(function (key) {
                map[toCamel(key)] = String(list[key]);
            });
        }
        return map;
    },

    // ---------------------------------------------------------------
    // Small DOM helpers
    // ---------------------------------------------------------------

    value: function (id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : "";
    },

    setValue: function (id, value) {
        var el = document.getElementById(id);
        if (el) el.value = (value === null || value === undefined) ? "" : String(value);
    },

    setChecked: function (id, value) {
        var el = document.getElementById(id);
        if (el) el.checked = value === true;
    },

    setTitle: function (text) {
        var el = document.getElementById("formTitle");
        if (el) el.textContent = text;
    },

    setAlert: function (message) {
        var el = document.getElementById("formAlert");
        if (!el) return;
        el.textContent = message || "";
        el.hidden = !message;
    },

    showFieldErrors: function (errors) {
        var form = this.form;
        Object.keys(errors).forEach(function (name) {
            var span = form.querySelector('[data-error-for="' + name + '"]');
            if (span) span.textContent = errors[name];
            var input = form.elements[name];
            if (input && input.setAttribute) input.setAttribute("aria-invalid", "true");
        });
    },

    clearFieldError: function (name) {
        if (!name) return;
        var span = this.form.querySelector('[data-error-for="' + name + '"]');
        if (span) span.textContent = "";
        var input = this.form.elements[name];
        if (input && input.removeAttribute) input.removeAttribute("aria-invalid");
    },

    clearAllErrors: function () {
        var form = this.form;
        Array.prototype.forEach.call(form.querySelectorAll("[data-error-for]"), function (span) {
            span.textContent = "";
        });
        Array.prototype.forEach.call(form.querySelectorAll("[aria-invalid]"), function (el) {
            el.removeAttribute("aria-invalid");
        });
    },

    focusFirstError: function () {
        var first = this.form.querySelector('[aria-invalid="true"]');
        if (first && first.focus) first.focus();
    },

    setSaving: function (isSaving) {
        this.saving = isSaving;
        var btn = document.getElementById("submitBtn");
        btn.disabled = isSaving;
        btn.textContent = isSaving ? "Saving..." : (this.editId ? "Save changes" : "Save product");
    },

    setSubmitDisabled: function (disabled) {
        document.getElementById("submitBtn").disabled = disabled;
    }
};

/* ---------- helpers local to this page ---------- */

function numOrNull(text) {
    if (text === "" || text === null || text === undefined) return null;
    var n = Number(text);
    return isNaN(n) ? null : n;
}

function intOrNull(text) {
    var n = numOrNull(text);
    return n === null ? null : Math.trunc(n);
}

function toCamel(name) {
    return String(name).replace(/_([a-z])/g, function (m, c) { return c.toUpperCase(); });
}

document.addEventListener("DOMContentLoaded", function () {
    ProductFormPage.init();
});