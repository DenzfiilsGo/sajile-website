// ===================================================================
// AUTH MANAGER — FINAL FIXED VERSION (SYNC LOCALSTORAGE + API)
// ===================================================================

import { API_AUTH_URL, API_BASE_URL } from "./config.js";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

// ===== UPDATE UI =====
export const updateAuthUI = () => {
    const token = getAuthToken();
    const userStr = localStorage.getItem(USER_KEY);
    let user = null;

    try { user = JSON.parse(userStr); } catch {}

    const loggedIn = !!token && !!user;
    document.body.dataset.loggedIn = loggedIn ? "true" : "false";

    const nameElm = document.getElementById("nav-username");
    const emailElm = document.getElementById("nav-email");
    const picSmall = document.getElementById("profile-pic-small");

    if (loggedIn && user) {
        if (nameElm) nameElm.textContent = user.username || "User";
        if (emailElm) emailElm.textContent = user.email || "";
        if (picSmall) picSmall.src = user.profilePictureUrl || "../assets/default-avatar.png";
    }
};

// ===== SIMPAN TOKEN & USER =====
export const saveAuthToken = (token, user = null) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    updateAuthUI();
};

// ===== AMBIL TOKEN =====
export const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

// ===== AMBIL DATA USER =====
export const getAuthUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
};

// ===== VALIDASI TOKEN KE BACKEND =====
export async function validateToken() {
    // Gunakan URL yang sudah pasti terisi dari config
    const apiUrl = API_AUTH_URL; 
    const token = getAuthToken(); 

    if (!token || !apiUrl) {
        console.log("[AuthManager] Validasi dilewati: Token atau URL belum siap.");
        return null;
    }

    try {
        const res = await fetch(apiUrl, {
            method: "GET",
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const responseBodyText = await res.text();

        if (!res.ok) {
            console.error(`[AuthManager] Session Expired / Invalid.`);
            removeAuthToken(); 
            return null;
        }
        
        const data = JSON.parse(responseBodyText);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        updateAuthUI();
        return data;

    } catch (error) {
        console.error("[AuthManager] Network Error during validation:", error.message);
        return null;
    }
}

// ===== LOGOUT =====
export const removeAuthToken = () => {
    console.log("[AuthManager] 🔓 Removing auth data...");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    setTimeout(() => {
        window.location.href = "../html/daftar_atau_login.html";
    }, 100);
};

// ===== INITIALIZATION LOGIC =====
const initAuthManager = async () => {
    updateAuthUI();
    // Jalankan validasi hanya jika URL sudah tersedia
    if (API_AUTH_URL) {
        await validateToken();
    } else {
        window.addEventListener('backend-url-changed', async () => {
            await validateToken();
        }, { once: true });
    }
};

console.log("[AuthManager] Script loaded...");
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuthManager);
} else {
    initAuthManager();
}