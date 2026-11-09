/**
 * GharSe - Buyer/seller profile page.
 *
 * Reads GET /v1/users/me to fill the form and saves with PUT /v1/users/me.
 * Editable: name, email, address. Phone is read-only (the backend doesn't
 * accept phone changes here). Password change is not on this page yet.
 *
 * Needs: core/utils.js, config.js, auth.js, api.js, toast.js, nav.js.
 */
var ProfilePage = {

    original: null,   // last values loaded or saved, used by "Undo changes"
    el: {},

    init: async function () {
        var el = this.el;
        el.form = document.getElementById("profileForm");
        el.loading = document.getElementById("profileLoading");
        el.message = document.getElementById("profileMessage");
        el.role = document.getElementById("profileRole");
        el.name = document.getElementById("profileName");
        el.email = document.getElementById("profileEmail");
        el.address = document.getElementById("profileAddress");
        el.phone = document.getElementById("profilePhone");
        el.save = document.getElementById("profileSave");
        el.reset = document.getElementById("profileReset");
        if (!el.form) return;

        // Logged-out visitors go to login, and come back here after.
        if (!Auth.isLoggedIn()) {
            var back = encodeURIComponent("pages/account/profile.html");
            window.location.href = Auth.rootPrefix() + "pages/auth/login.html?next=" + back;
            return;
        }

        el.form.addEventListener("submit", function (event) {
            event.preventDefault();
            ProfilePage.save();
        });
        el.reset.addEventListener("click", function () {
            ProfilePage.fill(ProfilePage.original);
            ProfilePage.setMessage("");
        });

        await this.load();
    },

    load: async function () {
        try {
            var user = await Api.get("/users/me");
            this.original = this.toModel(user);
            this.fill(this.original);
            this.el.loading.hidden = true;
            this.el.form.hidden = false;
        } catch (error) {
            this.el.loading.hidden = true;
            this.setMessage(error.message);
        }
    },

    /** Backend fields (camelCase, from UserProfileResponse) to form fields. */
    toModel: function (user) {
        return {
            name: user.name || "",
            email: user.email || "",
            addressText: user.addressText || "",
            phone: user.phone || "",
            role: user.role || ""
        };
    },

    fill: function (model) {
        if (!model) return;
        this.el.name.value = model.name;
        this.el.email.value = model.email;
        this.el.address.value = model.addressText;
        this.el.phone.value = model.phone;
        this.el.role.textContent = "Signed in as " + (model.role === "SELLER" ? "a seller" : "a buyer");
    },

    readForm: function () {
        return {
            name: this.el.name.value.trim(),
            email: this.el.email.value.trim(),
            addressText: this.el.address.value.trim()
        };
    },

    validate: function (values) {
        if (!values.name) return "Please enter your name.";
        if (values.name.length > 100) return "Name must be 100 characters or fewer.";
        if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
            return "Please enter a valid email address.";
        }
        return "";
    },

    save: async function () {
        var values = this.readForm();
        var problem = this.validate(values);
        if (problem) {
            this.setMessage(problem);
            return;
        }

        this.el.save.disabled = true;
        this.el.save.textContent = "Saving...";
        try {
            var payload = {
                name: values.name,
                // An empty string clears the email on the server.
                email: values.email || null,
                addressText: values.addressText || null
            };
            var saved = await Api.put("/users/me", payload);
            this.original = this.toModel(saved);
            this.fill(this.original);
            this.setMessage("");
            showToast("Profile saved.", "success");
        } catch (error) {
            this.setMessage(error.message);
        } finally {
            this.el.save.disabled = false;
            this.el.save.textContent = "Save changes";
        }
    },

    setMessage: function (text) {
        this.el.message.textContent = text;
        this.el.message.hidden = !text;
    }
};

document.addEventListener("DOMContentLoaded", function () {
    ProfilePage.init();
});