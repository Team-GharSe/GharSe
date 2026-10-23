/**
 * GharSe - global interactions shared by pages.
 * Currently: the mobile navigation toggle.
 */
const GharSeApp = {

    init() {
        this.initializeGlobalInteractions();
    },

    initializeGlobalInteractions() {
        const menuButton = document.getElementById("mobileMenuButton");
        const navigation = document.querySelector(".main-nav");

        if (!menuButton || !navigation) {
            return;
        }

        menuButton.addEventListener("click", () => {
            const isOpen = navigation.classList.toggle("open");
            menuButton.setAttribute("aria-expanded", String(isOpen));
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    GharSeApp.init();
});
