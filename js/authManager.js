// ===================================================================
// AUTH MANAGER — FINAL FIXED VERSION (SYNC LOCALSTORAGE + API)
// ===================================================================

import { API_AUTH_URL } from "./config.js";

const TOKEN_KEY = "authToken";
const USER_KEY = "authUser";

function removeAuthTokenWrapper(e) {
    e.preventDefault();
    removeAuthToken();
}


// ===== UPDATE UI =====
export const updateAuthUI = () => {
    const token = getAuthToken();
    const userStr = localStorage.getItem("authUser");
    let user = null;

    try { user = JSON.parse(userStr); } catch {}

    const loggedIn = !!token && !!user;

    document.body.dataset.loggedIn = loggedIn ? "true" : "false";

    const nameElm = document.getElementById("nav-username");
    const emailElm = document.getElementById("nav-email");
    const picSmall = document.getElementById("profile-pic-small");

    if (loggedIn) {
        if (nameElm) nameElm.textContent = user.username;
        if (emailElm) emailElm.textContent = user.email;
        if (picSmall) picSmall.src = user.profilePictureUrl ?? "assets/default-avatar.png";
    }
};


// ===== SIMPAN TOKEN & USER =====
export const saveAuthToken = (token, user = null) => {
    localStorage.setItem("authToken", token);
    if (user) localStorage.setItem("authUser", JSON.stringify(user));
    updateAuthUI();
};

// ===== AMBIL TOKEN =====
export const getAuthToken = () => localStorage.getItem("authToken");
// ===== AMBIL DATA USER =====
export const getAuthUser = () => {
    const userStr = localStorage.getItem(USER_KEY);
    try {
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error("[AuthManager] ❌ Parse error:", e);
        return null;
    }
};

// authManager.js: UPDATE FUNGSI validateToken
async function validateToken() {
    const apiUrl = `https://metallographical-unoverpaid-omer.ngrok-free.dev/api/auth`;
    
    // ✅ Mengambil token dari localStorage (fungsi yang sudah kita buat)
    const token = getAuthToken(); 

    if (!token) {
        console.log("[AuthManager] Tidak ada token di localStorage, melewati validasi.");
        return null;
    }

    try {
        const res = await fetch(apiUrl, {
            method: "GET",
            headers: { 
                Authorization: `Bearer ${token}`,
                'Accept': 'application/json'
            },
            credentials: 'include'
        });

        const responseBodyText = await res.text();

        if (!res.ok) {
            console.error(`Status HTTP ${res.status}: Gagal otentikasi.`, responseBodyText);
            removeAuthToken(); // Hapus token busuk jika gagal otentikasi
            throw new Error("Permintaan gagal di server.");
        }
        
        const data = JSON.parse(responseBodyText);
        console.log('Token Valid. Data JSON:', data);
        localStorage.setItem('authUser', JSON.stringify(data));
        return data;

    } catch (error) {
        console.error("[AuthManager] validateToken error:", error);
        return null;
    }
}

validateToken();

// ===== INIT =====
function initAuthManager() {
    updateAuthUI();
    validateToken().then((freshUser) => {
        if (freshUser) updateAuthUI();
    });
}

document.addEventListener("DOMContentLoaded", initAuthManager);




// --------------------------------------------------------
// LOGOUT
// --------------------------------------------------------
export const removeAuthToken = () => {
    console.log("[AuthManager] 🔓 Removing auth data...");
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    setTimeout(() => {
        window.location.href = "html/daftar_atau_login.html";
    }, 100);
};

// ===================================================================
// AUTO INIT
// ===================================================================
console.log("[AuthManager] Script loaded...");

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAuthManager);
} else {
    initAuthManager();
}
