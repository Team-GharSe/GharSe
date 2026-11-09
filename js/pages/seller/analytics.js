/**
 * GharSe - Seller analytics page.
 * Reads GET /v1/seller/me/analytics?from=&to= and displays the totals.
 * No money or unit maths happens here; the backend returns every figure.
 * The CSV export is built from the response already on screen.
 *
 * Needs (in this order): core/utils.js, config.js, auth.js, api.js, toast.js, nav.js, seller-guard.js.
 */
var AnalyticsPage = {

    current: null,

    init: function () {
        var to = new Date();
        var from = new Date();
        from.setDate(to.getDate() - 29); // last 30 days, inclusive

        document.getElementById("fromDate").value = isoDate(from);
        document.getElementById("toDate").value = isoDate(to);

        document.getElementById("rangeForm").addEventListener("submit", function (event) {
            event.preventDefault();
            AnalyticsPage.load();
        });
        document.getElementById("exportBtn").addEventListener("click", function () {
            AnalyticsPage.exportCsv();
        });

        this.load();
    },

    load: async function () {
        var from = document.getElementById("fromDate").value;
        var to = document.getElementById("toDate").value;
        this.setAlert("");

        if (!from || !to) {
            this.setAlert("Choose both dates.");
            return;
        }
        if (from > to) {
            this.setAlert("The 'From' date must be on or before the 'To' date.");
            return;
        }

        try {
            var data = await Api.get("/seller/me/analytics?from=" + encodeURIComponent(from) +
                "&to=" + encodeURIComponent(to));
            this.current = data;
            this.render(data);
        } catch (error) {
            this.current = null;
            document.getElementById("exportBtn").disabled = true;
            this.setAlert(error.message || "Analytics could not be loaded. Please try again.");
        }
    },

    render: function (d) {
        document.getElementById("statRevenue").textContent = formatCurrency(d.revenue);
        document.getElementById("statOrders").textContent = String(d.orders);
        document.getElementById("statUnits").textContent = String(d.unitsSold);

        var rows = d.daily || [];
        var table = document.getElementById("dailyTable");
        var body = document.getElementById("dailyBody");
        var empty = document.getElementById("emptyNote");

        empty.hidden = rows.length > 0;
        table.hidden = rows.length === 0;
        body.innerHTML = rows.map(function (r) {
            return "<tr>" +
                "<td>" + escapeHTML(r.date) + "</td>" +
                '<td class="num">' + escapeHTML(String(r.orders)) + "</td>" +
                '<td class="num">' + escapeHTML(formatCurrency(r.revenue)) + "</td>" +
                "</tr>";
        }).join("");

        document.getElementById("exportBtn").disabled = false;
    },

    exportCsv: function () {
        var d = this.current;
        if (!d) return;

        var lines = [
            ["Date", "Orders", "Revenue (INR)"].join(","),
        ];
        (d.daily || []).forEach(function (r) {
            lines.push([r.date, r.orders, r.revenue].join(","));
        });
        lines.push("");
        lines.push(["Total", d.orders, d.revenue].join(","));
        lines.push(["Units sold", d.unitsSold, ""].join(","));

        var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "analytics_" + d.from + "_to_" + d.to + ".csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    setAlert: function (message) {
        var el = document.getElementById("pageAlert");
        el.textContent = message || "";
        el.hidden = !message;
    }
};

function isoDate(d) {
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
}

document.addEventListener("DOMContentLoaded", function () {
    AnalyticsPage.init();
});