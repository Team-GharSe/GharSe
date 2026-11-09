/**
 * GharSe - Seller product form (create, edit, photos).
 *
 * Create: POST /v1/products. On success the page moves to edit mode so photos can be added.
 * Edit:   PUT  /v1/products/{id}. The product is read from GET /v1/seller/me/products.
 * Photos: POST /v1/products/{id}/photos and DELETE /v1/products/{id}/photos/{imageId}.
 * Categories: GET /v1/categories via ProductService.getCategories().
 *
 * The three true/false fields are always sent. Fulfilment fields are sent only
 * for the matching type; the other one is sent as null.
 * Server errors are shown next to the field they name, otherwise in the alert box.
 *
 * "Time needed" is entered as an amount plus a unit (hours, days or minutes).
 * It is converted to minutes for the API, which still stores productionTimeMinutesPerUnit.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js,
 * services/productService.js, toast.js, nav.js, seller-guard.js.
 */
var ProductFormPage = {

    editId: null,
    product: null,
    photos: [],
    saving: false,
    uploading: false,
    form: null,

    init: async function () {
        this.form = document.getElementById("productForm");
        if (!this.form) return;

        var params = new URLSearchParams(window.location.search);
        this.editId = params.get("id");

        this.bindEvents();
        this.toggleFulfilment();
        this.toggleDelivery();
        this.renderPhotos();

        await this.loadCategories();
        if (this.editId) {
            await this.loadProduct(this.editId);
        }
        if (params.get("saved") === "1") {
            notify("Product saved. You can add photos now.", "success");
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

        // Photos
        document.getElementById("photoInput").addEventListener("change", function (event) {
            page.addPhotos(event.target.files);
            event.target.value = "";
        });

        document.getElementById("photoGrid").addEventListener("click", function (event) {
            var btn = event.target.closest ? event.target.closest("[data-remove-photo]") : null;
            if (!btn) return;
            page.removePhoto(btn.getAttribute("data-remove-photo"));
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
        this.fillProductionTime(p.productionTimeMinutesPerUnit);
        this.setValue("deliveryRadiusKm", p.deliveryRadiusKm);

        this.radios().forEach(function (radio) {
            radio.checked = radio.value === p.fulfilmentType;
        });
        this.setChecked("supportsSelfDelivery", p.supportsSelfDelivery);
        this.setChecked("supportsPickup", p.supportsPickup);
        this.setChecked("supportsPostal", p.supportsPostal);

        this.toggleFulfilment();
        this.toggleDelivery();
        this.photos = p.photos || [];
        this.renderPhotos();
    },

    /** Shows stored minutes as the largest whole unit: 120 -> 2 Hours, 1440 -> 1 Day. */
    fillProductionTime: function (totalMinutes) {
        var total = Number(totalMinutes) || 0;
        var amount = total;
        var unit = "1";
        if (total > 0 && total % 1440 === 0) {
            amount = total / 1440;
            unit = "1440";
        } else if (total > 0 && total % 60 === 0) {
            amount = total / 60;
            unit = "60";
        }
        this.setValue("productionTime", total > 0 ? amount : "");
        this.setValue("productionTimeUnit", unit);
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
    // Photos
    // ---------------------------------------------------------------

    MAX_PHOTOS: 3,
    MAX_PHOTO_BYTES: 5 * 1024 * 1024,
    PHOTO_TYPES: ["image/jpeg", "image/png", "image/webp"],

    renderPhotos: function () {
        var hasProduct = !!this.editId && !!this.product;
        var grid = document.getElementById("photoGrid");
        var note = document.getElementById("photoNote");
        var addLabel = document.getElementById("photoAddLabel");

        note.hidden = hasProduct;
        addLabel.hidden = !hasProduct;
        addLabel.setAttribute("aria-disabled", this.uploading || this.photos.length >= this.MAX_PHOTOS ? "true" : "false");
        document.getElementById("photoInput").disabled = this.uploading || this.photos.length >= this.MAX_PHOTOS;

        if (!hasProduct) {
            grid.innerHTML = "";
            return;
        }

        if (this.photos.length === 0) {
            grid.innerHTML = '<p style="color: var(--color-text-muted, #6b6b6b);">No photos yet.</p>';
            return;
        }

        grid.innerHTML = this.photos.map(function (photo) {
            return '<div class="photo-item">' +
                '<img src="' + escapeAttr(photo.url) + '" alt="Product photo">' +
                '<button type="button" data-remove-photo="' + escapeAttr(photo.id) + '">Remove</button>' +
            '</div>';
        }).join("");
    },

    setPhotoError: function (message) {
        document.getElementById("photoError").textContent = message || "";
    },

    addPhotos: async function (fileList) {
        if (!this.editId || !this.product || this.uploading) return;

        var files = Array.prototype.slice.call(fileList || []);
        if (files.length === 0) return;

        if (this.photos.length + files.length > this.MAX_PHOTOS) {
            this.setPhotoError("A product can have at most " + this.MAX_PHOTOS + " photos. You have " +
                this.photos.length + " already.");
            return;
        }
        for (var i = 0; i < files.length; i++) {
            if (this.PHOTO_TYPES.indexOf(files[i].type) === -1) {
                this.setPhotoError("Photos must be JPEG, PNG or WebP.");
                return;
            }
            if (files[i].size > this.MAX_PHOTO_BYTES) {
                this.setPhotoError("Each photo must be 5 MB or smaller.");
                return;
            }
        }

        this.setPhotoError("");
        this.uploading = true;
        this.renderPhotos();
        try {
            var prepared = [];
            for (var j = 0; j < files.length; j++) {
                prepared.push(await compressImage(files[j]));
            }
            this.product = await ProductService.uploadPhotos(this.editId, prepared);
            this.photos = this.product.photos || [];
            notify("Photos added.", "success");
        } catch (error) {
            this.setPhotoError(error.message || "The photos could not be uploaded. Please try again.");
        } finally {
            this.uploading = false;
            this.renderPhotos();
        }
    },

    removePhoto: async function (photoId) {
        if (!this.editId || !photoId || this.uploading) return;
        if (!window.confirm("Remove this photo?")) return;

        this.setPhotoError("");
        try {
            this.product = await ProductService.removePhoto(this.editId, photoId);
            this.photos = this.product.photos || [];
            notify("Photo removed.", "success");
        } catch (error) {
            this.setPhotoError(error.message || "The photo could not be removed. Please try again.");
        }
        this.renderPhotos();
    },

    // ---------------------------------------------------------------
    // Read, validate, save
    // ---------------------------------------------------------------

    /** Converts the amount and unit fields into minutes. Returns null if the amount is empty. */
    productionMinutesFromForm: function () {
        var amount = numOrNull(this.value("productionTime"));
        var unitMinutes = Number(this.value("productionTimeUnit")) || 1;
        if (amount === null) return null;
        return Math.round(amount * unitMinutes);
    },

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
            productionTimeMinutesPerUnit: type === "MADE_TO_ORDER" ? this.productionMinutesFromForm() : null,
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
            var amount = numOrNull(this.value("productionTime"));
            if (amount === null || amount < 1 || amount % 1 !== 0) {
                errors.productionTimeMinutesPerUnit = "Enter a whole number of at least 1 for the time needed.";
            } else if (p.productionTimeMinutesPerUnit === null || p.productionTimeMinutesPerUnit < 1) {
                errors.productionTimeMinutesPerUnit = "The time needed must be at least 1 minute.";
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
                window.location.href = "products.html";
            } else {
                var created = await ProductService.create(payload);
                var newId = created && created.id;
                // Stay on the form in edit mode so photos can be added right away.
                window.location.href = newId
                    ? "product-form.html?id=" + encodeURIComponent(newId) + "&saved=1"
                    : "products.html";
            }
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
        var body = error && error.body ? error.body : null;
        var list = body ? body.errors : null;
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

function notify(message, type) {
    if (typeof showToast === "function") {
        showToast(message, type);
    } else {
        window.alert(message);
    }
}

/**
 * Shrinks a photo in the browser before upload (NFR2).
 * Returns the original File if it is already small or if compression fails.
 */
function compressImage(file) {
    var MAX_EDGE = 1600;
    var QUALITY = 0.8;
    var SKIP_BELOW_BYTES = 400 * 1024;

    return new Promise(function (resolve) {
        if (file.size <= SKIP_BELOW_BYTES) {
            resolve(file);
            return;
        }

        var url = URL.createObjectURL(file);
        var img = new Image();

        img.onload = function () {
            URL.revokeObjectURL(url);

            var scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
            var width = Math.round(img.naturalWidth * scale);
            var height = Math.round(img.naturalHeight * scale);

            var canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            var ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(function (blob) {
                if (!blob || blob.size >= file.size) {
                    resolve(file);
                    return;
                }
                var name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
                resolve(new File([blob], name, { type: "image/jpeg" }));
            }, "image/jpeg", QUALITY);
        };

        img.onerror = function () {
            URL.revokeObjectURL(url);
            resolve(file);
        };

        img.src = url;
    });
}

document.addEventListener("DOMContentLoaded", function () {
    ProductFormPage.init();
});