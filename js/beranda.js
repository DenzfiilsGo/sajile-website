// bagian atas: impor dan inisialisasi
// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { API_BASE_URL } from './config.js'; // PASTIKAN PATH INI BENAR

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
// MAIN LOGIC (DOMContentLoaded)
// =======================================================
document.addEventListener('DOMContentLoaded', async () => {
    // --- 1. DEKLARASI VARIABEL DOM UTAMA ---
    const navAuthLinks = document.querySelector('.nav-auth-links'); // Container tombol Masuk
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper'); // Container Profil
    const logoutBtn = document.getElementById('logout-btn');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');

    console.log('Menggunakan backend base URL:', API_BASE_URL);
    const API_BACKEND_URL = `https://metallographical-unoverpaid-omer.ngrok-free.dev/api`;

    // --- 3. LOGIKA OTENTIKASI (AUTH & USER DATA) ---
    
    // Helper: Tampilkan UI berdasarkan status login
    function updateAuthUI(isLoggedIn, userData = null) {
        if (isLoggedIn) {
            // Sembunyikan tombol masuk, Tampilkan profil
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';

            // Update Foto Profil & Username (jika ada elemennya)
            if (userData && profilePicBtn) {
                // Gunakan URL dari backend (Gravatar) atau fallback
                profilePicBtn.src = userData.profilePictureUrl || 'assets/default-avatar.png';
                
                // Handler jika gambar error/broken link -> kembali ke default
                profilePicBtn.onerror = function() {
                    this.src = 'assets/default-avatar.png';
                };
            }
        } else {
            // Tampilkan tombol masuk, Sembunyikan profil
            if (navAuthLinks) navAuthLinks.style.display = 'block';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        }
    }

    async function verifyAndFetchUser() {
        const token = localStorage.getItem("authToken");

        if (!token) {
            updateAuthUI(false);
            return;
        }

        // UI optimistik
        let cachedUser = null;
        const cached = localStorage.getItem("authUser");
        if (cached) {
            try { 
                cachedUser = JSON.parse(cached);
                updateAuthUI(true, cachedUser);
            } catch {}
        }

        // Ambil data terbaru dari server
        try {
            const res = await fetch(`${API_BACKEND_URL}/auth`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) {
                if (res.status === 401) return performLogout(false);
                return;
            }

            const latest = await res.json();
            localStorage.setItem("authUser", JSON.stringify(latest));

            updateAuthUI(true, latest);

        } catch (err) {
            console.error("Fetch user error:", err);
        }
    }


    // Fungsi Logout
    function performLogout(withConfirmation = true) {
        if (withConfirmation) {
            if (!confirm("Yakin ingin keluar?")) return;
        }
        
        localStorage.removeItem('authToken');
        localStorage.removeItem('user'); // Hapus data user juga
        window.location.reload();
    }

    // Panggil fungsi utama saat load
    verifyAndFetchUser();

    // Event Listener Tombol Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performLogout(true);
        });
    }

    // --- 4. DROPDOWN PROFIL (Desktop) ---
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
    // 7. UI STANDAR: THEME & HAMBURGER
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
    // 8. ANIMASI FADE IN
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