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

async function checkLoginState(navAuthLinks, profileDropdownWrapper, aiCtaSection, aiCtaLoginRequired, body) {
    // ✅ PERBAIKAN: Menggunakan kunci 'authToken'
    const token = localStorage.getItem('authToken');
    // ✅ PERBAIKAN: Menggunakan kunci 'authUser'
    const userDataJSON = localStorage.getItem('authUser');
    
    // Asumsi: Token valid jika ada dan data pengguna ada
    if (token && userDataJSON) {
        // Logika sederhana: anggap token dan data di LS valid
        if (navAuthLinks) navAuthLinks.style.display = 'none';
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (aiCtaSection) aiCtaSection.style.display = 'flex';
        if (aiCtaLoginRequired) aiCtaLoginRequired.style.display = 'none';
        if (body) body.dataset.loggedIn = 'true';

        // ⭐ Panggil fungsi untuk memperbarui UI profil ⭐
        updateUserProfileUI();
    } else {
        // Pengguna belum login
        if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex/block sesuai layout Anda
        if (profileDropdownWrapper) profileDropdownWrapper.style.display = 'none';
        if (aiCtaSection) aiCtaSection.style.display = 'none';
        if (aiCtaLoginRequired) aiCtaLoginRequired.style.display = 'flex';
        if (body) body.dataset.loggedIn = 'false';
    }
}

// P5 Project/html/resep.js (Sesuaikan path import jika perlu)

// ⭐ IMPORT API URL DARI FILE CONFIG.JS ⭐
import { PUBLIC_BACKEND_URL, API_AUTH_URL, API_BASE_URL } from '../js/config.js'; 

// Blokir seleksi teks via JavaScript (Sama)
document.addEventListener('selectstart', function(e) { e.preventDefault(); });
document.addEventListener('dragstart', function(e) { e.preventDefault(); });

document.addEventListener('DOMContentLoaded', async () => {
    // ✅ Gunakan API_BASE_URL yang diimpor dari config.js
    const API_RECIPES_URL = `${API_BASE_URL}/recipes`; // URL resep kita sekarang dinamis
    const RECIPES_PER_PAGE = 9;
    
    // --- Elemen DOM ---
    const body = document.body;
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = navMenu ? navMenu.querySelectorAll('.nav-links a') : []; 
    const themeToggle = document.getElementById('theme-toggle');
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profileDropdown = document.getElementById('profile-dropdown');
    const filterTags = document.querySelectorAll('.filter-tags .tag');
    const recipeGrid = document.querySelector('.recipe-grid');
    const recipeContainer = recipeGrid;
    const recipeCountDisplay = document.getElementById('recipe-count-display');

    let currentPage = 0;
    let totalRecipes = 0;
    let isLoading = false;
    let currentFilter = 'Semua';
    let userFavorites = []; // Untuk menyimpan daftar ID resep yang difavoritkan
    
    const loadMoreBtnContainer = document.querySelector('.load-more-btn-container');
    const loadMoreBtn = loadMoreBtnContainer ? loadMoreBtnContainer.querySelector('.btn-primary') : null;

    // --- SETUP INTERSECTION OBSERVER ---
    const observerOptions = { threshold: 0.15 }; 

    const observer = new IntersectionObserver((entries, observerInstance) => { 
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible'); // Ini mengubah opacity jadi 1
            observerInstance.unobserve(entry.target); 
        });
    }, observerOptions);

    // ============================================================
    // [PERBAIKAN UTAMA] - INI YANG HILANG SEBELUMNYA
    // Mengaktifkan animasi untuk elemen statis (Header, Search, CTA)
    // ============================================================
    const staticFadeElements = document.querySelectorAll('.fade-in');
    staticFadeElements.forEach(el => {
        observer.observe(el);
    });
    // ============================================================

    // ========================================================
    // LOGIKA CEK STATUS LOGIN (NAVBAR UI) - Diperbaiki
    // ========================================================
    const navAuthLinks = document.querySelector('.nav-auth-links');
    const profileDropdownWrapper = document.querySelector('.profile-dropdown-wrapper');
    const aiCtaSection = document.querySelector('.cta-chatbot-section');
    const aiCtaLoginRequired = document.querySelector('ai-login-required');
    const logoutBtn = document.getElementById('logout-btn');

    // --- 2. Cek Status Login Saat Halaman Dimuat ---
    checkLoginState(navAuthLinks, profileDropdownWrapper, aiCtaSection, aiCtaLoginRequired, body); 

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

    // ========================================================
    // FUNGSI UTAMA UNTUK MENGAMBIL DATA RESEP
    // ========================================================
    
    // --- Helper function untuk penanganan respons API yang aman (sama seperti di beranda.js) ---
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
    

    async function fetchRecipes() {
        if (isLoading) return;
        isLoading = true;
        
        const offset = currentPage * RECIPES_PER_PAGE; 
        
        if (loadMoreBtn) loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat...';

        try {
            // URL resep sudah menggunakan API_BASE_URL yang dimuat dari config.js
            const url = `${API_BASE_URL}/recipes?limit=${RECIPES_PER_PAGE}&offset=${offset}`;
            console.log('Fetching:', url);
            
            const res = await fetch(url, { 
                cache: 'no-cache',
                // ⭐ BARIS WAJIB UNTUK MELEWATI PERINGATAN NGROK ⭐
                headers: {
                    'ngrok-skip-browser-warning': 'true' 
                }
                // Karena rute ini publik (tanpa middleware auth), hapus/komentari credentials
                // credentials: 'include' 
            });

            // ✅ Gunakan helper penanganan respons yang aman
            const result = await handleApiResponseSecure(res);

            if (!result.ok) {
                // Tangani error menggunakan pesan dari helper
                throw new Error(result.data.msg || 'Gagal memuat resep.');
            }

            const data = result.data; // Data JSON yang sudah di-parse
            const recipes = data.recipes || [];
            totalRecipes = data.total || 0;
            
            // 1. Render resep baru
            renderRecipes(recipes);

            // 2. Perbarui state halaman
            currentPage++;
            
            // 3. Cek apakah masih ada resep untuk dimuat (data.hasMore atau perbandingan)
            const hasMore = data.hasMore; 
            
            if (loadMoreBtnContainer) {
                if (!hasMore) {
                    loadMoreBtnContainer.style.display = 'none'; // Sembunyikan tombol
                    console.log('Semua resep telah dimuat.');
                } else {
                    loadMoreBtnContainer.style.display = 'flex'; // Pastikan terlihat
                    if (loadMoreBtn) loadMoreBtn.textContent = 'Muat Lebih Banyak Resep';
                }
            }

        } catch (error) {
            console.error('Error saat mengambil resep:', error);
            alert('Gagal memuat resep. Silakan coba lagi nanti.');
            if (loadMoreBtn) loadMoreBtn.textContent = 'Gagal Memuat Resep';
        } finally {
            isLoading = false;
            // Panggil kembali observer untuk animasi fade-in pada card baru
            document.querySelectorAll('.recipe-card-container:not(.visible)').forEach(el => observer.observe(el));
            // ✅ Panggil updatePaginationControls di sini setelah loading selesai
            updatePaginationControls();
        }
    }

    // Fungsi untuk merender HTML card resep
    function renderRecipes(recipesArray, append = false) {
        if (!recipesArray || recipesArray.length === 0) {
            if (currentPage > 0) { 
                // Logika kosong (seharusnya ini hanya muncul jika pagination kosong)
            } else {
                // Jika page 0 (pertama kali load) yang kosong
                recipeGrid.innerHTML = `<div class="empty-state">Tidak ada resep untuk filter ini.</div>`;
            }
            return;
        }

        const newRecipeHTML = recipesArray.map(recipe => {
            const ratingValue = recipe.avgRating || 0;
            const starHTML = createRatingStarsHTML(ratingValue);
            const shortDesc = recipe.description.length > 100 
                ? recipe.description.substring(0, 100) + '...' 
                : recipe.description;
            
            // 👇👇 PERBAIKAN DI FUNGSI INI 👇👇
            let imageUrl = recipe.imageUrl || 'https://via.placeholder.com/300x200?text=Resep';
            
            // Jika URL gambar dimulai dengan '/' dan bukan http:// atau https://
            if (imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                // ⭐ PERBAIKAN NGROK KE URL ABSOLUT ⭐
                imageUrl = `${PUBLIC_BACKEND_URL}${imageUrl}?ngrok-skip-browser-warning=1`;
            }
            
            // 👇👇 PERBAIKAN STRUKTUR HTML AGAR SESUAI DENGAN resep.html 👇👇
            const timeTotal = (recipe.prepTime || 0) + (recipe.cookTime || 0);
            const categoryDisplay = recipe.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            const isFavorited = userFavorites.includes(recipe._id);

            // Menggunakan URL fallback yang benar di onerror (Hanya jika belum diperbaiki di createRecipeCard)
            const fallbackUrl = 'https://placehold.co/300?text=Gambar+Hilang';

            // Indikator Gembok Premium
            const premiumBadge = recipe.isPremium 
                ? `<div class="premium-lock-tag"><i class="fas fa-crown"></i> Premium</div>` 
                : '';

            return `
                <div class="recipe-card-container fade-in">
                    <!-- Link hanya membungkus area informasi resep -->
                    <a href="resep_detail.html?id=${recipe._id}" class="recipe-card ${recipe.isPremium ? 'premium-card' : ''}">
                        <div class="card-image">
                            <img src="${imageUrl}" alt="${recipe.title}" loading="lazy">
                            <span class="category-badge">${categoryDisplay}</span>
                            ${premiumBadge}
                        </div>
                        <div class="card-info">
                            <h3>${recipe.title}</h3>
                            <div class="card-more-info">
                                <p class="duration"><i class="far fa-clock"></i> ${timeTotal} Menit</p>
                                <p class="star-rating">
                                    ${starHTML} 
                                    <span class="rating-number">${ratingValue.toFixed(1)}</span>
                                </p>
                            </div>
                        </div>
                    </a>

                    <!-- Tombol sekarang di luar <a> tapi masih di dalam container -->
                    <button class="btn-fav ${isFavorited ? 'active' : ''}" data-id="${recipe._id}" aria-label="Favorit">
                        <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            `;
            // 👆👆 SELESAI PERBAIKAN STRUKTUR HTML 👆👆
        }).join('');
        
        // ... (kode di bawah ini sama persis) ...
        if (append) {
            recipeGrid.insertAdjacentHTML('beforeend', newRecipeHTML);
        } else {
            recipeGrid.innerHTML = newRecipeHTML;
        }
        
        const newlyAddedElements = recipeGrid.querySelectorAll('.recipe-card-container:not(.visible)');
        newlyAddedElements.forEach(el => observer.observe(el));

        // 👇👇 2. PANGGIL FUNGSI UNTUK PASANG LISTENER FAVORIT 👇👇
        attachFavoriteListeners();
    }

        // Delegasi event untuk klik kartu resep
        recipeGrid.addEventListener('click', async (e) => {
            const cardLink = e.target.closest('.recipe-card');
            if (!cardLink) return;

            // Ambil ID resep dari URL di href
            const urlParams = new URLSearchParams(new URL(cardLink.href).search);
            const recipeId = urlParams.get('id');

            // Jika user mengklik resep, kita cek dulu aksesnya via Fetch sebelum pindah halaman
            // ATAU biarkan pindah halaman tapi resep_detail.html yang menangani pop-up nya.
            // DISARANKAN: Biarkan resep_detail.html yang menangani agar user bisa melihat preview judul/gambar.
        });

    async function fetchUserFavorites() {
        const token = localStorage.getItem('authToken');
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/favorites`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Simpan hanya ID-nya saja agar mudah dicek
                userFavorites = data.map(fav => fav._id || fav.id);
            }
        } catch (err) {
            console.error("Gagal mengambil data favorit:", err);
        }
    }
    
    /**
     * FUNGSI LOGIKA FAVORIT (File: js/resep.js)
     * Menggunakan sistem modular: POST untuk simpan, DELETE untuk hapus.
     */
    function attachFavoriteListeners() {
        // 1. Delegasi Event pada recipeGrid (Kontainer Utama)
        // Ini memastikan tombol tetap berfungsi meskipun resep baru dimuat via "Load More"
        const recipeGrid = document.querySelector('.recipe-grid');
        if (!recipeGrid) return;

        // Menghapus listener lama (jika ada) untuk mencegah double execution
        recipeGrid.onclick = null; 

        recipeGrid.onclick = async (e) => {
            // Cari apakah yang diklik adalah .btn-fav atau elemen di dalamnya (seperti icon <i>)
            const btn = e.target.closest('.btn-fav');
            
            // Jika yang diklik bukan tombol favorit, biarkan event link <a> berjalan
            if (!btn) return;

            // 🔥 KUNCI: Hentikan bubbling agar tidak pindah ke halaman detail resep
            e.preventDefault(); 
            e.stopPropagation();
            e.stopImmediatePropagation();

            // 2. Persiapan Data & Validasi Login
            const token = localStorage.getItem('authToken');
            if (!token) {
                alert("Silakan login untuk menyimpan resep favorit!");
                return;
            }

            const recipeId = btn.getAttribute('data-id');
            const icon = btn.querySelector('i');
            const isCurrentlyActive = btn.classList.contains('active');

            // Pastikan elemen toast ada untuk feedback visual
            let toast = btn.querySelector('.fav-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.className = 'fav-toast';
                btn.appendChild(toast);
            }

            // 3. UI OPTIMISTIK (Berikan respon instan ke user)
            if (isCurrentlyActive) {
                btn.classList.remove('active');
                icon.classList.replace('fas', 'far'); // Kembali ke outline (Hapus)
                toast.textContent = "Dihapus";
            } else {
                btn.classList.add('active');
                icon.classList.replace('far', 'fas'); // Jadi solid (Simpan)
                toast.textContent = "Disimpan!";
            }

            // Jalankan animasi Toast
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2000);

            // 4. PANGGIL API BERDASARKAN STATUS (Modular)
            try {
                // Tentukan method dan URL berdasarkan status saat ini
                // Jika aktif -> panggil DELETE ke /api/favorites/:id
                // Jika tidak aktif -> panggil POST ke /api/favorites
                const method = isCurrentlyActive ? 'DELETE' : 'POST';
                const url = isCurrentlyActive 
                    ? `${API_BASE_URL}/favorites/${recipeId}` 
                    : `${API_BASE_URL}/favorites`;

                const res = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'ngrok-skip-browser-warning': 'true'
                    },
                    // Body hanya dikirim untuk method POST
                    body: isCurrentlyActive ? null : JSON.stringify({ recipeId: recipeId })
                });

                const result = await res.json();
                
                if (!res.ok) {
                    throw new Error(result.msg || "Gagal memperbarui database");
                }
                
                console.log(`Berhasil ${isCurrentlyActive ? 'menghapus' : 'menambah'} favorit.`);

            } catch (error) {
                console.error("Error Favorite Action:", error);
                
                // 5. REVERT UI (Kembalikan tampilan jika API GAGAL)
                alert("Terjadi kesalahan pada server. Perubahan gagal disimpan.");
                if (isCurrentlyActive) {
                    btn.classList.add('active');
                    icon.classList.replace('far', 'fas');
                } else {
                    btn.classList.remove('active');
                    icon.classList.replace('fas', 'far');
                }
            }
        };
    }

    // Fungsi untuk mengupdate tombol Load More
    function updatePaginationControls() {
        if (loadMoreBtn) loadMoreBtn.disabled = false;
        
        const loadedCount = currentPage * RECIPES_PER_PAGE;
        const remainingCount = totalRecipes - loadedCount;
        
        if (recipeCountDisplay) {
            recipeCountDisplay.textContent = `Menampilkan ${Math.min(loadedCount, totalRecipes)} dari ${totalRecipes} Resep`;
        }

        if (loadMoreBtn) {
            if (loadedCount >= totalRecipes) {
                // Sembunyikan atau nonaktifkan jika semua sudah dimuat
                loadMoreBtn.style.display = 'none'; 
            } else {
                // Tampilkan kembali
                loadMoreBtn.style.display = 'block'; 
                loadMoreBtn.textContent = `Muat ${Math.min(remainingCount, RECIPES_PER_PAGE)} Resep Lagi`;
            }
        }
    }
    
    // Fungsi untuk membuat HTML bintang rating (disalin dari resep_detail.js)
    function createRatingStarsHTML(ratingValue) {
        let starsHTML = '';
        const rating = parseFloat(ratingValue) || 0;

        for (let i = 1; i <= 5; i++) {
            // Logika Bintang Full
            if (i <= Math.floor(rating)) {
                starsHTML += '<i class="fas fa-star active"></i>';
            } 
            // Logika Bintang Setengah (Jika sisa desimal >= 0.3 dan < 0.8)
            else if (i === Math.ceil(rating) && (rating % 1 >= 0.3 && rating % 1 < 0.8)) {
                starsHTML += '<i class="fas fa-star-half-alt active"></i>';
            }
            // Logika Pembulatan ke Atas (Jika desimal >= 0.8, dianggap bintang penuh)
            else if (i === Math.ceil(rating) && (rating % 1 >= 0.8)) {
                starsHTML += '<i class="fas fa-star active"></i>';
            }
            // Bintang Kosong
            else {
                starsHTML += '<i class="far fa-star"></i>';
            }
        }
        return starsHTML;
    }


    // ========================================================
    // 4. Filter Logic (REAL - Memanggil API)
    // ========================================================
    
    filterTags.forEach(tag => {
        tag.addEventListener('click', function() {
            filterTags.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.getAttribute('data-filter') || this.textContent.trim(); // ✅ Update filter global
            
            // ✅ Reset halaman ke 0 saat filter baru diterapkan
            currentPage = 0; 
            fetchRecipes(); // Panggil API untuk memuat ulang resep dari halaman 0
        });
    });

    // ========================================================
    // START UP LOGIC (LOGIKA UTAMA YANG MENUNGGU config.js)
    // ========================================================
    
    async function initResepPage() {
        console.log('⚡ Resep.js: Inisialisasi...');
        checkLoginState(); 
        
        // 1. Ambil data favorit dulu
        await fetchUserFavorites(); 
        
        // 2. Baru kemudian ambil resep
        fetchRecipes(); 

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                fetchRecipes(); 
            });
        }
    }

    // Terapkan pola event listener dari beranda.js untuk menunggu URL dimuat
    if (API_BASE_URL) {
        initResepPage();
    } else {
        // Jika config.js belum selesai, tunggu event kustom
        window.addEventListener('backend-url-changed', initResepPage);
    }

    // ========================================================
    // START UP LOGIC
    // ========================================================

    // --- 1. Navbar Toggle Logic (STANDAR WAJIB) ---
    // Memastikan desain navbar dan dropdown vertical menu sesuai standar wajib [2025-11-27]
    if (hamburgerBtn && navMenu) {
        hamburgerBtn.addEventListener('click', () => {
            hamburgerBtn.classList.toggle('active');
            navMenu.classList.toggle('active');

            if (navMenu.classList.contains('active')) {
                if (window.innerWidth <= 1024) {
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
}); // Akhir DOMContentLoaded