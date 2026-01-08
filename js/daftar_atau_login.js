// bagian atas: impor dan inisialisasi
// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_BASE_URL, GOOGLE_CLIENT_ID } from './config.js';
import { saveAuthToken } from './authManager.js';

// =======================================================
// GLOBAL EVENT LISTENERS
// =======================================================

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
let API_BACKEND_URL = API_BASE_URL;

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
    // ⚠️ CEK PENTING: Pastikan URL sudah ada sebelum lanjut
    if (!API_BACKEND_URL) {
        // Jika config.js belum siap, ambil ulang nilainya (karena import bersifat live binding)
        if (API_BASE_URL) {
             API_BACKEND_URL = API_BASE_URL;
        } else {
             console.warn("[DaftarLogin] Menunggu URL Backend dari config.js...");
             // Kita bisa tambahkan listener di sini atau biarkan user mencoba lagi nanti
        }
    }
    console.log('[DaftarLogin] Menggunakan API URL:', API_BACKEND_URL);
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
    window.togglePasswordRegister = function(el) {
        const passwordInput = document.getElementById('registerPassword');
        // 'el' adalah elemen ikon yang diklik
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            el.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = "password";
            el.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };
    window.togglePasswordLogin = function(el) {
        const passwordInput = document.getElementById('loginPass');
        // 'el' adalah elemen ikon yang diklik
        if (passwordInput.type === "password") {
            passwordInput.type = "text";
            el.classList.replace('fa-eye', 'fa-eye-slash');
        } else {
            passwordInput.type = "password";
            el.classList.replace('fa-eye-slash', 'fa-eye');
        }
    };

    // ===== 6. GOOGLE AUTH HANDLER =====
    const googleSignUpBtn = document.getElementById('googleSignUp');
    const googleSignInBtn = document.getElementById('googleSignIn');

    // ===== 6. GOOGLE AUTH HANDLER =====
    const handleGoogleLogin = () => {
        // Inisialisasi Google Token Client
        const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile', // Meminta akses profil & email (termasuk foto)
            callback: async (response) => {
                if (response.access_token) {
                    try {
                        // Tampilkan loading
                        Swal.fire({
                            title: 'Menghubungkan...',
                            text: 'Memverifikasi akun Google Anda',
                            allowOutsideClick: false,
                            didOpen: () => { Swal.showLoading(); }
                        });

                        // Kirim access_token ke Backend SajiLe untuk divalidasi
                        const res = await fetch(`${API_BASE_URL}/auth/google`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: response.access_token })
                        });

                        const result = await res.json();

                        if (res.ok) {
                            // Simpan Token & Data User (Termasuk URL Foto dari Google)
                            saveAuthToken(result.token, result.user);
                            
                            Swal.fire({
                                icon: 'success',
                                title: 'Berhasil Masuk!',
                                text: `Selamat datang, ${result.user.username}!`,
                                timer: 2000,
                                showConfirmButton: false
                            }).then(() => {
                                window.location.replace('../index.html');
                            });
                        } else {
                            throw new Error(result.msg || 'Gagal autentikasi Google');
                        }
                    } catch (error) {
                        Swal.fire('Gagal', error.message, 'error');
                    }
                }
            },
        });

        // Membuka jendela pilihan akun Google
        client.requestAccessToken();
    };

    // Pasang listener ke tombol yang sudah kita desain
    document.getElementById('googleSignUp')?.addEventListener('click', handleGoogleLogin);
    document.getElementById('googleSignIn')?.addEventListener('click', handleGoogleLogin);
    
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

            if (!API_BACKEND_URL) API_BACKEND_URL = API_BASE_URL;

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
                    saveAuthToken(result.data.token, result.data.user);
                    registerMessageDiv.textContent = '✅ Registrasi berhasil! Silakan cek email untuk memverifikasi akun Anda.';
                    registerMessageDiv.style.color = '#39ff14';
                } else {
                    registerMessageDiv.textContent = `Gagal Daftar: ${result.data.msg || 'Terjadi kesalahan'}`;
                }
            } catch (error) {
                console.error("[DaftarLogin] Register error:", error);
                registerMessageDiv.style.color = '#8b0000';
                registerMessageDiv.textContent = '❌ Gagal koneksi ke server. Kemungkinan server sedang tidak aktif.';
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

            if (!API_BACKEND_URL) API_BACKEND_URL = API_BASE_URL;

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

                loginMessageDiv.textContent = '✅ Berhasil Masuk ke akun Anda! Tunggulah beberapa saat untuk berpindah halaman.';
                loginMessageDiv.style.color = '#39ff14';

                setTimeout(() => window.location.replace('../index.html'), 400);

            } catch (error) {
                console.error("[DaftarLogin] Login error:", error);
                loginMessageDiv.style.color = '#8b0000';
                loginMessageDiv.textContent = '❌ Gagal koneksi ke server. Kemungkinan server sedang tidak aktif.';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'MASUK';
            }
        });
    }

// -------------------------------------------------------------
    // LOGIKA BARU: LUPA KATA SANDI (FORGOT PASSWORD) - CUSTOMIZED
    // -------------------------------------------------------------
    const forgotPassBtn = document.querySelector('.forgot-pass');

    if (forgotPassBtn) {
        forgotPassBtn.addEventListener('click', async (e) => {
            e.preventDefault();

            const { value: email } = await Swal.fire({
                title: 'Lupa Kata Sandi?',
                text: 'Jangan khawatir, masukkan email Anda untuk mendapatkan link reset.',
                icon: 'question', // Menambahkan ikon tanya yang elegan
                input: 'email',
                inputPlaceholder: 'nama@email.com',
                
                // --- Kustomisasi Visual ---
                showCancelButton: true,
                confirmButtonText: 'Kirim Link <i class="fas fa-paper-plane" style="margin-left:5px"></i>',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#2ecc71', // Hijau SajiLe
                cancelButtonColor: '#95a5a6',  // Abu-abu elegan
                
                // Menambahkan kelas kustom untuk CSS eksternal (opsional)
                customClass: {
                    popup: 'sajile-swal-popup',
                    title: 'sajile-swal-title',
                    confirmButton: 'sajile-swal-confirm'
                },
                
                // Animasi saat muncul
                showClass: {
                    popup: 'animate__animated animate__fadeInDown'
                },
                hideClass: {
                    popup: 'animate__animated animate__fadeOutUp'
                },

                showLoaderOnConfirm: true,
                preConfirm: async (email) => {
                    try {
                        const response = await fetch(`${API_BACKEND_URL}/auth/forgotpassword`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email })
                        });
                        
                        const data = await response.json();
                        
                        if (!response.ok) {
                            throw new Error(data.msg || 'Gagal mengirim request');
                        }
                        return data;
                    } catch (error) {
                        Swal.showValidationMessage(`Gagal: ${error.message}`);
                    }
                },
                allowOutsideClick: () => !Swal.isLoading()
            });

            if (email) {
                Swal.fire({
                    title: 'Email Terkirim!',
                    text: 'Silakan cek kotak masuk email Anda (termasuk folder spam).',
                    icon: 'success',
                    confirmButtonColor: '#2ecc71',
                    timer: 5000 // Menutup otomatis setelah 5 detik
                });
            }
        });
    }

    console.log("[DaftarLogin] ✅ Initialization complete");
}

// -------------------------------------------------------------
// LOGIKA STARTUP YANG MENUNGGU URL (Standar Wajib Baru)
// -------------------------------------------------------------
const startApp = () => {
    API_BACKEND_URL = API_BASE_URL;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDaftarLogin, { once: true });
    } else {
        initDaftarLogin();
    }
};

// Cek apakah URL sudah tersedia dari config.js
if (API_BASE_URL) {
    startApp();
} else {
    window.addEventListener('backend-url-changed', () => {
        console.log("⚡ [DaftarLogin] URL update detected from config.js");
        startApp();
    }, { once: true });
}

console.log("[DaftarLogin] Script end - waiting for potential DOMContentLoaded or init immediately");