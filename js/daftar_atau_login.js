// bagian atas: impor dan inisialisasi
// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_BASE_URL } from './config.js'; // PASTIKAN PATH INI BENAR
import { saveAuthToken } from './authManager.js';

// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

console.log("[DaftarLogin] ✅ Script loaded, checking DOM state...");

console.log('Menggunakan backend base URL:', API_BASE_URL);
const API_BACKEND_URL = `https://metallographical-unoverpaid-omer.ngrok-free.dev/api`;

// --- Fungsi Pembantu untuk Penanganan Respons ---
async function handleApiResponse(response) {
    const responseText = await response.text();
    try {
        const jsonData = JSON.parse(responseText);
        return { ok: response.ok, data: jsonData };
    } catch (e) {
        // Jika ngrok mengembalikan HTML atau server eror parah
        console.error("Gagal parse JSON. Respons teks:", responseText);
        return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
    }
}

// ===== MAIN INITIALIZATION FUNCTION =====
function initDaftarLogin() {
    console.log("[DaftarLogin] 🚀 Initializing (DOM ready)...");
    
    // ===== GRAB ELEMEN DARI DOM (SEKARANG AMAN) =====
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');
    const loginMessageDiv = document.getElementById('loginMessage');
    const registerMessageDiv = document.getElementById('authMessage');
    const registerForm = document.getElementById('form_register');
    const loginForm = document.getElementById('form_login');
    
    console.log("[DaftarLogin] Elements found:", { 
        signUpButton: !!signUpButton, 
        signInButton: !!signInButton, 
        container: !!container,
        registerForm: !!registerForm,
        loginForm: !!loginForm
    });

    // ===== 1. CEK LOGIN AWAL =====
    function checkInitialLogin() {
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log("[DaftarLogin] ✅ User sudah login, redirect ke index.html");
            window.location.replace('../index.html');
        } else {
            console.log("[DaftarLogin] ℹ️ No token found, user bisa login");
        }
    }
    
    checkInitialLogin();

    // ===== 2. TOGGLE FORM =====
    if (signUpButton) {
        signUpButton.addEventListener('click', () => {
            console.log("[DaftarLogin] 📋 Switch to Register form");
            container.classList.add("right-panel-active");
            loginMessageDiv.textContent = '';
            registerMessageDiv.textContent = '';
        });
    }

    if (signInButton) {
        signInButton.addEventListener('click', () => {
            console.log("[DaftarLogin] 📋 Switch to Login form");
            container.classList.remove("right-panel-active");
            loginMessageDiv.textContent = '';
            registerMessageDiv.textContent = '';
        });
    }

    // ===== 3. TOGGLE PASSWORD VISIBILITY =====
    window.togglePassword = function() {
        const passwordInput = document.getElementById('loginPass');
        const toggleIcon = document.querySelector('.toggle-password');

        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = "password";
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    };

    // ===== 4. REGISTRASI HANDLER =====
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[DaftarLogin] 📝 Register form submitted");
            
            const registerUsernameInput = document.getElementById('registerUsername');
            const registerEmailInput = document.getElementById('registerEmail');
            const registerPasswordInput = document.getElementById('registerPassword');
            
            const username = registerUsernameInput.value.trim();
            const email = registerEmailInput.value.trim();
            const password = registerPasswordInput.value.trim();

            if (!username || !email || password.length < 6) {
                registerMessageDiv.style.color = 'red';
                registerMessageDiv.textContent = 'Harap isi semua kolom dan Password minimal 6 karakter.';
                return;
            }

            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';
            registerMessageDiv.textContent = '⏳ Menghubungkan ke server...';
            registerMessageDiv.style.color = '#FFA500';

            try {
                const response = await fetch(`${API_BACKEND_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                // ✅ Gunakan helper yang aman dari error HTML ngrok
                const result = await handleApiResponse(response); 
                console.log("[DaftarLogin] Register response:", result);

                if (result.ok) {
                    // ... (sisa kode sukses registrasi) ...
                    saveAuthToken(result.data.token, result.data.user);
                    // ...
                } else {
                    registerMessageDiv.textContent = `Gagal Daftar: ${result.data.msg || 'Terjadi kesalahan'}`;
                }
            } catch (error) {
                console.error("[DaftarLogin] Register error:", error);
                registerMessageDiv.style.color = 'red';
                registerMessageDiv.textContent = '❌ Gagal koneksi ke server';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'DAFTAR';
            }
        });
    }

    // ===== 5. LOGIN HANDLER =====
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("[DaftarLogin] 🔐 Login form submitted");
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPass').value.trim();

            if (!email || !password) {
                loginMessageDiv.style.color = 'red';
                loginMessageDiv.textContent = 'Email dan Password harus diisi.';
                return;
            }

            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Memproses...';
            loginMessageDiv.textContent = '⏳ Menghubungkan ke server...';
            loginMessageDiv.style.color = '#FFA500';

            try {
                const response = await fetch(`${API_BACKEND_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });

                // ✅ Gunakan helper yang aman dari error HTML ngrok
                const result = await handleApiResponse(response);
                console.log("[DaftarLogin] Login response:", result);


                if (!result.ok) {
                    loginMessageDiv.style.color = 'red';
                    loginMessageDiv.textContent = result.data.msg || "Gagal masuk!";
                    return;
                }

                // Backend mengirim: { token: ..., user: ... }
                const token = result.data.token;
                const user = result.data.user;

                if (!token || !user) {
                    loginMessageDiv.textContent = "Data token/user tidak lengkap!";
                    return;
                }

                // 🔥✅ Menggunakan fungsi saveAuthToken yang sudah benar JSON.stringify()
                saveAuthToken(token, user); 
                
                // --- BAGIAN FUNGSI GET USER DARI BACKEND DI BAWAH INI TIDAK LAGI DIPERLUKAN ---
                // Karena data user sudah didapatkan langsung dari respons login di atas.
                // Hapus semua kode fetch GET /auth yang ada di sini sampai setTimeout()

                loginMessageDiv.style.color = 'green';
                loginMessageDiv.textContent = 'Masuk berhasil! Mengalihkan...';

                setTimeout(() => window.location.replace('../index.html'), 400);

            } catch (error) {
                console.error("[DaftarLogin] Login error:", error);
                loginMessageDiv.style.color = 'red';
                loginMessageDiv.textContent = '❌ Gagal koneksi ke server';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'MASUK';
            }
        });
    }

    console.log("[DaftarLogin] ✅ Initialization complete");
}

// ⭐ PERBAIKAN: Cek apakah DOM sudah ready
if (document.readyState === 'loading') {
    // DOM belum ready, tunggu event
    document.addEventListener('DOMContentLoaded', initDaftarLogin);
} else {
    // DOM sudah ready, langsung jalankan
    console.log("[DaftarLogin] ⚡ DOM sudah ready, init langsung...");
    initDaftarLogin();
}

console.log("[DaftarLogin] Script end - waiting for potential DOMContentLoaded or init immediately");