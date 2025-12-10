// P5 Project/js/beranda.js

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
// Pastikan file config.js berada di lokasi yang benar
import { API_AUTH_URL, API_BASE_URL } from './config.js';

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
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    if (userDataJSON) {
        try {
            const userData = JSON.parse(userDataJSON);
            
            // 1. Update Profile Picture (ID harus 'profile-pic-img')
            const profilePicImg = document.getElementById('profile-pic-img');
            if (profilePicImg && userData.profilePictureUrl) {
                profilePicImg.src = userData.profilePictureUrl;
                
                // Tambahkan error handler untuk berjaga-jaga jika URL eksternal gagal
                profilePicImg.onerror = () => {
                    console.warn("Gagal memuat foto profil eksternal. Menggunakan default HTML.");
                    // Biarkan browser menggunakan src default yang sudah ada di HTML
                };
            }
            
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

// =======================================================
// MAIN LOGIC (DOMContentLoaded)
// =======================================================
document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. DEKLARASI VARIABEL DOM UTAMA ---
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    // Navbar Elements
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : []; 
    const themeToggle = document.getElementById('theme-toggle');

    // --- Helper function untuk penanganan respons API yang aman ---
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
            // Jika respons OK tapi tidak ada konten (204 No Content)
            return { ok: true, data: null };
        }
    }
    
    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body); 

    // --- 3. Logika Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Hapus semua data otentikasi
            // ✅ PERBAIKAN: Menggunakan kunci 'authToken' dan 'authUser'
            localStorage.removeItem('authToken'); 
            localStorage.removeItem('authUser');
            
            // Redirect ke halaman login atau beranda
            window.location.href = './index.html'; 
        });
    }

    // =======================================================
    // 4. STANDAR WAJIB: LOGIKA NAVBAR & DARK MODE
    // =======================================================

    // A. Dropdown Menu Profil
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); // Penting untuk mencegah event close di bawah
            profileDropdown.classList.toggle('active'); 
        });
        
        // Tutup dropdown jika mengklik di luar
        document.addEventListener('click', (e) => { 
            if (profileDropdown && profilePicBtn && 
                !profileDropdown.contains(e.target) && 
                !profilePicBtn.contains(e.target)) 
            {
                profileDropdown.classList.remove('active');
            }
        });
    }

    // B. Dark Mode Toggle
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        // ⭐ Gunakan kunci LS yang konsisten: sajile_theme
        const savedTheme = localStorage.getItem('sajile_theme') || 'light'; 
        
        body.dataset.theme = savedTheme;
        if (icon) {
            icon.classList.toggle('fa-sun', savedTheme === 'dark');
            icon.classList.toggle('fa-moon', savedTheme === 'light');
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = body.dataset.theme;
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);

            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }

    // C. Hamburger Menu Logic (Vertikal Dropdown)
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
                
            const isExpanded = navMenu.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded);
            
            // Kontrol overflow body
            if (isExpanded) {
                 if (window.innerWidth <= 768) { // Asumsi breakpoint mobile
                    document.body.style.overflow = 'hidden'; 
                }
            } else {
                document.body.style.overflow = ''; 
            }
        });
    }
    
    // Tutup menu jika link di dalam dropdown diklik
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            setTimeout(() => {
                if(hamburgerBtn) hamburgerBtn.classList.remove('active');
                if(navMenu) navMenu.classList.remove('active');
                document.body.style.overflow = '';
            }, 300);
        });
    });

    // =======================================================
    // 5. ANIMASI FADE IN (STANDAR WAJIB)
    // =======================================================
    const observerOptions = { threshold: 0.15 };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => {
        observer.observe(el);
    });
});