export let API_BASE_URL = "";
export let API_AUTH_URL = "";

let lastUrl = "";

export async function loadBackendUrl() {
    try {
        const res = await fetch("../sajile-backend/backend_url.json", { cache: "no-cache" });
        const data = await res.json();

        if (!data.url) return;

        if (data.url !== lastUrl) {
            console.log("⚡ Backend base URL updated:", data.url);
            lastUrl = data.url;

            API_BASE_URL = `${data.url}/api`;
            API_AUTH_URL = `${data.url}/auth`;
        }

    } catch (err) {
        console.error("Gagal memuat backend_url.json:", err);
    }
}

await loadBackendUrl();
setInterval(loadBackendUrl, 5000);
