document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("signupForm");
    var alertEl = document.getElementById("authAlert");
    var submitBtn = form.querySelector('button[type="submit"]');

    // Pre-select the role from ?role=buyer or ?role=seller
    var roleParam = new URLSearchParams(window.location.search).get("role");
    if (roleParam === "buyer" || roleParam === "seller") {
        var radio = document.getElementById(roleParam === "buyer" ? "roleBuyer" : "roleSeller");
        if (radio) radio.checked = true;
    }

    function showError(message) {
        alertEl.textContent = message;
        alertEl.style.display = "block";
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        alertEl.style.display = "none";

        var roleInput = document.querySelector('input[name="role"]:checked');
        if (!roleInput) {
            showError("Please choose whether you want to buy or sell.");
            return;
        }

        var wantsToSell = roleInput.value === "seller";
        var phone = document.getElementById("phone").value.trim();
        var email = document.getElementById("email").value.trim();
        var password = document.getElementById("password").value;

        // No role here: the server decides it. Sellers create their store next.
        var payload = {
            name: document.getElementById("name").value.trim(),
            phone: phone,
            // Send null, not "": the DB has a UNIQUE index on email,
            // so two blank emails would collide.
            email: email || null,
            password: password
        };

        var originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating account...";

        try {
            await AuthService.register(payload);

            // If register did not return a token, log in with the new credentials.
            if (!Auth.isLoggedIn()) {
                await AuthService.login(phone, password);
            }

            window.location.href = wantsToSell
                ? "../seller/onboarding.html"
                : "../marketplace/marketplace.html";
        } catch (error) {
            showError(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
        }
    });
});