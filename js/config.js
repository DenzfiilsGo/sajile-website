// P5 Project/js/config.js

export let PUBLIC_BACKEND_URL = "";
export let API_BASE_URL = "";
export let API_AUTH_URL = "";

// Fungsi helper untuk menetapkan URL setelah didapatkan
function setBackendUrls(url) {
    if (!url) return console.error("URL Backend tidak valid.");

    PUBLIC_BACKEND_URL = url;
    API_BASE_URL = `${url}/api`;
    API_AUTH_URL = `${url}/api/auth`;
    
    console.log("⚡ Menggunakan URL Backend:", API_BASE_URL);

    window.dispatchEvent(new CustomEvent("backend-url-changed", {
        detail: { url: url }
    }));
}

// --- STRATEGI BARU: Coba ENV Variable dulu, lalu fallback ke file JSON ---

async function loadBackendUrl() {
    let backendUrl = "";

    // 1. Coba baca dari variabel global/ENV (Untuk Netlify deployment)
    // Sesuaikan cara akses ENV VAR sesuai bundler Anda (Vite, Webpack, dll.)
    // Contoh ini menggunakan sintaks standar yang mungkin memerlukan build step
    if (typeof process !== 'undefined' && process.env.PUBLIC_BACKEND_URL) {
        backendUrl = process.env.PUBLIC_BACKEND_URL;
        console.log("Menggunakan ENV variable untuk URL backend.");

    } 
    
    // 2. Jika ENV tidak ditemukan, coba muat dari file JSON (Untuk localhost)
    if (!backendUrl) {
        try {
            // Menggunakan fetch manual seperti sebelumnya
            const res = await fetch("../backend_url.json", { cache: "no-cache" });
            const data = await res.json();
            if (data.url) {
                backendUrl = data.url;
                console.log("Menggunakan backend_url.json untuk URL backend.");
            }
        } catch (err) {
            console.error("Gagal memuat backend_url.json:", err.message);
        }
    }

    // Setel URL jika berhasil ditemukan
    if (backendUrl && backendUrl !== PUBLIC_BACKEND_URL) {
        setBackendUrls(backendUrl);
    } else if (!backendUrl) {
        console.error("URL backend tidak dapat ditentukan.");
    }
}

// Muat URL saat script berjalan
loadBackendUrl();
// Hapus setInterval jika Anda hanya ingin memuat sekali saat init
// setInterval(loadBackendUrl, 5000); 
