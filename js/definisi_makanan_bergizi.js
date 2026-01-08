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

document.addEventListener('DOMContentLoaded', () => {

    // === 1. DEKLARASI VARIABEL DOM UTAMA ===
    const body = document.body;
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');

    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, body); 

    // === 3. LOGIKA INTERAKSI NAVBAR (STANDAR) ===
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

    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
            const isExpanded = navMenu.classList.contains('active');
            hamburgerBtn.setAttribute('aria-expanded', isExpanded);
        });
    }

    // === 4. LOGIKA DARK MODE (STANDAR) ===
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const savedTheme = localStorage.getItem('sajile_theme') || 'light';
        body.dataset.theme = savedTheme;
        if (icon) {
            icon.classList.toggle('fa-sun', savedTheme === 'dark');
            icon.classList.toggle('fa-moon', savedTheme === 'light');
        }

        themeToggle.addEventListener('click', () => {
            const newTheme = body.dataset.theme === 'dark' ? 'light' : 'dark';
            body.dataset.theme = newTheme;
            localStorage.setItem('sajile_theme', newTheme);
            if (icon) {
                icon.classList.toggle('fa-moon');
                icon.classList.toggle('fa-sun');
            }
        });
    }

    // === 5. SCROLL ANIMATION & TABS (TETAP SAMA) ===
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // Tab Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabPanes.forEach(pane => pane.classList.remove('active'));
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });
});