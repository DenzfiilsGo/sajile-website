// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

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

    // === 2. LOGIKA CEK LOGIN (DEFAULT - WAJIB KONSISTEN) ===
    function checkLoginState() {
        const token = localStorage.getItem('authToken');

        if (token) {
            body.setAttribute('data-logged-in', 'true');
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'block';
        } else {
            body.setAttribute('data-logged-in', 'false');
            if (navAuthLinks) navAuthLinks.style.display = 'block';
            if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        }
    }
    checkLoginState();

    // === 3. LOGIKA INTERAKSI NAVBAR (DEFAULT) ===
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm("Yakin ingin keluar?")) {
                localStorage.removeItem('authToken');
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

    // === 4. LOGIKA DARK MODE (DEFAULT) ===
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

    // === 5. SCROLL ANIMATION (DEFAULT) ===
    const observerOptions = { threshold: 0.1 }; // Sedikit lebih sensitif
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));


    // === 6. LOGIKA TAB MAKANAN SEHAT (FITUR BARU KHUSUS HALAMAN INI) ===
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Hapus kelas active dari semua tombol
            tabBtns.forEach(b => b.classList.remove('active'));
            // Tambah kelas active ke tombol yang diklik
            btn.classList.add('active');

            // Sembunyikan semua pane
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Tampilkan pane yang sesuai target
            const targetId = btn.getAttribute('data-tab');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

});