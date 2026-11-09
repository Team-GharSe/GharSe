/**
 * GharSe - seller onboarding: store name, location, then create the store.
 * Calls POST /v1/seller/profile and saves the new token, which carries role SELLER.
 *
 * Needs: config.js, api.js, auth.js, geo.js, toast.js.
 */
var SellerOnboarding = {
    TOTAL_STEPS: 3,
    step: 1,
    busy: false,
    el: {},

    init: function () {
        if (!Auth.isLoggedIn()) {
            window.location.href = "../auth/login.html";
            return;
        }
        if (Auth.getRole() === "SELLER") {
            window.location.href = "dashboard.html";
            return;
        }

        var self = this;
        function byId(id) { return document.getElementById(id); }

        this.el = {
            label: byId("stepLabel"),
            alert: byId("formAlert"),
            name: byId("businessName"),
            lat: byId("latitude"),
            lng: byId("longitude"),
            locate: byId("useLocationBtn"),
            status: byId("locationStatus"),
            back: byId("backBtn"),
            next: byId("nextBtn"),
            reviewName: byId("reviewName"),
            reviewLat: byId("reviewLat"),
            reviewLng: byId("reviewLng")
        };

        this.el.back.addEventListener("click", function () { self.goTo(self.step - 1); });
        this.el.next.addEventListener("click", function () { self.onNext(); });
        this.el.locate.addEventListener("click", function () { self.locate(); });

        this.goTo(1);
    },

    showAlert: function (message) {
        this.el.alert.textContent = message || "";
        this.el.alert.style.display = message ? "block" : "none";
    },

    goTo: function (step) {
        this.step = step;
        this.showAlert("");

        document.querySelectorAll("[data-step]").forEach(function (section) {
            section.hidden = Number(section.getAttribute("data-step")) !== step;
        });

        this.el.label.textContent = "Step " + step + " of " + this.TOTAL_STEPS;
        this.el.back.hidden = step === 1;
        this.el.next.textContent = step === this.TOTAL_STEPS ? "Create my store" : "Continue";

        if (step === this.TOTAL_STEPS) this.fillReview();
    },

    onNext: function () {
        if (this.busy) return;

        if (this.step === 1) {
            var name = this.el.name.value.trim();
            if (name.length < 2) {
                this.showAlert("Please enter your business name (at least 2 characters).");
                return;
            }
            this.goTo(2);
            return;
        }

        if (this.step === 2) {
            if (this.readCoords()) this.goTo(3);
            return;
        }

        this.submit();
    },

    /** Returns {lat, lng} rounded to the DECIMAL(9,6) the database stores, or null. */
    readCoords: function () {
        var latText = this.el.lat.value.trim();
        var lngText = this.el.lng.value.trim();
        var lat = Number(latText);
        var lng = Number(lngText);

        if (latText === "" || lngText === "" || !isFinite(lat) || !isFinite(lng)) {
            this.showAlert("Please share your location or enter both latitude and longitude.");
            return null;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            this.showAlert("Those coordinates are out of range. Latitude is between -90 and 90, longitude between -180 and 180.");
            return null;
        }
        return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    },

    locate: async function () {
        var btn = this.el.locate;
        btn.disabled = true;
        this.el.status.textContent = "Finding your location...";

        try {
            var pos = await Geo.getPosition();
            this.el.lat.value = pos.lat.toFixed(6);
            this.el.lng.value = pos.lng.toFixed(6);
            this.el.status.textContent = "Location captured. You can adjust the numbers if needed.";
        } catch (error) {
            this.el.status.textContent = (error && error.message) || "We couldn't get your location. Enter it manually.";
        } finally {
            btn.disabled = false;
        }
    },

    fillReview: function () {
        var coords = this.readCoords();
        this.el.reviewName.textContent = this.el.name.value.trim();
        this.el.reviewLat.textContent = coords ? String(coords.lat) : "-";
        this.el.reviewLng.textContent = coords ? String(coords.lng) : "-";
    },

    submit: async function () {
        var coords = this.readCoords();
        if (!coords) {
            this.goTo(2);
            return;
        }

        this.busy = true;
        this.el.next.disabled = true;
        this.el.next.textContent = "Creating your store...";

        try {
            var result = await Api.post("/seller/profile", {
                businessName: this.el.name.value.trim(),
                latitude: coords.lat,
                longitude: coords.lng
            });

            // The response carries a new token with role SELLER. Replace the old one.
            Auth.setToken(result.token);
            showToast("Your store is ready.", "success");
            window.location.href = "dashboard.html";
        } catch (error) {
            this.busy = false;
            this.el.next.disabled = false;
            this.el.next.textContent = "Create my store";
            this.showAlert(error.message);
        }
    }
};

document.addEventListener("DOMContentLoaded", function () {
    SellerOnboarding.init();
});