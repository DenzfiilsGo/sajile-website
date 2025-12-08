export let PUBLIC_BACKEND_URL = "";
export let API_BASE_URL = "";
export let API_AUTH_URL = "";

let lastLoadedUrl = "";

async function loadBackendUrl() {
    try {
        const res = await fetch("../backend_url.json", { cache: "no-cache" });
        const data = await res.json();

        if (!data.url) return console.error("backend_url.json tidak punya 'url'");

        if (data.url !== lastLoadedUrl) {
            console.log("⚡ URL Backend berubah:", data.url);

            PUBLIC_BACKEND_URL = data.url;
            API_BASE_URL = `${data.url}/api`;
            API_AUTH_URL = `${data.url}/api/auth`;

            lastLoadedUrl = data.url;

            window.dispatchEvent(new CustomEvent("backend-url-changed", {
                detail: { url: data.url }
            }));
        }

    } catch (err) {
        console.error("Gagal memuat backend_url.json:", err);
    }
}

await loadBackendUrl();
setInterval(loadBackendUrl, 5000);
