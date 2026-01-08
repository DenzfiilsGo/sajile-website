// P5 Project/js/config.js

export let PUBLIC_BACKEND_URL = "";
export let API_BASE_URL = "";
export let API_AUTH_URL = "";
export const GOOGLE_CLIENT_ID = "807216146816-42990bd4umepp8h6ml0qc6bfedck1tce.apps.googleusercontent.com";

// Promise untuk memastikan script lain bisa menunggu URL siap
let resolveUrlReady;
export const backendUrlReady = new Promise((resolve) => {
    resolveUrlReady = resolve;
});

function setBackendUrls(url) {
    if (!url) return;

    PUBLIC_BACKEND_URL = url;
    API_BASE_URL = `${url}/api`;
    API_AUTH_URL = `${url}/api/auth`;
    
    console.log("⚡ Backend URL Ready:", API_BASE_URL);

    // Kirim event untuk kompatibilitas kode lama
    window.dispatchEvent(new CustomEvent("backend-url-changed", {
        detail: { url: url }
    }));

    // Selesaikan promise agar kode yang menggunakan 'await backendUrlReady' bisa lanjut
    resolveUrlReady(url);
}

async function loadBackendUrl() {
    let backendUrl = "";

    // 1. Cek ENV Variable (Prioritas Utama)
    if (typeof process !== 'undefined' && process.env.PUBLIC_BACKEND_URL) {
        backendUrl = process.env.PUBLIC_BACKEND_URL;
    } 
    
    // 2. Fallback ke file JSON (Localhost)
    if (!backendUrl) {
        try {
            const res = await fetch("../backend_url.json", { cache: "no-cache" });
            const data = await res.json();
            if (data.url) backendUrl = data.url;
        } catch (err) {
            console.error("Gagal memuat backend_url.json, mencoba localhost default...");
            backendUrl = "http://localhost:5000"; // Fallback aman terakhir
        }
    }

    setBackendUrls(backendUrl);
}

loadBackendUrl();