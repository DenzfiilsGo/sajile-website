// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {
    // Deklarasi Fungsi dan Variabel
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');


    // =======================================================
    // 1. LOGIKA CEK LOGIN
    // =======================================================
    // Ambil URL backend dari /backend_url.json (fallback ke localhost)
    async function loadBackendBaseUrl() {
        const DEFAULT = 'http://localhost:5000'; // fallback lokal
        try {
            const res = await fetch('/backend_url.json', { cache: 'no-cache' });
            if (!res.ok) return DEFAULT;
            const data = await res.json();
            if (!data || !data.url) return DEFAULT;
            // pastikan tidak ada trailing slash
            return data.url.replace(/\/$/, '');
        } catch (err) {
            console.warn('Gagal memuat backend_url.json, gunakan fallback:', err);
            return DEFAULT;
        }
    }

    const BACKEND_BASE_URL = await loadBackendBaseUrl();
    console.log('Menggunakan backend base URL:', BACKEND_BASE_URL);
    const API_RECIPES_URL = `${BACKEND_BASE_URL}/api/recipes`;
    
    const token = localStorage.getItem('authToken'); // Kunci yang dikonfirmasi benar
    
    // Helper: cek apakah token JWT telah kedaluwarsa (decode payload tanpa library)
    function isTokenExpired(jwtToken) {
        if (!jwtToken) return true;
        try {
            const parts = jwtToken.split('.');
            if (parts.length !== 3) return true;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (!payload.exp) return false;
            // exp is in seconds
            return payload.exp * 1000 < Date.now();
        } catch (err) {
            console.warn('Gagal decode token untuk cek expiry', err);
            return false; // jika gagal decode, jangan assume expired (kecuali anda mau)
        }
    }

    function forceLogoutAndRedirect(message = 'Sesi Anda berakhir. Silakan login kembali.') {
        try {
            localStorage.removeItem('authToken');
        } catch (e) {}
        alert(message);
        // beri jeda singkat supaya alert terbaca lalu redirect
        setTimeout(() => {
            window.location.href = 'daftar_atau_login.html';
        }, 300);
    }

    function checkLoginState() {
        const token = localStorage.getItem('authToken'); // Gunakan 'authToken'

        if (token) {
            // User Login: Sembunyikan tombol masuk, Tampilkan profil
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';
        } else {
            // User Belum Login: Tampilkan tombol masuk, Sembunyikan profil
            if (navAuthLinks) navAuthLinks.style.display = 'block';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        }
    }

    // Panggil saat halaman dimuat
    checkLoginState();
    isTokenExpired(token); // Cek apakah token sudah expired

    // Logika Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
                window.location.reload(); // Refresh untuk update UI
            }
        });
    }

    // Toggle Dropdown Profil (Untuk Desktop)
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profilePicBtn && profileDropdown) {
        profilePicBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }

    // =======================================================
    // 3. STANDAR WAJIB: NAVBAR, HAMBURGER & DARK MODE
    // (Tidak ada perubahan di bagian ini)
    // =======================================================
    const body = document.body;
    const themeToggle = document.getElementById('theme-toggle');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');

    // A. Dark Mode Logic
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
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

    // B. Hamburger Menu Logic
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            const isExpanded = navMenu.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded);
        });
    }

    // ========================================================
    // 4. STANDAR WAJIB: FADE IN ANIMATION
    // ========================================================
    const observerOptions = { threshold: 0.15 };

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
});