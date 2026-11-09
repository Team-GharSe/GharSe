/**
 * GharSe - Decorative illustrations in empty page margins.
 *
 * Adds faint drawings to the left and right edges of every page, plus
 * one at the top and bottom of the main content. Purely decorative:
 * aria-hidden, pointer-events none, behind content.
 *
 * Include once per page, after the DOM is ready (it waits itself).
 */
(function () {
    var BASE = (function () {
        // Works from pages/... and from the root index.html
        var depth = window.location.pathname.split("/").filter(Boolean).length;
        var inPages = /\/pages\//.test(window.location.pathname);
        return inPages ? "../../images/illustrations/" : "images/illustrations/";
    })();

    // Drawings and where they sit. side: "left" | "right" | "top" | "bottom"
    var SPOTS = [
        { file: "olive-branch.webp", side: "left",  top: "18%", size: 220, rotate: -12, opacity: 0.42 },
        { file: "leaf.webp",         side: "right", top: "30%", size: 110, rotate: 35,  opacity: 0.38 },
        { file: "clay-pot.webp",     side: "left",  top: "62%", size: 150, rotate: 0,   opacity: 0.36 },
        { file: "jute-bag.webp",     side: "right", top: "72%", size: 150, rotate: -6,  opacity: 0.36 },
        { file: "olive-branch.webp", side: "right", top: "8%",  size: 180, rotate: 160, opacity: 0.34 }
    ];

    function add(spot) {
        var img = document.createElement("img");
        img.src = BASE + spot.file;
        img.alt = "";
        img.setAttribute("aria-hidden", "true");
        img.loading = "lazy";
        img.className = "page-decor page-decor-" + spot.side;
        img.style.width = spot.size + "px";
        img.style.top = spot.top;
        img.style.opacity = spot.opacity;
        img.style.transform = "rotate(" + spot.rotate + "deg)";
        document.body.appendChild(img);
    }

    function init() {
        // Skip on very small screens, where margins are too narrow
        if (window.innerWidth < 900) return;
        SPOTS.forEach(add);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();