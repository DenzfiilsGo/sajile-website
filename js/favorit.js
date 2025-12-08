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
    // Asumsi ada endpoint untuk Favorit, contoh:
    const API_FAVORITES_URL = `${BACKEND_BASE_URL}/api/favorites`; 
    // =======================================================

    // --- Ambil Elemen DOM ---
    const body = document.body;
    const contentSection = document.getElementById('favorit-content');
    const emptyStateSection = document.getElementById('empty-state');
    
    // Navbar dan Dark Mode
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu-container');
    const themeToggle = document.getElementById('theme-toggle');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');


    // Default: Sembunyikan semua konten
    if (contentSection) contentSection.style.display = 'none';
    if (emptyStateSection) emptyStateSection.style.display = 'none';

    // ===============================================
    // FUNGSI UTAMA (Login, Status, Logout)
    // ===============================================

    function setLoginStatus(isLoggedIn) {
        body.setAttribute('data-logged-in', isLoggedIn ? 'true' : 'false');
        if (profileDropdown) {
            profileDropdown.classList.remove('active');
        }
    }
    
    // --- Logika Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (event) => {
            event.preventDefault();
            
            localStorage.removeItem('authToken'); 
            setLoginStatus(false);
            
            // Redirect ke halaman login setelah logout
            window.location.href = 'daftar_atau_login.html'; 
        });
    }

    // --- 1. Pengecekan Status Login Real ---
    async function checkLoginStatus() {
        const token = localStorage.getItem('authToken'); 
        
        if (!token) {
            handleEmptyState(false, false); // Belum Login
            return false;
        }

        try {
            const response = await fetch(`${API_AUTH_URL}/verify`, { 
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                setLoginStatus(true);
                return true;
            } else {
                localStorage.removeItem('authToken');
                handleEmptyState(false, false); // Token tidak valid
                return false;
            }

        } catch (error) {
            console.error('Koneksi ke Render gagal saat verifikasi:', error);
            handleEmptyState(false, false); // Error koneksi
            return false;
        }
    }

    // --- 2. Logika Penanganan Tampilan (Empty States) ---
    function handleEmptyState(isLoggedIn, hasFavorites) {
        if (contentSection) contentSection.style.display = 'none';
        if (emptyStateSection) emptyStateSection.style.display = 'flex';

        if (!isLoggedIn) {
            // Kasus 1: Belum Login / Error Token
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="fas fa-lock icon-large"></i>
                    <h2>Akses Dibatasi</h2>
                    <p>Silakan masuk atau daftar untuk melihat daftar resep favoritmu.</p>
                    <a href="daftar_atau_login.html" class="btn-primary">Masuk / Daftar Sekarang</a>
                </div>
            `;
        } else if (isLoggedIn && !hasFavorites) {
            // Kasus 2: Sudah Login, Tapi Belum Ada Favorit
            emptyStateSection.innerHTML = `
                <div class="empty-message fade-in visible">
                    <i class="far fa-heart icon-large"></i>
                    <h2>Favoritmu Masih Kosong</h2>
                    <p>Belum ada resep yang kamu simpan. Yuk, jelajahi ribuan resep lezat SajiLe!</p>
                    <a href="resep.html" class="btn-primary">Cari Resep</a>
                </div>
            `;
        } else {
            // Kasus 3: Sudah Login dan Ada Favorit (Seharusnya ini tidak dipanggil jika konten sudah ditampilkan)
            if (emptyStateSection) emptyStateSection.style.display = 'none';
            if (contentSection) contentSection.style.display = 'block';
        }
    }

    // --- 3. Logika Fetch Data Favorit ---
    async function fetchFavorites() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const response = await fetch(`${API_FAVORITES_URL}`, { // Endpoint GET /api/favorites
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (response.ok && data.favorites && data.favorites.length > 0) {
                // Berhasil dan ADA FAVORIT
                handleEmptyState(true, true); // Sembunyikan empty state
                renderFavorites(data.favorites); // Panggil fungsi render
                initContentListeners(); // Aktifkan event listener (Remove, Animation)
            } else {
                // Berhasil tapi TIDAK ADA FAVORIT (atau data kosong)
                handleEmptyState(true, false);
            }

        } catch (error) {
            console.error('Gagal mengambil favorit:', error);
            handleEmptyState(true, false); // Anggap tidak ada favorit karena error fetch
        }
    }

    // --- 4. Fungsi Simulasi Rendering (PERLU DIGANTI DENGAN LOGIKA HTML ASLI ANDA) ---
    function renderFavorites(favoritesArray) {
        // Logika ini harus diganti dengan cara Anda membuat card HTML
        const grid = document.querySelector('.recipe-grid');
        if (grid) {
            grid.innerHTML = favoritesArray.map(fav => `
                <div class="recipe-card fade-in" data-id="${fav.id}">
                    <img src="${fav.imageUrl}" alt="${fav.title}">
                    <div class="card-content">
                        <h3>${fav.title}</h3>
                        <p class="description">${fav.description}</p>
                        <div class="card-footer">
                            <a href="#" class="btn-primary">Lihat Resep</a>
                            <button class="btn-remove-fav">Hapus</button> 
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    // --- 5. Logika Inisialisasi Setelah Konten Dimuat ---
    function initContentListeners() {
        // Logika Menghapus Favorit (REAL - Memanggil API Delete)
        const removeBtns = document.querySelectorAll('.btn-remove-fav');
        removeBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault(); 
                
                if (!confirm("Yakin ingin menghapus resep ini dari Favorit?")) return;
                
                const card = btn.closest('.recipe-card');
                const recipeId = card.getAttribute('data-id');
                const token = localStorage.getItem('authToken');
                
                if (!recipeId || !token) return;

                try {
                    // ⭐ PANGGIL ENDPOINT DELETE API
                    const response = await fetch(`${API_FAVORITES_URL}/${recipeId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        // Hapus elemen dari DOM dengan transisi halus
                        card.style.opacity = 0;
                        card.style.transform = 'scale(0.8)';
                        
                        setTimeout(() => {
                            card.remove();
                            // Re-check jika grid kosong setelah penghapusan
                            const grid = card.closest('.recipe-grid');
                            if (grid && grid.children.length === 0) {
                                handleEmptyState(true, false);
                            }
                        }, 300);
                        
                    } else {
                        alert(`Gagal menghapus favorit: ${response.statusText}`);
                    }

                } catch (error) {
                    alert('Error koneksi saat menghapus favorit.');
                }
            });
        });

        // Scroll Animation (Fade In)
        const observerOptions = { threshold: 0.15 };
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            });
        }, observerOptions);

        const fadeElements = document.querySelectorAll('.fade-in');
        fadeElements.forEach(el => observer.observe(el));
    }


    // ===============================================
    // START UP LOGIC
    // ===============================================
    (async () => {
        const loggedIn = await checkLoginStatus();
        if (loggedIn) {
            await fetchFavorites();
        }
    })();
    
    // --- NAV BAR TOGGLE (Wajib) ---
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // --- Dark Mode Toggle (Tidak Berubah) ---
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const initTheme = () => {
            const savedTheme = localStorage.getItem('sajile_theme') || 'light'; // Gunakan sajile_theme
            body.dataset.theme = savedTheme;
            if (icon) {
                icon.classList.toggle('fa-sun', savedTheme === 'dark');
                icon.classList.toggle('fa-moon', savedTheme === 'light');
            }
        };
        initTheme();

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

    // --- 6. LOGIKA PROFILE DROPDOWN (Perbaikan Wajib) ---
    // Logika ini sebelumnya hilang sehingga dropdown tidak bisa dibuka
    if (profilePicBtn && profileDropdown) {
        // Toggle saat foto diklik
        profilePicBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Mencegah event bubbling ke window
            profileDropdown.classList.toggle('active');
        });

        // Tutup dropdown jika klik di luar area
        document.addEventListener('click', (e) => {
            if (!profileDropdown.contains(e.target) && !profilePicBtn.contains(e.target)) {
                profileDropdown.classList.remove('active');
            }
        });
    }
});