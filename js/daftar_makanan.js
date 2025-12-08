// Blokir seleksi teks via JavaScript
document.addEventListener('selectstart', function(e) {
    e.preventDefault(); // Mencegah aksi default seleksi
});

// Opsional: Blokir drag teks/gambar
document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

document.addEventListener('DOMContentLoaded', async () => {

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
    const API_AUTH_URL = `${BACKEND_BASE_URL}/api/auth`; 

    // === 1. Ambil Elemen DOM yang Dibutuhkan ===
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Profile Dropdown (Logged In)
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    // === 2. FUNGSI UTAMA UNTUK STATUS LOGIN ===

    /**
     * Fungsi untuk menentukan dan mengatur status masuk pengguna pada elemen <body>.
     * Mengatur atribut data-logged-in untuk kontrol CSS/DOM.
     */
    function setLoginStatus(isLoggedIn) {
        body.setAttribute('data-logged-in', isLoggedIn ? 'true' : 'false');
        
        if (profileDropdown) {
            profileDropdown.classList.remove('active');
        }
    }

    /**
     * Cek token di LocalStorage dan panggil API Render untuk verifikasi.
     */
    async function checkLoginStatus() {
        const token = localStorage.getItem('authToken'); // Ambil token yang disimpan saat login

        if (!token) {
            setLoginStatus(false);
            return;
        }

        try {
            // Panggil endpoint verifikasi/data profil Anda di Render
            const response = await fetch(`${API_AUTH_URL}/verify`, { // Asumsi ada endpoint /api/auth/verify
                method: 'GET',
                headers: {
                    // Mengirimkan token ke backend Render untuk verifikasi
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            if (response.ok) {
                // Token valid. Pengguna terautentikasi.
                setLoginStatus(true);
                // Opsional: Anda bisa memanggil response.json() untuk mendapatkan dan menampilkan nama pengguna di dropdown
            } else {
                // Token tidak valid (misalnya expired). Hapus token.
                localStorage.removeItem('authToken');
                setLoginStatus(false);
            }

        } catch (error) {
            // Error koneksi (Render sedang sleep, dll.)
            console.error('Koneksi ke Render gagal saat verifikasi:', error);
            // Biarkan status body tetap 'false' atau tangani sesuai UX yang diinginkan
            setLoginStatus(false);
        }
    }

    // Panggil fungsi pengecekan status saat halaman dimuat
    checkLoginStatus();

    // === 3. Logika Logout ===
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Hapus token JWT dan data login lainnya
            localStorage.removeItem('authToken'); 
            
            // Ubah status dan muat ulang tampilan navbar
            setLoginStatus(false);
            
            // Redirect ke halaman login setelah logout
            window.location.href = '../html/daftar_atau_login.html'; 
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