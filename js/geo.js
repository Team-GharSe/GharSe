/**
 * GharSe - the buyer's device location, for distance sort and radius search (FR7).
 *
 * Geo.getPosition() resolves to { lat, lng }, or rejects with an Error whose
 * message can be shown to the user. Callers should treat a rejection as
 * "no location": search without lat/lng and say so. Nothing is stored; the
 * coordinates are only passed along to ProductService.search.
 *
 * The browser allows geolocation only on https:// or http://localhost
 * (and 127.0.0.1), which covers Live Server.
 */
var Geo = {

    getPosition: function () {
        return new Promise(function (resolve, reject) {
            if (!navigator.geolocation) {
                reject(new Error("Your browser does not support location."));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                function (error) {
                    if (error.code === 1) {
                        reject(new Error("Location permission was denied."));
                    } else if (error.code === 3) {
                        reject(new Error("Finding your location took too long."));
                    } else {
                        reject(new Error("Could not find your location."));
                    }
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
            );
        });
    }
};