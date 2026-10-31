/**
 * GharSe - seller sales trends. Draws one bar per day from
 * GET /v1/seller/me/analytics?from=&to= (the daily rows). The bar heights are
 * scaled from the server's revenue values only; no totals are computed here.
 *
 * Needs: config.js, core/utils.js, api.js, auth.js, nav.js, seller-guard.js.
 */
var TrendsPage = {

    init: function () {
        var today = new Date();
        var thirtyAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
        document.getElementById("toDate").value = this.isoDate(today);
        document.getElementById("fromDate").value = this.isoDate(thirtyAgo);

        var self = this;
        document.getElementById("rangeForm").addEventListener("submit", function (event) {
            event.preventDefault();
            self.load();
        });

        this.load();
    },

    isoDate: function (d) {
        var m = String(d.getMonth() + 1);
        var day = String(d.getDate());
        return d.getFullYear() + "-" + (m.length < 2 ? "0" + m : m) + "-" + (day.length < 2 ? "0" + day : day);
    },

    showAlert: function (message) {
        var el = document.getElementById("pageAlert");
        el.textContent = message || "";
        el.hidden = !message;
    },

    load: async function () {
        var from = document.getElementById("fromDate").value;
        var to = document.getElementById("toDate").value;
        var chart = document.getElementById("chart");
        var emptyNote = document.getElementById("emptyNote");
        this.showAlert("");

        if (!from || !to) {
            this.showAlert("Choose both dates.");
            return;
        }

        var data;
        try {
            data = await Api.get("/seller/me/analytics?from=" + encodeURIComponent(from) +
                "&to=" + encodeURIComponent(to));
        } catch (error) {
            this.showAlert(error.message || "Trends couldn't be loaded.");
            chart.innerHTML = "";
            return;
        }

        var days = Array.isArray(data.daily) ? data.daily : [];
        document.getElementById("summaryLine").textContent =
            "Total revenue " + formatCurrency(Number(data.revenue) || 0) +
            " from " + (Number(data.orders) || 0) + " order(s).";

        if (days.length === 0) {
            chart.innerHTML = "";
            emptyNote.hidden = false;
            return;
        }
        emptyNote.hidden = true;

        // Scale bars against the largest day in the response. Display only.
        var max = 0;
        days.forEach(function (d) { max = Math.max(max, Number(d.revenue) || 0); });

        chart.innerHTML = days.map(function (d) {
            var value = Number(d.revenue) || 0;
            var heightPct = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 2;
            var shortDate = String(d.date || "").slice(5);
            return '<div class="trend-col" title="' + escapeAttr(d.date) + ': ' + escapeAttr(formatCurrency(value)) + '">' +
                '<span class="trend-value">' + escapeHTML(formatCurrency(value)) + '</span>' +
                '<div class="trend-bar" style="height: ' + heightPct + '%;"></div>' +
                '<span class="trend-label">' + escapeHTML(shortDate) + '</span>' +
            '</div>';
        }).join("");
    }
};

document.addEventListener("DOMContentLoaded", function () {
    TrendsPage.init();
});