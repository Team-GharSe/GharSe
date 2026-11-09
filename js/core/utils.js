/**
 * GHARSE MARKETPLACE
 * Utility Functions
 */


/**
 * Safely parse JSON.
 */
function parseJSON(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}


/**
 * Generate a simple unique ID.
 */
function generateId(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 8)}`;
}


/**
 * Format Indian currency. Whole amounts show without decimals (₹1,299);
 * amounts with paise keep both decimals (₹249.50) so a price is never rounded.
 */
function formatCurrency(amount) {
    const value = Number(amount);
    const safe = Number.isFinite(value) ? value : 0;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: Number.isInteger(safe) ? 0 : 2,
        maximumFractionDigits: 2
    }).format(safe);
}


/**
 * Escape HTML before inserting user-generated content as element text.
 * NOTE: this does not escape quotes. Use escapeAttr() inside attributes.
 */
function escapeHTML(value) {
    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;
}


/**
 * Escape a value for use inside an HTML attribute (title="...", alt="...",
 * href="...", data-x="..."). Also escapes quotes, which escapeHTML does not.
 */
function escapeAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
