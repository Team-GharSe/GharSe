/**
 * GharSe - Stops the mouse wheel from changing a number input.
 *
 * Browsers change a focused <input type="number"> when the wheel scrolls over
 * it. This stops that only for the focused field, so the page still scrolls
 * everywhere else. Typing and the +/- arrows keep working.
 *
 * Load on every page that has a number input, before </body>.
 */
(function () {
    document.addEventListener("wheel", function (event) {
        var target = event.target;
        if (
            target &&
            target.tagName === "INPUT" &&
            target.type === "number" &&
            target === document.activeElement
        ) {
            event.preventDefault();
        }
    }, { passive: false });
})();