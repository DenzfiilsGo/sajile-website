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

// =======================================================
// FUNGSI UTAMA: UPDATE UI PROFIL (FOTO, NAMA, EMAIL)
// =======================================================

/**
 * Mengambil data pengguna dari localStorage dan memperbarui
 * foto profil, username, dan email pada navbar dropdown.
 */
function updateUserProfileUI() {
    const userDataJSON = localStorage.getItem('authUser');
    if (!userDataJSON) return;

    try {
        const userData = JSON.parse(userDataJSON);
        const profileImages = document.querySelectorAll('.profile-pic img, .dropdown-header img');
        
        // Pastikan URL Google menggunakan HTTPS
        let photoUrl = userData.profilePictureUrl;
        if (photoUrl && photoUrl.startsWith('http://')) {
            photoUrl = photoUrl.replace('http://', 'https://');
        }

        profileImages.forEach(img => {
            // Hindari reload gambar jika src sudah sama
            if (img.src === photoUrl) return;

            if (photoUrl) {
                // Gunakan crossOrigin anonymous untuk menghindari blokir CORS/CORB pada gambar
                img.crossOrigin = "anonymous"; 
                img.src = photoUrl;
            } else {
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
            }

            img.onerror = () => {
                // Jika Google memblokir (429/CORB), gunakan inisial sebagai fallback terakhir
                img.src = `https://placehold.co/40x40/2ecc71/fff?text=${userData.username.charAt(0)}`;
                img.onerror = null; // Hentikan loop onerror
            };
        })
            
        // 2. Update Username (ID atau Class)
        const usernameEl = document.querySelector('.username'); // Atau gunakan ID jika ada
        if (usernameEl && userData.username) {
            usernameEl.textContent = userData.username; // Teks biasa (yang akan disembunyikan)
            usernameEl.setAttribute('data-text', userData.username); // Teks untuk animasi marquee
        }
                
        // 3. Update Email (ID atau Class)
        const emailEl = document.querySelector('.email'); // Atau gunakan ID jika ada
        if (emailEl && userData.email) {
            emailEl.textContent = userData.email; // Teks biasa (yang akan disembunyikan)
            emailEl.setAttribute('data-text', userData.email); // Teks untuk animasi marquee
        }
                
    } catch (error) {
        console.error("Gagal memparsing data pengguna dari LocalStorage:", error);
    }
}

// =======================================================
// FUNGSI UTAMA: CEK STATUS LOGIN DAN TAMPILKAN UI YANG SESUAI
// =======================================================

async function checkLoginState(navAuthLinks, profileDropdownWrapper, body) {
    // ✅ PERBAIKAN: Menggunakan kunci 'authToken'
    const token = localStorage.getItem('authToken');
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    // Asumsi: Token valid jika ada dan data pengguna ada
    if (token && userDataJSON) {
        // Logika sederhana: anggap token dan data di LS valid
        if (navAuthLinks) navAuthLinks.style.display = 'none';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (body) body.dataset.loggedIn = 'true';

        // ⭐ Panggil fungsi untuk memperbarui UI profil ⭐
        updateUserProfileUI();
    } else {
        // Pengguna belum login
        if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (body) body.dataset.loggedIn = 'false';
    }
}

// P5 Project/html/daftar_makanan.js (asumsi lokasi relatif)

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
// Sesuaikan path import ini jika lokasi file berbeda dari '../js/config.js'
import { API_AUTH_URL, API_BASE_URL } from '../js/config.js'; 

// =======================================================
// GLOBAL EVENT LISTENERS (Sama seperti sebelumnya)
// =======================================================
document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {

    // --- Helper function untuk penanganan respons API yang aman ---
    // Fungsi ini sama persis dengan yang ada di beranda.js/daftar_atau_login.js
    async function handleApiResponseSecure(response) {
        const responseText = await response.text();
        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                return { ok: false, data: errorData };
            } catch (e) {
                return { ok: false, data: { msg: 'Kesalahan jaringan atau server.' } };
            }
        }
        try {
            const jsonData = JSON.parse(responseText);
            return { ok: true, data: jsonData };
        } catch (e) {
            console.error("Gagal parse JSON. Respons teks:", responseText);
            return { ok: false, data: { msg: 'Kesalahan format respons dari server' } };
        }
    }
    
    // HAPUS SEMUA LOGIKA loadBackendBaseUrl() YANG LAMA DI SINI
    // const BACKEND_BASE_URL = await loadBackendBaseUrl(); // Hapus ini
    // console.log('Menggunakan backend base URL:', BACKEND_BASE_URL); // Hapus ini
    // const API_AUTH_URL = `${BACKEND_BASE_URL}/api/auth`; // Hapus ini

    // === 1. Ambil Elemen DOM yang Dibutuhkan ===
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Profile Dropdown (Logged In)
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body); 

    // === 2. FUNGSI UTAMA UNTUK STATUS LOGIN ===

    function setLoginStatus(isLoggedIn) {
        body.setAttribute('data-logged-in', isLoggedIn ? 'true' : 'false');
        if (profileDropdown) {
            profileDropdown.classList.remove('active');
        }
    }

    async function checkLoginStatus() {
        const token = localStorage.getItem('authToken');

        if (!token) {
            setLoginStatus(false);
            return;
        }

        try {
            // ✅ Menggunakan API_AUTH_URL yang diimpor dari config.js
            const response = await fetch(API_AUTH_URL, { 
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` 
                },
                credentials: 'include'
            });
            
            // ✅ Menggunakan helper penanganan respons yang aman
            const result = await handleApiResponseSecure(response);

            if (result.ok) {
                setLoginStatus(true);
                // Opsional: Perbarui UI dengan user data (result.data) jika diperlukan
                localStorage.setItem('authUser', JSON.stringify(result.data));
            } else {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser'); // ✅ Hapus user data juga
                setLoginStatus(false);
            }

        } catch (error) {
            console.error('Koneksi backend gagal saat verifikasi:', error);
            setLoginStatus(false);
        }
    }

    // PANGGIL FUNGSI INI HANYA JIKA URL BACKEND SUDAH DIMUAT
    function initDaftarMakanan() {
        console.log('Menggunakan backend base URL:', API_BASE_URL); // Log URL yang benar
        checkLoginStatus();
        // ... (fungsi lain yang perlu dijalankan saat init) ...
        // Misalnya: loadFoodItems(); 
    }

    // Terapkan pola event listener dari beranda.js untuk menunggu URL dimuat
    if (API_BASE_URL) {
        initDaftarMakanan();
    } else {
        window.addEventListener('backend-url-changed', initDaftarMakanan);
    }


    // === 3. Logika Logout ===
    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                window.location.reload();
            }
        });
    }

    // -----------------------------------------------
    // 4. Logika Toggle Profile Dropdown (Desktop)
    // -----------------------------------------------
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (event) => {
            if (window.innerWidth > 1024) { 
                profileDropdown.classList.toggle('active');
                event.stopPropagation(); 
            }
        });
        
        document.addEventListener('click', (event) => {
            if (profileDropdown.classList.contains('active') && 
                !profileDropdown.contains(event.target) && 
                !profilePicBtn.contains(event.target)) {
                
                profileDropdown.classList.remove('active');
            }
        });
    }

    // -----------------------------------------------
    // 5. Logika Toggle Hamburger Menu (Mobile)
    // -----------------------------------------------
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            hamburgerBtn.classList.toggle('active');
            
            if (profileDropdown) {
                profileDropdown.classList.remove('active');
            }
        });
        
        document.querySelectorAll('.nav-links a, .nav-auth-links a').forEach(link => {
             link.addEventListener('click', () => {
                setTimeout(() => {
                    navMenu.classList.remove('active');
                    hamburgerBtn.classList.remove('active');
                }, 300); 
             });
        });
    }

    // === 6. Logika Filter Makanan/Minuman (TIDAK BERUBAH) ===
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    const foodItems = document.querySelectorAll('.category-makanan');
    const drinkItems = document.querySelectorAll('.category-minuman');

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.getAttribute('data-filter');

            if (filter === 'makanan') {
                foodItems.forEach(item => {
                    item.style.display = 'flex'; 
                    resetAnimation(item);
                });
                drinkItems.forEach(item => item.style.display = 'none');
            } else {
                drinkItems.forEach(item => {
                    item.style.display = 'flex';
                    resetAnimation(item);
                });
                foodItems.forEach(item => item.style.display = 'none');
            }
        });
    });

    function resetAnimation(element) {
        element.style.animation = 'none';
        element.offsetHeight; /* trigger reflow */
        element.style.animation = 'fadeIn 0.5s ease-in-out';
    }

    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(styleSheet);


    // === 7. Logika Dark Mode (TIDAK BERUBAH) ===
    if (themeToggle) {
        // Cek status tema tersimpan (Menggunakan sajile_theme seperti di beranda.js)
        const savedTheme = localStorage.getItem('sajile_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        body.dataset.theme = savedTheme;
        
        // Atur ikon awal
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-sun', savedTheme === 'dark');
        icon.classList.toggle('fa-moon', savedTheme === 'light');

        themeToggle.addEventListener('click', () => {
            const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
        });
    }

});