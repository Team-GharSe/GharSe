var AuthService = {
    login: async function (identifier, password) {
        var data = await Api.post("/auth/login", { identifier: identifier, password: password });
        Auth.setToken(data.token);
        return data;
    },

    // Registers the account. If the backend returns a token (AuthResponse),
    // store it so the user is logged in straight away.
    register: async function (payload) {
        var data = await Api.post("/auth/register", payload);
        if (data && data.token) {
            Auth.setToken(data.token);
        }
        return data;
    }
};