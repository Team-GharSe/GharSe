var Auth = {
    TOKEN_KEY: "gharse_token",

    getToken: function () { return localStorage.getItem(this.TOKEN_KEY); },
    setToken: function (t) { localStorage.setItem(this.TOKEN_KEY, t); },

    getClaims: function () {
        var t = this.getToken();
        if (!t) return null;
        try {
            var b64 = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
            return JSON.parse(atob(b64));
        } catch (e) { return null; }
    },

    // True when the token's "exp" claim (seconds) is in the past.
    // A token with no exp claim is treated as not expired.
    isExpired: function () {
        var c = this.getClaims();
        return !!(c && c.exp && c.exp * 1000 <= Date.now());
    },

    // Logged in = a readable token that has not expired. A garbled or
    // expired token counts as logged out, so the nav never shows account
    // links for a session the server would reject.
    isLoggedIn: function () {
        return !!this.getClaims() && !this.isExpired();
    },

    getRole: function () {
        if (!this.isLoggedIn()) return null;
        return this.getClaims().role || null;
    },

    /** "../../" from a page two folders deep, "" from the root. Same rule as Nav.getRootPrefix. */
    rootPrefix: function () {
        var path = window.location.pathname;
        if (/\/pages\/(auth|seller|buyer|admin|marketplace|account)\//.test(path)) return "../../";
        if (path.indexOf("/pages/") !== -1) return "../";
        return "";
    },

    logout: function () {
        localStorage.removeItem(this.TOKEN_KEY);
        window.location.href = this.rootPrefix() + "index.html";
    }
};