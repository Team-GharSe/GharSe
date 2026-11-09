/**
 * GharSe - API client. The only file that calls fetch().
 *
 * Needs: js/config.js (CONFIG) and js/auth.js (Auth) loaded first.
 *
 * Every method resolves with the "data" field of the backend's ApiResponse and
 * rejects with an Error whose message is safe to show to the user. The error
 * also carries .status (HTTP status, 0 for network failures/timeouts) and
 * .body (the parsed JSON body, if any) so callers can react to e.g. a 409.
 */
var Api = {
    TIMEOUT_MS: 20000,

    /** {a: 1, b: "", c: null} -> "?a=1"  (empty values are skipped) */
    buildQuery: function (params) {
        if (!params) return "";
        var parts = [];
        Object.keys(params).forEach(function (key) {
            var value = params[key];
            if (value === undefined || value === null || value === "") return;
            parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
        });
        return parts.length ? "?" + parts.join("&") : "";
    },

    request: async function (path, options) {
        options = options || {};
        var isAuthPath = path.indexOf("/auth/") === 0;
        var headers = {};

        // Only send a token that is still valid. An expired token is not sent,
        // so public pages keep working for someone whose session has lapsed.
        var storedToken = Auth.getToken();
        if (storedToken && !isAuthPath && Auth.isLoggedIn()) {
            headers["Authorization"] = "Bearer " + storedToken;
        }
        // Content-Type only for JSON bodies. Plain GETs stay "simple" requests and
        // the browser skips the CORS preflight. Uploads set their own Content-Type
        // (multipart boundary), so we must not set it here.
        if (options.body && !options.formData) {
            headers["Content-Type"] = "application/json";
        }

        var controller = (typeof AbortController !== "undefined") ? new AbortController() : null;
        var timer = controller ? setTimeout(function () { controller.abort(); }, Api.TIMEOUT_MS) : null;

        var requestBody = undefined;
        if (options.formData) {
            requestBody = options.formData;
        } else if (options.body) {
            requestBody = JSON.stringify(options.body);
        }

        var response;
        try {
            response = await fetch(CONFIG.API_BASE_URL + path, {
                method: options.method || "GET",
                headers: headers,
                body: requestBody,
                signal: controller ? controller.signal : undefined
            });
        } catch (e) {
            if (e && e.name === "AbortError") {
                throw Api._error("The server took too long to respond. Please try again.", 0, null);
            }
            throw Api._error("Can't reach the server. Check your connection and try again.", 0, null);
        } finally {
            if (timer) clearTimeout(timer);
        }

        var json = null;
        try { json = await response.json(); } catch (e) { json = null; }

        if (response.status === 401 && storedToken && !isAuthPath) {
            Auth.logout();
            throw Api._error("Your session has expired. Please log in again.", 401, json);
        }
        if (!response.ok || (json && json.success === false)) {
            throw Api._error((json && json.message) || Api._fallbackMessage(response.status), response.status, json);
        }
        if (response.status === 204) return null;
        if (json === null) {
            throw Api._error("Unexpected response from the server.", response.status, null);
        }
        return json.data;
    },

    get:    function (path, params) { return Api.request(path + Api.buildQuery(params)); },
    post:   function (path, body)   { return Api.request(path, { method: "POST",   body: body }); },
    put:    function (path, body)   { return Api.request(path, { method: "PUT",    body: body }); },
    patch:  function (path, body)   { return Api.request(path, { method: "PATCH",  body: body }); },
    del:    function (path)         { return Api.request(path, { method: "DELETE" }); },

    /** Multipart upload. formData is a FormData object (e.g. files appended under one name). */
    upload: function (path, formData) { return Api.request(path, { method: "POST", formData: formData }); },

    _error: function (message, status, body) {
        var error = new Error(message);
        error.status = status || 0;
        error.body = body || null;
        return error;
    },

    _fallbackMessage: function (status) {
        if (status === 400) return "Please check the details and try again.";
        if (status === 403) return "You don't have permission to do that.";
        if (status === 404) return "We couldn't find what you were looking for.";
        if (status === 409) return "That conflicts with the current state. Please refresh and try again.";
        if (status >= 500) return "The server ran into a problem. Please try again shortly.";
        return "Something went wrong. Please try again.";
    }
};